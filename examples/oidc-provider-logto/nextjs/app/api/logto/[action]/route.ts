import { logtoClient } from '@/lib/logto';
import { type NextRequest } from 'next/server';

// Ensure all request methods are handled
export const GET = async (
  request: NextRequest,
  { params }: { params: { action: string } },
) => {
  const { action } = params;

  // The 'sign-in' action is now initiated directly by the middleware redirecting to Logto's /authorize.
  // We only need to handle the callback and sign-out here.
  if (action === 'callback') {
    console.log('Logto Callback Route: Handling callback via SDK...');
    // Default handler should establish the session cookie.
    // CSRF/State validation happens in middleware *after* this redirects.
    return logtoClient.handleAuthRoutes({ action })(request);
  } else if (action === 'sign-out') {
    console.log('Logto Sign-out Route: Handling sign-out via SDK...');
    return logtoClient.handleAuthRoutes({ action })(request);
  } else {
    // Optional: Handle other potential actions or return 404/error
    console.warn(`Logto API Route: Unhandled action "${action}"`);
    return new Response('Not Found', { status: 404 });
  }
};

export const POST = async (
  request: NextRequest,
  { params }: { params: { action: string } },
) => {
  // OIDC flows typically use GET for callback, but handle POST if necessary for sign-out or other actions.
  const { action } = params;
  if (action === 'callback' || action === 'sign-out') {
    return logtoClient.handleAuthRoutes({ action: params.action })(request);
  }
  console.warn(`Logto API Route: Unhandled POST action "${action}"`);
  return new Response('Not Found', { status: 404 });
};
