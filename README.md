# 👑 Miss Poblacion Occidental 2026 — Automated Judging System

A web-based judging, live tabulation, locking, audit history, and winner declaration system built for **Miss Poblacion Occidental 2026**.

This project was created to replace manual paper-based scoring with a faster, cleaner, and more transparent system where each judge can score on their own device while the tabulator/admin laptop automatically computes official results.

---

## ✨ Project Status

✅ **Finished / Completed Project**  
✅ Ready for pageant-night use  
✅ Supports judge devices, admin tabulation, score locking, audit logs, and winner declaration  
✅ PDF/certificate print idea removed from the final scope

---

## 🔗 Live Project

Production URL:

```txt
https://pageant-judging.vercel.app
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend/API | Node.js + Express.js |
| Database | PostgreSQL / Neon |
| Deployment | Vercel |
| Styling | CSS |

---

## 🎯 Main Purpose

The system is designed for a pageant setup with:

- **5 judges** using separate devices
- **8 contestants**
- **1 admin/tabulator laptop**
- Live automatic tabulation
- Weighted criteria scoring
- Score lock after final submit
- Audit trail for transparency
- Winner declaration banner

---

## 🧮 Scoring Logic

Each judge scores every contestant using official criteria. Each criterion is entered as a score out of **100**, but it contributes only according to its assigned weight.

| Criteria | Input Max | Weight / Contribution |
|---|---:|---:|
| Production Number | 100 | 10% |
| Fun Wear | 100 | 15% |
| Preliminary Interview | 100 | 20% |
| Advocacy Interview | 100 | 25% |
| Long Gown | 100 | 30% |
| **Total** | — | **100%** |

Example:

```txt
Production Number: 100 × 0.10 = 10
Fun Wear: 100 × 0.15 = 15
Preliminary Interview: 100 × 0.20 = 20
Advocacy Interview: 100 × 0.25 = 25
Long Gown: 100 × 0.30 = 30

Final Total = 100
```

The admin dashboard averages judge scores per criterion, applies the criteria weights, and ranks candidates by final weighted total.

---

## ✅ Core Features

### Judge Panel

- Judge PIN login
- Candidate-by-candidate scoring
- Criteria notes / judging guide
- Auto-save after score input
- Progress counter showing completed fields
- Final Submit & Lock button
- Locked scores cannot be edited after final submission

### Admin / Tabulator Dashboard

- Admin PIN login
- Live tabulation dashboard
- Auto-refresh every 3 seconds
- Ranking table with criteria breakdown
- Judge submission status
- Number of submitted judges
- Score details per judge
- Audit history with timestamp
- Declare Winner button
- Clear Winner button

### Transparency / Anti-Dispute Features

- Every score edit is recorded
- History includes old score, new score, judge, contestant, criterion, action, and exact timestamp
- Final submit locks judge scores
- Admin can check if a judge has submitted or is still editing
- Criteria breakdown is visible beside final total

---

## 🔐 User Roles

### Judge Device

Judges open the live URL, choose **Judge Device**, and enter their assigned PIN. They can score until they click **Final Submit & Lock**.

### Admin / Tabulator Laptop

The tabulator opens the live URL, chooses **Admin Dashboard**, and enters the admin PIN. The dashboard shows live rankings, score details, judge lock status, and audit logs.

> Security note: never commit real production secrets, Neon connection strings, or admin PINs to GitHub. Use `.env` locally and Vercel Environment Variables for production.

---

## 📁 File Structure

```txt
pageant-judging/
├── api/
│   ├── db.js                         # PostgreSQL connection pool
│   └── index.js                      # Express API routes
│
├── public/
│   └── pageant-logo.jpg              # Miss Poblacion Occidental logo
│
├── src/
│   ├── App.jsx                       # Main React app, judge/admin UI, winner banner
│   ├── main.jsx                      # React entry point
│   └── styles.css                    # Full app styling
│
├── .env                              # Local environment variables; do not commit secrets
├── .gitignore                        # Git ignored files
├── index.html                        # Vite HTML entry
├── package.json                      # Scripts and dependencies
├── package-lock.json                 # Dependency lock file
├── schema.sql                        # Base database schema and seed data
├── migration-lock-audit.sql          # Score lock and audit history tables
├── migration-winner-announcement.sql # Winner announcement setting table
├── update-5-judges-8-contestants.sql # Seeds 5 judges and 8 contestants
├── update-actual-criteria.sql        # Official weighted criteria
├── fix-official-weights.sql          # Criteria weight correction script
├── vercel.json                       # Vercel routing/build config
└── README.md                         # Project documentation
```

---

## ⚙️ Environment Variables

Create a local `.env` file:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/dbname?sslmode=require"
ADMIN_PIN="your-admin-pin"
```

For Vercel deployment, add the same variables in:

```txt
Vercel Dashboard → Project → Settings → Environment Variables
```

Required variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon/PostgreSQL connection string |
| `ADMIN_PIN` | Admin dashboard PIN |

---

## 🚀 Local Setup Guide

### 1. Clone the repository

```bash
git clone https://github.com/DevN4iru/pageant-judging.git
cd pageant-judging
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env`

```bash
cat > .env <<'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@HOST/dbname?sslmode=require"
ADMIN_PIN="your-admin-pin"
EOF
```

### 4. Prepare the database

Run the base schema first, then migrations/updates.

If using a SQL editor such as Neon SQL Editor, paste and run:

```txt
schema.sql
migration-lock-audit.sql
migration-winner-announcement.sql
update-5-judges-8-contestants.sql
update-actual-criteria.sql
fix-official-weights.sql
```

Or run SQL files using your preferred PostgreSQL client.

### 5. Start development server

```bash
npm run dev
```

Local app usually opens at:

```txt
http://localhost:5173
```

If port 5173 is already used, Vite will show another port.

---

## 🧪 Build Test

Before deploying, always run:

```bash
npm run build
```

If this succeeds, the app is safe to deploy.

---

## 🌍 Deploy to Vercel

### 1. Login to Vercel

```bash
npx vercel login
```

### 2. Deploy production

```bash
npx vercel --prod
```

### 3. Confirm live URL

```txt
https://pageant-judging.vercel.app
```

Important: share only the production `.vercel.app` link with judges. Do not share Vercel dashboard, OAuth, or deployment-protection links.

---

## 🧑‍⚖️ How to Use During the Event

### Judge Workflow

1. Open the live URL.
2. Click **Judge Device**.
3. Enter assigned judge PIN.
4. Score each contestant per criterion.
5. Review all fields.
6. Click **Final Submit & Lock**.
7. Once locked, the judge cannot edit scores anymore.

### Admin Workflow

1. Open the live URL on the tabulator laptop.
2. Click **Admin Dashboard**.
3. Enter admin PIN.
4. Monitor live ranking.
5. Use **Show Details** to inspect score entries.
6. Use **Show History** to inspect edit logs.
7. Use **Declare Winner** when the committee is ready.
8. Use **Clear Winner** only if the declared winner needs to be removed/reset.

---

## 🧹 Clean / Reset Data

To clear event/test data while keeping judges, contestants, criteria, and PINs:

```bash
node - <<'NODE'
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query(`
      DELETE FROM score_history;
      DELETE FROM judge_submissions;
      DELETE FROM scores;
      DELETE FROM app_settings WHERE key = 'declared_winner';
    `);

    console.log('Cleaned scores, locks, history, and declared winner.');
  } catch (err) {
    console.error(err.message);
  } finally {
    await pool.end();
  }
}

main();
NODE
```

After reset:

```txt
Totals = 0.00
Judges submitted = 0
History = empty
Winner banner = removed
Judges can score again
```

---

## 🗃️ Database Tables

| Table | Purpose |
|---|---|
| `judges` | Stores judge names and PINs |
| `contestants` | Stores contestant number/name/category |
| `criteria` | Stores criteria, max score, weight, and order |
| `scores` | Stores current saved score per judge/contestant/criterion |
| `judge_submissions` | Stores final submit lock status |
| `score_history` | Stores score edit audit trail |
| `app_settings` | Stores declared winner and app-level settings |

---

## 🔌 API Overview

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | API health check |
| `/api/setup` | GET | Fetch contestants and criteria |
| `/api/judge/login` | POST | Judge PIN login |
| `/api/admin/login` | POST | Admin PIN login |
| `/api/judge/:judgeId/scores` | GET | Fetch saved judge scores |
| `/api/judge/:judgeId/status` | GET | Fetch judge lock/progress status |
| `/api/scores` | POST | Save or update score |
| `/api/judge/:judgeId/submit` | POST | Final submit and lock scores |
| `/api/judges/status` | GET | Fetch all judge status rows |
| `/api/results` | GET | Fetch ranked weighted results |
| `/api/results/details` | GET | Fetch detailed score table |
| `/api/history` | GET | Fetch audit history |
| `/api/winner` | GET | Fetch declared winner |
| `/api/winner` | POST | Declare winner |
| `/api/winner` | DELETE | Clear declared winner |

---

## 🧯 Troubleshooting

### Site keeps loading

Check these URLs:

```txt
https://pageant-judging.vercel.app/api/health
https://pageant-judging.vercel.app/api/setup
https://pageant-judging.vercel.app/api/results
```

If the API works but the page is stuck, hard refresh:

```txt
Ctrl + Shift + R
```

Or clear local saved login state in browser console:

```js
localStorage.clear();
location.href = '/';
```

### Judges see Vercel login or request access

They are opening the wrong Vercel page. Send only:

```txt
https://pageant-judging.vercel.app
```

Do not send:

```txt
vercel.com/...
vercel.app/login
preview deployment URLs
Vercel OAuth URLs
```

### Build fails

Run:

```bash
npm run build
```

Fix the first error shown before deploying.

---

## 👨‍💻 Developers / Credits

Built as a collaboration of:

### Kirjane Labs

**Kirch Ivan A. Balite**  
Email: `kirchbalite.careers@gmail.com`  
Phone: `09486328353`  
Facebook: Kirch Ivan

### Dev Siris

**Osiris Kedigadash Palac**  
Email: `palac.osiriskedigadash@gmail.com`  
Phone: `09694213824`  
Facebook: Siris Palac

---

## 📌 Final Notes

This system was built for transparent, faster, and traceable pageant scoring. Judges can score independently, the tabulator can monitor live results, and the committee can verify score changes through the audit history.

**Happy Fiesta from Kirjane Labs × Dev Siris.**
