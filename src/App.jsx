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
    note: 'Live interview during coronation night. Each candidate has a maximum of one minute to answer.',
    items: [
      'Communication Skills and Clarity of Thought — 30%',
      'Confidence and Stage Presence — 25%',
      'Intelligence and Substance of Answer — 25%',
      'Overall Impression — 20%'
    ]
  },
  'Advocacy Interview': {
    segmentWeight: '25% of Top 3 score',
    note: 'Closed-door advocacy interview conducted one day before coronation night.',
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
    items: ['Score fairly based on the candidate performance for this criterion.']
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

          <span className="last-updated">Updated {lastUpdated || '—'}</span>
        </div>
      </section>

      {declaredWinner && (
        <WinnerAnnouncement winnerName={declaredWinner} declaredAt={declaredAt} />
      )}

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
