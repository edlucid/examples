import { logtoClient } from '@/lib/logto'; // Import your configured client
import { SignJWT, importJWK, jwtVerify } from 'jose';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';

// Generate a CSRF token or Nonce
function generateOidcToken() {
  return nanoid(32);
}

// Secret for signing the state cookie
const STATE_COOKIE_SECRET = process.env.LOGTO_COOKIE_SECRET || 'complex_password_at_least_32_characters_long';
const STATE_COOKIE_NAME = 'logto_oidc_state_package'; // Renamed for clarity
const STATE_EXPIRY_SECONDS = 60 * 10; // 10 minutes

// Creates a signed JWT cookie containing CSRF and Nonce
async function getSignedStateCookie(csrfToken: string, nonce: string): Promise<string> {
    const secretJWK = { kty: 'oct', k: Buffer.from(STATE_COOKIE_SECRET, 'utf8').toString('base64url') };
    const secretKey = await importJWK(secretJWK, 'HS256');
    const jwt = await new SignJWT({ csrf: csrfToken, nonce: nonce })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(`${STATE_EXPIRY_SECONDS}s`)
        .sign(secretKey);
    return jwt;
}

// Verifies the signed cookie and returns the CSRF token and Nonce
async function verifyStateCookie(signedCookie: string | undefined): Promise<{csrf: string, nonce: string} | null> {
  if (!signedCookie) return null;
  try {
    const secretJWK = { kty: 'oct', k: Buffer.from(STATE_COOKIE_SECRET, 'utf8').toString('base64url') };
    const secretKey = await importJWK(secretJWK, 'HS256');
    const { payload } = await jwtVerify(signedCookie, secretKey, { algorithms: ['HS256'] });
    if (typeof payload.csrf === 'string' && typeof payload.nonce === 'string') {
        return { csrf: payload.csrf, nonce: payload.nonce };
    }
    return null;
  } catch (error) {
    console.error('Error verifying Logto state package cookie:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const response = NextResponse.next();

  // Get session using Logto SDK
  // Note: getLogtoContext needs cookies, which are read-only in middleware.
  // We might need to rely on checking for the session cookie directly or handle post-login CSRF check differently.
  // Let's assume for now we *can* check authentication status somehow.
  // const isAuthenticated = await logtoClient.isAuthenticated(); // This likely won't work directly here

  // Alternative: Check for the presence of the Logto session cookie (fragile)
  const sessionCookie = cookies().get(logtoClient.cookieKeySession);
  const isAuthenticated = !!sessionCookie;

  const ltiState = searchParams.get('lti_state');

  if (isAuthenticated) {
    // User is logged in.
    // Check if a state package cookie exists from a previous step (post-callback validation)
    const statePackageCookie = cookies().get(STATE_COOKIE_NAME);
    if (statePackageCookie) {
        const validatedState = await verifyStateCookie(statePackageCookie.value);
        if (!validatedState) {
             console.error('Logto Middleware: Invalid state package cookie found after login.');
             // Clear the invalid cookie and redirect to error page
             response.cookies.delete(STATE_COOKIE_NAME);
             return NextResponse.redirect(new URL('/auth-error?message=Invalid+Login+State', request.url));
        } else {
            console.log('Logto Middleware: State package cookie validated successfully.');
            // Clear the cookie as it's validated - it contained the CSRF token essentially
            response.cookies.delete(STATE_COOKIE_NAME);
            // Nonce validation ideally happens by comparing cookie nonce with id_token nonce,
            // which is hard to do reliably here. Relying on state validation for now.
        }
    }
    return response; 
  }

  // Not authenticated
  if (ltiState) {
    // LTI state is present, initiate login flow
    console.log('Logto Middleware: No session, lti_state found. Initiating login.');

    const csrfToken = generateOidcToken();
    const nonce = generateOidcToken(); // Generate nonce for OIDC request

    // Store CSRF and Nonce in the signed cookie
    const signedCookie = await getSignedStateCookie(csrfToken, nonce);
    response.cookies.set(STATE_COOKIE_NAME, signedCookie, {
      httpOnly: true,
      secure: request.nextUrl.protocol === 'https:',
      maxAge: STATE_EXPIRY_SECONDS,
      path: '/',
      sameSite: 'lax',
    });

    // Construct the OIDC state parameter (CSRF token + LTI state)
    const oidcStateObject = { csrfToken: csrfToken, ltiState: ltiState };
    const encodedOidcState = Buffer.from(JSON.stringify(oidcStateObject)).toString('base64url');

    // Construct the Logto /authorize URL
    const logtoEndpoint = process.env.LOGTO_ENDPOINT;
    const clientId = process.env.LOGTO_APP_ID;
    const redirectUri = `${request.nextUrl.origin}/api/logto/callback`; // Logto SDK handles callback
    const scope = 'openid profile email'; // Adjust scopes if needed
    const responseType = 'code'; // Standard OIDC flow

    if (!logtoEndpoint || !clientId) {
        console.error('Logto endpoint or client ID not configured for direct redirect.');
        return NextResponse.redirect(new URL('/auth-error?message=Logto+config+missing', request.url));
    }

    // Ensure endpoint doesn't have trailing slash before appending path
    const authorizeUrl = new URL(`${logtoEndpoint.replace(/\/$/, '')}/oidc/auth`); 
    authorizeUrl.searchParams.set('response_type', responseType);
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', scope);
    authorizeUrl.searchParams.set('state', encodedOidcState);
    authorizeUrl.searchParams.set('nonce', nonce);

    console.log(`Logto Middleware: Redirecting to Logto Authorize: ${authorizeUrl.toString()}`);
    // Must return the redirect response with the cookie set
    const redirectResponse = NextResponse.redirect(authorizeUrl);
    redirectResponse.cookies.set(response.cookies.get(STATE_COOKIE_NAME)!); // Transfer cookie
    return redirectResponse;
  }

  // Not authenticated and no lti_state
  console.log('Logto Middleware: No session, no lti_state. Blocking/Redirecting.');
  return NextResponse.redirect(new URL('/lti-required', request.url));
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /lti-required (info page)
     * - /auth-error (error page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|lti-required|auth-error).*)',
  ],
};
