import LogtoClient from '@logto/next/server-actions';

export const logtoClient = new LogtoClient({
  endpoint: process.env.LOGTO_ENDPOINT ?? '', // No sensible default - MUST be provided by user
  appId: process.env.LOGTO_APP_ID ?? '',
  appSecret: process.env.LOGTO_APP_SECRET ?? '',
  baseUrl: process.env.BASE_URL ?? 'http://localhost:3001', // Default for local sample app run
  cookieSecret:
    process.env.LOGTO_COOKIE_SECRET ??
    'complex_password_at_least_32_characters_long',
  cookieSecure: process.env.NODE_ENV === 'production',
  // Optional: If your LTI Bridge requires specific scopes beyond openid, profile, email
  // scopes: ['scope1', 'scope2'],
  // Optional: If your LTI Bridge requires specific resources
  // resources: ['resource1', 'resource2'],
});
