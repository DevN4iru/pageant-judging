import React, { useState } from 'react';
import {
  createContestant,
  createJudge,
  createRound,
  createCriterion,
  deleteContestant,
  deleteCriterion,
  deleteJudge,
  deleteRound,
  setJudgePin,
  updateContestant,
  updateCriterion,
  updateEventSettings,
  updateJudge,
  updateRound
} from './saasBuilderApi.js';
import './saasBuilder.css';
import { card } from './saasBuilderStyles.js';
import Stat from './components/Stat.jsx';
import EventSettingsPanel from './panels/EventSettingsPanel.jsx';
import ContestantsPanel from './panels/ContestantsPanel.jsx';
import JudgesPanel from './panels/JudgesPanel.jsx';
import AuditLogsPanel from './panels/AuditLogsPanel.jsx';
import RoundsCriteriaPanel from './panels/RoundsCriteriaPanel.jsx';
import useSaasBuilderData from './hooks/useSaasBuilderData.js';


export default function SaasBuilderApp() {
  const {
    templates,
    events,
    builder,
    auditLogs,
    eventId,
    setEventId,
    settings,
    setSettings,
    status,
    setStatus,
    refresh,
    activeEvent,
    templateSummary
  } = useSaasBuilderData('1');
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
  const [saving, setSaving] = useState(false);

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



  function getBalancedWeights(criteria) {
    const count = criteria.length;

    if (count === 0) {
      return [];
    }

    const base = Math.floor((1 / count) * 1000000) / 1000000;
    const weights = Array(count).fill(base);
    weights[count - 1] = Number((1 - base * (count - 1)).toFixed(6));

    return weights;
  }

  async function autoBalanceRound(round, criteria = round.criteria) {
    const weights = getBalancedWeights(criteria);

    await Promise.all(
      criteria.map((criterion, index) =>
        updateCriterion(eventId, round.id, criterion.id, {
          weight: weights[index]
        })
      )
    );
  }

  async function autoBalanceRoundFromButton(round) {
    setSaving(true);
    setStatus('Auto-calculating weights...');

    try {
      await autoBalanceRound(round);
      await refresh(eventId);
      setStatus('Round weights auto-calculated to 100%');
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
    const nextCount = round.criteria.length + 1;
    const initialWeight = form.weightPercent
      ? Number(form.weightPercent) / 100
      : 1 / nextCount;

    setSaving(true);
    setStatus('Adding criterion and auto-calculating weights...');

    try {
      const result = await createCriterion(eventId, round.id, {
        name: form.name,
        weight: initialWeight,
        sortOrder: Number(form.sortOrder || nextCount)
      });

      await autoBalanceRound(round, [...round.criteria, result.criterion]);

      updateCriterionForm(round.id, { name: '', weightPercent: '', sortOrder: '' });
      await refresh(eventId);
      setStatus('Criterion added and weights auto-calculated to 100%');
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

        <EventSettingsPanel
          settings={settings}
          setSettings={setSettings}
          saving={saving}
          saveSettings={saveSettings}
        />

        <ContestantsPanel
          contestantForm={contestantForm}
          setContestantForm={setContestantForm}
          saving={saving}
          addContestant={addContestant}
          contestants={builder.contestants}
          renameContestant={renameContestant}
          removeContestant={removeContestant}
        />

        <JudgesPanel
          judgeForm={judgeForm}
          setJudgeForm={setJudgeForm}
          saving={saving}
          addJudge={addJudge}
          judges={builder.judges}
          toggleJudge={toggleJudge}
          resetJudgePin={resetJudgePin}
          removeJudge={removeJudge}
        />

        <RoundsCriteriaPanel
          roundForm={roundForm}
          setRoundForm={setRoundForm}
          criterionForms={criterionForms}
          updateCriterionForm={updateCriterionForm}
          saving={saving}
          rounds={builder.rounds}
          addRound={addRound}
          renameRound={renameRound}
          autoBalanceRoundFromButton={autoBalanceRoundFromButton}
          toggleRoundLock={toggleRoundLock}
          removeRound={removeRound}
          addCriterion={addCriterion}
          editCriterion={editCriterion}
          removeCriterion={removeCriterion}
        />

        <AuditLogsPanel auditLogs={auditLogs} />

        <footer style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>
          Open legacy app normally. Open builder with <b>?builder=saas</b>.
        </footer>
      </div>
    </main>
  );
}
