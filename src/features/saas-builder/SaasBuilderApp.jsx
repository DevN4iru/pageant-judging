import React, { useEffect, useMemo, useState } from 'react';
import {
  createContestant,
  createJudge,
  createRound,
  createCriterion,
  deleteContestant,
  deleteCriterion,
  deleteJudge,
  deleteRound,
  getAuditLogs,
  getBuilder,
  getEvents,
  getTemplates,
  setJudgePin,
  updateContestant,
  updateCriterion,
  updateEventSettings,
  updateJudge,
  updateRound
} from './saasBuilderApi.js';
import './saasBuilder.css';

const card = {
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: 'rgba(15, 23, 42, 0.72)',
  borderRadius: 22,
  padding: 20,
  boxShadow: '0 22px 70px rgba(0,0,0,0.25)'
};

const input = {
  width: '100%',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  borderRadius: 14,
  padding: '12px 14px',
  background: 'rgba(2, 6, 23, 0.66)',
  color: '#f8fafc',
  outline: 'none'
};

const label = {
  display: 'grid',
  gap: 8,
  color: '#cbd5e1',
  fontSize: 13,
  fontWeight: 700
};

function Stat({ label, value }) {
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="saas-builder-section" style={card}>
      <h2 style={{ margin: '0 0 16px', color: '#f8fafc', fontSize: 22 }}>{title}</h2>
      {children}
    </section>
  );
}

function MiniTable({ columns, rows }) {
  return (
    <div className="saas-builder-table-wrap" style={{ overflowX: 'auto' }}>
      <table className="saas-builder-table" style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ textAlign: 'left', padding: '10px 8px', color: '#94a3b8', fontSize: 12 }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} style={{ borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
              {columns.map((column) => (
                <td key={column.key} style={{ padding: '12px 8px', fontSize: 14 }}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SaasBuilderApp() {
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [builder, setBuilder] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [eventId, setEventId] = useState('1');
  const [settings, setSettings] = useState({});
  const [contestantForm, setContestantForm] = useState({ contestantNumber: '', name: '', photoUrl: '' });
  const [judgeForm, setJudgeForm] = useState({ name: '', displayOrder: '', pin: '' });
  const [roundForm, setRoundForm] = useState({
    name: '',
    sortOrder: '',
    candidatePoolMode: 'all_contestants',
    advancingCount: '',
    scoreCarryMode: 'qualifier_only'
  });
  const [criterionForms, setCriterionForms] = useState({});
  const [status, setStatus] = useState('Loading builder...');
  const [saving, setSaving] = useState(false);

  async function refresh(selectedEventId = eventId) {
    setStatus('Loading builder...');

    const [templateData, eventData, builderData, auditData] = await Promise.all([
      getTemplates(),
      getEvents(),
      getBuilder(selectedEventId),
      getAuditLogs(selectedEventId)
    ]);

    setTemplates(templateData);
    setEvents(eventData);
    setBuilder(builderData);
    setAuditLogs(auditData);
    setSettings({
      title: builderData.event.title || '',
      organizationName: builderData.event.organization_name || '',
      logoUrl: builderData.event.logo_url || '',
      themeColor: builderData.event.theme_color || '',
      tvDisplayTitle: builderData.event.tv_display_title || '',
      pdfFooter: builderData.event.pdf_footer || '',
      preparedByText: builderData.event.prepared_by_text || '',
      developerCredits: builderData.event.developer_credits || '',
      advancingCount: builderData.event.advancing_count || 3,
      scoreCarryMode: builderData.event.score_carry_mode || 'qualifier_only'
    });

    setStatus('Builder loaded');
  }

  useEffect(() => {
    refresh('1').catch((err) => setStatus(err.message));
  }, []);

  const activeEvent = builder?.event;

  const templateSummary = useMemo(() => {
    return templates.map((template) => `${template.name}: ${template.rounds?.length || 0} round(s)`).join(' • ');
  }, [templates]);

  async function saveSettings() {
    setSaving(true);
    setStatus('Saving settings...');

    try {
      await updateEventSettings(eventId, {
        ...settings,
        advancingCount: Number(settings.advancingCount)
      });
      await refresh(eventId);
      setStatus('Event settings saved');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addContestant() {
    setSaving(true);
    setStatus('Adding contestant...');

    try {
      await createContestant(eventId, {
        contestantNumber: Number(contestantForm.contestantNumber),
        name: contestantForm.name,
        photoUrl: contestantForm.photoUrl || null,
        details: {}
      });
      setContestantForm({ contestantNumber: '', name: '', photoUrl: '' });
      await refresh(eventId);
      setStatus('Contestant added');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function renameContestant(contestant) {
    const nextName = window.prompt('New contestant name:', contestant.name);

    if (!nextName) {
      return;
    }

    setSaving(true);
    setStatus('Updating contestant...');

    try {
      await updateContestant(eventId, contestant.id, { name: nextName });
      await refresh(eventId);
      setStatus('Contestant updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeContestant(contestant) {
    if (!window.confirm(`Delete ${contestant.name}?`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting contestant...');

    try {
      await deleteContestant(eventId, contestant.id);
      await refresh(eventId);
      setStatus('Contestant deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addJudge() {
    setSaving(true);
    setStatus('Adding judge...');

    try {
      const result = await createJudge(eventId, {
        name: judgeForm.name,
        displayOrder: Number(judgeForm.displayOrder || builder.judges.length + 1),
        isEnabled: true
      });

      if (judgeForm.pin) {
        await setJudgePin(eventId, result.judge.id, judgeForm.pin);
      }

      setJudgeForm({ name: '', displayOrder: '', pin: '' });
      await refresh(eventId);
      setStatus('Judge added');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleJudge(judge) {
    setSaving(true);
    setStatus('Updating judge...');

    try {
      await updateJudge(eventId, judge.id, { isEnabled: !judge.is_enabled });
      await refresh(eventId);
      setStatus('Judge updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function resetJudgePin(judge) {
    const pin = window.prompt(`New PIN for ${judge.name}:`);

    if (!pin) {
      return;
    }

    setSaving(true);
    setStatus('Resetting judge PIN...');

    try {
      await setJudgePin(eventId, judge.id, pin);
      await refresh(eventId);
      setStatus('Judge PIN reset');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeJudge(judge) {
    if (!window.confirm(`Delete ${judge.name}?`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting judge...');

    try {
      await deleteJudge(eventId, judge.id);
      await refresh(eventId);
      setStatus('Judge deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }


  function updateCriterionForm(roundId, patch) {
    setCriterionForms((current) => ({
      ...current,
      [roundId]: {
        name: '',
        weightPercent: '',
        sortOrder: '',
        ...(current[roundId] || {}),
        ...patch
      }
    }));
  }

  async function addRound() {
    setSaving(true);
    setStatus('Adding round...');

    try {
      await createRound(eventId, {
        name: roundForm.name,
        sortOrder: Number(roundForm.sortOrder || builder.rounds.length + 1),
        candidatePoolMode: roundForm.candidatePoolMode,
        advancingCount: roundForm.advancingCount === '' ? null : Number(roundForm.advancingCount),
        scoreCarryMode: roundForm.scoreCarryMode
      });

      setRoundForm({
        name: '',
        sortOrder: '',
        candidatePoolMode: 'all_contestants',
        advancingCount: '',
        scoreCarryMode: 'qualifier_only'
      });

      await refresh(eventId);
      setStatus('Round added');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function renameRound(round) {
    const nextName = window.prompt('New round name:', round.name);

    if (!nextName) {
      return;
    }

    setSaving(true);
    setStatus('Updating round...');

    try {
      await updateRound(eventId, round.id, { name: nextName });
      await refresh(eventId);
      setStatus('Round updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRoundLock(round) {
    setSaving(true);
    setStatus(round.is_locked ? 'Unlocking round...' : 'Locking round...');

    try {
      await updateRound(eventId, round.id, { isLocked: !round.is_locked });
      await refresh(eventId);
      setStatus(round.is_locked ? 'Round unlocked' : 'Round locked');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeRound(round) {
    if (!window.confirm(`Delete ${round.name}? Criteria inside this round will also be deleted.`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting round...');

    try {
      await deleteRound(eventId, round.id);
      await refresh(eventId);
      setStatus('Round deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function addCriterion(round) {
    const form = criterionForms[round.id] || {};

    setSaving(true);
    setStatus('Adding criterion...');

    try {
      await createCriterion(eventId, round.id, {
        name: form.name,
        weight: Number(form.weightPercent) / 100,
        sortOrder: Number(form.sortOrder || round.criteria.length + 1)
      });

      updateCriterionForm(round.id, { name: '', weightPercent: '', sortOrder: '' });
      await refresh(eventId);
      setStatus('Criterion added');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function editCriterion(round, criterion) {
    const nextName = window.prompt('Criterion name:', criterion.name);

    if (!nextName) {
      return;
    }

    const nextWeight = window.prompt('Weight percent:', String(Number(criterion.weight) * 100));

    if (!nextWeight) {
      return;
    }

    setSaving(true);
    setStatus('Updating criterion...');

    try {
      await updateCriterion(eventId, round.id, criterion.id, {
        name: nextName,
        weight: Number(nextWeight) / 100
      });

      await refresh(eventId);
      setStatus('Criterion updated');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeCriterion(round, criterion) {
    if (!window.confirm(`Delete ${criterion.name}?`)) {
      return;
    }

    setSaving(true);
    setStatus('Deleting criterion...');

    try {
      await deleteCriterion(eventId, round.id, criterion.id);
      await refresh(eventId);
      setStatus('Criterion deleted');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }


  if (!builder) {
    return (
      <main style={{ minHeight: '100vh', background: '#020617', color: '#f8fafc', padding: 32 }}>
        <h1>SaaS Event Builder</h1>
        <p>{status}</p>
      </main>
    );
  }

  return (
    <main className="saas-builder-shell" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617, #111827 45%, #3b0764)', color: '#f8fafc', padding: 28 }}>
      <div className="saas-builder-page" style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 22 }}>
        <header style={{ ...card, display: 'grid', gap: 14 }}>
          <div className="saas-builder-header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#f9a8d4', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
                SaaS Event Builder
              </div>
              <h1 style={{ margin: '8px 0 0', fontSize: 34 }}>{activeEvent.title}</h1>
              <p style={{ color: '#cbd5e1', margin: '8px 0 0' }}>
                Event-builder dashboard powered by customizable SaaS tables. Legacy scoring is untouched.
              </p>
            </div>
            <button
              type="button"
              onClick={() => refresh(eventId)}
              style={{ border: 0, borderRadius: 999, padding: '12px 18px', fontWeight: 900, background: '#ec4899', color: 'white', height: 46 }}
            >
              Refresh
            </button>
          </div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>{status}</div>
          <div style={{ color: '#94a3b8', fontSize: 13 }}>{templateSummary}</div>
        </header>

        <div className="saas-builder-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
          <Stat label="Contestants" value={builder.contestants.length} />
          <Stat label="Judges" value={builder.judges.length} />
          <Stat label="Rounds" value={builder.rounds.length} />
          <Stat label="Templates" value={templates.length} />
        </div>

        <Section title="Event Settings">
          <div className="saas-builder-settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            <label style={label}>Event title<input style={input} value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} /></label>
            <label style={label}>Organization name<input style={input} value={settings.organizationName} onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })} /></label>
            <label style={label}>Logo URL<input style={input} value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} /></label>
            <label style={label}>Theme color<input style={input} value={settings.themeColor} onChange={(e) => setSettings({ ...settings, themeColor: e.target.value })} /></label>
            <label style={label}>TV display title<input style={input} value={settings.tvDisplayTitle} onChange={(e) => setSettings({ ...settings, tvDisplayTitle: e.target.value })} /></label>
            <label style={label}>Top / advancing count<input style={input} type="number" value={settings.advancingCount} onChange={(e) => setSettings({ ...settings, advancingCount: e.target.value })} /></label>
            <label style={label}>PDF footer<input style={input} value={settings.pdfFooter} onChange={(e) => setSettings({ ...settings, pdfFooter: e.target.value })} /></label>
            <label style={label}>Prepared by<input style={input} value={settings.preparedByText} onChange={(e) => setSettings({ ...settings, preparedByText: e.target.value })} /></label>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={saveSettings}
            style={{ marginTop: 16, border: 0, borderRadius: 14, padding: '12px 18px', fontWeight: 900, background: saving ? '#64748b' : '#22c55e', color: 'white' }}
          >
            {saving ? 'Saving...' : 'Save Event Settings'}
          </button>
        </Section>

        <Section title="Contestants">
          <div className="saas-builder-contestant-form" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr auto', gap: 12, marginBottom: 16 }}>
            <input style={input} type="number" placeholder="#" value={contestantForm.contestantNumber} onChange={(e) => setContestantForm({ ...contestantForm, contestantNumber: e.target.value })} />
            <input style={input} placeholder="Contestant name" value={contestantForm.name} onChange={(e) => setContestantForm({ ...contestantForm, name: e.target.value })} />
            <input style={input} placeholder="Photo URL" value={contestantForm.photoUrl} onChange={(e) => setContestantForm({ ...contestantForm, photoUrl: e.target.value })} />
            <button type="button" disabled={saving} onClick={addContestant} style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}>Add</button>
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
                    <button type="button" onClick={() => renameContestant(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>Rename</button>
                    <button type="button" onClick={() => removeContestant(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>Delete</button>
                  </div>
                )
              }
            ]}
            rows={builder.contestants}
          />
        </Section>

        <Section title="Judges">
          <div className="saas-builder-judge-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px auto', gap: 12, marginBottom: 16 }}>
            <input style={input} placeholder="Judge name" value={judgeForm.name} onChange={(e) => setJudgeForm({ ...judgeForm, name: e.target.value })} />
            <input style={input} type="number" placeholder="Order" value={judgeForm.displayOrder} onChange={(e) => setJudgeForm({ ...judgeForm, displayOrder: e.target.value })} />
            <input style={input} placeholder="PIN" value={judgeForm.pin} onChange={(e) => setJudgeForm({ ...judgeForm, pin: e.target.value })} />
            <button type="button" disabled={saving} onClick={addJudge} style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}>Add</button>
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
                    <button type="button" onClick={() => toggleJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>{row.is_enabled ? 'Disable' : 'Enable'}</button>
                    <button type="button" onClick={() => resetJudgePin(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>Reset PIN</button>
                    <button type="button" onClick={() => removeJudge(row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>Delete</button>
                  </div>
                )
              }
            ]}
            rows={builder.judges}
          />
        </Section>

        <Section title="Rounds & Criteria">
          <div className="saas-builder-round-form" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 180px 140px 180px auto', gap: 12, marginBottom: 16 }}>
            <input style={input} placeholder="Round name" value={roundForm.name} onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })} />
            <input style={input} type="number" placeholder="Order" value={roundForm.sortOrder} onChange={(e) => setRoundForm({ ...roundForm, sortOrder: e.target.value })} />
            <select style={input} value={roundForm.candidatePoolMode} onChange={(e) => setRoundForm({ ...roundForm, candidatePoolMode: e.target.value })}>
              <option value="all_contestants">All contestants</option>
              <option value="previous_round_advancers">Previous round advancers</option>
              <option value="custom_pool">Custom pool</option>
            </select>
            <input style={input} type="number" placeholder="Top count" value={roundForm.advancingCount} onChange={(e) => setRoundForm({ ...roundForm, advancingCount: e.target.value })} />
            <select style={input} value={roundForm.scoreCarryMode} onChange={(e) => setRoundForm({ ...roundForm, scoreCarryMode: e.target.value })}>
              <option value="qualifier_only">Qualifier only</option>
              <option value="round_only">Round only</option>
              <option value="carry_over">Carry over</option>
            </select>
            <button type="button" disabled={saving} onClick={addRound} style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#ec4899', color: 'white' }}>Add</button>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {builder.rounds.map((round) => {
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
                      <button type="button" onClick={() => renameRound(round)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>Rename</button>
                      <button type="button" onClick={() => toggleRoundLock(round)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>{round.is_locked ? 'Unlock' : 'Lock'}</button>
                      <button type="button" onClick={() => removeRound(round)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>Delete</button>
                    </div>
                  </div>

                  <div className="saas-builder-criterion-form" style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px auto', gap: 12, margin: '12px 0 16px' }}>
                    <input style={input} placeholder="Criterion name" value={criterionForm.name} onChange={(e) => updateCriterionForm(round.id, { name: e.target.value })} />
                    <input style={input} type="number" placeholder="Weight %" value={criterionForm.weightPercent} onChange={(e) => updateCriterionForm(round.id, { weightPercent: e.target.value })} />
                    <input style={input} type="number" placeholder="Order" value={criterionForm.sortOrder} onChange={(e) => updateCriterionForm(round.id, { sortOrder: e.target.value })} />
                    <button type="button" disabled={saving} onClick={() => addCriterion(round)} style={{ border: 0, borderRadius: 14, padding: '12px 16px', fontWeight: 900, background: '#22c55e', color: 'white' }}>Add Criterion</button>
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
                            <button type="button" onClick={() => editCriterion(round, row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800 }}>Edit</button>
                            <button type="button" onClick={() => removeCriterion(round, row)} style={{ border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 800, background: '#ef4444', color: 'white' }}>Delete</button>
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

        <Section title="Audit Logs">
          <MiniTable
            columns={[
              { key: 'created_at', label: 'Time', render: (row) => new Date(row.created_at).toLocaleString() },
              { key: 'action_type', label: 'Action' },
              { key: 'target_type', label: 'Target' },
              { key: 'reason', label: 'Reason' }
            ]}
            rows={auditLogs}
          />
        </Section>

        <footer style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          Open legacy app normally. Open builder with <b>?builder=saas</b>.
        </footer>
      </div>
    </main>
  );
}
