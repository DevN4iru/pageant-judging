import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';

export default function ResultsPanel({
  snapshots,
  createSnapshot,
  activeEvent,
  scoringResults
}) {
  const overall = scoringResults?.overall || [];
  const rounds = scoringResults?.rounds || [];

  return (
    <Section title="Results">
      <p style={{ color: '#94a3b8' }}>
        Live rankings are generated from the generic SaaS scoring tables. Result snapshots record official declaration moments.
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          type="button"
          onClick={createSnapshot}
          style={{ border: 0, borderRadius: 12, padding: '10px 14px', fontWeight: 900, background: '#22c55e', color: 'white' }}
        >
          Declare / Snapshot Current Results
        </button>

        <a
          href={`?tv=saas&eventId=${activeEvent?.id || 1}`}
          target="_blank"
          rel="noreferrer"
          style={{ borderRadius: 12, padding: '10px 14px', fontWeight: 900, background: '#ec4899', color: 'white', textDecoration: 'none' }}
        >
          Open SaaS TV Results
        </a>
      </div>

      <h3 style={{ marginTop: 0 }}>Overall Live Ranking</h3>
      <MiniTable
        columns={[
          { key: 'rank', label: 'Rank' },
          { key: 'contestant_number', label: '#' },
          { key: 'name', label: 'Contestant' },
          { key: 'total', label: 'Total', render: (row) => Number(row.total || 0).toFixed(2) }
        ]}
        rows={overall}
      />

      <div style={{ display: 'grid', gap: 16, marginTop: 22 }}>
        {rounds.map(({ round, results }) => (
          <div key={round.id} style={{ border: '1px solid rgba(148, 163, 184, 0.16)', borderRadius: 16, padding: 14 }}>
            <h3 style={{ marginTop: 0 }}>{round.name}</h3>
            <MiniTable
              columns={[
                { key: 'rank', label: 'Rank' },
                { key: 'contestant_number', label: '#' },
                { key: 'name', label: 'Contestant' },
                { key: 'total', label: 'Total', render: (row) => Number(row.total || 0).toFixed(2) }
              ]}
              rows={results}
            />
          </div>
        ))}
      </div>

      <h3>Declaration Snapshots</h3>
      <MiniTable
        columns={[
          { key: 'created_at', label: 'Created', render: (row) => new Date(row.created_at).toLocaleString() },
          { key: 'snapshot_type', label: 'Type' },
          { key: 'title', label: 'Title' }
        ]}
        rows={snapshots || []}
      />

      <p style={{ color: '#94a3b8', marginTop: 14 }}>
        Current event: <b>{activeEvent?.title}</b>
      </p>
    </Section>
  );
}
