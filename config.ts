import * as dotenv from 'dotenv'

dotenv.config();

interface Auth {
  domain: string;
  clientId: string;
  clientSecret: string;
}

const registerSecret : string = process.env.REGISTER_SECRET || 'secret'

const auth: Auth = {
  domain: process.env.AUTH_DOMAIN || 'dev-dt65.eu.auth0.com',
  clientId: process.env.AUTH_CLIENT_ID || 'clientId',
  clientSecret: process.env.AUTH_CLIENT_SECRET || 'secret',
  // APP_AUDIENCE_ID: process.env.APP_AUDIENCE_ID || 'app_audience',
};

const config = {
  auth,
  registerSecret,
};

export { config };
