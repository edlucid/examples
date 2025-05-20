import { Auth0Client } from "@auth0/nextjs-auth0/server";

const issuerBaseURL = process.env.AUTH0_ISSUER_BASE_URL;
const baseURL = process.env.AUTH0_BASE_URL;

if (!issuerBaseURL) {
  throw new Error('AUTH0_ISSUER_BASE_URL is not set. Please check your .env file and ensure it is loaded correctly.');
}

if (!baseURL) {
  throw new Error('AUTH0_BASE_URL is not set. Please check your .env file and ensure it is loaded correctly.');
}

// Using 'any' for config type to bypass immediate linter error on Auth0ServerClientConfig
// The main goal is to ensure runtime values are passed to the constructor.
const config: any = {
  secret: process.env.AUTH0_SECRET as string,
  baseURL: baseURL,
  issuerBaseURL: issuerBaseURL,
  clientID: process.env.AUTH0_CLIENT_ID as string,
  clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
  authorizationParams: {
    audience: process.env.AUTH0_AUDIENCE, 
    scope: process.env.AUTH0_SCOPE,       
  },
};

if (!config.secret || !config.clientID || !config.clientSecret) {
  throw new Error(
    'One or more required Auth0 config values (AUTH0_SECRET, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET) are undefined. Please check your .env file.'
  );
}

export const auth0 = new Auth0Client(config); 