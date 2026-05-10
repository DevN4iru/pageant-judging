# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 1516 lines

## Extracted So Far

- `utils/session.js`: `getSavedJudge`
- `utils/formatting.js`: `formatDateTime`
- `components/CriteriaGuide.jsx`: `CRITERIA_GUIDE`, `getCriteriaGuide`, `CriteriaNote`, `CriteriaOverview`
- `components/SharedUi.jsx`: `LoginCard`, `WinnerAnnouncement`, `DeveloperCredits`, `TVCreditFooter`, `SiteFooter`, `ErrorPanel`, `LoadingPanel`
- `components/AdminSummaryPrintButtons.jsx`: print/PDF summary component and its internal HTML helpers

## Top-Level Components and Functions

| Line | Type | Name |
|---:|---|---|
| 39 | helper/function | `logout` |
| 121 | component/function | `Home` |
| 176 | component/function | `JudgePanel` |
| 219 | helper/function | `candidateSubtotal` |
| 401 | component/function | `FinalInterviewJudgePanel` |
| 446 | helper/function | `candidateFinalSubtotal` |
| 649 | component/function | `FinalInterviewAdminPanel` |
| 908 | component/function | `AdminPanel` |
| 909 | helper/function | `openTvMode` |
| 1292 | component/function | `TVWinnersDisplay` |
| 1405 | component/function | `TVTop3Display` |
| 1447 | helper/function | `preFinalScore` |

## Suggested Split Order

1. Extract `Home` into a small landing component.
2. Extract TV display panels.
3. Extract judge panels.
4. Extract admin panels.
5. Extract API helper once panel dependencies are separated.

## Rule

Move code mechanically. Do not change scoring formulas, API routes, or labels during extraction.
