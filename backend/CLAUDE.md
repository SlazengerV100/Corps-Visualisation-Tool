# Backend

## Invariants

- Read each source file once per process. No file I/O or score computation while serving a request; derived figures are precomputed when the insights layer is built.
- A store reads only its own source and returns figures as recorded. Business rules and anything combining sources belong in the insights layer.
- A new metric is a registry entry, not a new route.
- Every store implementation must pass its contract's shared test suite.

## Typing

The codebase is moving to TypeScript. `npm run lint` type-checks the JSDoc in `src` strictly (`tsc` with `checkJs`), runs on commit, and must pass. Give any file you add or touch full JSDoc types. Tests under `src/__tests__` are not type-checked yet.

## Data quirks

### SAMIS

- Both exports contain summary rows (`Growth%` in the year column, `TOTAL`/`TOTxx` period codes).
- Yearly worship, kids church and youth figures are the average of the monthly values. First-time decisions count only in years with worship above zero, and default to 0.

### TechOne

- Blank tithing months appear as ` - ` and count as 0.
- A surplus/deficit of 0 is a real figure; only an empty cell means no figure.
- Surplus/deficit is keyed by TechOne `location`, which is not one-to-one with centre code: corps move, tithe under two locations at once, or share one. Each financial year uses the location of that corps' first tithing row that year; no tithing that year means no surplus/deficit figure.

### Address list

- Population figures exist only for a few census and projection years, not every year.

### Scores

- Scores can only exist for a given year if there is valid data for the year before.
