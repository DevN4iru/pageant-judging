export default function LoadingState({ status }) {
  return (
    <main style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', padding: 32 }}>
      <h1>SaaS Event Builder</h1>
      <p>{status}</p>
    </main>
  );
}
