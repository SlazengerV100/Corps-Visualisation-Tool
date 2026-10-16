# Backend

## Invariants

- Read each source file once per process. No file I/O or score computation while serving a request; derived figures are precomputed when the insights layer is built.
- A store reads only its own source and returns figures as recorded. Business rules and anything combining sources belong in the insights layer.
- A new metric is a registry entry, not a new route.
- Every store implementation must pass its contract's shared test suite.

## Typing

`npm run lint` type-checks the JSDoc strictly and must stay clean. Avoid casts: use a checked object literal, or `NoInfer` so a generic takes its type from the right argument.

## Tests

- Fixture CSVs must copy the real headers exactly, including the byte-order mark, and include the rows a store has to skip.
- Before changing behaviour the API exposes, record the current responses on real data and compare afterwards, classifying every difference as intended or unexpected.

## Data quirks

### SAMIS

- Both exports contain summary rows (`Growth%` in the year column, `TOTAL`/`TOTxx` period codes) that must be skipped.
- Yearly worship, kids church and youth figures are the average of the monthly values. First-time decisions count only in years with worship above zero, and default to 0.

### TechOne

- Blank tithing months appear as ` - ` and count as 0.
- A surplus/deficit of 0 is a real figure; only an empty cell means no figure.
- Surplus/deficit is keyed by TechOne `location`, which is not one-to-one with centre code: corps move, tithe under two locations at once, or share one. Each financial year uses the location of that corps' first tithing row that year; no tithing that year means no surplus/deficit figure.

### Address list

Population figures exist only for a few census and projection years, not every year.

### Scores

- Growth is undefined when the previous year's worship is 0 (the formula throws).
- Sustainability needs tithing but not surplus/deficit.
- A year is scored only if finance data exists for the year before; otherwise the first finance year scores against zero prior tithing.

### File names

The export file names include their year range. A data refresh that renames them needs the store constants updated; until then the server refuses to start and names the missing file.
