import React, { useEffect, useMemo, useState } from 'react';

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function getSavedJudge() {
  try {
    return JSON.parse(localStorage.getItem('judge') || 'null');
  } catch {
    return null;
  }
}

function formatDateTime(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const CRITERIA_GUIDE = {
  'Production Number': {
    segmentWeight: '10% of Top 3 score',
    note: 'Opening production number. Judges evaluate stage energy, performance, projection, and overall impact.',
    items: [
      'Stage Presence and Projection — 40%',
      'Execution of Choreography — 30%',
      'Confidence and Poise — 20%',
      'Overall Impact — 10%'
    ]
  },
  'Fun Wear': {
    segmentWeight: '15% of Top 3 score',
    note: 'Showcases creativity, personality, confidence, and expressive style through fun wear attire.',
    items: [
      'Creativity and Style — 30%',
      'Confidence and Carriage — 30%',
      'Stage Presence — 20%',
      'Overall Appeal — 20%'
    ]
  },
  'Preliminary Interview': {
    segmentWeight: '20% of Top 3 score',
    note: 'Live interview during coronation night.',
    items: [
      'Communication Skills and Clarity of Thought — 30%',
      'Confidence and Stage Presence — 25%',
      'Intelligence and Substance of Answer — 25%',
      'Overall Impression — 20%'
    ]
  },
  'Advocacy Interview': {
    segmentWeight: '25% of Top 3 score',
    note: 'Closed-door advocacy interview conducted before coronation night.',
    items: [
      'Depth and Relevance of Advocacy — 30%',
      'Knowledge and Understanding — 25%',
      'Communication Skills and Clarity — 25%',
      'Sincerity and Impact — 20%'
    ]
  },
  'Long Gown': {
    segmentWeight: '30% of Top 3 score',
    note: 'Highlights elegance, grace, confidence, sophistication, and gown suitability.',
    items: [
      'Elegance and Poise — 35%',
      'Stage Presence and Confidence — 35%',
      'Gown Selection and Suitability — 20%',
      'Overall Impact — 10%'
    ]
  }
};

function getCriteriaGuide(name) {
  return CRITERIA_GUIDE[name] || {
    segmentWeight: 'Official judging criterion',
    note: 'Use the approved scoring standard set by the pageant committee.',
    items: ['Score fairly based on candidate performance.']
  };
}

function CriteriaNote({ name }) {
  const guide = getCriteriaGuide(name);

  return (
    <details className="criteria-note-box">
      <summary>View notes</summary>
      <div className="criteria-note-content">
        <strong>{name}</strong>
        <em>{guide.segmentWeight}</em>
        <p>{guide.note}</p>
        <ul>
          {guide.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function CriteriaOverview() {
  return (
    <details className="criteria-overview">
      <summary>View Judging Criteria / Notes</summary>

      <div className="criteria-overview-grid">
        {Object.entries(CRITERIA_GUIDE).map(([name, guide]) => (
          <article key={name}>
            <div>
              <h4>{name}</h4>
              <span>{guide.segmentWeight}</span>
            </div>
            <p>{guide.note}</p>
            <ul>
              {guide.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="final-interview-note">
        <strong>Final Interview for Top 3:</strong>
        <span> Beauty and Poise — 60% · Wit, Intelligence, and Quality of Answer — 40%</span>
      </div>
    </details>
  );
}

export default function App() {
  const [mode, setMode] = useState(localStorage.getItem('mode') || 'home');
  const [judge, setJudge] = useState(getSavedJudge());
  const [admin, setAdmin] = useState(localStorage.getItem('admin') === 'true');
  const params = new URLSearchParams(window.location.search);
  const rawTvMode = params.get('tv');
  const wantsTvMode = params.has('tv') || params.get('view') === 'tv';
  const tvMode =
    rawTvMode === 'top3' || rawTvMode === 'search'
      ? 'top3'
      : 'final';

  if (wantsTvMode) {
    return tvMode === 'top3' ? <TVTop3Display /> : <TVWinnersDisplay />;
  }

  function logout() {
    localStorage.clear();
    setJudge(null);
    setAdmin(false);
    setMode('home');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <img
            src="/pageant-logo.jpg"
            alt="Miss Poblacion Occidental 2026 Logo"
            className="brand-logo"
          />

          <div>
            <p className="eyebrow">Official Scoring System</p>
            <h1>Miss Poblacion Occidental</h1>
            <p className="subtitle">Automated judging, tabulation, locking, and audit history</p>
          </div>
        </div>

        {(judge || admin) && (
          <button className="btn btn-light" onClick={logout}>
            Logout
          </button>
        )}
      </header>

      {mode === 'home' && !judge && !admin && <Home setMode={setMode} />}

      {mode === 'judge-login' && !judge && (
        <LoginCard
          title="Judge Login"
          description="Enter your assigned judge PIN to start scoring."
          placeholder="Judge PIN"
          buttonText="Enter Judge Panel"
          onBack={() => setMode('home')}
          onSubmit={async (pin) => {
            const data = await api('/api/judge/login', {
              method: 'POST',
              body: JSON.stringify({ pin })
            });

            localStorage.setItem('judge', JSON.stringify(data.judge));
            localStorage.setItem('mode', 'judge');
            setJudge(data.judge);
          }}
        />
      )}

      {mode === 'admin-login' && !admin && (
        <LoginCard
          title="Admin Login"
          description="Use this on the tabulator laptop for live results and audit logs."
          placeholder="Admin PIN"
          buttonText="Open Dashboard"
          onBack={() => setMode('home')}
          onSubmit={async (pin) => {
            await api('/api/admin/login', {
              method: 'POST',
              body: JSON.stringify({ pin })
            });

            localStorage.setItem('admin', 'true');
            localStorage.setItem('mode', 'admin');
            setAdmin(true);
          }}
        />
      )}

      {judge && <JudgePanel judge={judge} />}
      {admin && <AdminPanel />}

      <SiteFooter />
    </div>
  );
}

function Home({ setMode }) {
  return (
    <main className="hero-grid">
      <section className="hero-card">
        <img
          src="/pageant-logo.jpg"
          alt="Miss Poblacion Occidental 2026 Logo"
          className="hero-logo"
        />

        <p className="eyebrow">Pageant Night Ready</p>
        <h2>Fast, clean, automatic, and traceable tabulation.</h2>
        <p>
          Judges can edit while scoring, then click Final Submit. After that, their
          scores are locked and the admin can see score history with exact timestamps.
        </p>

        <div className="role-grid">
          <button className="role-card" onClick={() => setMode('judge-login')}>
            <span className="role-icon">📝</span>
            <strong>Judge Device</strong>
            <small>Score, review, and final submit</small>
          </button>

          <button className="role-card dark" onClick={() => setMode('admin-login')}>
            <span className="role-icon">📊</span>
            <strong>Admin Dashboard</strong>
            <small>Live ranking, lock status, and audit logs</small>
          </button>
        </div>

        <CriteriaOverview />
        <DeveloperCredits />
      </section>

      <section className="info-panel">
        <div className="mini-stat">
          <span>Lock</span>
          <p>Final submit prevents score edits</p>
        </div>

        <div className="mini-stat">
          <span>Audit</span>
          <p>Every score edit has a timestamp</p>
        </div>

        <div className="mini-stat">
          <span>Live</span>
          <p>Admin dashboard auto-refreshes</p>
        </div>
      </section>
    </main>
  );
}

function LoginCard({ title, description, placeholder, buttonText, onSubmit, onBack }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit(pin.trim());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-wrap">
      <section className="panel login-card">
        <div className="lock-icon">🔐</div>
        <h2>{title}</h2>
        <p>{description}</p>

        <form onSubmit={submit}>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={placeholder}
            inputMode="numeric"
            autoFocus
          />

          <button className="btn btn-primary full" disabled={loading}>
            {loading ? 'Checking...' : buttonText}
          </button>
        </form>

        {error && <p className="alert error">{error}</p>}

        <button className="btn-text" onClick={onBack}>
          ← Back to role selection
        </button>
      </section>
    </main>
  );
}

function JudgePanel({ judge }) {
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

      <FinalInterviewJudgePanel judge={judge} />
    </main>
  );
}


/* ===== KIRCH FINAL INTERVIEW COMPONENTS START ===== */

function FinalInterviewJudgePanel({ judge }) {
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
      setStatus('Finals Night 2 scores are already locked.');
      return;
    }

    const key = `${contestantId}-${criteriaKey}`;

    setScores((old) => ({
      ...old,
      [key]: score
    }));

    if (score === '') return;

    setStatus('Saving Finals Night 2 score...');

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
      setStatus('Finals Night 2 score saved ✓');
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function finalInterviewSubmit() {
    if (!canSubmit) {
      setStatus(`Complete all Finals Night 2 scores first. ${filledFields}/${totalFields} fields filled.`);
      return;
    }

    const yes = window.confirm(
      'Submit Finals Night 2 scores? After this, your Finals Night 2 scores will be locked.'
    );

    if (!yes) return;

    setSubmitting(true);
    setStatus('Submitting Finals Night 2 scores...');

    try {
      const result = await api(`/api/final/judge/${judge.id}/submit`, {
        method: 'POST'
      });

      const currentStatus = await api(`/api/final/judge/${judge.id}/status`).catch(() => ({
        submitted: true,
        submitted_at: result.submitted_at
      }));

      setJudgeStatus(currentStatus);
      setStatus(`Finals Night 2 submitted and locked at ${formatDateTime(result.submitted_at)}.`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="panel final-round-panel">
        <p className="eyebrow">Final Interview</p>
        <p>Loading Top 3 final round...</p>
      </section>
    );
  }

  if (!finalReady) {
    return (
      <section className="panel final-round-panel final-round-locked">
        <div>
          <p className="eyebrow">Final Interview · Locked</p>
          <h2>Final Round opens after Top 3 is official.</h2>
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
    <section className="panel final-round-panel">
      <div className="final-round-head">
        <div>
          <p className="eyebrow">Final Interview · Top 3 Only</p>
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
            <div className="locked-badge">🔒 Final Interview Locked</div>
          ) : (
            <>
              <button
                className="btn btn-primary full"
                onClick={finalInterviewSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Final Interview'}
              </button>
              <p className="warning-note">Locks Finals Night 2 scores only.</p>
            </>
          )}
        </div>
      </div>

      {status && (
        <div className={status.includes('saved') || status.includes('locked') ? 'toast success' : 'toast'}>
          {status}
        </div>
      )}

      <div className="final-candidate-grid">
        {contestants.map((candidate) => (
          <article className="candidate-card final-candidate-card" key={candidate.id}>
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

function FinalInterviewAdminPanel() {
  const [results, setResults] = useState([]);
  const [judgeStatuses, setJudgeStatuses] = useState([]);
  const [details, setDetails] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [finalReadiness, setFinalReadiness] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState('');

  async function safeApi(path, fallback) {
    try {
      return await api(path);
    } catch (err) {
      setLoadWarning(`${path} failed: ${err.message}`);
      return fallback;
    }
  }

  async function loadFinalAdmin() {
    const readinessData = await safeApi('/api/final/readiness', {
      ready: false,
      total_judges: 0,
      submitted_judges: 0
    });

    setFinalReadiness(readinessData);

    if (!readinessData.ready) {
      setResults([]);
      setJudgeStatuses([]);
      setDetails([]);
      setLastUpdated(new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      setLoading(false);
      return;
    }

    const [resultData, judgeData] = await Promise.all([
      safeApi('/api/final/results', []),
      safeApi('/api/final/judges/status', [])
    ]);

    setResults(resultData || []);
    setJudgeStatuses(judgeData || []);

    if (showDetails) {
      setDetails(await safeApi('/api/final/details', []));
    }

    setLastUpdated(new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));

    setLoading(false);
  }

  useEffect(() => {
    loadFinalAdmin();

    const timer = setInterval(loadFinalAdmin, 3000);
    return () => clearInterval(timer);
  }, [showDetails]);

  const ranked = results.map((result, index) => ({
    ...result,
    rank: index + 1
  }));

  const winner = ranked[0];
  const lockedJudges = judgeStatuses.filter((j) => j.submitted_at).length;

  if (!loading && finalReadiness && !finalReadiness.ready) {
    return (
      <section className="panel table-panel final-results-panel final-round-locked">
        <div className="table-title">
          <div>
            <p className="eyebrow">Finals Night 2 Results</p>
            <h3>Waiting for official Top 3</h3>
            <p>
              Final Interview results are locked until all Preliminary Round judges final-submit.
              Current Preliminary Round submissions: {finalReadiness.submitted_judges}/{finalReadiness.total_judges} judges.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {winner && (
        <section className="panel final-round-leader-card">
          <div>
            <p className="eyebrow">Finals Night 2 Leader</p>
            <h2>#{winner.number} {winner.name}</h2>
            <p>Highest score after Finals Night 2</p>
          </div>
          <strong>{Number(winner.final_score || 0).toFixed(2)}</strong>
        </section>
      )}

      <section className="panel table-panel final-results-panel">
      <div className="table-title">
        <div>
          <p className="eyebrow">Finals Night 2 Results</p>
          <h3>Finals Night 2 Winners</h3>
          <p>
            {loading ? 'Loading final round...' : `${lockedJudges} of ${judgeStatuses.length} judges submitted Finals Night 2 scores`}
            {lastUpdated ? ` · Updated ${lastUpdated}` : ''}
          </p>
          {loadWarning && <p className="warning-note">Warning: {loadWarning}</p>}
        </div>

        <button
          className={showDetails ? 'btn btn-active' : 'btn btn-dark'}
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '✓ Final Details Open' : 'Show Final Details'}
        </button>
      </div>
<div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Final Rank</th>
              <th>Candidate</th>
              <th>Beauty & Poise 60%</th>
              <th>Q&A 40%</th>
              <th>Final Score</th>
              <th>Preliminary Score</th>
              <th>Judges Submitted</th>
            </tr>
          </thead>

          <tbody>
            {ranked.map((r) => (
              <tr key={r.id} className={r.rank === 1 ? 'top-rank' : ''}>
                <td>
                  <span className="rank-pill">
                    {r.rank === 1
                      ? '👑 Winner'
                      : r.rank === 2
                        ? '🥈 1st Runner-Up'
                        : r.rank === 3
                          ? '🥉 2nd Runner-Up'
                          : r.rank}
                  </span>
                </td>
                <td><strong>#{r.number} {r.name}</strong></td>
                <td className="score-total">
                  {Number(r.criteria_breakdown?.['Beauty and Poise'] || 0).toFixed(2)}
                </td>
                <td className="score-total">
                  {Number(r.criteria_breakdown?.['Wit, Intelligence, and Quality of Answer'] || 0).toFixed(2)}
                </td>
                <td className="score-total grand-total">{Number(r.final_score || 0).toFixed(2)}</td>
                <td>{Number(r.pre_final_score || 0).toFixed(2)}</td>
                <td><span className="submitted-pill">{r.judges_submitted}</span></td>
              </tr>
            ))}

            {ranked.length === 0 && (
              <tr>
                <td colSpan="7">No Finals Night 2 data yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showDetails && (
        <div className="table-wrap final-details-wrap">
          <table>
            <thead>
              <tr>
                <th>Contestant</th>
                <th>Judge</th>
                <th>Final Criteria</th>
                <th>Score</th>
                <th>Last Edited</th>
              </tr>
            </thead>

            <tbody>
              {details.map((d, index) => (
                <tr key={index}>
                  <td>#{d.contestant_number} {d.contestant}</td>
                  <td>{d.judge}</td>
                  <td>{d.criteria}</td>
                  <td className="score-total">{Number(d.score).toFixed(2)}</td>
                  <td>{formatDateTime(d.updated_at)}</td>
                </tr>
              ))}

              {details.length === 0 && (
                <tr>
                  <td colSpan="5">No Finals Night 2 details yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>

      {judgeStatuses.length > 0 && (
        <section className="panel table-panel final-status-panel">
          <div className="table-title">
            <div>
              <p className="eyebrow">Finals Night 2 Completion</p>
              <h3>Judge Submission Status · Finals Night 2</h3>
              <p>{lockedJudges} of {judgeStatuses.length} judges submitted Finals Night 2 scores</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Judge</th>
                  <th>Status</th>
                  <th>Final Score Entries</th>
                  <th>Submitted Time</th>
                </tr>
              </thead>

              <tbody>
                {judgeStatuses.map((judgeStatusRow) => (
                  <tr key={judgeStatusRow.id}>
                    <td><strong>{judgeStatusRow.name}</strong></td>
                    <td>
                      {judgeStatusRow.submitted_at ? (
                        <span className="submitted-pill">🔒 Locked</span>
                      ) : (
                        <span className="rank-pill">Editing</span>
                      )}
                    </td>
                    <td>{judgeStatusRow.score_count}</td>
                    <td>{formatDateTime(judgeStatusRow.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

/* ===== KIRCH FINAL INTERVIEW COMPONENTS END ===== */


function AdminPanel() {
  function openTvMode(mode = 'final') {
    const url = `${window.location.origin}${window.location.pathname}?tv=${mode}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  const [results, setResults] = useState([]);
  const [details, setDetails] = useState([]);
  const [judgeStatuses, setJudgeStatuses] = useState([]);
  const [history, setHistory] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadWarning, setLoadWarning] = useState('');
  const [declaredWinner, setDeclaredWinner] = useState('');
  const [declaredAt, setDeclaredAt] = useState(null);

  async function safeApi(path, fallback) {
    try {
      return await api(path);
    } catch (err) {
      console.error(`${path} failed:`, err.message);
      setLoadWarning(`${path} failed: ${err.message}`);
      return fallback;
    }
  }

  async function load() {
    const [resultData, setupData, judgeData, winnerData] = await Promise.all([
      safeApi('/api/results', []),
      safeApi('/api/setup', { criteria: [] }),
      safeApi('/api/judges/status', []),
      safeApi('/api/winner', { winner_name: '', declared_at: null })
    ]);

    setResults(resultData || []);
    setCriteria(setupData.criteria || []);
    setJudgeStatuses(judgeData || []);
    setDeclaredWinner(winnerData.winner_name || '');
    setDeclaredAt(winnerData.declared_at || null);

    if (showDetails) {
      setDetails(await safeApi('/api/results/details', []));
    }

    if (showHistory) {
      setHistory(await safeApi('/api/history', []));
    }

    setLastUpdated(new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));

    setLoading(false);
  }

  async function declareWinner() {
    const name = window.prompt('Please enter the winner name:');
    if (!name || !name.trim()) return;

    try {
      const result = await api('/api/winner', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() })
      });

      setDeclaredWinner(result.winner_name);
      setDeclaredAt(result.declared_at);
    } catch (err) {
      alert(err.message);
    }
  }

  async function clearWinner() {
    if (!window.confirm('Clear declared winner?')) return;

    try {
      await api('/api/winner', { method: 'DELETE' });
      setDeclaredWinner('');
      setDeclaredAt(null);
    } catch (err) {
      alert(err.message);
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [showDetails, showHistory]);

  const ranked = useMemo(() => {
    return results.map((result, index) => ({
      ...result,
      rank: index + 1
    }));
  }, [results]);

  const leader = ranked[0];
  const lockedJudges = judgeStatuses.filter((j) => j.submitted_at).length;

  if (loading && ranked.length === 0) {
    return <LoadingPanel text="Loading live dashboard..." />;
  }

  return (
    <main className="content-grid admin-dashboard-view">
      <section className="panel dashboard-hero">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h2>Admin Control · Live Tabulation</h2>
          <p>Admin control screen. Use the TV buttons for public display. Preliminary Round scores choose the Top 3 Finalists; Finals Night 2 decides the winners.</p>
          {loadWarning && <p className="warning-note">Warning: {loadWarning}</p>}
        </div>

        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={load}>Refresh Now</button>

          <button
            className={showDetails ? 'btn btn-active' : 'btn btn-dark'}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '✓ Details Open' : 'Show Details'}
          </button>

          <button
            className={showHistory ? 'btn btn-active' : 'btn btn-dark'}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? '✓ History Open' : 'Show History'}
          </button>

          <button className="btn btn-winner" onClick={declareWinner}>
            Declare Winner
          </button>

          <button className="btn btn-dark" onClick={() => openTvMode('top3')}>
            TV Top 3 Finalists
          </button>

          <button className="btn btn-dark" onClick={() => openTvMode('final')}>
            TV Coronation Results
          </button>

          {declaredWinner && (
            <button className="btn btn-light" onClick={clearWinner}>
              Clear Winner
            </button>
          )}

          <span className="last-updated">Updated {lastUpdated || '—'}</span>
        </div>
      </section>

      {declaredWinner && (
        <WinnerAnnouncement winnerName={declaredWinner} declaredAt={declaredAt} />
      )}

      <FinalInterviewAdminPanel />
{ranked.length >= 3 && (
        <section className="panel top3-finalists-panel">
          <div className="table-title">
            <div>
              <p className="eyebrow">Official Top 3 Finalists</p>
              <h3>Candidates Advancing to Finals Night 2</h3>
              <p>Color-coded live leaderboard from the Preliminary Round</p>
            </div>
          </div>

          <div className="top3-finalists-grid">
            {ranked.slice(0, 3).map((candidate, index) => (
              <article
                key={candidate.id}
                className={`top3-finalist-card rank-${index + 1}`}
              >
                <span>
                  {index === 0
                    ? '🥇 Rank 1 Finalist'
                    : index === 1
                      ? '🥈 Rank 2 Finalist'
                      : '🥉 Rank 3 Finalist'}
                </span>
                <h4>#{candidate.number} {candidate.name}</h4>
                <p>Preliminary Round Score</p>
                <strong>{Number(candidate.total_score || 0).toFixed(2)}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      {judgeStatuses.length > 0 && (
        <section className="panel table-panel judge-status-panel">
          <div className="table-title">
            <div>
              <p className="eyebrow">Preliminary Round Completion</p>
              <h3>Judge Submission Status · Preliminary Round</h3>
              <p>{lockedJudges} of {judgeStatuses.length} judges submitted Preliminary Round scores</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Judge</th>
                  <th>Status</th>
                  <th>Score Entries</th>
                  <th>Submitted Time</th>
                </tr>
              </thead>

              <tbody>
                {judgeStatuses.map((judgeStatusRow) => (
                  <tr key={judgeStatusRow.id}>
                    <td><strong>{judgeStatusRow.name}</strong></td>
                    <td>
                      {judgeStatusRow.submitted_at ? (
                        <span className="submitted-pill">🔒 Locked</span>
                      ) : (
                        <span className="rank-pill">Editing</span>
                      )}
                    </td>
                    <td>{judgeStatusRow.score_count}</td>
                    <td>{formatDateTime(judgeStatusRow.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel table-panel prelim-ranking-panel">
        <div className="table-title">
          <div>
            <p className="eyebrow">Preliminary Round Results</p>
            <h3>Preliminary Round Ranking · Top 3 Finalists</h3>
            <p>{ranked.length} candidates · The Top 3 advance to Finals Night 2</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Candidate</th>
                {criteria.map((cr) => (
                  <th key={cr.id}>{cr.name}</th>
                ))}
                <th>Total</th>
                <th>Judges Submitted</th>
              </tr>
            </thead>

            <tbody>
              {ranked.map((r) => (
                <tr key={r.id} className={r.rank === 1 ? 'top-rank' : ''}>
                  <td>
                    <span className="rank-pill">
                      {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}
                    </span>
                  </td>
                  <td><strong>#{r.number} {r.name}</strong></td>

                  {criteria.map((cr) => (
                    <td key={cr.id} className="score-total">
                      {Number(r.criteria_breakdown?.[cr.name] || 0).toFixed(2)}
                    </td>
                  ))}

                  <td className="score-total grand-total">{Number(r.total_score).toFixed(2)}</td>
                  <td><span className="submitted-pill">{r.judges_submitted}</span></td>
                </tr>
              ))}

              {ranked.length === 0 && (
                <tr>
                  <td colSpan={criteria.length + 4}>No ranking data yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showDetails && (
        <section className="panel table-panel">
          <div className="table-title">
            <div>
              <h3>Score Details</h3>
              <p>Current saved score per judge and criteria</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Contestant</th>
                  <th>Judge</th>
                  <th>Criteria</th>
                  <th>Score</th>
                  <th>Last Edited</th>
                </tr>
              </thead>

              <tbody>
                {details.map((d, index) => (
                  <tr key={index}>
                    <td>#{d.contestant_number} {d.contestant}</td>
                    <td>{d.judge}</td>
                    <td>{d.criteria}</td>
                    <td className="score-total">{Number(d.score).toFixed(2)}</td>
                    <td>{formatDateTime(d.updated_at)}</td>
                  </tr>
                ))}

                {details.length === 0 && (
                  <tr>
                    <td colSpan="5">No score details yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showHistory && (
        <section className="panel table-panel">
          <div className="table-title">
            <div>
              <h3>Score Edit History</h3>
              <p>Audit trail with exact date, hour, minute, and second</p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Judge</th>
                  <th>Contestant</th>
                  <th>Criteria</th>
                  <th>Old</th>
                  <th>New</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{formatDateTime(h.changed_at)}</td>
                    <td>{h.judge}</td>
                    <td>#{h.contestant_number} {h.contestant}</td>
                    <td>{h.criteria}</td>
                    <td>{h.old_score === null ? '—' : Number(h.old_score).toFixed(2)}</td>
                    <td className="score-total">{Number(h.new_score).toFixed(2)}</td>
                    <td>{h.action}</td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td colSpan="7">No score history yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function WinnerAnnouncement({ winnerName, declaredAt }) {
  return (
    <section className="winner-announcement">
      <div className="winner-sparkle">👑</div>

      <p className="eyebrow">Official Congratulations</p>
      <h2>Congratulations, {winnerName}!</h2>
      <p className="winner-message">
        Warmest congratulations from <strong>Kirjane Labs</strong> and <strong>Dev Siris</strong>.
        Your grace, confidence, and excellence shine brightly as part of
        <strong> Miss Poblacion Occidental 2026</strong>.
      </p>

      <div className="winner-dev-note">
        <span>With appreciation from the system developers:</span>
        <strong>Kirch Ivan A. Balite</strong>
        <strong>Osiris Kedigadash Palac</strong>
      </div>

      {declaredAt && (
        <p className="winner-time">Declared at {formatDateTime(declaredAt)}</p>
      )}
    </section>
  );
}

function DeveloperCredits() {
  return (
    <section className="developer-feature balanced-credits">
      <p className="eyebrow">Happy Fiesta from us!</p>
      <h3>Made for Miss Poblacion Occidental</h3>
      <p className="credit-intro">
        This automated judging and tabulation system is proudly developed as a
        collaboration between <strong> Kirjane Labs</strong> and <strong> Dev Siris</strong>,
        built for faster, cleaner, transparent, and traceable pageant scoring.
      </p>

      <div className="collab-banner">
        <div>
          <span>Project Collaboration</span>
          <strong>Kirjane Labs × Dev Siris</strong>
        </div>
      </div>

      <div className="developer-grid equal-dev-grid">
        <article className="developer-card">
          <span className="developer-label">Full-Stack Developer</span>
          <strong>Kirch Ivan A. Balite</strong>
          <p>Kirjane Labs</p>
          <a href="tel:09486328353">09486328353</a>
          <a href="mailto:kirchbalite.careers@gmail.com">kirchbalite.careers@gmail.com</a>
          <span className="facebook-line">Facebook: Kirch Ivan</span>
        </article>

        <article className="developer-card">
          <span className="developer-label">Full-Stack Developer</span>
          <strong>Osiris Kedigadash Palac</strong>
          <p>Dev Siris</p>
          <a href="tel:09694213824">09694213824</a>
          <a href="mailto:palac.osiriskedigadash@gmail.com">palac.osiriskedigadash@gmail.com</a>
          <span className="facebook-line">Facebook: Siris Palac</span>
        </article>
      </div>
    </section>
  );
}


function TVCreditFooter({ leftLabel, rightLabel }) {
  return (
    <footer className="tv-credit-footer">
      <div className="tv-credit-main">
        <strong>OFFICIAL AUTOMATED JUDGING AND TABULATION SYSTEM</strong>
        <span>Developed by Kirch Ivan A. Balite and Osiris Kedigadash Palac</span>
        <small>Kirjane Labs × Dev Siris</small>
      </div>

      <div className="tv-credit-meta">
        {leftLabel && <span>{leftLabel}</span>}
        {rightLabel && <span>{rightLabel}</span>}
      </div>
    </footer>
  );
}

function TVWinnersDisplay() {
  const [results, setResults] = useState([]);
  const [judgeStatuses, setJudgeStatuses] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');

  async function loadTvResults() {
    try {
      const [finalResults, finalJudges] = await Promise.all([
        api('/api/final/results'),
        api('/api/final/judges/status')
      ]);

      setResults(finalResults || []);
      setJudgeStatuses(finalJudges || []);
      setLastUpdated(new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTvResults();
    const timer = setInterval(loadTvResults, 3000);
    return () => clearInterval(timer);
  }, []);

  const ranked = results.map((result, index) => ({
    ...result,
    rank: index + 1
  }));

  const submittedFinalJudges = judgeStatuses.filter((judge) => judge.submitted_at).length;
  const allFinalSubmitted = judgeStatuses.length > 0 && submittedFinalJudges === judgeStatuses.length;

  const winner = ranked[0];
  const firstRunnerUp = ranked[1];
  const secondRunnerUp = ranked[2];

  if (error || !allFinalSubmitted || ranked.length < 3) {
    return (
      <main className="tv-stage tv-waiting">
        <section className="tv-header">
          <img src="/pageant-logo.jpg" alt="Miss Poblacion Occidental 2026 Logo" />
          <div>
            <p className="eyebrow">Official Final Results</p>
            <h1>Miss Poblacion Occidental 2026</h1>
            <p>Coronation results will appear once all Finals Night 2 scores are locked.</p>
          </div>
        </section>

        <section className="tv-wait-card">
          <h2>Waiting for coronation results</h2>
          <p>{error || 'Finals Night 2 submissions are not yet complete.'}</p>
        </section>

        <TVCreditFooter
          leftLabel="Awaiting official confirmation"
          rightLabel={lastUpdated ? `Updated ${lastUpdated}` : ''}
        />
      </main>
    );
  }

  return (
    <main className="tv-stage">
      <section className="tv-header">
        <img src="/pageant-logo.jpg" alt="Miss Poblacion Occidental 2026 Logo" />
        <div>
          <p className="eyebrow">Official Final Results</p>
          <h1>Miss Poblacion Occidental 2026</h1>
          <p>Official coronation results.</p>
        </div>
      </section>

      <section className="tv-note-strip">
        <strong>TV Display · Coronation Results</strong>
        <span>Official display for the coronation results.</span>
      </section>

      <section className="tv-winner-card">
        <p>👑 Miss Poblacion Occidental 2026</p>
        <h2>#{winner.number} {winner.name}</h2>
      </section>

      <section className="tv-runner-grid">
        <article>
          <span>🥈 First Runner-Up</span>
          <h3>#{firstRunnerUp.number} {firstRunnerUp.name}</h3>
        </article>

        <article>
          <span>🥉 Second Runner-Up</span>
          <h3>#{secondRunnerUp.number} {secondRunnerUp.name}</h3>
        </article>
      </section>

      <TVCreditFooter
        leftLabel="Finals Night 2 results confirmed"
        rightLabel={lastUpdated ? `Updated ${lastUpdated}` : ''}
      />
    </main>
  );
}




function TVTop3Display() {
  const [results, setResults] = useState([]);
  const [judgeStatuses, setJudgeStatuses] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [error, setError] = useState('');

  async function loadTvTop3() {
    try {
      const [rankingResults, judgeData] = await Promise.all([
        api('/api/results'),
        api('/api/judges/status')
      ]);

      setResults(rankingResults || []);
      setJudgeStatuses(judgeData || []);
      setLastUpdated(new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTvTop3();
    const timer = setInterval(loadTvTop3, 3000);
    return () => clearInterval(timer);
  }, []);

  const ranked = (results || []).slice(0, 3).map((result, index) => ({
    ...result,
    rank: index + 1
  }));

  const submittedJudges = judgeStatuses.filter((judge) => judge.submitted_at).length;
  const top1 = ranked[0];
  const top2 = ranked[1];
  const top3 = ranked[2];

  function preFinalScore(row) {
    return Number(row.total || row.total_score || row.final_score || 0).toFixed(2);
  }

  if (error || ranked.length < 3) {
    return (
      <main className="tv-stage tv-waiting">
        <section className="tv-header">
          <img src="/pageant-logo.jpg" alt="Miss Poblacion Occidental 2026 Logo" />
          <div>
            <p className="eyebrow">Official Top 3 Finalists</p>
            <h1>Miss Poblacion Occidental 2026</h1>
            <p>Official display for the candidates advancing to the Final Interview.</p>
          </div>
        </section>

        <section className="tv-wait-card">
          <h2>Waiting for Top 3 data</h2>
          <p>{error || 'Preliminary Round ranking is not ready yet.'}</p>
        </section>

        <TVCreditFooter
          leftLabel="Awaiting official confirmation"
          rightLabel={lastUpdated ? `Updated ${lastUpdated}` : ''}
        />
      </main>
    );
  }

  return (
    <main className="tv-stage">
      <section className="tv-header">
        <img src="/pageant-logo.jpg" alt="Miss Poblacion Occidental 2026 Logo" />
        <div>
          <p className="eyebrow">Official Top 3 Finalists</p>
          <h1>Miss Poblacion Occidental 2026</h1>
          <p>These candidates advance to the Final Interview.</p>
        </div>
      </section>

      <section className="tv-note-strip">
        <strong>TV Display · Top 3 Finalists</strong>
        <span>These candidates advance to the Final Interview.</span>
      </section>

      <section className="tv-winner-card tv-top3-card">
        <p>✨ Top 3 Finalist</p>
        <h2>#{top1.number} {top1.name}</h2>
      </section>

      <section className="tv-runner-grid">
        <article>
          <span>✨ Top 3 Finalist</span>
          <h3>#{top2.number} {top2.name}</h3>
        </article>

        <article>
          <span>✨ Top 3 Finalist</span>
          <h3>#{top3.number} {top3.name}</h3>
        </article>
      </section>

      <TVCreditFooter
        leftLabel="Top 3 Finalists confirmed"
        rightLabel={lastUpdated ? `Updated ${lastUpdated}` : ''}
      />
    </main>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer compact-footer">
      <div className="compact-footer-inner">
        <strong>Miss Poblacion Occidental Automated Judging System</strong>
        <p>© {year} All rights reserved. Happy Fiesta from Kirjane Labs × Dev Siris.</p>

        <div className="compact-dev-lines">
          <p>
            <strong>Kirjane Labs</strong> — Kirch Ivan A. Balite · 09486328353 ·
            <a href="mailto:kirchbalite.careers@gmail.com"> kirchbalite.careers@gmail.com</a> ·
            Facebook: Kirch Ivan
          </p>

          <p>
            <strong>Dev Siris</strong> — Osiris Kedigadash Palac · 09694213824 ·
            <a href="mailto:palac.osiriskedigadash@gmail.com"> palac.osiriskedigadash@gmail.com</a> ·
            Facebook: Siris Palac
          </p>
        </div>
      </div>
    </footer>
  );
}

function ErrorPanel({ title, message }) {
  return (
    <main className="login-wrap">
      <section className="panel login-card error-panel">
        <h2>{title}</h2>
        <p>{message || 'Something went wrong while loading this page.'}</p>
        <button className="btn btn-primary full" onClick={() => window.location.reload()}>
          Reload
        </button>
        <button
          className="btn btn-light full"
          onClick={() => {
            localStorage.clear();
            window.location.href = '/';
          }}
        >
          Clear Login and Go Home
        </button>
      </section>
    </main>
  );
}

function LoadingPanel({ text }) {
  return (
    <main className="login-wrap">
      <section className="panel login-card">
        <div className="spinner" />
        <h2>{text}</h2>
      </section>
    </main>
  );
}
