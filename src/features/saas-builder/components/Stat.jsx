import { card } from '../saasBuilderStyles.js';

export default function Stat({ label, value }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}
