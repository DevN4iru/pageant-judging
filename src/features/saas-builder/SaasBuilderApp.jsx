import React, { useState } from 'react';
import './saasBuilder.css';
import LoadingState from './components/LoadingState.jsx';
import SaasBuilderHeader from './components/SaasBuilderHeader.jsx';
import StatsGrid from './components/StatsGrid.jsx';
import BuilderFooter from './components/BuilderFooter.jsx';
import BuilderNav from './components/BuilderNav.jsx';
import ScoringMonitorPanel from './panels/ScoringMonitorPanel.jsx';
import ResultsPanel from './panels/ResultsPanel.jsx';
import TvDisplaySettingsPanel from './panels/TvDisplaySettingsPanel.jsx';
import PdfExportCenterPanel from './panels/PdfExportCenterPanel.jsx';
import {
  createPdfExport,
  createResultSnapshot,
  updateDisplaySettings
} from './saasBuilderApi.js';
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
    monitor,
    resultSnapshots,
    displaySettings,
    setDisplaySettings,
    pdfExports,
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
  const [activePage, setActivePage] = useState('settings');

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

  function handleEventChange(nextEventId) {
    if (String(nextEventId) === String(eventId)) {
      return;
    }

    setEventId(nextEventId);
    setContestantForm({ contestantNumber: '', name: '', photoUrl: '' });
    setJudgeForm({ name: '', displayOrder: '', pin: '' });
    setRoundForm({
      name: '',
      sortOrder: '',
      candidatePoolMode: 'all_contestants',
      advancingCount: '',
      scoreCarryMode: 'qualifier_only'
    });

    refresh(nextEventId).catch((err) => setStatus(err.message));
  }












  async function saveDisplaySettings() {
    setSaving(true);
    setStatus('Saving TV display settings...');

    try {
      await updateDisplaySettings(eventId, displaySettings);
      await refresh(eventId);
      setStatus('TV display settings saved');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function createSnapshot() {
    setSaving(true);
    setStatus('Creating result snapshot...');

    try {
      await createResultSnapshot(eventId, {
        title: `${activeEvent?.title || 'Event'} Result Snapshot`,
        snapshotType: 'admin_result_snapshot',
        data: {
          eventId,
          title: activeEvent?.title,
          advancingCount: activeEvent?.advancing_count,
          createdFrom: 'saas-builder'
        }
      });
      await refresh(eventId);
      setStatus('Result snapshot created');
      setActivePage('results');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function createPdfExportLog() {
    setSaving(true);
    setStatus('Logging export generation...');

    try {
      await createPdfExport(eventId, {
        exportType: 'builder_export_log',
        title: `${activeEvent?.title || 'Event'} Builder Export`,
        footerText: activeEvent?.pdf_footer || '',
        preparedByText: activeEvent?.prepared_by_text || '',
        metadata: {
          source: 'saas-builder',
          eventId
        }
      });
      await refresh(eventId);
      setStatus('Export generation logged');
      setActivePage('exports');
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }


  if (!builder) {
    return <LoadingState status={status} />;
  }

  return (
    <main className="saas-builder-shell" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #020617, #111827 45%, #3b0764)', color: '#f8fafc', padding: 28 }}>
      <div className="saas-builder-page" style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 22 }}>
        <SaasBuilderHeader
          activeEvent={activeEvent}
          events={events}
          eventId={eventId}
          status={status}
          templateSummary={templateSummary}
          onEventChange={handleEventChange}
          onRefresh={() => refresh(eventId)}
        />

        <StatsGrid
          builder={builder}
          templates={templates}
        />

        <BuilderNav
          activePage={activePage}
          onChange={setActivePage}
        />

        {activePage === 'settings' && (
          <EventSettingsPanel
            settings={settings}
            setSettings={setSettings}
            saving={saving}
            saveSettings={saveSettings}
          />
        )}

        {activePage === 'contestants' && (
          <ContestantsPanel
            contestantForm={contestantForm}
            setContestantForm={setContestantForm}
            saving={saving}
            addContestant={addContestant}
            contestants={builder.contestants}
            renameContestant={renameContestant}
            removeContestant={removeContestant}
          />
        )}

        {activePage === 'judges' && (
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
        )}

        {activePage === 'rounds' && (
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
        )}

        {activePage === 'monitor' && (
          <ScoringMonitorPanel
            monitor={monitor}
            onRefresh={() => refresh(eventId)}
          />
        )}

        {activePage === 'results' && (
          <ResultsPanel
            snapshots={resultSnapshots}
            createSnapshot={createSnapshot}
            activeEvent={activeEvent}
          />
        )}

        {activePage === 'tv' && (
          <TvDisplaySettingsPanel
            displaySettings={displaySettings}
            setDisplaySettings={setDisplaySettings}
            saveDisplaySettings={saveDisplaySettings}
            saving={saving}
          />
        )}

        {activePage === 'exports' && (
          <PdfExportCenterPanel
            pdfExports={pdfExports}
            createPdfExportLog={createPdfExportLog}
          />
        )}

        {activePage === 'audit' && (
          <AuditLogsPanel auditLogs={auditLogs} />
        )}

        <BuilderFooter />
      </div>
    </main>
  );
}
