'use client'; // Keep client component for reading searchParams initially

import { useUser } from '@auth0/nextjs-auth0/client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ResourcePage() {
  const { user, error, isLoading } = useUser();
  const searchParams = useSearchParams();
  const ltiState = searchParams.get('lti_state');

  // Note: The actual authentication trigger now happens in middleware
  // This page just displays content once the middleware allows access.

  useEffect(() => {
    // You could potentially use ltiState here if needed after authentication,
    // e.g., to fetch specific context, but it's primarily for the login flow.
    if (ltiState) {
      console.log('Resource Page: lti_state found in URL:', ltiState);
    }
  }, [ltiState]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error.message}</div>;

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Protected Resource Page</h1>
      <p>This page is protected and requires authentication via LTI launch.</p>
      {user ? (
        <div>
          <h2>Welcome, {user.name}!</h2>
          <p>You have successfully accessed the resource.</p>
          <p>
            Your LTI State during launch was:{' '}
            {ltiState || 'Not found in current URL'}
          </p>
          <p>
            <a href="/api/auth/logout">Logout</a>
          </p>
          <h3>Your User Info (from Auth0 session)</h3>
          <pre style={{ background: '#eee', padding: '1rem' }}>
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      ) : (
        <p>
          You do not seem to be logged in. Access should be initiated via LTI.
        </p>
      )}
    </main>
  );
}
