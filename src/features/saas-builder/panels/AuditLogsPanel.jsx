import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';

export default function AuditLogsPanel({ auditLogs }) {
  return (
    <Section title="Audit Logs">
      <MiniTable
        columns={[
          {
            key: 'created_at',
            label: 'Time',
            render: (row) => new Date(row.created_at).toLocaleString()
          },
          { key: 'action_type', label: 'Action' },
          { key: 'target_type', label: 'Target' },
          { key: 'reason', label: 'Reason' }
        ]}
        rows={auditLogs}
      />
    </Section>
  );
}
