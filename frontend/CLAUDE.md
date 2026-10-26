# Frontend

## Typing

- The codebase is moving to TypeScript. Give any file you add or touch full types. `npm run lint` runs oxlint, which type-checks `.ts` and `.tsx` files but not JavaScript (`checkJs` is off), so JSDoc types in `.jsx` files go unchecked.
- `npm run lint` runs on commit and in CI, and must pass with no warnings. Rules shared with the backend live in `oxlint.base.jsonc` at the repo root. Files that failed ESLint when the hook was added open with `/* eslint-disable */`, which oxlint honours. When you change one of those files, add types, fix its lint errors and remove the annotation.

## Data quirks

- Time ranges and projections count from the metric's latest financial year in the data, not the calendar year: the latest data usually lags the calendar.
- Population figures exist only for a few years, so the population chart picks the latest year that has them rather than the latest year overall.
