import { handleAuth, handleCallback, Session } from '@auth0/nextjs-auth0';
import { importJWK, jwtVerify } from 'jose';
import { NextApiRequest, NextApiResponse } from 'next'; // Assuming API routes, adjust if using App Router Route Handlers

const CSRF_COOKIE_NAME = 'auth0_csrf_state';
const CSRF_COOKIE_SECRET =
  process.env.AUTH0_SECRET || 'a-very-secure-secret-for-csrf-cookie-replace-me';

// Function to verify the signed CSRF cookie
async function verifyCsrfCookie(
  signedCookie: string | undefined,
): Promise<string | null> {
  if (!signedCookie) return null;
  try {
    const secretJWK = {
      kty: 'oct',
      k: Buffer.from(CSRF_COOKIE_SECRET, 'utf8').toString('base64url'),
    };
    const secretKey = await importJWK(secretJWK, 'HS256');
    const { payload } = await jwtVerify(signedCookie, secretKey, {
      algorithms: ['HS256'],
    });
    return (payload.csrf as string) ?? null;
  } catch (error) {
    console.error('Error verifying CSRF cookie:', error);
    return null;
  }
}

const afterCallback = async (
  req: NextApiRequest,
  res: NextApiResponse,
  session: Session,
  state: { [key: string]: any } | undefined,
) => {
  console.log('Executing afterCallback...');
  // IMPORTANT: state passed here is already decoded by the SDK if it was URL-safe Base64.
  // If we passed base64url in middleware, it should be decoded here.
  // If not, we need to decode it: Buffer.from(state?.state ?? '', 'base64url').toString('utf8')

  // For now, assume SDK handles decoding or state is not what we encoded (need verification)
  // Let's try reading the original query param first
  const originalStateParam = req.query.state as string | undefined;
  let decodedState;
  if (originalStateParam) {
    try {
      decodedState = JSON.parse(
        Buffer.from(originalStateParam, 'base64url').toString('utf8'),
      );
      console.log('Decoded state from query param:', decodedState);
    } catch (e) {
      console.error('Failed to decode original state query parameter', e);
      throw new Error('Invalid state parameter received.');
    }
  } else {
    console.error('Original state parameter missing from callback request.');
    throw new Error('State parameter missing from callback.');
  }

  const receivedCsrf = decodedState?.csrfToken;
  const ltiState = decodedState?.ltiState; // Extract ltiState if needed later

  if (!receivedCsrf) {
    console.error('CSRF token missing in decoded state.');
    throw new Error('Invalid state: CSRF token missing.');
  }

  // Retrieve the expected CSRF token from the signed cookie
  const csrfCookie = req.cookies[CSRF_COOKIE_NAME];
  const expectedCsrf = await verifyCsrfCookie(csrfCookie);

  // Remove the cookie immediately after reading
  // Note: Modifying headers/cookies in API routes requires careful handling
  // res.setHeader('Set-Cookie', `${CSRF_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`);
  // --> Better to handle cookie removal in middleware maybe, or ensure it expires

  if (!expectedCsrf) {
    console.error('Expected CSRF token missing or cookie verification failed.');
    throw new Error(
      'CSRF validation failed (missing cookie or invalid signature).',
    );
  }

  if (receivedCsrf !== expectedCsrf) {
    console.error(
      `CSRF mismatch: Received \"${receivedCsrf}\", Expected \"${expectedCsrf}\"`,
    );
    throw new Error('CSRF validation failed (token mismatch).');
  }

  console.log('CSRF validation successful.');
  console.log('LTI State from callback state:', ltiState);

  // Add LTI state to the session if needed downstream?
  // session.user.ltiState = ltiState;

  return session;
};

export default handleAuth({
  callback: async (req: any, res: any) => {
    try {
      // Use handleCallback with the afterCallback hook
      // Need to adjust types if using App Router Route Handlers instead of API Routes
      await handleCallback(req, res, { afterCallback });
    } catch (error: any) {
      res.status(error.status || 500).end(error.message);
    }
  },
  // Add other handlers like login, logout, profile if needed,
  // though login is now initiated differently
});
