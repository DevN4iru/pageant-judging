import React, { useState } from 'react';
import { getSavedJudge } from './utils/session.js';
import { LoginCard, SiteFooter } from './components/SharedUi.jsx';
import { AdminSummaryPrintButtons } from './components/AdminSummaryPrintButtons.jsx';
import { Home } from './components/Home.jsx';
import { TVTop3Display, TVWinnersDisplay } from './tv/TvDisplays.jsx';
import { JudgePanel } from './judge/JudgePanels.jsx';
import { AdminPanel } from './admin/AdminPanels.jsx';

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
      {admin && <AdminPanel api={api} />}

      <SiteFooter />
    </div>
  );
}

