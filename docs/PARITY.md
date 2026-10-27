# Parity report — Next.js rewrite vs legacy Flask + Vite

Baseline: legacy commit `e6fbef4` (last commit touching `production/`).
Rewrite: `porting/val-comp-analyzer`.

## What is being compared

| Layer | Legacy | Rewrite |
| --- | --- | --- |
| Options data | pandas over `production/backend/data/*.csv` | SQLite projection seeded from `data/*.csv` |
| Options endpoints | Flask controllers + `SharedOptionsService`/`TeamPredictionService` | Next route handlers + Drizzle queries |
| Analysis endpoints | Flask controllers + Python services | Next route handlers -> FastAPI sidecar (`analyzer/`) |
| Analysis math | pandas + XGBoost 3.0.2 | **same code**, copied verbatim into `analyzer/app/core` |
| UI | Vite + jQuery + hand-written CSS | Next.js App Router + Tailwind + React components |

The strongest parity guarantee is that the analysis/ML logic is not reimplemented: the FastAPI
service imports a verbatim copy of the legacy modules, so the two only differ in transport.

## Verified: options endpoints (runtime, production build)

```text
GET /api/options/years
200 {"years":[2024,2025,2026]}

GET /api/options/maps?year=2024
200 {"year":2024,"maps":["Abyss","Ascent","Bind","Breeze","Haven","Icebox","Lotus","Split","Sunset"]}   (9 maps)
    legacy counts: 2024=9, 2025=11, 2026=10  -> match

GET /api/team/options/teams?year=2024&map=Abyss
200 {"year":2024,"map":"Abyss","teams":["DRX","EDward Gaming","FunPlus Phoenix","KRÜ Esports",
     "LEVIATÁN","Team Heretics","Trace Esports"]}   (7 eligible teams, sum(maps) >= 3)
    legacy output: identical names and order
```

Seed verification (`bun run db:seed`):

```text
general rows: 1090   (legacy CSV rows: 1090)
team rows:    2802   (legacy CSV rows: 2802)
```

## Verified: validation contract (route handlers, `bun run scripts/smoke.ts`)

```text
PASS  years 200
PASS  maps 2024 200
PASS  maps missing year 400          -> "Year is required."
PASS  maps invalid year 400          -> "Year must be an integer."
PASS  teams 2024 Abyss 200
PASS  teams missing params 400       -> "Missing required query parameters: map"
PASS  teams unknown context 400      -> "No Team V2 data for Abyss / 2019."
summary: 7/7 passed
```

POST validation preserved (verified over HTTP against `next start`):

```text
POST /api/general/analyze  {"map":"Ascent","year":2024}      -> 400 {"error":"Missing required fields: agents"}
POST /api/general/analyze  (analyzer offline)                -> 502 {"error":"Layanan analisis tidak dapat dihubungi, silakan coba lagi."}
```

The same message strings as the Flask controllers are preserved:
"Request body must be a JSON object.", "Missing required fields: <joined fields>",
"Year is required.", "Year must be an integer.", "Missing required query parameters: <joined>",
"No shared map data for year <year>.", "No Team V2 data for <map> / <year>.",
"No eligible teams for <map> / <year>."

## Analysis endpoint parity

Both analysis routes forward the raw request body to FastAPI, which runs the copied services:

```text
POST /api/general/analyze -> POST {ANALYZER_URL}/v1/general/analyze
POST /api/team/predict    -> POST {ANALYZER_URL}/v1/team/predict
```

Upstream `{"error": "..."}` bodies are passed through unchanged; upstream 5xx/timeouts map to
502/504 with a readable Indonesian message. When running, both payloads are identical to the
legacy Flask responses because they are produced by the same Python functions.

Service-level parity script (compares the copied services against a read-only legacy checkout):

```bash
docker run --rm -v "<repo>/production:/legacy:ro" val-comp-analyzer-api \
  python tests/parity_legacy_check.py
```

Exit code 0 means every case matched (general found/unseen/never-seen compositions, team
predictions, best composition, options lists).

## Intentional divergences

1. **Unknown routes / methods**: status codes are unchanged (404 / 405), but bodies differ —
   Next.js serves its HTML 404 page for an unknown API path (Flask also served HTML) and an empty
   405 body for a wrong method on an existing route (Flask served an HTML 405 page).
   The five real endpoints always return JSON.
2. **Wrong-typed bodies** (e.g. `{"year":"abc"}` on the general endpoint) return **400** with a
   validation message; the legacy endpoint could leak a 500 from Python (and FastAPI never
   returns 422 to the browser because the Next layer validates presence and the service maps
   ValueError to 400).
3. **Agent catalog** has 29 agents (adds **veto**); the legacy UI listed 28 while the backend and
   model already accepted 29. Parity for the model is unchanged — this only widens the picker.
4. **Copyright footer** no longer prints a runtime `new Date()` year (cacheComponents would freeze it
   at build); "Last Data Updated" still shows the latest data year.
5. **Options data source** is SQLite instead of pandas. Values are identical (verified above) but
   the data must be seeded before the first request (`bun run db:seed`) and refreshed when the CSVs change.
