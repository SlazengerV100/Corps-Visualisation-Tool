# Frontend

- `npm run lint` already reports errors on `main`. Compare touched files against the branch base rather than expecting a clean run, and add no new ones.
- `npm run build` writes `dist/`, which is not gitignored; delete it after a local build.
- Time ranges and projections count from the metric's latest financial year in the data, not the calendar year: the latest data usually lags the calendar.
- Population figures exist only for a few years, so the population chart picks the latest year that has them rather than the latest year overall.
