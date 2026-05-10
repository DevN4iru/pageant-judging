# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 2169 lines

## Extracted So Far

- `utils/session.js`: `getSavedJudge`
- `utils/formatting.js`: `formatDateTime`
- `components/CriteriaGuide.jsx`: `CRITERIA_GUIDE`, `getCriteriaGuide`, `CriteriaNote`, `CriteriaOverview`

## Top-Level Components and Functions

| Line | Type | Name |
|---:|---|---|
| 21 | component/function | `AdminSummaryPrintButtons` |
| 24 | helper/function | `esc` |
| 34 | helper/function | `score` |
| 39 | helper/function | `percent` |
| 44 | helper/function | `table` |
| 82 | helper/function | `preliminarySection` |
| 139 | helper/function | `finalsSection` |
| 195 | helper/function | `programSection` |
| 243 | helper/function | `buildPrintableHtml` |
| 489 | helper/function | `logout` |
| 571 | component/function | `Home` |
| 626 | component/function | `LoginCard` |
| 676 | component/function | `JudgePanel` |
| 719 | helper/function | `candidateSubtotal` |
| 901 | component/function | `FinalInterviewJudgePanel` |
| 946 | helper/function | `candidateFinalSubtotal` |
| 1149 | component/function | `FinalInterviewAdminPanel` |
| 1408 | component/function | `AdminPanel` |
| 1409 | helper/function | `openTvMode` |
| 1792 | component/function | `WinnerAnnouncement` |
| 1818 | component/function | `DeveloperCredits` |
| 1860 | component/function | `TVCreditFooter` |
| 1885 | component/function | `TVWinnersDisplay` |
| 1998 | component/function | `TVTop3Display` |
| 2040 | helper/function | `preFinalScore` |
| 2110 | component/function | `SiteFooter` |
| 2137 | component/function | `ErrorPanel` |
| 2160 | component/function | `LoadingPanel` |

## Suggested Split Order

1. Extract pure helpers first.
2. Extract small shared UI components.
3. Extract judge panels.
4. Extract admin panels.
5. Extract TV display panels.
6. Extract PDF/print summary logic last.

## Rule

Move code mechanically. Do not change scoring formulas, API routes, or labels during extraction.
