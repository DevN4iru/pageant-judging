import React, { useEffect, useMemo, useState } from 'react';
import { CriteriaNote, CriteriaOverview } from './components/CriteriaGuide.jsx';
import { formatDateTime } from './utils/formatting.js';
import { getSavedJudge } from './utils/session.js';
import { DeveloperCredits, ErrorPanel, LoadingPanel, LoginCard, SiteFooter, TVCreditFooter, WinnerAnnouncement } from './components/SharedUi.jsx';
import { AdminSummaryPrintButtons } from './components/AdminSummaryPrintButtons.jsx';
import { Home } from './components/Home.jsx';
import { TVTop3Display, TVWinnersDisplay } from './tv/TvDisplays.jsx';
import { JudgePanel } from './judge/JudgePanels.jsx';

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
    <div className={admin ? 'app-shell admin-shell' : 'app-shell'}>
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

      {judge && <JudgePanel judge={judge} api={api} />}
      {admin && <AdminSummaryPrintButtons api={api} />}
      {admin && <AdminPanel />}

      <SiteFooter />
    </div>
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
            <p className="eyebrow">Finals Results</p>
            <h3>Waiting for official Top 3</h3>
            <p>
              Finals results are locked until all Preliminary Round judges final-submit.
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
            <p className="eyebrow">Finals Leader</p>
            <h2>#{winner.number} {winner.name}</h2>
            <p>Highest score after Finals</p>
          </div>
          <strong>{Number(winner.final_score || 0).toFixed(2)}</strong>
        </section>
      )}

      <section className="panel table-panel final-results-panel">
      <div className="table-title">
        <div>
          <p className="eyebrow">Finals Results</p>
          <h3>Finals Winners</h3>
          <p>
            {loading ? 'Loading final round...' : `${lockedJudges} of ${judgeStatuses.length} judges submitted Finals scores`}
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
                <td colSpan="7">No Finals data yet.</td>
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
                  <td colSpan="5">No Finals details yet.</td>
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
              <p className="eyebrow">Finals Completion</p>
              <h3>Judge Submission Status · Finals</h3>
              <p>{lockedJudges} of {judgeStatuses.length} judges submitted Finals scores</p>
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
          <p className="eyebrow">Admin Control</p>
          <h2>Admin Control · Live Tabulation</h2>
          <p>Admin control screen. Preliminary Round chooses the Top 3 Finalists. Finals decides the winners.</p>
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
            TV Finals
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
              <h3>Top 3 Live Leaderboard</h3>
              <p>Gold, silver, and bronze ranking from the Preliminary Round</p>
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
            <p>{ranked.length} candidates · The Top 3 advance to Finals</p>
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

