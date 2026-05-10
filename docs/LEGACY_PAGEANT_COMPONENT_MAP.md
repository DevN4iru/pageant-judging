# Legacy Pageant JSX Component Map

Generated from `src/features/legacy-pageant/LegacyPageantApp.jsx`.

Purpose: split the remaining JSX god file without rewriting scoring logic.

## File Size

- `LegacyPageantApp.jsx`: 2299 lines

## Import Lines

- Import block starts near line 1 and ends near line 1.

## Top-Level Components and Functions

| Line | Type | Name |
|---:|---|---|
| 18 | helper/function | `getSavedJudge` |
| 26 | helper/function | `formatDateTime` |
| 39 | component/const | `CRITERIA_GUIDE` |
| 92 | helper/function | `getCriteriaGuide` |
| 100 | component/function | `CriteriaNote` |
| 120 | component/function | `CriteriaOverview` |
| 151 | component/function | `AdminSummaryPrintButtons` |
| 154 | helper/function | `esc` |
| 164 | helper/function | `score` |
| 169 | helper/function | `percent` |
| 174 | helper/function | `table` |
| 212 | helper/function | `preliminarySection` |
| 269 | helper/function | `finalsSection` |
| 325 | helper/function | `programSection` |
| 373 | helper/function | `buildPrintableHtml` |
| 619 | helper/function | `logout` |
| 701 | component/function | `Home` |
| 756 | component/function | `LoginCard` |
| 806 | component/function | `JudgePanel` |
| 849 | helper/function | `candidateSubtotal` |
| 1031 | component/function | `FinalInterviewJudgePanel` |
| 1076 | helper/function | `candidateFinalSubtotal` |
| 1279 | component/function | `FinalInterviewAdminPanel` |
| 1538 | component/function | `AdminPanel` |
| 1539 | helper/function | `openTvMode` |
| 1922 | component/function | `WinnerAnnouncement` |
| 1948 | component/function | `DeveloperCredits` |
| 1990 | component/function | `TVCreditFooter` |
| 2015 | component/function | `TVWinnersDisplay` |
| 2128 | component/function | `TVTop3Display` |
| 2170 | helper/function | `preFinalScore` |
| 2240 | component/function | `SiteFooter` |
| 2267 | component/function | `ErrorPanel` |
| 2290 | component/function | `LoadingPanel` |

## Suggested Split Order

1. Extract pure helpers first: formatting, scoring display helpers, API helpers.
2. Extract small shared UI components: login, loading, error, footer, header.
3. Extract judge panels.
4. Extract admin panels.
5. Extract TV display panels.
6. Extract PDF/print summary logic last because it usually touches many helpers.

## Rule

Move code mechanically. Do not change scoring formulas, API routes, or labels during extraction.
