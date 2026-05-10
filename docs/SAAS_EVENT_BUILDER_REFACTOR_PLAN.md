# SaaS Event Builder Refactor Plan

## Phase 0: Protect Current Stable App

Do not delete or rename these yet:

- `/api/final/*`
- `final_scores`
- `final_judge_submissions`
- `FinalInterviewJudgePanel`
- `FinalInterviewAdminPanel`

They are still part of the stable working flow.

## Phase 1: Add Skeleton and Documentation

Purpose:
- create safe folder structure
- document future split
- prevent new god files

No runtime behavior changes.

## Phase 2: Add Compatibility Database Layer

Add SaaS tables while keeping old tables working.

New tables should include:

- organizations
- users
- events
- event_templates
- contestants with event_id
- judges with event_id
- judge_credentials
- rounds
- criteria linked to rounds
- scores linked to event and round
- submissions linked to event and round
- result_snapshots
- audit_logs
- display_settings
- pdf_exports

## Phase 3: Default Event Adapter

Create one default event that wraps the current working pageant.

Current fixed mechanics become template data.

## Phase 4: Builder Pages

Add admin pages:

- Event Settings
- Contestants
- Judges
- Rounds & Criteria
- Scoring Monitor
- Results
- TV Display Settings
- PDF / Export Center
- Audit Logs

## Phase 5: Replace Hardcoded Progression

Replace fixed Top 3 with:

- `rounds.advancing_count`
- `rounds.advancement_rule`
- `rounds.score_carry_mode`

## Phase 6: Replace Hardcoded Finals

Move finals criteria from code into database criteria under a round.

## Phase 7: Generic Round Scoring

Replace special final tables with generic round score tables.

## Phase 8: SaaS Branding

Move event title, logo, TV labels, PDF footer, prepared-by text, and credits into settings.

## Phase 9: Audit Everything

Every after-submission edit, unlock, reset, PDF generation, and final declaration must create audit logs.
