# Val Comp Analyzer — Next.js rewrite

Full-stack rewrite of the legacy Flask + Vite app. Two modes:

- **Casual** (`/`) — historical composition analysis: pick map, year and 5 agents; get win rate,
  pick rate, role pattern, playstyle and up to 3 historical recommendations.
- **Pro Team** (`/pro`) — win-rate prediction for a team + map + year + 5-agent lineup, with
  confidence evidence, pattern adjustment and the team's most-used historical composition.

## Architecture

```text
Browser
  |  (same origin, no CORS)
  v
Next.js 16 App Router (this folder)
  |-- /            Casual page (client analyzer + static shell)
  |-- /pro         Pro Team page
  |-- /api/options/{years,maps,teams}   -> SQLite (Drizzle)   <- seeded from CSVs
  |-- /api/general/analyze  ---\
  |-- /api/team/predict     ----+------> FastAPI analyzer (analyzer/)
                                         |-- legacy pandas analysis + XGBoost model
                                         |-- CSVs + joblib artifacts baked in the image
```

- **SQLite is a read-only projection** of the two CSVs (`data/*.csv`). Options endpoints are SQL
  queries; analysis is done by the Python service, which owns the model/feature contract.
- The browser never calls Python directly. Next route handlers validate the body, forward it,
  and map upstream errors to the legacy `{"error": "..."}` shape.
- All legacy endpoint paths and JSON response shapes are preserved.

## Requirements

- **bun** 1.4+ (package manager, also runs the TypeScript seed script)
- **Node.js** 22+ (26.x tested) for Next.js
- **Docker** (recommended) or Python 3.11 for the analyzer service. Python 3.14
  is not supported by the pinned ML dependencies.

## Getting started

```bash
bun install

# 1. seed the local SQLite database from data/*.csv
bun run db:seed

# 2. install the analyzer dependencies for local Python development
#    (skip this step when using Docker)
python -m pip install -r analyzer/requirements.txt

# 3. start the web app and Python analyzer together
cp .env.example .env.local   # optional; defaults are fine for local dev
bun run dev
```

Open http://localhost:3000.

`bun run dev` starts both services concurrently:

- Next.js frontend at http://localhost:3000
- FastAPI analyzer at http://127.0.0.1:8000

The individual services can also be started with `bun run dev:frontend` and
`bun run dev:backend`. On Windows, `bun run dev:backend` automatically uses a
local Python installation when all analyzer dependencies are available;
otherwise it builds and runs the Python 3.11 Docker image. Docker remains
available for running the analyzer in a production-like environment:

```bash
docker build -t val-comp-analyzer-api ./analyzer
docker run --rm -p 8000:8000 val-comp-analyzer-api
```

Environment variables (`.env.local`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANALYZER_URL` | `http://127.0.0.1:8000` | FastAPI base URL |
| `ANALYZER_TOKEN` | empty | Optional bearer token shared with the service |
| `DATABASE_PATH` | `./data/app.db` | SQLite file used by the options endpoints |

### Verifying without the analyzer

The options endpoints and the whole UI shell work with only the seeded DB:

```bash
bun run dev
curl http://localhost:3000/api/options/years
curl "http://localhost:3000/api/options/maps?year=2024"
curl "http://localhost:3000/api/team/options/teams?year=2024&map=Abyss"
```

The two `POST` analysis endpoints return `502` with a readable message while the analyzer is down.

Data-layer + options contract checks: `bun run smoke` (expects `data/app.db` from `bun run db:seed`).

## API

| Method | Path | Source |
| --- | --- | --- |
| GET | `/api/options/years` | SQLite |
| GET | `/api/options/maps?year=` | SQLite |
| GET | `/api/team/options/teams?year=&map=` | SQLite |
| POST | `/api/general/analyze` | FastAPI `/v1/general/analyze` |
| POST | `/api/team/predict` | FastAPI `/v1/team/predict` |

Validation messages are preserved from the Flask controllers (e.g. "Request body must be a JSON object.", "Missing required fields: agents").

## Project layout

```text
app/                      pages, layout, route handlers
components/
  analyzer.tsx            client orchestrator (selection state, fetch, results)
  agent-picker/           role filter, agent grid, counter
  inputs/                 year/map/team selects, action buttons, selection summary
  results/general/        Casual result panels
  results/team/           Pro Team result panels (gauge, confidence, historical)
  results/shared/         stat cards, playstyle badge, role pattern, agent thumbs
  ui/                     small Tailwind primitives (button, card, badge, select...)
lib/
  catalog/                single agent catalog (29 agents) + playstyle map
  db/                     Drizzle schema, client, queries, DDL
  api/                    browser client, server analyzer client
  types.ts                API response contract
data/                     source CSVs + generated app.db
scripts/seed.ts           CSV -> SQLite
analyzer/                 FastAPI service (Python 3.11, Docker)
```

## Data updates

`data/*.csv` are the source of truth (mirrored from `production/backend/data/`). To refresh:

1. copy the new CSVs into `data/` (and `analyzer/data/`),
2. `bun run db:seed`,
3. rebuild the analyzer image.

The seed script recomputes the derived columns (win rate, pick rate, role pattern, playstyle) and writes `dataset_meta`.

## Notes / known divergences

- `cacheComponents` (Partial Prerendering) is enabled by the scaffold; the pages are static shells
  and all dynamic data is fetched from route handlers, so no Suspense boundaries are required.
- `tests/api.http` in the legacy app is stale and was not used as a contract.
- The legacy UI catalog (28 agents) omitted **veto**; the API/model accepts it, so the catalog here has
  29 agents (veto's portrait is served locally from `public/agents/veto.png`).
- Unknown API paths / wrong methods keep the legacy behaviour (HTML 404 / empty 405); the five real endpoints always return JSON. See `docs/PARITY.md`.