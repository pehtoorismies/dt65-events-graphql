import * as rp from 'request-promise';
import * as R from 'ramda';
import { config } from './config';

const isEmailOrOpenId = (n: string) => n === 'email' || n === 'openid';

export const getScopes = R.pipe(
  R.split(' '),
  R.reject(isEmailOrOpenId),
);

let pubkeys = {};

export const getMatchingPubKey = async (kid: string) => {
  if (!(kid in pubkeys)) {
    const jwks = await rp({
      method: 'GET',
      url: `https://${config.auth.domain}/.well-known/jwks.json`,
    });
    const data = JSON.parse(jwks);

    const key = R.find(R.propEq('kid', kid), data.keys);

    const pubkey = key.x5c[0];

    pubkeys = R.assoc(
      kid,
      `-----BEGIN CERTIFICATE-----\n${pubkey}\n-----END CERTIFICATE-----`,
      pubkeys,
    );
  }
  try {
    return R.prop(kid, pubkeys);
  } catch (e) {
    console.error(e);
    throw new Error('Unknown key id in token');
  }
};

