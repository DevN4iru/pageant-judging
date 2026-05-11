import React, { useEffect, useMemo, useState } from 'react';
import { getScoringResults } from '../saas-scoring/saasScoringApi.js';
import './saasTvDisplay.css';

export default function SaasTvDisplayApp() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('eventId') || '1';
  const mode = params.get('mode') || 'overall';
  const limit = Number(params.get('limit') || 10);

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('Loading SaaS TV results...');

  async function refresh() {
    try {
      const result = await getScoringResults(eventId);
      setData(result);
      setStatus(`Updated ${new Date().toLocaleTimeString()}`);
    } catch (err) {
      setStatus(err.message);
    }
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [eventId]);

  const rows = useMemo(() => {
    if (!data) {
      return [];
    }

    if (mode === 'final' && data.rounds?.length) {
      return data.rounds[data.rounds.length - 1].results || [];
    }

    return data.overall || [];
  }, [data, mode]);

  const title = mode === 'final' ? 'Finals Live Ranking' : 'Overall Live Ranking';

  return (
    <main className="saas-tv-shell">
      <section className="saas-tv-stage">
        <div className="saas-tv-header">
          <div>
            <div className="saas-tv-eyebrow">Official SaaS Results Display</div>
            <h1>{data?.event?.tv_display_title || data?.event?.title || 'Live Results'}</h1>
            <p>{title} • Auto-refresh every 5 seconds</p>
          </div>

          <div className="saas-tv-status">{status}</div>
        </div>

        <div className="saas-tv-leaderboard">
          {rows.slice(0, limit).map((row) => (
            <div key={row.contestant_id} className={`saas-tv-row rank-${row.rank}`}>
              <div className="saas-tv-rank">#{row.rank}</div>
              <div>
                <div className="saas-tv-name">{row.name}</div>
                <div className="saas-tv-sub">Candidate #{row.contestant_number}</div>
              </div>
              <div className="saas-tv-score">{Number(row.total || 0).toFixed(2)}</div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="saas-tv-empty">No scores yet.</div>
          )}
        </div>

        <footer className="saas-tv-footer">
          Powered by Kirjane Labs × Dev Siris • Generic SaaS scoring engine
        </footer>
      </section>
    </main>
  );
}
