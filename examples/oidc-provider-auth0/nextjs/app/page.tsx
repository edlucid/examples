import { getSession } from '@auth0/nextjs-auth0';

export default async function Home() {
  const session = await getSession();

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Auth0 OIDC Provider Sample (via LTI Bridge)</h1>
      <p>This application requires access via an LTI launch.</p>
      {session?.user ? (
        <div>
          <h2>Session Active</h2>
          <p>You are logged in.</p>
          <p>
            <a href="/resource">View Protected Resource</a>
          </p>
          <p>
            <a href="/api/auth/logout">Logout</a>
          </p>
          <h3>User Info</h3>
          <pre style={{ background: '#eee', padding: '1rem' }}>
            {JSON.stringify(session.user, null, 2)}
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
