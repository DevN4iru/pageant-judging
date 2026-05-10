import React, { useState } from 'react';
import { formatDateTime } from '../utils/formatting.js';

export function AdminSummaryPrintButtons({ api }) {
  const [busy, setBusy] = useState('');

  function esc(value) {
    return String(value ?? '—').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function score(value) {
    const num = Number(value || 0);
    return Number.isFinite(num) ? num.toFixed(2) : '0.00';
  }

  function percent(value) {
    const num = Number(value || 0) * 100;
    return Number.isFinite(num) ? `${num.toFixed(0)}%` : '0%';
  }

  function table(headers, rows) {
    return `
      <table>
        <thead>
          <tr>${headers.map((item) => `<th>${esc(item)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.length
            ? rows.map((row) => `<tr>${row.map((item) => `<td>${esc(item)}</td>`).join('')}</tr>`).join('')
            : `<tr><td colspan="${headers.length}">No data available yet.</td></tr>`}
        </tbody>
      </table>
    `;
  }

  async function safeApi(path, fallback) {
    try {
      return await api(path);
    } catch {
      return fallback;
    }
  }

  async function loadSummaryData() {
    const [setup, prelim, prelimJudges, finalReadiness, finalResults, finalJudges, winner] =
      await Promise.all([
        safeApi('/api/setup', { contestants: [], criteria: [] }),
        safeApi('/api/results', []),
        safeApi('/api/judges/status', []),
        safeApi('/api/final/readiness', { ready: false, top_three: [], submitted_judges: 0, total_judges: 0 }),
        safeApi('/api/final/results', []),
        safeApi('/api/final/judges/status', []),
        safeApi('/api/winner', { winner_name: '', declared_at: null })
      ]);

    return { setup, prelim, prelimJudges, finalReadiness, finalResults, finalJudges, winner };
  }

  function preliminarySection(data) {
    const criteria = data.setup.criteria || [];
    const criteriaNames = criteria.map((item) => item.name);

    const mathRows = criteria.map((item) => [
      item.name,
      percent(item.weight),
      `Average judge score × ${Number(item.weight || 0).toFixed(2)}`
    ]);

    const resultHeaders = [
      'Rank',
      'Candidate',
      ...criteriaNames,
      'Preliminary Total',
      'Judges'
    ];

    const resultRows = (data.prelim || []).map((item, index) => [
      index + 1,
      `#${item.number} ${item.name}`,
      ...criteriaNames.map((name) => score(item.criteria_breakdown?.[name])),
      score(item.total_score),
      item.judges_submitted
    ]);

    const judgeRows = (data.prelimJudges || []).map((judge) => [
      judge.name,
      judge.submitted_at ? 'Submitted / Locked' : 'Editing',
      judge.score_count,
      judge.submitted_at ? formatDateTime(judge.submitted_at) : '—'
    ]);

    return `
      <section>
        <h2>Preliminary Round Summary</h2>
        <p>
          The Preliminary Round ranks all candidates and determines the official Top 3 finalists.
          Each criterion is averaged across judges, multiplied by its official weight, then summed.
        </p>

        <h3>Preliminary Round Formula</h3>
        <p class="formula">
          Preliminary Total = Production Number 10% + Fun Wear 15% + Preliminary Interview 20% +
          Advocacy Interview 25% + Long Gown 30%.
        </p>
        ${table(['Criterion', 'Weight', 'Formula'], mathRows)}

        <h3>Preliminary Ranking</h3>
        ${table(resultHeaders, resultRows)}

        <h3>Preliminary Judge Submission Status</h3>
        ${table(['Judge', 'Status', 'Score Entries', 'Submitted Time'], judgeRows)}
      </section>
    `;
  }

  function finalsSection(data) {
    const finalRows = (data.finalResults || []).map((item, index) => [
      index + 1,
      `#${item.number} ${item.name}`,
      score(item.criteria_breakdown?.['Beauty and Poise']),
      score(item.criteria_breakdown?.['Wit, Intelligence, and Quality of Answer']),
      score(item.final_score),
      score(item.pre_final_score),
      item.judges_submitted
    ]);

    const topThreeRows = (data.finalReadiness.top_three || []).map((item, index) => [
      index + 1,
      `#${item.number} ${item.name}`,
      score(item.pre_final_score)
    ]);

    const judgeRows = (data.finalJudges || []).map((judge) => [
      judge.name,
      judge.submitted_at ? 'Submitted / Locked' : 'Editing',
      judge.score_count,
      judge.submitted_at ? formatDateTime(judge.submitted_at) : '—'
    ]);

    return `
      <section>
        <h2>Finals Summary</h2>
        <p>
          The Top 3 candidates from the Preliminary Round proceed to the Finals.
          Winners are ranked by Finals score.
        </p>

        <h3>Official Top 3 Finalists</h3>
        ${table(['Preliminary Rank', 'Candidate', 'Preliminary Score'], topThreeRows)}

        <h3>Finals Formula</h3>
        <p class="formula">
          Finals Score = Beauty and Poise 60% + Wit, Intelligence, and Quality of Answer 40%.
        </p>
        ${table(['Finals Criterion', 'Weight', 'Formula'], [
          ['Beauty and Poise', '60%', 'Average judge score × 0.60'],
          ['Wit, Intelligence, and Quality of Answer', '40%', 'Average judge score × 0.40']
        ])}

        <h3>Finals Ranking</h3>
        ${table(
          ['Final Rank', 'Candidate', 'Beauty & Poise', 'Q&A', 'Finals Score', 'Preliminary Reference', 'Judges'],
          finalRows
        )}

        <h3>Finals Judge Submission Status</h3>
        ${table(['Judge', 'Status', 'Final Entries', 'Submitted Time'], judgeRows)}
      </section>
    `;
  }

  function programSection(data) {
    const prelimTop = (data.prelim || []).slice(0, 3).map((item, index) => [
      index + 1,
      `#${item.number} ${item.name}`,
      score(item.total_score)
    ]);

    const finalWinners = (data.finalResults || []).map((item, index) => [
      index + 1,
      index === 0 ? 'Winner' : index === 1 ? '1st Runner-Up' : index === 2 ? '2nd Runner-Up' : `Rank ${index + 1}`,
      `#${item.number} ${item.name}`,
      score(item.final_score)
    ]);

    return `
      <section>
        <h2>Whole Program Summary</h2>
        <p>
          This document summarizes the automated judging flow, scoring mechanics, lock status,
          Top 3 progression, Finals ranking, and official result computation.
        </p>

        <h3>Program Flow</h3>
        ${table(['Step', 'Description'], [
          ['1', 'Judges score all candidates in the Preliminary Round.'],
          ['2', 'Judges final-submit their Preliminary Round scores. Scores become locked.'],
          ['3', 'The system ranks candidates by Preliminary Total and identifies the official Top 3.'],
          ['4', 'Only the Top 3 proceed to the Finals.'],
          ['5', 'Judges score the Top 3 using Beauty and Poise 60% and Q&A 40%.'],
          ['6', 'Judges final-submit Finals scores. Scores become locked.'],
          ['7', 'The system ranks the Top 3 by Finals Score to determine Winner, 1st Runner-Up, and 2nd Runner-Up.']
        ])}

        <h3>Top 3 from Preliminary Round</h3>
        ${table(['Rank', 'Candidate', 'Preliminary Score'], prelimTop)}

        <h3>Official Finals Winners</h3>
        ${table(['Final Rank', 'Placement', 'Candidate', 'Finals Score'], finalWinners)}

        <h3>Declared Winner Record</h3>
        ${table(['Winner Name', 'Declared Time'], [[
          data.winner.winner_name || 'Not manually declared',
          data.winner.declared_at ? formatDateTime(data.winner.declared_at) : '—'
        ]])}
      </section>
    `;
  }

  function buildPrintableHtml(kind, data) {
    const title =
      kind === 'prelim'
        ? 'Preliminary Round Summary'
        : kind === 'finals'
          ? 'Finals Summary'
          : 'Whole Program Summary';

    const sections = [
      kind === 'prelim' || kind === 'full' ? preliminarySection(data) : '',
      kind === 'finals' || kind === 'full' ? finalsSection(data) : '',
      kind === 'full' ? programSection(data) : ''
    ].join('');

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${esc(title)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f1235;
              background: #ffffff;
              font-size: 9px;
              line-height: 1.22;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .cover {
              border: 1.4px solid #6d28d9;
              border-radius: 8px;
              padding: 7px 10px;
              margin: 0 0 6px;
              background: #f7f2ff;
            }

            .eyebrow {
              margin: 0 0 2px;
              color: #6d28d9;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              font-size: 7px;
            }

            h1 {
              margin: 0 0 2px;
              font-size: 16px;
              line-height: 1.05;
              letter-spacing: -0.02em;
            }

            h2 {
              margin: 7px 0 3px;
              font-size: 11px;
              color: #4c1d95;
              border-bottom: 0.6px solid #ddd6fe;
              padding-bottom: 2px;
            }

            h3 {
              margin: 5px 0 2px;
              font-size: 9px;
              color: #581c87;
            }

            p {
              margin: 0 0 3px;
            }

            .formula {
              padding: 4px 5px;
              border-radius: 5px;
              border: 0.6px solid #fde68a;
              background: #fffbeb;
              font-weight: 700;
              color: #78350f;
              margin-bottom: 4px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 3px 0 5px;
              page-break-inside: auto;
            }

            thead {
              display: table-header-group;
            }

            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }

            th,
            td {
              border: 0.5px solid #d8b4fe;
              padding: 2.2px 3px;
              vertical-align: top;
              text-align: left;
            }

            th {
              background: #ede9fe;
              color: #2e1065;
              font-weight: 800;
              text-transform: uppercase;
              font-size: 6.6px;
              letter-spacing: 0.03em;
            }

            td {
              font-size: 7.4px;
            }

            section {
              margin: 0;
              padding: 0;
              page-break-inside: auto;
            }

            .footer {
              margin-top: 6px;
              padding-top: 4px;
              border-top: 0.6px solid #ddd6fe;
              color: #6b5875;
              font-size: 7px;
            }

            @media screen {
              body {
                padding: 10px;
                background: #f4f0f7;
              }
            }
          </style>
        </head>
        <body>
          <div class="cover">
            <p class="eyebrow">Miss Poblacion Occidental Automated Judging System</p>
            <h1>${esc(title)}</h1>
            <p>Official scoring summary for verification and filing.</p>
          </div>

          ${sections}

          <div class="footer">
            <strong>Prepared by Kirjane Labs × Dev Siris</strong><br />
            Kirch automated judging, tabulation, locking, and audit history system.
          </div>

          <script>
            window.onload = () => {
              setTimeout(() => window.print(), 350);
            };
          </script>
        </body>
      </html>
    `;
  }

  async function printSummary(kind) {
    setBusy(kind);

    try {
      const data = await loadSummaryData();
      const printableHtml = buildPrintableHtml(kind, data);
      const win = window.open('', '_blank', 'width=1200,height=800');

      if (!win) {
        alert('Print window was blocked. Allow popups, then try again.');
        return;
      }

      win.document.open();
      win.document.write(printableHtml);
      win.document.close();
      win.focus();
    } catch (err) {
      alert(`Unable to generate summary: ${err.message}`);
    } finally {
      setBusy('');
    }
  }

  return (
    <section className="panel summary-print-panel">
      <div>
        <p className="eyebrow">PDF Summary Maker</p>
        <h3>Print Round Summaries</h3>
        <p>
          Opens a clean print-ready summary. In the print dialog, choose <strong>Save to PDF</strong>.
        </p>
      </div>

      <div className="summary-print-actions">
        <button className="btn btn-light" onClick={() => printSummary('prelim')} disabled={Boolean(busy)}>
          {busy === 'prelim' ? 'Preparing...' : 'Print Preliminary PDF'}
        </button>
        <button className="btn btn-light" onClick={() => printSummary('finals')} disabled={Boolean(busy)}>
          {busy === 'finals' ? 'Preparing...' : 'Print Finals PDF'}
        </button>
        <button className="btn btn-primary" onClick={() => printSummary('full')} disabled={Boolean(busy)}>
          {busy === 'full' ? 'Preparing...' : 'Print Full Program PDF'}
        </button>
      </div>
    </section>
  );
}
