# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 108 lines

## Extracted So Far

- `utils/apiClient.js`: legacy fetch API helper
- `utils/session.js`: `getSavedJudge`
- `utils/formatting.js`: `formatDateTime`
- `components/CriteriaGuide.jsx`: criteria guide constants/components
- `components/SharedUi.jsx`: shared UI components
- `components/AdminSummaryPrintButtons.jsx`: print/PDF summary component
- `components/Home.jsx`: landing screen
- `tv/TvDisplays.jsx`: TV finalist and winners displays
- `judge/JudgePanels.jsx`: preliminary judge panel and finals judge panel
- `admin/AdminPanels.jsx`: preliminary admin dashboard and finals admin panel

## Top-Level Components and Functions

| Line | Type | Name |
|---:|---|---|
| 11 | shell/component | `App` |
| 27 | helper/function | `logout` |

## Current State

`LegacyPageantApp.jsx` is now a thin legacy shell. The previous frontend god file has been split into focused modules.

## Next Recommended Work

1. Runtime smoke test judge login, admin login, TV mode, PDF print, preliminary scoring, finals scoring.
2. Stop splitting frontend unless a file approaches 1,000 lines.
3. Start SaaS event-builder database migration work.

## Rule

Do not change scoring formulas, API routes, or labels until the legacy split is verified in browser.
