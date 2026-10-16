# Frontend

## Typing

- The codebase is moving to TypeScript. Give any file you add or touch full JSDoc types, as the backend does. `npm run lint` only runs ESLint here and does not type-check yet, so nothing enforces this.
- `npm run lint` runs on commit and must pass. Files that failed it when the hook was added open with `/* eslint-disable */` for now. When you change one of those files, add types, fix its lint errors and remove the annotation.

## Data quirks

- Time ranges and projections count from the metric's latest financial year in the data, not the calendar year: the latest data usually lags the calendar.
- Population figures exist only for a few years, so the population chart picks the latest year that has them rather than the latest year overall.
