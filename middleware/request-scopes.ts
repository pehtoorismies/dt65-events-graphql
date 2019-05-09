import * as jwt from 'jsonwebtoken';
import * as R from 'ramda';
import { getMatchingPubKey, getScopes } from '../util';
import { config } from '../config';

const getBearerToken = R.pipe(
  R.defaultTo(''),
  R.split('Bearer'),
  R.last,
  R.trim,
);

const getKID = R.path(['header', 'kid']);

const requestScopes = async (resolve, root, args, context, info) => {
  // console.log('***');
  // console.log(info.fieldName);
  // console.log(info.operation);
  // console.log('/***');

  const authHeader = context.request.get('Authorization');
  console.log('authHeader', authHeader)
  const jwtToken = getBearerToken(authHeader);
  if (!jwtToken) {
    const result = await resolve(root, args, context, info);
    return result;
  }

  const decodedToken = jwt.decode(jwtToken, { complete: true });
  const kid = String(getKID(decodedToken));

  if (!kid) {
    return new Error('Malformed token');
  }
  const pubkey = await getMatchingPubKey(kid);

  try {
    const token: any = jwt.verify(jwtToken, pubkey, {
      audience: config.auth.jwtAudience,
      issuer: `https://${config.auth.domain}/`,
      algorithms: ['RS256'],
    });
    const scopes: string[] = getScopes(token.scope);
    const updatedContext = {
      ...context,
      scopes,
    };
    const result = await resolve(root, args, updatedContext, info);
    return result;
  } catch (e) {
    console.error(e);
    return new Error('Not able to get public key');
  }
};

export default requestScopes;
