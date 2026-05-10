# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 1238 lines

## Extracted So Far

- `utils/session.js`: `getSavedJudge`
- `utils/formatting.js`: `formatDateTime`
- `components/CriteriaGuide.jsx`: criteria guide constants/components
- `components/SharedUi.jsx`: shared UI components
- `components/AdminSummaryPrintButtons.jsx`: print/PDF summary component
- `components/Home.jsx`: landing screen
- `tv/TvDisplays.jsx`: TV finalist and winners displays

## Top-Level Components and Functions

| Line | Type | Name |
|---:|---|---|
| 41 | helper/function | `logout` |
| 123 | component/function | `JudgePanel` |
| 166 | helper/function | `candidateSubtotal` |
| 348 | component/function | `FinalInterviewJudgePanel` |
| 393 | helper/function | `candidateFinalSubtotal` |
| 596 | component/function | `FinalInterviewAdminPanel` |
| 855 | component/function | `AdminPanel` |
| 856 | helper/function | `openTvMode` |

## Suggested Split Order

1. Extract judge panels.
2. Extract admin panels.
3. Extract API helper once panel dependencies are separated.

## Rule

Move code mechanically. Do not change scoring formulas, API routes, or labels during extraction.
