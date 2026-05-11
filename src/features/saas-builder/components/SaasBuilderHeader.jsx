import { card } from '../saasBuilderStyles.js';

export default function SaasBuilderHeader({
  activeEvent,
  status,
  templateSummary,
  onRefresh
}) {
  return (
    <header style={{ ...card, display: 'grid', gap: 14 }}>
      <div className="saas-builder-header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#f9a8d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
            SaaS Event Builder
          </div>

          <h1 style={{ margin: '8px 0 0', fontSize: 34 }}>
            {activeEvent?.title || 'SaaS Event Builder'}
          </h1>

          <p style={{ color: '#cbd5e1', margin: '8px 0 0' }}>
            Event-builder dashboard powered by customizable SaaS tables. Legacy scoring is untouched.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          style={{ border: 0, borderRadius: 999, padding: '12px 18px', fontWeight: 900, background: '#ec4899', color: 'white', height: 46 }}
        >
          Refresh
        </button>
      </div>

      <div style={{ color: '#94a3b8', fontSize: 13 }}>{status}</div>
      <div style={{ color: '#94a3b8', fontSize: 13 }}>{templateSummary}</div>
    </header>
  );
}
