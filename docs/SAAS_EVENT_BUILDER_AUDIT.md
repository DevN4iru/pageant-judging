# SaaS Event Builder Audit

## Current State

The current pageant judging system is a working single-event app. It is not yet SaaS/event-builder based.

Current hardcoded assumptions found:

- 5 judges
- 8 contestants
- fixed judge PINs
- fixed preliminary criteria
- fixed finals criteria
- fixed Top 3 progression
- fixed event branding
- fixed PDF text
- fixed TV display labels
- special final round tables and routes

## SaaS Requirement

All current hardcoded mechanics must become default templates only.

The admin dashboard must become the source of truth for:

- contestants
- judges
- judge credentials
- rounds
- criteria
- criteria weights
- advancing finalist count
- score locks
- audit logs
- branding
- TV display settings
- PDF/export settings

## Current High-Risk Files

### Backend

- api/index.js
- schema.sql
- migration-final-interview.sql
- migration-lock-audit.sql
- migration-eight-contestants.sql
- update-5-judges-8-contestants.sql
- update-actual-criteria.sql
- fix-official-weights.sql

### Frontend

- src/App.jsx
- src/styles.css
- index.html

### Tests / Docs

- scripts/feature-test-final-flow.mjs
- README.md

## Safe Refactor Order

1. Keep current working flow stable.
2. Add SaaS/event-builder tables without deleting old tables yet.
3. Add a default event record.
4. Attach existing contestants, judges, criteria, scores, and settings to the default event.
5. Convert hardcoded Top 3 into event/round setting.
6. Convert finals criteria into database criteria.
7. Convert final_scores into generic round scores.
8. Add admin builder pages.
9. Add event-scoped judge credentials.
10. Move branding/PDF/TV labels into event settings.
11. Add complete audit log coverage.
12. Only then remove old hardcoded routes/tables.

## Do Not Hardcode

- contestant count
- judge count
- judge PINs
- criteria names
- weights
- Top 3
- pageant title
- PDF footer
- TV display labels
