"""
Pydantic request/response contracts for the analyzer sidecar.

The legacy Flask controllers returned plain dicts from the service layer
(jsonify of the service result). To keep responses byte-compatible, the POST
endpoints return those same dicts untouched and these models are used for:

  * OpenAPI documentation (declared via responses={200: {"model": ...}}),
  * request validation,
  * test-time validation that the live payload matches the documented shape.

Models that describe a service payload allow extra keys so they can never
silently disagree with the legacy output; the important fields are typed
exactly as the services emit them.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


# ============================================================
# ERRORS / HEALTH
# ============================================================

class ErrorResponse(BaseModel):
    error: str


class HealthResponse(BaseModel):
    status: str
    model: str
    features: int


# ============================================================
# REQUESTS
# ============================================================

class GeneralAnalyzeRequest(BaseModel):
    """POST /v1/general/analyze body (legacy: map, year, agents)."""

    # Same order as the legacy controller's required_fields tuple, so
    # missing-field messages keep the legacy ordering.
    map: str
    year: int
    agents: list[str]


class TeamPredictRequest(BaseModel):
    """POST /v1/team/predict body (legacy: team, map, year, agents)."""

    team: str
    map: str
    year: int
    agents: list[str]


# ============================================================
# GENERAL ANALYSIS RESPONSE
# ============================================================

class GeneralInput(BaseModel):
    map: str
    year: int
    agents: list[str]


class PlaystyleInfo(BaseModel):
    name: str
    description: str
    pattern: str


class HistoricalComposition(BaseModel):
    """Exact historical match; when found is False only the first four keys exist."""

    model_config = ConfigDict(extra="allow")

    found: bool
    map: str
    year: int
    agents: list[str]
    role_pattern: str | None = None
    playstyle: str | None = None
    total_maps: int | None = None
    winrate: float | None = None
    pick_rate: float | None = None


class Recommendation(BaseModel):
    rank: int
    map: str
    year: int
    agents: list[str]
    role_pattern: str
    playstyle: str
    total_maps: int
    pick_rate: float
    winrate: float


class GeneralAnalyzeResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    input: GeneralInput
    playstyle: PlaystyleInfo
    historical: HistoricalComposition
    recommendations: list[Recommendation]
    fallback: bool
    fallback_source: str | None = None


# ============================================================
# TEAM PREDICTION RESPONSE
# ============================================================

class TeamInput(BaseModel):
    team: str
    map: str
    year: int
    agents: list[str]


class PredictionRange(BaseModel):
    low: float
    high: float
    level: float


class PatternAdjustment(BaseModel):
    points: float
    tier: str
    reason: str


class PredictionInfo(BaseModel):
    winrate: float
    percentage: float
    model_winrate: float
    prior_winrate: float
    range: PredictionRange
    winrate_before_adjustment: float
    pattern_adjustment: PatternAdjustment


class MetaPrevalence(BaseModel):
    role_pattern_share_pct: float
    label: str
    rank: int | None = None
    n_patterns: int
    team_maps_with_pattern: int


class ConfidenceInfo(BaseModel):
    model_config = ConfigDict(extra="allow")

    level: str
    team_map_played: int
    context_played: int
    composition_played: int
    team_pattern_played: int
    role_pattern_played: int
    role_pattern_never_observed: bool
    role_pattern_rarity_discount: float
    meta_prevalence: MetaPrevalence
    note: str


class TeamComposition(BaseModel):
    role_pattern: str
    duelist_count: int
    initiator_count: int
    controller_count: int
    sentinel_count: int
    playstyle: PlaystyleInfo


class TeamHistorical(BaseModel):
    found: bool
    winrate: float | None = None
    composition_strength: float


class BestComposition(BaseModel):
    """Most-used historical composition; only {"found": False} when missing."""

    model_config = ConfigDict(extra="allow")

    found: bool
    agents: list[str] | None = None
    role_pattern: str | None = None
    playstyle: PlaystyleInfo | None = None
    maps_played: int | None = None
    winrate: float | None = None
    percentage: float | None = None
    composition_strength: float | None = None


class InferenceInfo(BaseModel):
    feature_count: int


class TeamPredictResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    input: TeamInput
    prediction: PredictionInfo
    confidence: ConfidenceInfo
    composition: TeamComposition
    historical: TeamHistorical
    best_composition: BestComposition
    inference: InferenceInfo


# ============================================================
# OPTIONS RESPONSES
# ============================================================

class YearsResponse(BaseModel):
    years: list[int]


class MapsResponse(BaseModel):
    year: int
    maps: list[str]


class TeamsResponse(BaseModel):
    year: int
    map: str
    teams: list[str]
