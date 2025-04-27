export default function LtiRequiredPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Access Denied</h1>
      <p>
        This application must be accessed via a valid LTI launch from your
        Learning Management System (LMS).
      </p>
      <p>
        Please return to your LMS and click the LTI link for this application
        again.
      </p>
    </div>
  );
}
