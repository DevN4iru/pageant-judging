import { card } from '../saasBuilderStyles.js';

export default function Section({ title, children }) {
  return (
    <section className="saas-builder-section" style={card}>
      <h2 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: 22 }}>{title}</h2>
      {children}
    </section>
  );
}
