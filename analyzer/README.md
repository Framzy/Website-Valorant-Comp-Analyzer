# analyzer - FastAPI sidecar for the Next.js rewrite

HTTP sidecar that exposes the **existing** Python analysis/ML logic of the
legacy Flask backend as a FastAPI service. The analysis and ML code is copied
verbatim; only module-qualified imports and one config path were rewritten.
The Next.js app proxies /api/general/analyze, /api/team/predict and the
options endpoints to this service.

## Layout

```
analyzer/
  app/
    __init__.py
    main.py              FastAPI app, lifespan singletons, /v1 routes
    schemas.py           pydantic request/contract models
    errors.py            legacy error mapping + optional bearer auth
    core/                legacy analysis/ML core (copied verbatim)
      __init__.py
      config.py          only BASE_DIR adjusted (see below)
      constants.py
      ml/
        __init__.py
        team/
          __init__.py
          feature_encoder.py
          inference_feature_builder.py
          comp_strength_hierarchy.py
      services/
        __init__.py
        general_analysis_service.py
        shared_options_service.py
        team_prediction_service.py
  data/                  valorant_dataset_general_v2.csv, valorant_dataset_team_v2.csv
  artifacts/team/        team_model_v2.joblib, encoders.joblib, feature_names.joblib, metadata.json
  tests/
    test_api.py          pytest API regression suite
    parity_legacy_check.py   optional legacy-vs-FastAPI parity check
  requirements.txt
  requirements-dev.txt
  Dockerfile
  .dockerignore
  README.md
```

## Endpoints

| Method | Path | Legacy equivalent | Notes |
| --- | --- | --- | --- |
| GET | /healthz | - | public: `{"status":"ok","model":"2.0","features":116}` |
| GET | /v1/options/years | GET /api/options/years | `{"years":[...]}` |
| GET | /v1/options/maps?year= | GET /api/options/maps | `{"year":2024,"maps":[...]}` |
| GET | /v1/team/options/teams?year=&map= | GET /api/team/options/teams | `{"year","map","teams"}` |
| POST | /v1/general/analyze | POST /api/general/analyze | body: map, year, agents |
| POST | /v1/team/predict | POST /api/team/predict | body: team, map, year, agents |

Request bodies (identical shape to the Flask app):

```json
{"map": "Ascent", "year": 2024, "agents": ["jett", "kayo", "killjoy", "omen", "sova"]}
{"team": "G2 Esports", "map": "Ascent", "year": 2024, "agents": ["jett", "kayo", "killjoy", "omen", "sova"]}
```

Every /v1 response is the legacy service dict, unmodified (parsed JSON is
equal to the Flask response). Endpoints are declared with `def` (sync), so
FastAPI runs the pandas/ML work in the threadpool and never blocks the event
loop. CORS is intentionally not enabled: the Next.js server proxies the calls.

### Errors (legacy-compatible)

| Situation | Response |
| --- | --- |
| `ValueError` from a service (unknown agent, bad year, no data, ...) | 400 `{"error": "<str(exc)>"}` |
| Invalid request body | 400 `{"error": "..."}` (legacy wording: `Request body must be a JSON object.`, `Missing required fields: agents`) |
| Anything unexpected | 500 `{"error":"Internal server error."}` |

### Auth

If the `ANALYZER_TOKEN` environment variable is set, every `/v1/*` request
must send `Authorization: Bearer <token>` (401 otherwise). `/healthz` stays
public so container health checks keep working. Unset => no auth.

## Run

```bash
# from porting/val-comp-analyzer
docker build -t val-comp-analyzer-api analyzer
docker run -d --rm --name valcomp-api -p 8787:8000 val-comp-analyzer-api

curl http://127.0.0.1:8787/healthz
curl -X POST http://127.0.0.1:8787/v1/general/analyze -H "Content-Type: application/json" \
  -d '{"map":"Ascent","year":2024,"agents":["jett","kayo","killjoy","omen","sova"]}'
curl -X POST http://127.0.0.1:8787/v1/team/predict -H "Content-Type: application/json" \
  -d '{"team":"G2 Esports","map":"Ascent","year":2024,"agents":["jett","kayo","killjoy","omen","sova"]}'
```

Optional bearer token:

```bash
docker run -d --rm --name valcomp-api -p 8787:8000 -e ANALYZER_TOKEN=secret val-comp-analyzer-api
curl -H "Authorization: Bearer secret" http://127.0.0.1:8787/v1/options/years
```

Local development (Python 3.11; the pinned ML wheels do not build on 3.14):

```bash
python3.11 -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

## Code adjustments (the only changes vs the legacy code)

The copied modules are byte-identical apart from these rewrites:

1. **`app/core/config.py`** - `BASE_DIR` now points at the analyzer folder:
   `BASE_DIR = Path(__file__).resolve().parents[2]` (app/core/config.py ->
   analyzer/), with `DATA_DIR = BASE_DIR / "data"`,
   `ARTIFACT_DIR = BASE_DIR / "artifacts"`,
   `ARTIFACT_TEAM_DIR = BASE_DIR / "artifacts" / "team"`.
   `GENERAL_DATASET_PATH` / `TEAM_DATASET_PATH` keep their filenames, so the
   services receive the same paths/semantics as before.
2. **Import paths only** in the copied core: every `from backend.<module>`
   became `from app.core.<module>` (config, constants, ml.team.*, services.*).
   No logic, constant or docstring was edited.

Path-assumption audit: the services read datasets and artifacts exclusively
through the `app.core.config` defaults above (plus the optional
`dataset_path`/model-path constructor arguments). Nothing reads
`../ml/artifacts` or any path outside `analyzer/`; `metadata.json` is read via
`ARTIFACT_TEAM_DIR / "metadata.json"`. All assets are copied into the image,
so the container is self-contained.

Behaviour deliberately kept from Flask: `jsonify`-equivalent dict responses
(no response reshaping), 400/500 error envelopes, the options-query error
strings, and the exact service-level validation messages.

## Verification

```bash
# 1. syntax check with any Python 3.11+
python -m py_compile $(find app tests -name '*.py')     # or: pwsh -c "python -m py_compile ..."
# 2. image + container
docker build -t val-comp-analyzer-api analyzer
docker run -d --rm --name valcomp-api -p 8787:8000 val-comp-analyzer-api
curl http://127.0.0.1:8787/healthz
# 3. pytest (image built with tests installed)
docker build --build-arg INSTALL_TESTS=1 -t val-comp-analyzer-api:test analyzer
docker run --rm val-comp-analyzer-api:test python -m pytest -q
# 4. legacy parity (mount the read-only Flask backend)
docker run --rm -v "<repo>/production:/legacy:ro" val-comp-analyzer-api \
  python tests/parity_legacy_check.py
```

`tests/parity_legacy_check.py` imports both `app.core.services` and
`backend.services` (from the mounted legacy checkout) and compares general
analysis, team prediction, options and error payloads case by case.

## Notes / deviations

* `response_model` is used for `/healthz` and the options endpoints (their
  bodies are built in `main.py`). The POST payloads are returned untouched and
  `app/schemas.py` models document them via `responses={200: {"model": ...}}`
  and are validated in the tests - this guarantees the documented contract and
  byte-compatible bodies instead of letting pydantic re-serialize service
  output.
* FastAPI still lists a 422 in the OpenAPI docs for body validation; the
  actual runtime response for invalid bodies is 400 (as in Flask) because the
  `RequestValidationError` handler maps it.
* Extra files beyond the required list: `requirements-dev.txt` (pytest/httpx,
  only installed with `--build-arg INSTALL_TESTS=1`), `tests/__init__.py`,
  `tests/parity_legacy_check.py`. No files outside `analyzer/` were modified.
* The app is intended to run with a single uvicorn worker: each process loads
  the datasets/model once at startup and reuses them, exactly like the Flask
  gunicorn deployment.
