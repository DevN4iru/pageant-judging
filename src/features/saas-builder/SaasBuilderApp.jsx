import React, { useState } from 'react';
import './saasBuilder.css';
import { card } from './saasBuilderStyles.js';
import Stat from './components/Stat.jsx';
import EventSettingsPanel from './panels/EventSettingsPanel.jsx';
import ContestantsPanel from './panels/ContestantsPanel.jsx';
import JudgesPanel from './panels/JudgesPanel.jsx';
import AuditLogsPanel from './panels/AuditLogsPanel.jsx';
import RoundsCriteriaPanel from './panels/RoundsCriteriaPanel.jsx';
import useSaasBuilderData from './hooks/useSaasBuilderData.js';
import useEventSettingsActions from './hooks/useEventSettingsActions.js';
import useContestantActions from './hooks/useContestantActions.js';
import useJudgeActions from './hooks/useJudgeActions.js';
import useRoundCriteriaActions from './hooks/useRoundCriteriaActions.js';


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
  const [saving, setSaving] = useState(false);

  const {
    saveSettings
  } = useEventSettingsActions({
    eventId,
    settings,
    refresh,
    setSaving,
    setStatus
  });

  const {
    addContestant,
    renameContestant,
    removeContestant
  } = useContestantActions({
    eventId,
    contestantForm,
    setContestantForm,
    refresh,
    setSaving,
    setStatus
  });

  const {
    addJudge,
    toggleJudge,
    resetJudgePin,
    removeJudge
  } = useJudgeActions({
    eventId,
    judgeForm,
    setJudgeForm,
    builder,
    refresh,
    setSaving,
    setStatus
  });

  const {
    criterionForms,
    updateCriterionForm,
    addRound,
    renameRound,
    autoBalanceRoundFromButton,
    toggleRoundLock,
    removeRound,
    addCriterion,
    editCriterion,
    removeCriterion
  } = useRoundCriteriaActions({
    eventId,
    roundForm,
    setRoundForm,
    builder,
    refresh,
    setSaving,
    setStatus
  });












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
