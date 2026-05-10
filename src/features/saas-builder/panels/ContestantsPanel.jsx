import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';
import { input } from '../saasBuilderStyles.js';

export default function ContestantsPanel({
  contestantForm,
  setContestantForm,
  saving,
  addContestant,
  contestants,
  renameContestant,
  removeContestant
}) {
  return (
    <Section title="Contestants">
      <div className="saas-builder-contestant-form" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto', gap: 12, marginBottom: 16 }}>
        <input
          style={input}
          type="number"
          placeholder="#"
          value={contestantForm.contestantNumber}
          onChange={(e) => setContestantForm({ ...contestantForm, contestantNumber: e.target.value })}
        />

        <input
          style={input}
          placeholder="Contestant name"
          value={contestantForm.name}
          onChange={(e) => setContestantForm({ ...contestantForm, name: e.target.value })}
        />

        <input
          style={input}
          placeholder="Photo URL"
          value={contestantForm.photoUrl}
          onChange={(e) => setContestantForm({ ...contestantForm, photoUrl: e.target.value })}
        />

        <button
          type="button"
          disabled={saving}
          onClick={addContestant}
          style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}
        >
          Add
        </button>
      </div>

      <MiniTable
        columns={[
          { key: 'contestant_number', label: '#' },
          { key: 'name', label: 'Name' },
          { key: 'photo_url', label: 'Photo' },
          { key: 'is_active', label: 'Active', render: (row) => row.is_active ? 'Yes' : 'No' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="saas-builder-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => renameContestant(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>
                  Rename
                </button>

                <button type="button" onClick={() => removeContestant(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>
                  Delete
                </button>
              </div>
            )
          }
        ]}
        rows={contestants}
      />
    </Section>
  );
}
