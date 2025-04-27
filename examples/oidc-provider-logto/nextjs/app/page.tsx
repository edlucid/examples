import { logtoClient } from '@/lib/logto';

export default async function Home() {
  const { isAuthenticated, claims, userInfo } =
    await logtoClient.getLogtoContext({ fetchUserInfo: true });

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Logto OIDC Provider Sample (via LTI Bridge)</h1>
      <p>This application requires access via an LTI launch.</p>
      {isAuthenticated ? (
        <div>
          <h2>Session Active</h2>
          <p>You are logged in.</p>
          <p>
            <a href="/protected">View Protected Resource</a>
          </p>
          <p>
            <a href="/api/logto/sign-out">Sign Out</a>
          </p>
          <h2>User Info</h2>
          <pre style={{ background: '#eee', padding: '1rem' }}>
            {JSON.stringify(userInfo, null, 2)}
          </pre>
          <h2>Claims</h2>
          <pre style={{ background: '#eee', padding: '1rem' }}>
            {JSON.stringify(claims, null, 2)}
          </pre>
        </div>
      ) : (
        <p>
          You are not logged in. Please access this application through an LTI
          link from your Learning Management System.
        </p>
      )}
    </main>
  );
}
