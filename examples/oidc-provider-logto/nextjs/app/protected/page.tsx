import { logtoClient } from '@/lib/logto';

// This page is protected by the middleware

export default async function ProtectedPage() {
  const { claims, userInfo } = await logtoClient.getLogtoContext({
    fetchUserInfo: true,
  });

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Protected Resource Page (Logto)</h1>
      <p>This page is protected and requires authentication via LTI launch.</p>
      <h2>Welcome!</h2>
      <p>You have successfully accessed the resource.</p>
      <p>
        <a href="/api/logto/sign-out">Logout</a>
      </p>
      <h3>Your User Info (from Logto session)</h3>
      <pre style={{ background: '#eee', padding: '1rem' }}>
        {JSON.stringify(userInfo, null, 2)}
      </pre>
      <h3>Your Claims (from Logto session)</h3>
      <pre style={{ background: '#eee', padding: '1rem' }}>
        {JSON.stringify(claims, null, 2)}
      </pre>
    </main>
  );
}
