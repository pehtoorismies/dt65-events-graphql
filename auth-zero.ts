import { ManagementClient, AuthenticationClient } from 'auth0';
import { config } from './config';

const { domain, clientId, clientSecret } = config.auth;

const auth0 = new AuthenticationClient({
  domain,
  clientId,
  clientSecret,
});

const createAuthZeroUser = async (
  email: string,
  username: string,
  password: string,
) => {
  // valid user => create to Auth0
  const client = await auth0.clientCredentialsGrant({
    audience: `https://${domain}/api/v2/`,
  });
  const management = new ManagementClient({
    token: client.access_token,
    domain,
  });
  const authZeroUser = await management
    .createUser({
      connection: 'Username-Password-Authentication',
      email,
      password,
      username,
      verify_email: true,
      email_verified: false,
      user_metadata: {
        username,
      },
      app_metadata: { role: 'USER' },
    })
    .catch((err: Error) => {
      console.error(err);
      return null;
    });
  return authZeroUser;
};

export { createAuthZeroUser };
