import { card } from '../saasBuilderStyles.js';

export default function SaasBuilderHeader({
  activeEvent,
  events,
  eventId,
  status,
  templateSummary,
  onEventChange,
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

        <div className="saas-builder-header-controls" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 6, color: '#cbd5e1', fontSize: 12, fontWeight: 800 }}>
            Active event
            <select
              value={String(eventId)}
              onChange={(event) => onEventChange(event.target.value)}
              style={{
                minWidth: 260,
                border: '1px solid rgba(148, 163, 184, 0.28)',
                borderRadius: 999,
                padding: '12px 14px',
                background: 'rgba(2, 6, 23, 0.78)',
                color: '#f8fafc',
                fontWeight: 800,
                outline: 'none'
              }}
            >
              {events.map((event) => (
                <option key={event.id} value={String(event.id)}>
                  {event.title || event.name || `Event #${event.id}`}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onRefresh}
            style={{ border: 0, borderRadius: 999, padding: '12px 18px', fontWeight: 900, background: '#ec4899', color: 'white', height: 46, marginTop: 22 }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ color: '#94a3b8', fontSize: 13 }}>{status}</div>
      <div style={{ color: '#94a3b8', fontSize: 13 }}>{templateSummary}</div>
    </header>
  );
}
