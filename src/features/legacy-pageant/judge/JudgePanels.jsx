import React, { useEffect, useState } from 'react';
import { CriteriaNote } from '../components/CriteriaGuide.jsx';
import { ErrorPanel, LoadingPanel } from '../components/SharedUi.jsx';
import { formatDateTime } from '../utils/formatting.js';

export function JudgePanel({ judge, api }) {
  const [contestants, setContestants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [judgeStatus, setJudgeStatus] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const setup = await api('/api/setup');
    const saved = await api(`/api/judge/${judge.id}/scores`);
    const currentStatus = await api(`/api/judge/${judge.id}/status`).catch(() => ({
      submitted: false,
      submitted_at: null
    }));

    const map = {};
    saved.forEach((s) => {
      map[`${s.contestant_id}-${s.criteria_id}`] = s.score;
    });
    setContestants(setup.contestants || []);
    setCriteria(setup.criteria || []);
    setScores(map);
    setJudgeStatus(currentStatus);
  }

  useEffect(() => {
    load()
      .catch((err) => {
        setLoadError(err.message);
        setStatus(err.message);
      })
      .finally(() => setLoading(false));
  }, [judge.id]);

  const isLocked = Boolean(judgeStatus?.submitted);
  const totalFields = contestants.length * criteria.length;
  const filledFields = Object.values(scores).filter((value) => value !== '').length;
  const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  const canFinalSubmit = !isLocked && totalFields > 0 && filledFields >= totalFields;

  function candidateSubtotal(candidateId) {
    return criteria.reduce((sum, cr) => {
      const value = Number(scores[`${candidateId}-${cr.id}`]);
      const weight = Number(cr.weight || 1);
      return Number.isNaN(value) ? sum : sum + value * weight;
    }, 0);
  }

  async function saveScore(contestantId, criteriaId, score) {
    if (isLocked) {
      setStatus('Scores are already locked.');
      return;
    }

    const key = `${contestantId}-${criteriaId}`;

    setScores((old) => ({
      ...old,
      [key]: score
    }));

    if (score === '') return;

    setStatus('Saving...');

    try {
      await api('/api/scores', {
        method: 'POST',
        body: JSON.stringify({
          judgeId: judge.id,
          contestantId,
          criteriaId,
          score
        })
      });

      const currentStatus = await api(`/api/judge/${judge.id}/status`).catch(() => judgeStatus);
      setJudgeStatus(currentStatus);
      setStatus('Saved ✓');
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function finalSubmit() {
    if (!canFinalSubmit) {
      setStatus(`Complete all scores first. ${filledFields}/${totalFields} fields filled.`);
      return;
    }

    const yes = window.confirm(
      'Final submit? After this, your scores will be locked and cannot be edited.'
    );

    if (!yes) return;

    setSubmitting(true);
    setStatus('Final submitting...');

    try {
      const result = await api(`/api/judge/${judge.id}/submit`, {
        method: 'POST'
      });

      const currentStatus = await api(`/api/judge/${judge.id}/status`).catch(() => ({
        submitted: true,
        submitted_at: result.submitted_at
      }));

      setJudgeStatus(currentStatus);
      setStatus(`Final submitted and locked at ${formatDateTime(result.submitted_at)}.`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingPanel text="Loading judge panel..." />;

  if (loadError) {
    return <ErrorPanel title="Judge panel failed to load" message={loadError} />;
  }

  return (
    <main className="content-grid">
      <section className="panel judge-hero">
        <div>
          <p className="eyebrow">Judge Panel</p>
          <h2>{judge.name}</h2>
          <p>
            {isLocked
              ? `Final submitted at ${formatDateTime(judgeStatus?.submitted_at)}. Scores are locked.`
              : 'Input scores per candidate. You may edit until you click Final Submit.'}
          </p>
        </div>

        <div className="progress-card">
          <strong>{progress}%</strong>
          <span>{filledFields} of {totalFields} fields filled</span>
          <div className="progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="final-submit-card">
          {isLocked ? (
            <div className="locked-badge">🔒 Final Submitted</div>
          ) : (
            <>
              <button
                className="btn btn-primary full"
                onClick={finalSubmit}
                disabled={!canFinalSubmit || submitting}
              >
                {submitting ? 'Submitting...' : 'Final Submit & Lock'}
              </button>
              <p className="warning-note">Final submit locks your scores permanently.</p>
            </>
          )}
        </div>
      </section>

      {status && (
        <div className={status.includes('Saved') || status.includes('locked') ? 'toast success' : 'toast'}>
          {status}
        </div>
      )}

      <section className="candidate-list">
        {contestants.map((candidate) => (
          <article className="candidate-card" key={candidate.id}>
            <div className="candidate-head">
              <div>
                <span className="candidate-number">Candidate #{candidate.number}</span>
                <h3>{candidate.name}</h3>
              </div>

              <div className="subtotal">
                <span>Subtotal</span>
                <strong>{candidateSubtotal(candidate.id).toFixed(2)}</strong>
              </div>
            </div>

            <div className="score-grid">
              {criteria.map((cr) => {
                const key = `${candidate.id}-${cr.id}`;

                return (
                  <label className="score-field" key={cr.id}>
                    <span>{cr.name}</span>
                    <small>
                      Input / {Number(cr.max_score).toFixed(0)} · Counts as {(Number(cr.weight || 0) * 100).toFixed(0)}%
                    </small>

                    <CriteriaNote name={cr.name} />

                    <input
                      type="number"
                      min="0"
                      max={cr.max_score}
                      step="0.01"
                      value={scores[key] ?? ''}
                      disabled={isLocked}
                      onChange={(e) => saveScore(candidate.id, cr.id, e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <FinalInterviewJudgePanel judge={judge} api={api} />
    </main>
  );
}


/* ===== KIRCH FINAL INTERVIEW COMPONENTS START ===== */

function FinalInterviewJudgePanel({ judge, api }) {
  const [contestants, setContestants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [scores, setScores] = useState({});
  const [judgeStatus, setJudgeStatus] = useState(null);
  const [status, setStatus] = useState('');
  const [finalReady, setFinalReady] = useState(false);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadFinalInterview() {
    const setup = await api('/api/final/setup');
    const saved = await api(`/api/final/judge/${judge.id}/scores`).catch(() => []);
    const currentStatus = await api(`/api/final/judge/${judge.id}/status`).catch(() => ({
      submitted: false,
      submitted_at: null,
      required_count: 0,
      score_count: 0
    }));

    const map = {};
    saved.forEach((s) => {
      map[`${s.contestant_id}-${s.criteria_key}`] = s.score;
    });
    setFinalReady(Boolean(setup.ready));
    setReadiness(setup);
    setContestants(setup.contestants || []);
    setCriteria(setup.criteria || []);
    setScores(map);
    setJudgeStatus(currentStatus);
  }

  useEffect(() => {
    loadFinalInterview()
      .catch((err) => setStatus(err.message))
      .finally(() => setLoading(false));
  }, [judge.id]);

  const isLocked = Boolean(judgeStatus?.submitted);
  const totalFields = contestants.length * criteria.length;
  const filledFields = Object.values(scores).filter((value) => value !== '').length;
  const progress = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  const canSubmit = !isLocked && totalFields > 0 && filledFields >= totalFields;

  function candidateFinalSubtotal(candidateId) {
    return criteria.reduce((sum, cr) => {
      const value = Number(scores[`${candidateId}-${cr.key}`]);
      const weight = Number(cr.weight || 0);
      return Number.isNaN(value) ? sum : sum + value * weight;
    }, 0);
  }

  async function saveFinalScore(contestantId, criteriaKey, score) {
    if (isLocked) {
      setStatus('Finals scores are already locked.');
      return;
    }

    const key = `${contestantId}-${criteriaKey}`;

    setScores((old) => ({
      ...old,
      [key]: score
    }));

    if (score === '') return;

    setStatus('Saving Finals score...');

    try {
      await api('/api/final/scores', {
        method: 'POST',
        body: JSON.stringify({
          judgeId: judge.id,
          contestantId,
          criteriaKey,
          score
        })
      });

      const currentStatus = await api(`/api/final/judge/${judge.id}/status`).catch(() => judgeStatus);
      setJudgeStatus(currentStatus);
      setStatus('Finals score saved ✓');
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function finalInterviewSubmit() {
    if (!canSubmit) {
      setStatus(`Complete all Finals scores first. ${filledFields}/${totalFields} fields filled.`);
      return;
    }

    const yes = window.confirm(
      'Submit Finals scores? After this, your Finals scores will be locked.'
    );

    if (!yes) return;

    setSubmitting(true);
    setStatus('Submitting Finals scores...');

    try {
      const result = await api(`/api/final/judge/${judge.id}/submit`, {
        method: 'POST'
      });

      const currentStatus = await api(`/api/final/judge/${judge.id}/status`).catch(() => ({
        submitted: true,
        submitted_at: result.submitted_at
      }));

      setJudgeStatus(currentStatus);
      setStatus(`Finals submitted and locked at ${formatDateTime(result.submitted_at)}.`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="panel final-round-panel">
        <p className="eyebrow">Finals</p>
        <p>Loading Finals...</p>
      </section>
    );
  }

  if (!finalReady) {
    return (
      <section className="panel final-round-panel final-round-locked">
        <div>
          <p className="eyebrow">Finals · Locked</p>
          <h2>Finals opens after the Top 3 are official.</h2>
          <p>
            Complete and final-submit all Preliminary Round scores first. Current Preliminary Round
            submissions: {readiness?.submitted_judges ?? 0}/{readiness?.total_judges ?? 0} judges.
          </p>
        </div>
        <div className="locked-badge">🔒 Waiting for Preliminary Round lock</div>
      </section>
    );
  }

  return (
    <section className="panel final-round-panel finals-judge-panel">
      <div className="final-round-head">
        <div>
          <p className="eyebrow">Finals · Top 3 Only</p>
          <h2>Decisive Final Round</h2>
          <p>
            Final ranking is based on Beauty and Poise 60% plus Wit, Intelligence,
            and Quality of Answer 40%.
          </p>
        </div>

        <div className="progress-card final-progress-card">
          <strong>{progress}%</strong>
          <span>{filledFields} of {totalFields} fields filled</span>
          <div className="progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="final-submit-card">
          {isLocked ? (
            <div className="locked-badge">🔒 Finals Locked</div>
          ) : (
            <>
              <button
                className="btn btn-primary full"
                onClick={finalInterviewSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Finals'}
              </button>
              <p className="warning-note">Locks Finals scores only.</p>
            </>
          )}
        </div>
      </div>

      {status && (
        <div className={status.includes('saved') || status.includes('locked') ? 'toast success' : 'toast'}>
          {status}
        </div>
      )}

      <div className="final-candidate-grid finals-judge-grid">
        {contestants.map((candidate) => (
          <article className="candidate-card final-candidate-card finals-judge-card" key={candidate.id}>
            <div className="candidate-head">
              <div>
                <span className="candidate-number">Top 3 · Candidate #{candidate.number}</span>
                <h3>{candidate.name}</h3>
                <p className="prefinal-note">
                  Preliminary Round score: {Number(candidate.pre_final_score || 0).toFixed(2)}
                </p>
              </div>

              <div className="subtotal">
                <span>Final</span>
                <strong>{candidateFinalSubtotal(candidate.id).toFixed(2)}</strong>
              </div>
            </div>

            <div className="score-grid final-score-grid">
              {criteria.map((cr) => {
                const key = `${candidate.id}-${cr.key}`;

                return (
                  <label className="score-field" key={cr.key}>
                    <span>{cr.name}</span>
                    <small>
                      Input / {Number(cr.max_score).toFixed(0)} · Counts as {(Number(cr.weight || 0) * 100).toFixed(0)}%
                    </small>

                    <input
                      type="number"
                      min="0"
                      max={cr.max_score}
                      step="0.01"
                      value={scores[key] ?? ''}
                      disabled={isLocked}
                      onChange={(e) => saveFinalScore(candidate.id, cr.key, e.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </article>
        ))}

        {contestants.length === 0 && (
          <article className="candidate-card">
            <h3>No Top 3 data yet</h3>
            <p>Complete Preliminary Round scoring first.</p>
          </article>
        )}
      </div>
    </section>
  );
}
