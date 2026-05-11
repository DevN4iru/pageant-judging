import React, { useEffect, useMemo, useState } from 'react';
import {
  getEvents,
  getJudgeDesk,
  getScoringResults,
  judgeLogin,
  saveScore,
  submitRound
} from './saasScoringApi.js';
import './saasScoring.css';

function scoreKey(roundId, criterionId, contestantId) {
  return `${roundId}:${criterionId}:${contestantId}`;
}

function buildDrafts(rounds) {
  const drafts = {};

  rounds.forEach((round) => {
    round.scores.forEach((score) => {
      drafts[scoreKey(score.round_id, score.criterion_id, score.contestant_id)] = String(score.score);
    });
  });

  return drafts;
}

export default function SaasScoringApp() {
  const params = new URLSearchParams(window.location.search);
  const initialEventId = params.get('eventId') || '1';

  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [pin, setPin] = useState('');
  const [judge, setJudge] = useState(null);
  const [desk, setDesk] = useState(null);
  const [activeRoundId, setActiveRoundId] = useState('');
  const [drafts, setDrafts] = useState({});
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState('Loading events...');
  const [saving, setSaving] = useState(false);

  async function loadEvents() {
    const data = await getEvents();
    setEvents(data);
    setStatus('Ready');
  }

  async function loadDesk(nextJudge = judge, nextEventId = eventId) {
    if (!nextJudge) {
      return;
    }

    const data = await getJudgeDesk(nextEventId, nextJudge.id);
    setDesk(data);
    setDrafts(buildDrafts(data.rounds));
    setActiveRoundId((current) => current || String(data.rounds[0]?.id || ''));
    setResults(await getScoringResults(nextEventId));
    setStatus('Scoring desk loaded');
  }

  useEffect(() => {
    loadEvents().catch((err) => setStatus(err.message));
  }, []);

  async function login(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('Logging in...');

    try {
      const data = await judgeLogin(eventId, pin);
      setJudge(data.judge);
      await loadDesk(data.judge, eventId);
      setStatus(`Logged in as ${data.judge.name}`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(roundId, criterionId, contestantId, value) {
    setDrafts((current) => ({
      ...current,
      [scoreKey(roundId, criterionId, contestantId)]: value
    }));
  }

  async function saveRound(round) {
    setSaving(true);
    setStatus(`Saving ${round.name}...`);

    try {
      for (const contestant of round.contestants) {
        for (const criterion of round.criteria) {
          const value = drafts[scoreKey(round.id, criterion.id, contestant.id)];

          if (value === undefined || value === '') {
            continue;
          }

          await saveScore(eventId, judge.id, {
            roundId: round.id,
            criterionId: criterion.id,
            contestantId: contestant.id,
            score: Number(value)
          });
        }
      }

      await loadDesk(judge, eventId);
      setStatus(`${round.name} saved`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function finalSubmitRound(round) {
    if (!window.confirm(`Final submit ${round.name}? Scores will lock for this judge.`)) {
      return;
    }

    setSaving(true);
    setStatus(`Submitting ${round.name}...`);

    try {
      await saveRound(round);
      await submitRound(eventId, judge.id, round.id);
      await loadDesk(judge, eventId);
      setStatus(`${round.name} submitted`);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    setJudge(null);
    setDesk(null);
    setResults(null);
    setDrafts({});
    setPin('');
    setActiveRoundId('');
    setStatus('Logged out');
  }

  const activeRound = useMemo(() => {
    return desk?.rounds.find((round) => String(round.id) === String(activeRoundId)) || desk?.rounds[0];
  }, [desk, activeRoundId]);

  if (!judge || !desk) {
    return (
      <main className="saas-scoring-shell">
        <section className="saas-scoring-login">
          <div>
            <div className="saas-scoring-eyebrow">SaaS Judge Portal</div>
            <h1>Event Scoring Login</h1>
            <p>Judge access is per event. PINs do not expose other events.</p>
          </div>

          <form onSubmit={login} className="saas-scoring-form">
            <label>
              Event
              <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title || `Event #${event.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Judge PIN
              <input value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Enter judge PIN" />
            </label>

            <button disabled={saving || !pin} type="submit">
              {saving ? 'Loading...' : 'Enter Scoring Desk'}
            </button>
          </form>

          <div className="saas-scoring-status">{status}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="saas-scoring-shell">
      <header className="saas-scoring-header">
        <div>
          <div className="saas-scoring-eyebrow">SaaS Judge Portal</div>
          <h1>{desk.event.title}</h1>
          <p>{judge.name} • Generic event-builder scoring engine</p>
        </div>

        <div className="saas-scoring-header-actions">
          <button onClick={() => loadDesk(judge, eventId)} disabled={saving}>Refresh</button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <nav className="saas-scoring-rounds">
        {desk.rounds.map((round) => (
          <button
            key={round.id}
            onClick={() => setActiveRoundId(String(round.id))}
            className={String(activeRound?.id) === String(round.id) ? 'active' : ''}
          >
            {round.name}
            {round.is_submitted ? ' ✓' : ''}
          </button>
        ))}
      </nav>

      <div className="saas-scoring-status">{status}</div>

      {activeRound && (
        <section className="saas-scoring-card">
          <div className="saas-scoring-round-head">
            <div>
              <h2>{activeRound.name}</h2>
              <p>
                {activeRound.contestants.length} contestants • {activeRound.criteria.length} criteria • {activeRound.is_submitted ? 'Submitted / locked' : 'Editable'}
              </p>
            </div>

            <div className="saas-scoring-round-actions">
              <button disabled={saving || activeRound.is_submitted} onClick={() => saveRound(activeRound)}>Save Round</button>
              <button disabled={saving || activeRound.is_submitted} onClick={() => finalSubmitRound(activeRound)}>Final Submit</button>
            </div>
          </div>

          <div className="saas-scoring-table-wrap">
            <table className="saas-scoring-table">
              <thead>
                <tr>
                  <th>Contestant</th>
                  {activeRound.criteria.map((criterion) => (
                    <th key={criterion.id}>
                      {criterion.name}
                      <span>{(Number(criterion.weight) * 100).toFixed(2)}%</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRound.contestants.map((contestant) => (
                  <tr key={contestant.id}>
                    <td>
                      <b>#{contestant.contestant_number}</b>
                      <br />
                      {contestant.name}
                    </td>

                    {activeRound.criteria.map((criterion) => (
                      <td key={criterion.id}>
                        <input
                          type="number"
                          min="0"
                          max={criterion.max_score || 100}
                          step="0.01"
                          disabled={activeRound.is_submitted || saving}
                          value={drafts[scoreKey(activeRound.id, criterion.id, contestant.id)] || ''}
                          onChange={(event) => updateDraft(activeRound.id, criterion.id, contestant.id, event.target.value)}
                          placeholder="0"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="saas-scoring-card">
        <h2>Live Results Preview</h2>
        <p>This preview reads generic SaaS scores. It does not touch legacy scoring tables.</p>

        <div className="saas-scoring-results">
          {(results?.overall || []).slice(0, 10).map((row) => (
            <div key={row.contestant_id} className="saas-scoring-result-row">
              <b>#{row.rank}</b>
              <span>{row.name}</span>
              <strong>{row.total.toFixed(2)}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
