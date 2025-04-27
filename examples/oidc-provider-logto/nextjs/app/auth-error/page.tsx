import React from 'react';

export default function AuthErrorPage({ searchParams }: { searchParams: { message?: string }}) {
  const errorMessage = searchParams.message || 'An unknown authentication error occurred.';

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', color: 'red' }}>
      <h1>Authentication Error</h1>
      <p>An error occurred during the authentication process:</p>
      <pre style={{ background: '#fee', padding: '1rem', border: '1px solid red' }}>
        {decodeURIComponent(errorMessage)}
      </pre>
      <p>
        Please try accessing the application again from your LMS. If the problem persists, contact support.
      </p>
    </div>
  );
} 