# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 766 lines

## Extracted So Far

- `utils/session.js`: `getSavedJudge`
- `utils/formatting.js`: `formatDateTime`
- `components/CriteriaGuide.jsx`: criteria guide constants/components
- `components/SharedUi.jsx`: shared UI components
- `components/AdminSummaryPrintButtons.jsx`: print/PDF summary component
- `components/Home.jsx`: landing screen
- `tv/TvDisplays.jsx`: TV finalist and winners displays
- `judge/JudgePanels.jsx`: preliminary judge panel and finals judge panel

## Top-Level Components and Functions

| Line | Type | Name |
|---:|---|---|
| 42 | helper/function | `logout` |
| 124 | component/function | `FinalInterviewAdminPanel` |
| 383 | component/function | `AdminPanel` |
| 384 | helper/function | `openTvMode` |

## Suggested Split Order

1. Extract admin panels.
2. Extract API helper once admin dependencies are separated.
3. Convert legacy panels into event-builder modules after behavior is stable.

## Rule

Move code mechanically. Do not change scoring formulas, API routes, or labels during extraction.
