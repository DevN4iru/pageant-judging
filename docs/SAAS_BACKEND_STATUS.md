# SaaS Backend Status

## Completed in Hardening Pass

- Modular SaaS backend helpers for audit, security, and scoring engine logic.
- Secure judge PIN hashing using Node crypto PBKDF2.
- Judge PIN login rate limiting.
- Submission completeness validation before final submit.
- Admin reopen judge submission endpoint.
- Final declaration endpoint with result snapshot and event freeze.
- Finalized event reopen endpoint with reason and audit.
- Custom candidate pool endpoints using round_candidate_pool.
- Event creation from template endpoint.
- Printable HTML results export endpoint.
- Plan-aware contestant limit enforcement.
- SaaS backend smoke test script.

## Local URLs

Use the Vite port printed by npm run dev.

Legacy app: /
SaaS builder: ?builder=saas
SaaS judge portal: ?score=saas
SaaS TV: ?tv=saas&eventId=1

## Verification

npm run build
node -c api/modules/saas/saas.routes.js
find api/modules/saas -name "*.js" -print -exec node -c {} \;
API=http://127.0.0.1:3001 node scripts/saas/smoke-backend.mjs

## Remaining Risks

- Full admin login UI/session is still not wired into the frontend.
- Printable HTML export exists; hosted PDF file storage is not implemented.
- Rate limiting is in-memory and should be moved to Redis or database for multi-instance SaaS.
