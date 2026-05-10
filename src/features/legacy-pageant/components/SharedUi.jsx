import React, { useState } from 'react';
import { formatDateTime } from '../utils/formatting.js';

export function LoginCard({ title, description, placeholder, buttonText, onSubmit, onBack }) {
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

export function WinnerAnnouncement({ winnerName, declaredAt }) {
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

export function DeveloperCredits() {
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

export function TVCreditFooter() {
  return (
    <footer className="tv-credit-footer site-footer compact-footer">
      <div className="compact-footer-inner">
        <strong>Miss Poblacion Occidental Automated Judging System</strong>
        <p>© 2026 All rights reserved. Happy Fiesta from Kirjane Labs × Dev Siris.</p>

        <div className="compact-dev-lines">
          <p>
            <strong>Kirjane Labs</strong> — Kirch Ivan A. Balite · 094863238533 ·{' '}
            <a href="mailto:kirchbalite.careers@gmail.com">kirchbalite.careers@gmail.com</a>
            {' '}· Facebook: Kirch Ivan
          </p>

          <p>
            <strong>Dev Siris</strong> — Osiris Kedgidagash Palac · 09694213824 ·{' '}
            <a href="mailto:palac.osiriskedgidagash@gmail.com">palac.osiriskedgidagash@gmail.com</a>
            {' '}· Facebook: Siris Palac
          </p>
        </div>
      </div>
    </footer>
  );
}

export function SiteFooter() {
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

export function ErrorPanel({ title, message }) {
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

export function LoadingPanel({ text }) {
  return (
    <main className="login-wrap">
      <section className="panel login-card">
        <div className="spinner" />
        <h2>{text}</h2>
      </section>
    </main>
  );
}
