import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';

export default function ScoringMonitorPanel({ monitor, onRefresh }) {
  const counts = monitor?.counts || {};

  return (
    <Section title="Scoring Monitor">
      <div className="saas-builder-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        <div>Active contestants<br /><b>{counts.active_contestants || 0}</b></div>
        <div>Enabled judges<br /><b>{counts.enabled_judges || 0}</b></div>
        <div>Score rows<br /><b>{counts.score_rows || 0}</b></div>
        <div>Submissions<br /><b>{counts.submissions || 0}</b></div>
      </div>

      <button type="button" onClick={onRefresh} style={{ border: 0, borderRadius: 12, padding: '10px 14px', fontWeight: 900, background: '#ec4899', color: 'white', marginBottom: 12 }}>
        Refresh Monitor
      </button>

      <MiniTable
        columns={[
          { key: 'sort_order', label: 'Order' },
          { key: 'name', label: 'Round' },
          { key: 'criteria_count', label: 'Criteria' },
          { key: 'submission_count', label: 'Submissions' },
          { key: 'score_count', label: 'Scores' },
          { key: 'is_locked', label: 'Lock', render: (row) => row.is_locked ? 'Locked' : 'Open' }
        ]}
        rows={monitor?.rounds || []}
      />
    </Section>
  );
}
