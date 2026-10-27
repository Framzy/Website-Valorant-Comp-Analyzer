"""
FastAPI sidecar for the Valorant composition analyzer.
=====================================================

This application is an HTTP adapter only. All analysis/ML logic lives in
app/core/ as a verbatim copy of the legacy Flask backend (see README.md);
nothing in this file reimplements or reshapes that logic.

Routing parity with the legacy Flask API:

    legacy Flask                          FastAPI (this service)
    GET  /api/options/years            -> GET  /v1/options/years
    GET  /api/options/maps?year=       -> GET  /v1/options/maps
    GET  /api/team/options/teams       -> GET  /v1/team/options/teams
    POST /api/general/analyze          -> POST /v1/general/analyze
    POST /api/team/predict             -> POST /v1/team/predict
                                          GET  /healthz  (new)

The three legacy services (which load datasets/artifacts once at import time
in the Flask controllers) are instantiated exactly once during lifespan and
stored on app.state.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import Depends, FastAPI, Query, Request

from app.core.config import (
    ARTIFACT_TEAM_DIR,
    GENERAL_DATASET_PATH,
    TEAM_DATASET_PATH,
)
from app.core.constants import EXPECTED_FEATURE_COUNT
from app.core.services.general_analysis_service import GeneralAnalysisService
from app.core.services.shared_options_service import SharedOptionsService
from app.core.services.team_prediction_service import TeamPredictionService
from app.errors import (
    BearerTokenMiddleware,
    error_response,
    install_exception_handlers,
)
from app.schemas import (
    ErrorResponse,
    GeneralAnalyzeRequest,
    GeneralAnalyzeResponse,
    HealthResponse,
    MapsResponse,
    TeamPredictRequest,
    TeamPredictResponse,
    TeamsResponse,
    YearsResponse,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("analyzer")
logger.setLevel(logging.INFO)

MODEL_VERSION = "2.0"

# Files the services need before the app can accept traffic.
REQUIRED_ASSET_FILES = (
    GENERAL_DATASET_PATH,
    TEAM_DATASET_PATH,
    ARTIFACT_TEAM_DIR / "team_model_v2.joblib",
    ARTIFACT_TEAM_DIR / "encoders.joblib",
    ARTIFACT_TEAM_DIR / "feature_names.joblib",
    ARTIFACT_TEAM_DIR / "metadata.json",
)

_ERROR_RESPONSES = {
    400: {"model": ErrorResponse, "description": "Invalid request"},
    500: {"model": ErrorResponse, "description": "Unexpected server error"},
}


def assert_assets_present() -> None:
    """Fail fast (with a clear log line) when data/artifacts are missing."""
    missing = [str(path) for path in REQUIRED_ASSET_FILES if not path.is_file()]

    if missing:
        logger.error(
            "Analyzer startup aborted: missing required asset file(s): %s",
            ", ".join(missing),
        )
        raise RuntimeError("Analyzer assets missing: " + ", ".join(missing))


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Instantiate the three legacy singletons once, before serving traffic."""
    logger.info("Analyzer starting: validating datasets and model artifacts...")
    assert_assets_present()

    logger.info("Loading General Analysis dataset...")
    general_service = GeneralAnalysisService()

    logger.info("Loading shared options datasets...")
    shared_options_service = SharedOptionsService()

    logger.info("Loading Team Prediction model and dataset...")
    team_prediction_service = TeamPredictionService()

    app.state.general_service = general_service
    app.state.shared_options_service = shared_options_service
    app.state.team_prediction_service = team_prediction_service

    logger.info(
        "Analyzer ready: model %s, %d features, endpoints under /v1/*.",
        MODEL_VERSION,
        EXPECTED_FEATURE_COUNT,
    )

    try:
        yield
    finally:
        logger.info("Analyzer shutting down.")


# ============================================================
# DEPENDENCIES (services live on app.state, loaded once)
# ============================================================

def get_general_service(request: Request) -> GeneralAnalysisService:
    return request.app.state.general_service


def get_shared_options_service(request: Request) -> SharedOptionsService:
    return request.app.state.shared_options_service


def get_team_prediction_service(request: Request) -> TeamPredictionService:
    return request.app.state.team_prediction_service


# ============================================================
# APP FACTORY
# ============================================================

def create_app(token: str | None = None) -> FastAPI:
    """Build the FastAPI application.

    token: bearer token for /v1/*. When None, ANALYZER_TOKEN from the
    environment is used (empty/unset disables authentication).
    """
    app = FastAPI(
        title="Valorant Comp Analyzer API",
        version=MODEL_VERSION,
        description=(
            "FastAPI sidecar exposing the legacy Flask analysis/ML core "
            "(General Analysis V2 and Team Prediction V2)."
        ),
        lifespan=lifespan,
    )

    install_exception_handlers(app)

    if token is None:
        token = os.environ.get("ANALYZER_TOKEN") or None

    if token:
        app.add_middleware(BearerTokenMiddleware, token=token)
        logger.info("ANALYZER_TOKEN is set: /v1/* requires a bearer token.")
    else:
        logger.warning("ANALYZER_TOKEN is not set: /v1/* is unauthenticated.")

    # --------------------------------------------------------
    # HEALTH
    # --------------------------------------------------------

    @app.get(
        "/healthz",
        response_model=HealthResponse,
        summary="Health check",
        tags=["health"],
    )
    def healthz() -> dict[str, Any]:
        return {
            "status": "ok",
            "model": MODEL_VERSION,
            "features": EXPECTED_FEATURE_COUNT,
        }

    # --------------------------------------------------------
    # OPTIONS (parity/debug helpers)
    # --------------------------------------------------------

    @app.get(
        "/v1/options/years",
        response_model=YearsResponse,
        responses=_ERROR_RESPONSES,
        summary="Years shared by General V2 and Team V2",
        tags=["options"],
    )
    def get_available_years(
        service: SharedOptionsService = Depends(get_shared_options_service),
    ) -> dict[str, Any]:
        return {"years": service.get_available_years()}

    @app.get(
        "/v1/options/maps",
        response_model=MapsResponse,
        responses=_ERROR_RESPONSES,
        summary="Maps shared by General V2 and Team V2 for a year",
        tags=["options"],
    )
    def get_available_maps(
        year: str | None = Query(default=None, description="Season year"),
        service: SharedOptionsService = Depends(get_shared_options_service),
    ) -> Any:
        # Legacy controller answered a missing year with a plain 400 body.
        if year is None:
            return error_response(400, "Year is required.")

        maps = service.get_available_maps(year)

        return {
            "year": int(year),
            "maps": maps,
        }

    @app.get(
        "/v1/team/options/teams",
        response_model=TeamsResponse,
        responses=_ERROR_RESPONSES,
        summary="Team V2 teams for a year and map",
        tags=["options"],
    )
    def get_team_teams(
        year: str | None = Query(default=None, description="Season year"),
        map_name: str | None = Query(
            default=None, alias="map", description="Map name"
        ),
        service: TeamPredictionService = Depends(get_team_prediction_service),
    ) -> Any:
        missing_fields = []
        if year is None:
            missing_fields.append("year")
        if map_name is None:
            missing_fields.append("map")

        if missing_fields:
            return error_response(
                400,
                "Missing required query parameters: "
                + ", ".join(missing_fields),
            )

        teams = service.get_available_teams(
            year=year,
            map_name=map_name,
        )

        return {
            "year": int(year),
            "map": map_name,
            "teams": teams,
        }

    # --------------------------------------------------------
    # ANALYSIS (sync def -> FastAPI runs them in the threadpool,
    # so pandas/ML work never blocks the event loop)
    # --------------------------------------------------------

    @app.post(
        "/v1/general/analyze",
        responses={
            200: {
                "model": GeneralAnalyzeResponse,
                "description": "Legacy /api/general/analyze payload, unchanged",
            },
            **_ERROR_RESPONSES,
        },
        summary="General Analysis V2",
        tags=["analysis"],
    )
    def analyze_general(
        payload: GeneralAnalyzeRequest,
        service: GeneralAnalysisService = Depends(get_general_service),
    ) -> dict[str, Any]:
        # Returned as-is: the legacy controller jsonify'd this exact dict.
        return service.analyze_composition(
            map_name=payload.map,
            year=payload.year,
            agents=payload.agents,
        )

    @app.post(
        "/v1/team/predict",
        responses={
            200: {
                "model": TeamPredictResponse,
                "description": "Legacy /api/team/predict payload, unchanged",
            },
            **_ERROR_RESPONSES,
        },
        summary="Team Prediction V2",
        tags=["analysis"],
    )
    def predict_team(
        payload: TeamPredictRequest,
        service: TeamPredictionService = Depends(get_team_prediction_service),
    ) -> dict[str, Any]:
        # Returned as-is: the legacy controller jsonify'd this exact dict.
        return service.predict(
            team=payload.team,
            map_name=payload.map,
            year=payload.year,
            agents=payload.agents,
        )

    return app


app = create_app()
