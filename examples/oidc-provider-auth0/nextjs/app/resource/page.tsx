import { redirect } from 'next/navigation';
import { auth0 } from '../../lib/auth0';

// Helper function to render a simple page (can be moved to a separate component file)
function MessagePage({ title, message }: { title: string; message: string }) {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>{title}</h1>
      <p>{message}</p>
      <p><a href="/">Go to Home</a></p>
    </div>
  );
}

export default async function ResourcePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await auth0.getSession();
  const ltiState = searchParams?.lti_state;
  const ltiStateString = Array.isArray(ltiState) ? ltiState[0] : ltiState;

  if (session) {
    let message = `Welcome, ${session.user.name || session.user.nickname || 'user'}! You are already logged in.`;
    if (ltiStateString) {
      message += ` LTI State received: ${ltiStateString}.`;
    }
    // You might want to redirect to a profile page or the actual resource here
    // instead of just showing a message.
    return (
      <MessagePage 
        title="Session Active"
        message={message}
      />
    );
  }

  // No session, proceed with LTI state check and login initiation
  if (!ltiStateString) {
    return (
      <MessagePage 
        title="Login Required"
        message="No active session and no lti_state parameter found. Please log in or ensure lti_state is provided."
      />
    );
    // Alternatively, redirect to a generic login page or home:
    // return redirect('/?error=missing_lti_state_or_session');
  }

  const baseUrl = process.env.AUTH0_BASE_URL || 'http://localhost:3000';
  const loginUrl = new URL('/auth/login', baseUrl);

  loginUrl.searchParams.set('returnTo', '/resource'); // Or your desired returnTo after login
  loginUrl.searchParams.set('login_hint', ltiStateString);
  loginUrl.searchParams.set('connection', process.env.AUTH0_CONNECTION_NAME || 'edlucid-idp');
  
  redirect(loginUrl.toString());

  // This part will not be reached due to the redirect or direct render,
  // but Next.js expects a component to return JSX or null if not redirecting.
  return null;
} 