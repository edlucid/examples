import {
  getSession,
  withMiddlewareAuthRequired,
} from '@auth0/nextjs-auth0/edge';
import { SignJWT, importJWK } from 'jose';
import { nanoid } from 'nanoid'; // Using nanoid for CSRF token generation
import { NextRequest, NextResponse } from 'next/server';

// Generate a CSRF token
function generateCsrfToken() {
  return nanoid(32);
}

// Secret for signing the CSRF state cookie
// IMPORTANT: Use a strong, unique secret stored securely (e.g., env var)
// For demo purposes only, using a hardcoded value. DO NOT DO THIS IN PRODUCTION.
const CSRF_COOKIE_SECRET =
  process.env.AUTH0_SECRET || 'a-very-secure-secret-for-csrf-cookie-replace-me';
const CSRF_COOKIE_NAME = 'auth0_csrf_state';
const CSRF_EXPIRY_SECONDS = 60 * 10; // 10 minutes

async function getSignedCsrfCookie(csrfToken: string): Promise<string> {
  const secretJWK = {
    kty: 'oct',
    k: Buffer.from(CSRF_COOKIE_SECRET, 'utf8').toString('base64url'),
  };
  const secretKey = await importJWK(secretJWK, 'HS256');
  const jwt = await new SignJWT({ csrf: csrfToken })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${CSRF_EXPIRY_SECONDS}s`)
    .sign(secretKey);
  return jwt;
}

export default withMiddlewareAuthRequired(
  async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const user = await getSession(req, res);

    const ltiState = req.nextUrl.searchParams.get('lti_state');

    // If user is already logged in, just proceed
    if (user) {
      return res;
    }

    // If not logged in AND lti_state is present, initiate login with combined state
    if (ltiState) {
      console.log('Middleware: No session, lti_state found. Initiating login.');
      const csrfToken = generateCsrfToken();
      const combinedState = {
        csrfToken: csrfToken,
        ltiState: ltiState,
      };
      const encodedState = Buffer.from(JSON.stringify(combinedState)).toString(
        'base64url',
      );

      // Store CSRF token in a signed, secure, httpOnly cookie
      const signedCookie = await getSignedCsrfCookie(csrfToken);
      res.cookies.set(CSRF_COOKIE_NAME, signedCookie, {
        httpOnly: true,
        secure: req.nextUrl.protocol === 'https:',
        maxAge: CSRF_EXPIRY_SECONDS,
        path: '/', // Ensure cookie is available on callback path
        sameSite: 'lax',
      });

      // Redirect to the login handler, passing the combined state
      // handleLogin will pick up authorizationParams from loginOptions
      // NOTE: This approach with withMiddlewareAuthRequired options is complex for dynamic state.
      // A simpler redirect to /api/auth/login with state in query might be needed if this fails,
      // requiring /api/auth/login to handle reading state from query.
      // For now, let's try modifying the response directly (less standard).

      // --- Redirect Approach ---
      const loginUrl = new URL('/api/auth/login', req.nextUrl.origin);
      // Auth0 SDK reads state from authorizationParams in handleLogin options,
      // which are hard to set dynamically here. We construct the redirect manually.
      // Ideally, the SDK would allow easier state passing from middleware.
      // This requires ensuring the Auth0 connection uses the right parameters.
      const params = new URLSearchParams({
        returnTo: req.nextUrl.pathname + req.nextUrl.search, // Return to the originally requested page
        // We need to trigger the Auth0 flow with our custom state that includes lti_state
        // This needs careful setup in handleLogin or direct construction of Auth0 /authorize URL
      });

      // !! IMPORTANT REVISION: Redirecting to /api/auth/login won't work well for setting
      // dynamic state easily with this SDK structure. We need to redirect directly
      // to the Auth0 /authorize endpoint constructed with our combined state.
      // This bypasses the SDK's /api/auth/login convenience but gives us control.

      const auth0Domain = process.env.AUTH0_ISSUER_BASE_URL?.replace(
        /^https?:\/\//,
        '',
      );
      const clientId = process.env.AUTH0_CLIENT_ID;
      const redirectUri = `${req.nextUrl.origin}/api/auth/callback`; // Callback handled by SDK
      const scope = 'openid profile email'; // Standard scopes
      const responseType = 'code'; // Standard OIDC flow

      if (!auth0Domain || !clientId) {
        console.error(
          'Auth0 domain or client ID not configured for direct redirect.',
        );
        return NextResponse.redirect(new URL('/auth-error', req.url)); // Redirect to an error page
      }

      const authorizeUrl = new URL(`https://${auth0Domain}/authorize`);
      authorizeUrl.searchParams.set('response_type', responseType);
      authorizeUrl.searchParams.set('client_id', clientId);
      authorizeUrl.searchParams.set('redirect_uri', redirectUri);
      authorizeUrl.searchParams.set('scope', scope);
      authorizeUrl.searchParams.set('state', encodedState); // Our combined state
      // Nonce should be handled by the SDK during callback validation if possible,
      // or generated here and stored in cookie for validation in afterCallback.

      // Explicitly specify the connection name for the edlucid.io OIDC provider
      const connectionName = process.env.AUTH0_CONNECTION_NAME; // Needs to be configured
      if (connectionName) {
        authorizeUrl.searchParams.set('connection', connectionName);
      } else {
        console.warn(
          'AUTH0_CONNECTION_NAME not set; Auth0 might show login page instead of directly using the OIDC connection.',
        );
        // Optional: Could redirect to an error page if the connection *must* be specified
        // return NextResponse.redirect(new URL('/auth-error?message=Auth0+connection+name+not+configured', req.url));
      }

      console.log(
        `Middleware: Redirecting to Auth0 Authorize: ${authorizeUrl.toString()}`,
      );
      // Set the cookie *before* redirecting
      const redirectResponse = NextResponse.redirect(authorizeUrl);
      redirectResponse.cookies.set(res.cookies.get(CSRF_COOKIE_NAME)!); // Transfer cookie set earlier
      return redirectResponse;
    }

    // If not logged in and no lti_state, block or redirect (adjust as needed)
    console.log('Middleware: No session, no lti_state. Blocking/Redirecting.');
    // Option 1: Redirect to an error/info page
    return NextResponse.redirect(new URL('/lti-required', req.url));
    // Option 2: Show a generic unauthorized page (less ideal)
    // return new NextResponse('Access requires LTI launch', { status: 401 });
  },
  {
    // Define routes that require authentication
    // Protect the resource page and potentially others
    pages: ['/resource'],
    // If you want to protect the root and redirect based on lti_state:
    // pages: ['/', '/resource'],
    // returnTo: '/resource' // Default place to land after login if not specified otherwise
  },
);

// Define which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /lti-required (our info page)
     * - /auth-error (our error page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|lti-required|auth-error).*)',
  ],
};
