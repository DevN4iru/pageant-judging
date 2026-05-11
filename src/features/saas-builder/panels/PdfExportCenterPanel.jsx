import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';

export default function PdfExportCenterPanel({ pdfExports, createPdfExportLog }) {
  return (
    <Section title="PDF / Export Center">
      <p style={{ color: '#94a3b8' }}>
        This records PDF/export generation in SaaS tables and audit logs. Actual PDF rendering can be wired after the result engine is finalized.
      </p>

      <button type="button" onClick={createPdfExportLog} style={{ border: 0, borderRadius: 12, padding: '10px 14px', fontWeight: 900, background: '#22c55e', color: 'white', marginBottom: 12 }}>
        Log Export Generation
      </button>

      <MiniTable
        columns={[
          { key: 'generated_at', label: 'Generated', render: (row) => new Date(row.generated_at).toLocaleString() },
          { key: 'export_type', label: 'Type' },
          { key: 'title', label: 'Title' },
          { key: 'prepared_by_text', label: 'Prepared by' }
        ]}
        rows={pdfExports || []}
      />
    </Section>
  );
}
