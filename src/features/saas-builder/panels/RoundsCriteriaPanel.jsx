import MiniTable from '../components/MiniTable.jsx';
import Section from '../components/Section.jsx';
import { input } from '../saasBuilderStyles.js';

export default function RoundsCriteriaPanel({
  roundForm,
  setRoundForm,
  criterionForms,
  updateCriterionForm,
  saving,
  rounds,
  addRound,
  renameRound,
  autoBalanceRoundFromButton,
  toggleRoundLock,
  removeRound,
  addCriterion,
  editCriterion,
  removeCriterion
}) {
  return (
    <Section title="Rounds & Criteria">
      <div className="saas-builder-round-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 180px 140px 180px auto', gap: 12, marginBottom: 16 }}>
        <input
          style={input}
          placeholder="Round name"
          value={roundForm.name}
          onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
        />

        <input
          style={input}
          type="number"
          placeholder="Order"
          value={roundForm.sortOrder}
          onChange={(e) => setRoundForm({ ...roundForm, sortOrder: e.target.value })}
        />

        <select
          style={input}
          value={roundForm.candidatePoolMode}
          onChange={(e) => setRoundForm({ ...roundForm, candidatePoolMode: e.target.value })}
        >
          <option value="all_contestants">All contestants</option>
          <option value="previous_round_advancers">Previous round advancers</option>
          <option value="custom_pool">Custom pool</option>
        </select>

        <input
          style={input}
          type="number"
          placeholder="Top count"
          value={roundForm.advancingCount}
          onChange={(e) => setRoundForm({ ...roundForm, advancingCount: e.target.value })}
        />

        <select
          style={input}
          value={roundForm.scoreCarryMode}
          onChange={(e) => setRoundForm({ ...roundForm, scoreCarryMode: e.target.value })}
        >
          <option value="qualifier_only">Qualifier only</option>
          <option value="round_only">Round only</option>
          <option value="carry_over">Carry over</option>
        </select>

        <button
          type="button"
          disabled={saving}
          onClick={addRound}
          style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}
        >
          Add
        </button>
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {rounds.map((round) => {
          const totalWeight = round.criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
          const isWeightValid = Math.abs(totalWeight - 1) < 0.000001;
          const criterionForm = criterionForms[round.id] || { name: '', weightPercent: '', sortOrder: '' };

          return (
            <div key={round.id} style={{ border: '1px solid rgba(148, 163, 184, 0.18)', borderRadius: 18, padding: 16 }}>
              <div className="saas-builder-round-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{round.name}</h3>
                  <p style={{ color: '#94a3b8', margin: '8px 0 12px' }}>
                    Pool: {round.candidate_pool_mode} • Advancing: {round.advancing_count || 'None'} • Status: {round.is_locked ? 'Locked' : 'Editable'}
                  </p>
                  <p style={{ color: isWeightValid ? '#22c55e' : '#f97316', margin: '0 0 12px', fontWeight: 900 }}>
                    Weight total: {(totalWeight * 100).toFixed(2)}% {isWeightValid ? '✓' : '— must total 100%'}
                  </p>
                </div>

                <div className="saas-builder-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => renameRound(round)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>
                    Rename
                  </button>

                  <button type="button" onClick={() => autoBalanceRoundFromButton(round)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#22c55e', color: 'white' }}>
                    Auto Calculate 100%
                  </button>

                  <button type="button" onClick={() => toggleRoundLock(round)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>
                    {round.is_locked ? 'Unlock' : 'Lock'}
                  </button>

                  <button type="button" onClick={() => removeRound(round)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="saas-builder-criterion-form" style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px auto', gap: 12, margin: '12px 0 16px' }}>
                <input
                  style={input}
                  placeholder="Criterion name"
                  value={criterionForm.name}
                  onChange={(e) => updateCriterionForm(round.id, { name: e.target.value })}
                />

                <input
                  style={input}
                  type="number"
                  placeholder="Weight %"
                  value={criterionForm.weightPercent}
                  onChange={(e) => updateCriterionForm(round.id, { weightPercent: e.target.value })}
                />

                <input
                  style={input}
                  type="number"
                  placeholder="Order"
                  value={criterionForm.sortOrder}
                  onChange={(e) => updateCriterionForm(round.id, { sortOrder: e.target.value })}
                />

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => addCriterion(round)}
                  style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#22c55e', color: 'white' }}
                >
                  Add Criterion
                </button>
              </div>

              <MiniTable
                columns={[
                  { key: 'sort_order', label: 'Order' },
                  { key: 'name', label: 'Criterion' },
                  { key: 'weight', label: 'Weight', render: (row) => `${(Number(row.weight) * 100).toFixed(2)}%` },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row) => (
                      <div className="saas-builder-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => editCriterion(round, row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>
                          Edit
                        </button>

                        <button type="button" onClick={() => removeCriterion(round, row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>
                          Delete
                        </button>
                      </div>
                    )
                  }
                ]}
                rows={round.criteria}
              />
            </div>
          );
        })}
      </div>
    </Section>
  );
}
