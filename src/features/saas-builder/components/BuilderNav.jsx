const pages = [
  ['settings', 'Event Settings'],
  ['contestants', 'Contestants'],
  ['judges', 'Judges'],
  ['rounds', 'Rounds & Criteria'],
  ['monitor', 'Scoring Monitor'],
  ['results', 'Results'],
  ['tv', 'TV Display Settings'],
  ['exports', 'PDF / Export Center'],
  ['audit', 'Audit Logs']
];

export default function BuilderNav({ activePage, onChange }) {
  return (
    <nav className="saas-builder-nav" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {pages.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            border: '1px solid rgba(148, 163, 184, 0.24)',
            borderRadius: 999,
            padding: '10px 14px',
            fontWeight: 900,
            background: activePage === key ? '#ec4899' : 'rgba(15, 23, 42, 0.72)',
            color: '#f8fafc'
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
