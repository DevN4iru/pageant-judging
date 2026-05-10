# SaaS Event Builder File Map

This document defines the future folder/file direction for the SaaS version of the pageant judging system.

## Existing God Files To Break Down Later

### `src/App.jsx`

Current risk:
- landing page
- judge login
- admin login
- judge scoring
- finals scoring
- admin dashboard
- TV display
- PDF summary maker
- footer/branding
- winner display

Target:
- keep `src/App.jsx` as a thin app shell only
- move feature logic into `src/features/*`

### `api/index.js`

Current risk:
- Express setup
- auth routes
- setup routes
- scoring routes
- final round routes
- results routes
- audit routes
- winner routes

Target:
- keep `api/index.js` as server bootstrap only
- move route groups and logic into `api/modules/*`

### `src/styles.css`

Current risk:
- global UI
- admin UI
- judge UI
- TV UI
- footer UI
- PDF print UI
- finals UI

Target:
- keep global/base styles only
- later split feature styles by module if needed

## New Backend Module Folders

### `api/modules/events`

For event CRUD, event settings, event status, and event-level rules.

Future files:
- `events.routes.js`
- `events.service.js`
- `events.repository.js`
- `events.validators.js`

### `api/modules/contestants`

For contestant CRUD per event.

Future files:
- `contestants.routes.js`
- `contestants.service.js`
- `contestants.repository.js`
- `contestants.validators.js`

### `api/modules/judges`

For judge CRUD per event.

Future files:
- `judges.routes.js`
- `judges.service.js`
- `judges.repository.js`
- `judges.validators.js`

### `api/modules/credentials`

For event-scoped judge credentials and PIN/password reset.

Future files:
- `credentials.routes.js`
- `credentials.service.js`
- `credentials.repository.js`
- `credentials.validators.js`

### `api/modules/rounds`

For round builder, round locking, round order, advancement rules, and carry-over rules.

Future files:
- `rounds.routes.js`
- `rounds.service.js`
- `rounds.repository.js`
- `rounds.validators.js`

### `api/modules/criteria`

For criteria CRUD and 100% weight validation per round.

Future files:
- `criteria.routes.js`
- `criteria.service.js`
- `criteria.repository.js`
- `criteria.validators.js`

### `api/modules/scoring`

For score entry, score validation, scoring formulas, ranking, and computation.

Future files:
- `scores.routes.js`
- `scores.service.js`
- `scores.repository.js`
- `score-calculator.js`
- `rankings.js`
- `score-locks.js`

Do not create one giant `ScoringEngine.js`.

### `api/modules/submissions`

For judge final-submit records and score lock status.

Future files:
- `submissions.routes.js`
- `submissions.service.js`
- `submissions.repository.js`

### `api/modules/results`

For result snapshots, declared results, placements, and official finalization.

Future files:
- `results.routes.js`
- `results.service.js`
- `results.repository.js`
- `result-snapshots.js`

### `api/modules/audit-logs`

For centralized audit logs.

Future files:
- `audit-logs.routes.js`
- `audit-logs.service.js`
- `audit-logs.repository.js`
- `audit-event-types.js`

### `api/modules/display-settings`

For TV display settings and branding values.

Future files:
- `display-settings.routes.js`
- `display-settings.service.js`
- `display-settings.repository.js`

### `api/modules/pdf-exports`

For PDF/export logs, export settings, and export templates.

Future files:
- `pdf-exports.routes.js`
- `pdf-exports.service.js`
- `pdf-exports.repository.js`

### `api/modules/templates`

For Pageant Standard, School Pageant, Talent Competition, and Blank Event templates.

Future files:
- `templates.routes.js`
- `templates.service.js`
- `templates.repository.js`
- `template-installer.js`

### `api/modules/shared`

For shared backend helpers only.

Future files:
- `db.js`
- `errors.js`
- `async-handler.js`
- `request-context.js`
- `pagination.js`

## New Frontend Feature Folders

### `src/features/event-builder/pages`

Required future pages:
- `EventSettingsPage.jsx`
- `ContestantsPage.jsx`
- `JudgesPage.jsx`
- `RoundsCriteriaPage.jsx`
- `ScoringMonitorPage.jsx`
- `ResultsPage.jsx`
- `TvDisplaySettingsPage.jsx`
- `PdfExportCenterPage.jsx`
- `AuditLogsPage.jsx`

Do not create one giant `EventBuilderDashboard.jsx`.

### `src/features/event-builder/components`

Reusable event-builder UI parts.

Future files:
- `BuilderShell.jsx`
- `BuilderNav.jsx`
- `WeightTotalBadge.jsx`
- `RoundCard.jsx`
- `CriterionRow.jsx`
- `ContestantForm.jsx`
- `JudgeForm.jsx`
- `LockStatusBadge.jsx`

### `src/features/event-builder/hooks`

Future files:
- `useEventSettings.js`
- `useContestants.js`
- `useJudges.js`
- `useRounds.js`
- `useCriteria.js`
- `useAuditLogs.js`

### `src/features/event-builder/services`

Future files:
- `eventBuilderApi.js`
- `contestantsApi.js`
- `judgesApi.js`
- `roundsApi.js`
- `criteriaApi.js`

### `src/features/judge-scoring`

For judge scoring screen only.

Future files:
- `JudgeScoringPage.jsx`
- `JudgeRoundScoreSheet.jsx`
- `JudgeSubmitLockPanel.jsx`

### `src/features/admin-scoring-monitor`

For live scoring monitor only.

Future files:
- `ScoringMonitorPage.jsx`
- `JudgeSubmissionTable.jsx`
- `RoundProgressPanel.jsx`

### `src/features/results`

For results and rankings only.

Future files:
- `ResultsPage.jsx`
- `RankingTable.jsx`
- `ResultSnapshotPanel.jsx`
- `FinalDeclarationPanel.jsx`

### `src/features/tv-display`

For TV display only.

Future files:
- `TvDisplayRouter.jsx`
- `TvFinalistsDisplay.jsx`
- `TvWinnersDisplay.jsx`
- `TvCreditFooter.jsx`

### `src/features/pdf-export`

For PDF/export UI only.

Future files:
- `PdfExportCenterPage.jsx`
- `PrintableSummaryTemplate.jsx`
- `ExportHistoryTable.jsx`

### `src/features/audit-logs`

For audit log UI only.

Future files:
- `AuditLogsPage.jsx`
- `AuditLogTable.jsx`
- `AuditLogFilters.jsx`

### `src/features/branding`

For event branding controls and display helpers.

Future files:
- `BrandingPanel.jsx`
- `EventLogoUploader.jsx`
- `ThemeColorPicker.jsx`

## New Shared Frontend Folders

### `src/components/layout`

App shell and layout components only.

### `src/components/ui`

Small reusable UI primitives only.

### `src/lib/api`

API client helpers only.

### `src/lib/scoring`

Frontend scoring helpers only. Backend remains source of truth.

### `src/lib/validation`

Frontend validation helpers only.

## Database Folder

### `database/migrations/saas`

Future SaaS migrations.

Suggested first migration:
- `001_create_saas_event_builder_tables.sql`

### `database/seeds/templates`

Future template seed data.

Suggested files:
- `pageant-standard-template.sql`
- `school-pageant-template.sql`
- `talent-competition-template.sql`
- `blank-event-template.sql`

### `database/schema`

Future schema notes or snapshots.

## Rule

No new file should grow past 500 lines without review.

Any file approaching 1,000 lines must be split into a folder/module before continuing.
