# Corps Visualisation Tool

## Data

The source CSV exports are not in the repository; point `DATA_FOLDER` at a local copy. They come from two systems plus a reference list, and the code keeps them apart:

- **SAMIS**: mission indicators (worship, first-time decisions, kids church, youth).
- **TechOne**: finance (tithing, surplus/deficit).
- **Corps address list**: reference data (location, closing date, population). It belongs to neither system.

## Domain conventions

- A **financial year** runs July to June and is named by the year it ends in: `2025` is July 2024 to June 2025. Monthly points carry the calendar year, so July–December of FY2025 are 2024.
- A corps is identified by its **centre code** everywhere. Each source's own keys are converted to it inside that source's store.
- Neither app hard-codes years or the metric list; both come from `/api/catalogue`.

## Deployment

The backend scales to zero and starts on the first request, so start-up time matters. Data is read once at start-up, and the server refuses to start if a source file is missing.

## Working in this repo

`backend/prds/` holds local planning documents. Keep them untracked and stage explicit paths.
