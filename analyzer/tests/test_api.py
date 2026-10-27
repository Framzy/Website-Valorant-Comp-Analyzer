"""API regression tests for the FastAPI analyzer sidecar.

Run inside the service image (or a venv with requirements-dev.txt installed):

    python -m pytest -q

The tests exercise the full HTTP -> route -> legacy service path with the
real datasets and model artifacts, mirroring the legacy Flask API tests
(production/backend/tests/test_api.py) where behaviour overlaps.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.schemas import GeneralAnalyzeResponse, TeamPredictResponse

GENERAL_PAYLOAD = {
    "map": "Ascent",
    "year": 2024,
    "agents": ["jett", "kayo", "killjoy", "omen", "sova"],
}

TEAM_PAYLOAD = {
    "team": "G2 Esports",
    "map": "Ascent",
    "year": 2024,
    "agents": ["jett", "kayo", "killjoy", "omen", "sova"],
}

TOKEN = "test-token"


@pytest.fixture(scope="session")
def client() -> TestClient:
    # token="" disables auth regardless of the ambient ANALYZER_TOKEN.
    app = create_app(token="")
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def protected_client() -> TestClient:
    app = create_app(token=TOKEN)
    with TestClient(app) as test_client:
        yield test_client


# ============================================================
# HEALTH
# ============================================================

def test_healthz(client: TestClient) -> None:
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "model": "2.0", "features": 116}


# ============================================================
# OPTIONS
# ============================================================

def test_get_available_years(client: TestClient) -> None:
    response = client.get("/v1/options/years")

    assert response.status_code == 200
    body = response.json()
    assert body["years"] == [2024, 2025, 2026]


def test_get_available_maps(client: TestClient) -> None:
    response = client.get("/v1/options/maps", params={"year": 2024})

    assert response.status_code == 200
    body = response.json()
    assert body["year"] == 2024
    assert body["maps"] == sorted(body["maps"])
    assert "Ascent" in body["maps"]


def test_get_available_maps_requires_year(client: TestClient) -> None:
    response = client.get("/v1/options/maps")

    assert response.status_code == 400
    assert response.json() == {"error": "Year is required."}


def test_get_available_maps_invalid_year(client: TestClient) -> None:
    response = client.get("/v1/options/maps", params={"year": "abc"})

    assert response.status_code == 400
    assert response.json() == {"error": "Year must be an integer."}


def test_get_available_maps_unknown_year(client: TestClient) -> None:
    response = client.get("/v1/options/maps", params={"year": 2020})

    assert response.status_code == 400
    assert response.json() == {"error": "No shared map data for year 2020."}


def test_get_team_teams(client: TestClient) -> None:
    response = client.get(
        "/v1/team/options/teams", params={"year": 2024, "map": "Ascent"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["year"] == 2024
    assert body["map"] == "Ascent"
    assert body["teams"] == sorted(body["teams"])
    assert "G2 Esports" in body["teams"]


def test_get_team_teams_missing_parameters(client: TestClient) -> None:
    response = client.get("/v1/team/options/teams", params={"year": 2024})

    assert response.status_code == 400
    assert response.json() == {
        "error": "Missing required query parameters: map"
    }


# ============================================================
# GENERAL ANALYSIS
# ============================================================

def test_general_analyze(client: TestClient) -> None:
    response = client.post("/v1/general/analyze", json=GENERAL_PAYLOAD)

    assert response.status_code == 200
    body = response.json()

    # Documented contract model accepts the live payload unchanged.
    GeneralAnalyzeResponse.model_validate(body)

    assert body["input"] == {
        "map": "Ascent",
        "year": 2024,
        "agents": ["jett", "kayo", "killjoy", "omen", "sova"],
    }
    assert body["playstyle"]["pattern"] == "1D-2I-1C-1S"
    assert body["playstyle"]["name"] == "STANDARD"
    assert body["playstyle"]["description"]

    assert body["historical"]["found"] is True
    assert body["historical"]["total_maps"] == 166
    assert body["historical"]["winrate"] == pytest.approx(92 / 166)
    assert body["historical"]["role_pattern"] == "1D-2I-1C-1S"

    assert body["fallback"] is False
    assert body["fallback_source"] is None
    assert len(body["recommendations"]) == 3
    assert [item["rank"] for item in body["recommendations"]] == [1, 2, 3]


def test_general_analyze_fallback_for_unseen_composition(client: TestClient) -> None:
    payload = {
        "map": "Ascent",
        "year": 2024,
        # 0D-5I-0C-0S -> UNCLASSIFIED playstyle, no exact historical row.
        "agents": ["breach", "fade", "gekko", "kayo", "sova"],
    }

    response = client.post("/v1/general/analyze", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["playstyle"]["name"] == "UNCLASSIFIED"
    assert body["historical"] == {
        "found": False,
        "map": "Ascent",
        "year": 2024,
        "agents": sorted(payload["agents"]),
    }
    assert body["fallback"] is True
    assert body["fallback_source"] in {"MAP_YEAR", "MAP", "GLOBAL"}


def test_general_analyze_missing_field(client: TestClient) -> None:
    response = client.post(
        "/v1/general/analyze", json={"map": "Ascent", "year": 2024}
    )

    assert response.status_code == 400
    assert response.json() == {"error": "Missing required fields: agents"}


def test_general_analyze_non_object_body(client: TestClient) -> None:
    response = client.post("/v1/general/analyze", json=["not", "an", "object"])

    assert response.status_code == 400
    assert response.json() == {"error": "Request body must be a JSON object."}


def test_general_analyze_malformed_json(client: TestClient) -> None:
    response = client.post(
        "/v1/general/analyze",
        content=b"{not json",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.json() == {"error": "Request body must be a JSON object."}


def test_general_analyze_unknown_agent(client: TestClient) -> None:
    payload = {**GENERAL_PAYLOAD, "agents": ["jett", "kayo", "killjoy", "omen", "nope"]}

    response = client.post("/v1/general/analyze", json=payload)

    assert response.status_code == 400
    assert response.json() == {"error": "Unknown agent role: ['nope']"}


def test_general_analyze_wrong_agent_count(client: TestClient) -> None:
    payload = {**GENERAL_PAYLOAD, "agents": ["jett", "kayo", "killjoy", "omen"]}

    response = client.post("/v1/general/analyze", json=payload)

    assert response.status_code == 400
    assert response.json() == {
        "error": "Composition must contain exactly 5 agents."
    }


def test_general_analyze_duplicate_agents(client: TestClient) -> None:
    payload = {
        **GENERAL_PAYLOAD,
        "agents": ["jett", "jett", "killjoy", "omen", "sova"],
    }

    response = client.post("/v1/general/analyze", json=payload)

    assert response.status_code == 400
    assert response.json() == {
        "error": "Composition cannot contain duplicate agents."
    }


# ============================================================
# TEAM PREDICTION
# ============================================================

def test_team_predict(client: TestClient) -> None:
    response = client.post("/v1/team/predict", json=TEAM_PAYLOAD)

    assert response.status_code == 200
    body = response.json()

    # Documented contract model accepts the live payload unchanged.
    TeamPredictResponse.model_validate(body)

    assert body["input"] == {
        "team": "G2 Esports",
        "map": "Ascent",
        "year": 2024,
        "agents": ["jett", "kayo", "killjoy", "omen", "sova"],
    }

    prediction = body["prediction"]
    assert 0.0 <= prediction["winrate"] <= 1.0
    assert prediction["percentage"] == pytest.approx(
        round(prediction["winrate"] * 100, 2), abs=0.01
    )
    assert prediction["range"]["low"] <= prediction["range"]["high"]
    assert prediction["pattern_adjustment"]["points"] <= 0.0

    assert body["inference"]["feature_count"] == 116
    assert body["historical"]["found"] is True
    assert body["historical"]["winrate"] == pytest.approx(0.625)

    assert body["best_composition"]["found"] is True
    assert body["best_composition"]["maps_played"] == 8
    assert body["best_composition"]["agents"] == [
        "jett", "kayo", "killjoy", "omen", "sova"
    ]

    assert body["composition"]["role_pattern"] == "1D-2I-1C-1S"
    assert body["composition"]["playstyle"]["name"] == "STANDARD"

    assert body["confidence"]["level"] in {"low", "medium", "high"}
    assert body["confidence"]["meta_prevalence"]["n_patterns"] > 0


def test_team_predict_unseen_composition_uses_inference_path(
    client: TestClient,
) -> None:
    payload = {
        "team": "G2 Esports",
        "map": "Ascent",
        "year": 2024,
        "agents": ["jett", "raze", "kayo", "omen", "sage"],
    }

    response = client.post("/v1/team/predict", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["historical"]["found"] is False
    assert body["historical"]["winrate"] is None
    assert body["inference"]["feature_count"] == 116
    assert body["composition"]["role_pattern"] == "2D-1I-1C-1S"
    assert body["composition"]["playstyle"]["name"] == "AGGRESSIVE"


def test_team_predict_missing_field(client: TestClient) -> None:
    payload = {"team": "G2 Esports", "map": "Ascent", "year": 2024}

    response = client.post("/v1/team/predict", json=payload)

    assert response.status_code == 400
    assert response.json() == {"error": "Missing required fields: agents"}


def test_team_predict_unknown_team(client: TestClient) -> None:
    payload = {**TEAM_PAYLOAD, "team": "Not A Real Team"}

    response = client.post("/v1/team/predict", json=payload)

    assert response.status_code == 400
    assert response.json() == {
        "error": "No Team V2 data for Not A Real Team / Ascent / 2024."
    }


def test_team_predict_unknown_agent(client: TestClient) -> None:
    payload = {**TEAM_PAYLOAD, "agents": ["jett", "kayo", "killjoy", "omen", "nope"]}

    response = client.post("/v1/team/predict", json=payload)

    assert response.status_code == 400
    assert response.json() == {"error": "Unknown agents: nope"}


# ============================================================
# ROUTING
# ============================================================

def test_unknown_endpoint(client: TestClient) -> None:
    assert client.get("/v1/does-not-exist").status_code == 404


def test_wrong_method(client: TestClient) -> None:
    assert client.get("/v1/team/predict").status_code == 405


# ============================================================
# AUTH
# ============================================================

def test_auth_required_when_token_configured(
    protected_client: TestClient,
) -> None:
    response = protected_client.get("/v1/options/years")

    assert response.status_code == 401
    assert response.json() == {"error": "Unauthorized."}


def test_auth_accepts_valid_bearer_token(protected_client: TestClient) -> None:
    response = protected_client.get(
        "/v1/options/years",
        headers={"Authorization": f"Bearer {TOKEN}"},
    )

    assert response.status_code == 200
    assert response.json()["years"] == [2024, 2025, 2026]


def test_auth_rejects_wrong_token(protected_client: TestClient) -> None:
    response = protected_client.get(
        "/v1/options/years",
        headers={"Authorization": "Bearer wrong-token"},
    )

    assert response.status_code == 401


def test_healthz_stays_public_when_auth_enabled(
    protected_client: TestClient,
) -> None:
    assert protected_client.get("/healthz").status_code == 200


# ============================================================
# UNEXPECTED ERRORS
# ============================================================

def test_unexpected_error_returns_500(client: TestClient) -> None:
    app = client.app

    def boom() -> None:
        raise RuntimeError("boom")

    app.add_api_route("/v1/_boom", boom, methods=["GET"])
    try:
        with TestClient(app, raise_server_exceptions=False) as error_client:
            response = error_client.get("/v1/_boom")
    finally:
        app.router.routes = [
            route
            for route in app.router.routes
            if getattr(route, "path", None) != "/v1/_boom"
        ]

    assert response.status_code == 500
    assert response.json() == {"error": "Internal server error."}
