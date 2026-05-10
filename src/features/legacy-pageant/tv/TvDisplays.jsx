import React, { useEffect, useState } from 'react';
import { formatDateTime } from '../utils/formatting.js';
import { TVCreditFooter } from '../components/SharedUi.jsx';

function preFinalScore(item) {
  return Number(item.pre_final_score ?? item.preliminary_score ?? item.total_score ?? 0);
}

export function TVWinnersDisplay() {
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
            <p>Coronation results will appear once all Finals scores are locked.</p>
          </div>
        </section>

        <section className="tv-wait-card">
          <h2>Waiting for coronation results</h2>
          <p>{error || 'Finals submissions are not yet complete.'}</p>
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
        <strong>TV Display · Finals Coronation</strong>
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
        leftLabel="Finals results confirmed"
        rightLabel={lastUpdated ? `Updated ${lastUpdated}` : ''}
      />
    </main>
  );
}

export function TVTop3Display() {
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
            <p>Official display for the candidates advancing to Finals.</p>
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
          <p>These candidates advance to Finals.</p>
        </div>
      </section>

      <section className="tv-note-strip">
        <strong>TV Display · Top 3 Finalists</strong>
        <span>These candidates advance to Finals.</span>
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
