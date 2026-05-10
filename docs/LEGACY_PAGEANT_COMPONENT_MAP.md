# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 122 lines

## Extracted So Far

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
| 41 | helper/function | `logout` |

## Suggested Split Order

1. Extract `api` helper into `utils/apiClient.js`.
2. Keep `LegacyPageantApp.jsx` as the legacy shell only.
3. Start SaaS event-builder schema work after confirming runtime behavior.

## Rule

Move code mechanically. Do not change scoring formulas, API routes, or labels during extraction.
