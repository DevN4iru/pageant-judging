import React, { useEffect, useMemo, useState } from 'react';

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      'Content-Type': 'application/json'
    },
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

export default function App() {
  const [mode, setMode] = useState(localStorage.getItem('mode') || 'home');
  const [judge, setJudge] = useState(getSavedJudge());
  const [admin, setAdmin] = useState(localStorage.getItem('admin') === 'true');

  function logout() {
    localStorage.removeItem('mode');
    localStorage.removeItem('judge');
    localStorage.removeItem('admin');
    setJudge(null);
    setAdmin(false);
    setMode('home');
  }

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-one" />
      <div className="bg-glow bg-glow-two" />

      <header className="topbar">
        <div className="brand-block">
          <img src="/poblacion-logo.png" alt="Sangguniang Kabataan Poblacion Occidental Logo" className="brand-logo" />
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
    </div>
  );
}

function Home({ setMode }) {
  return (
    <main className="hero-grid">
      <section className="hero-card">
        <img src="/poblacion-logo.png" alt="Poblacion Occidental Logo" className="hero-logo" />
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
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const setup = await api('/api/setup');

    setContestants(setup.contestants);
    setCriteria(setup.criteria);

    const saved = await api(`/api/judge/${judge.id}/scores`);
    const currentStatus = await api(`/api/judge/${judge.id}/status`);

    const map = {};
    saved.forEach((s) => {
      map[`${s.contestant_id}-${s.criteria_id}`] = s.score;
    });

    setScores(map);
    setJudgeStatus(currentStatus);
  }

  useEffect(() => {
    load()
      .catch((err) => setStatus(err.message))
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
      return Number.isNaN(value) ? sum : sum + value;
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

    if (score === '') {
      return;
    }

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

      const currentStatus = await api(`/api/judge/${judge.id}/status`);
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

      const currentStatus = await api(`/api/judge/${judge.id}/status`);
      setJudgeStatus(currentStatus);

      setStatus(`Final submitted and locked at ${formatDateTime(result.submitted_at)}.`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingPanel text="Loading judge panel..." />;
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
              <p className="warning-note">
                Final submit locks your scores permanently.
              </p>
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
                    <small>Max {Number(cr.max_score).toFixed(0)}</small>
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
    </main>
  );
}

function AdminPanel() {
  const [results, setResults] = useState([]);
  const [details, setDetails] = useState([]);
  const [judgeStatuses, setJudgeStatuses] = useState([]);
  const [history, setHistory] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const [resultData, setupData, judgeData] = await Promise.all([
      api('/api/results'),
      api('/api/setup'),
      api('/api/judges/status').catch(() => [])
    ]);

    setResults(resultData);
    setCriteria(setupData.criteria || []);
    setJudgeStatuses(judgeData || []);

    if (showDetails) {
      const detailData = await api('/api/results/details');
      setDetails(detailData);
    }

    if (showHistory) {
      const historyData = await api('/api/history');
      setHistory(historyData);
    }

    setLastUpdated(new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }));

    setLoading(false);
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

  if (loading) {
    return <LoadingPanel text="Loading live dashboard..." />;
  }

  return (
    <main className="content-grid">
      <section className="panel dashboard-hero">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h2>Live Tabulation</h2>
          <p>
            Auto-refreshes every 3 seconds. Criteria totals are shown beside the final total.
          </p>
        </div>

        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={load}>
            Refresh Now
          </button>

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

          <span className="last-updated">Updated {lastUpdated || '—'}</span>
        </div>
      </section>

      {leader && (
        <section className="leader-card">
          <div>
            <span className="medal">🏆</span>
            <p className="eyebrow">Current Leader</p>
            <h2>#{leader.number} {leader.name}</h2>
          </div>
          <strong>{Number(leader.total_score).toFixed(2)}</strong>
        </section>
      )}

      {judgeStatuses.length > 0 && (
        <section className="panel table-panel">
          <div className="table-title">
            <div>
              <h3>Judge Submission Status</h3>
              <p>{lockedJudges} of {judgeStatuses.length} judges final submitted</p>
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
                {judgeStatuses.map((judge) => (
                  <tr key={judge.id}>
                    <td><strong>{judge.name}</strong></td>
                    <td>
                      {judge.submitted_at ? (
                        <span className="submitted-pill">🔒 Locked</span>
                      ) : (
                        <span className="rank-pill">Editing</span>
                      )}
                    </td>
                    <td>{judge.score_count}</td>
                    <td>{formatDateTime(judge.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel table-panel">
        <div className="table-title">
          <div>
            <h3>Official Ranking</h3>
            <p>{ranked.length} candidates</p>
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

                  <td>
                    <strong>#{r.number} {r.name}</strong>
                  </td>

                  {criteria.map((cr) => (
                    <td key={cr.id} className="score-total">
                      {Number(r.criteria_breakdown?.[cr.name] || 0).toFixed(2)}
                    </td>
                  ))}

                  <td className="score-total grand-total">
                    {Number(r.total_score).toFixed(2)}
                  </td>

                  <td>
                    <span className="submitted-pill">{r.judges_submitted}</span>
                  </td>
                </tr>
              ))}
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
                    <td>{h.action === 'initial_save' ? 'Initial Save' : 'Edited Score'}</td>
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
