import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';
import { input } from '../saasBuilderStyles.js';

export default function JudgesPanel({
  judgeForm,
  setJudgeForm,
  saving,
  addJudge,
  judges,
  toggleJudge,
  resetJudgePin,
  removeJudge
}) {
  return (
    <Section title="Judges">
      <div className="saas-builder-judge-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px auto', gap: 12, marginBottom: 16 }}>
        <input
          style={input}
          placeholder="Judge name"
          value={judgeForm.name}
          onChange={(e) => setJudgeForm({ ...judgeForm, name: e.target.value })}
        />

        <input
          style={input}
          type="number"
          placeholder="Order"
          value={judgeForm.displayOrder}
          onChange={(e) => setJudgeForm({ ...judgeForm, displayOrder: e.target.value })}
        />

        <input
          style={input}
          placeholder="PIN"
          value={judgeForm.pin}
          onChange={(e) => setJudgeForm({ ...judgeForm, pin: e.target.value })}
        />

        <button
          type="button"
          disabled={saving}
          onClick={addJudge}
          style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}
        >
          Add
        </button>
      </div>

      <MiniTable
        columns={[
          { key: 'display_order', label: 'Order' },
          { key: 'name', label: 'Name' },
          { key: 'is_enabled', label: 'Enabled', render: (row) => row.is_enabled ? 'Yes' : 'No' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="saas-builder-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => toggleJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>
                  {row.is_enabled ? 'Disable' : 'Enable'}
                </button>

                <button type="button" onClick={() => resetJudgePin(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>
                  Reset PIN
                </button>

                <button type="button" onClick={() => removeJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>
                  Delete
                </button>
              </div>
            )
          }
        ]}
        rows={judges}
      />
    </Section>
  );
}
