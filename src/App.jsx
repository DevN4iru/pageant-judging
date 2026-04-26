import React from 'react';

export default function App() {
  return (
    <main className="closed-page">
      <section className="closed-card">
        <img
          src="/pageant-logo.jpg"
          alt="Miss Poblacion Occidental 2026 Logo"
          className="closed-logo"
        />

        <p className="eyebrow">System Closed</p>
        <h1>Miss Poblacion Occidental 2026</h1>
        <h2>Judging and tabulation has been completed.</h2>

        <p>
          This automated judging system is now closed. Thank you for using the
          official scoring and tabulation platform.
        </p>

        <div className="credits">
          <strong>Kirjane Labs × Dev Siris</strong>
          <span>Full-Stack Developers</span>
          <p>Kirch Ivan A. Balite</p>
          <p>Osiris Kedigadash Palac</p>
        </div>

        <small>© 2026 All rights reserved.</small>
      </section>
    </main>
  );
}
