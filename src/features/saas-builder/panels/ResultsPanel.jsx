import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';

export default function ResultsPanel({ snapshots, createSnapshot, activeEvent }) {
  return (
    <Section title="Results">
      <p style={{ color: '#94a3b8' }}>
        Result snapshots are separated from live scoring. Use this to record a declaration/final result moment with audit trail.
      </p>

      <button
        type="button"
        onClick={createSnapshot}
        style={{ border: 0, borderRadius: 12, padding: '10px 14px', fontWeight: 900, background: '#22c55e', color: 'white', marginBottom: 12 }}
      >
        Create Result Snapshot
      </button>

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
