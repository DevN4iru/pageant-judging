# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 1967 lines

## Extracted So Far

- `utils/session.js`: `getSavedJudge`
- `utils/formatting.js`: `formatDateTime`
- `components/CriteriaGuide.jsx`: `CRITERIA_GUIDE`, `getCriteriaGuide`, `CriteriaNote`, `CriteriaOverview`
- `components/SharedUi.jsx`: `LoginCard`, `WinnerAnnouncement`, `DeveloperCredits`, `TVCreditFooter`, `SiteFooter`, `ErrorPanel`, `LoadingPanel`

## Top-Level Components and Functions

| Line | Type | Name |
|---:|---|---|
| 22 | component/function | `AdminSummaryPrintButtons` |
| 25 | helper/function | `esc` |
| 35 | helper/function | `score` |
| 40 | helper/function | `percent` |
| 45 | helper/function | `table` |
| 83 | helper/function | `preliminarySection` |
| 140 | helper/function | `finalsSection` |
| 196 | helper/function | `programSection` |
| 244 | helper/function | `buildPrintableHtml` |
| 490 | helper/function | `logout` |
| 572 | component/function | `Home` |
| 627 | component/function | `JudgePanel` |
| 670 | helper/function | `candidateSubtotal` |
| 852 | component/function | `FinalInterviewJudgePanel` |
| 897 | helper/function | `candidateFinalSubtotal` |
| 1100 | component/function | `FinalInterviewAdminPanel` |
| 1359 | component/function | `AdminPanel` |
| 1360 | helper/function | `openTvMode` |
| 1743 | component/function | `TVWinnersDisplay` |
| 1856 | component/function | `TVTop3Display` |
| 1898 | helper/function | `preFinalScore` |

## Suggested Split Order

1. Extract print summary logic.
2. Extract judge panels.
3. Extract admin panels.
4. Extract TV display panels.
5. Extract API helper once dependencies are clear.

## Rule

Move code mechanically. Do not change scoring formulas, API routes, or labels during extraction.
