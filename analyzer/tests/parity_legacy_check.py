#!/usr/bin/env python3
"""Parity check: FastAPI analyzer core vs the legacy Flask services.

Compares the exact payloads produced by the copied app/core services with the
ones produced by the legacy backend services imported from a read-only
checkout. This is the strongest form of the "parsed JSON equal" requirement:
it compares the service-layer dicts that both HTTP layers return unchanged.

It runs inside the service image, with the legacy backend mounted read-only:

    docker run --rm \
      -v "<repo>/production:/legacy:ro" \
      val-comp-analyzer-api \
      python tests/parity_legacy_check.py

Set LEGACY_BACKEND_ROOT to point elsewhere if needed.
Exit code 0 = every case matches, 1 = at least one mismatch.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Callable

APP_ROOT = Path(__file__).resolve().parents[1]
LEGACY_ROOT = Path(os.environ.get("LEGACY_BACKEND_ROOT", "/legacy"))

for entry in (str(LEGACY_ROOT), str(APP_ROOT)):
    if entry not in sys.path:
        sys.path.insert(0, entry)

from app.core.services.general_analysis_service import (  # noqa: E402
    GeneralAnalysisService as NewGeneralService,
)
from app.core.services.shared_options_service import (  # noqa: E402
    SharedOptionsService as NewSharedOptionsService,
)
from app.core.services.team_prediction_service import (  # noqa: E402
    TeamPredictionService as NewTeamService,
)
from backend.services.general_analysis_service import (  # noqa: E402
    GeneralAnalysisService as LegacyGeneralService,
)
from backend.services.shared_options_service import (  # noqa: E402
    SharedOptionsService as LegacySharedOptionsService,
)
from backend.services.team_prediction_service import (  # noqa: E402
    TeamPredictionService as LegacyTeamService,
)

AGENTS_STANDARD = ["jett", "kayo", "killjoy", "omen", "sova"]
AGENTS_UNSEEN = ["jett", "raze", "kayo", "omen", "sage"]
AGENTS_NEVER_SEEN_PATTERN = ["chamber", "cypher", "deadlock", "killjoy", "sage"]


def normalize(value: Any) -> Any:
    """Round-trip through JSON so comparisons match HTTP-level equality."""
    return json.loads(json.dumps(value, sort_keys=True, default=str))


def run(factory: Callable[[], Any]) -> tuple[Any, str | None]:
    try:
        return normalize(factory()), None
    except Exception as exc:  # noqa: BLE001 - parity also covers error strings
        return None, f"{type(exc).__name__}: {exc}"


def main() -> int:
    print(f"app core:    {APP_ROOT}")
    print(f"legacy root: {LEGACY_ROOT}")

    new_general = NewGeneralService()
    legacy_general = LegacyGeneralService()
    new_options = NewSharedOptionsService()
    legacy_options = LegacySharedOptionsService()
    new_team = NewTeamService()
    legacy_team = LegacyTeamService()

    cases: list[tuple[str, Callable[[], Any], Callable[[], Any]]] = [
        (
            "general/exact-historical",
            lambda: new_general.analyze_composition("Ascent", 2024, list(AGENTS_STANDARD)),
            lambda: legacy_general.analyze_composition("Ascent", 2024, list(AGENTS_STANDARD)),
        ),
        (
            "general/unseen-standard",
            lambda: new_general.analyze_composition("Ascent", 2024, list(AGENTS_UNSEEN)),
            lambda: legacy_general.analyze_composition("Ascent", 2024, list(AGENTS_UNSEEN)),
        ),
        (
            "general/unclassified-fallback",
            lambda: new_general.analyze_composition(
                "Abyss", 2024, ["breach", "fade", "gekko", "kayo", "sova"]
            ),
            lambda: legacy_general.analyze_composition(
                "Abyss", 2024, ["breach", "fade", "gekko", "kayo", "sova"]
            ),
        ),
        (
            "general/unknown-agent-error",
            lambda: new_general.analyze_composition(
                "Ascent", 2024, ["jett", "kayo", "killjoy", "omen", "nope"]
            ),
            lambda: legacy_general.analyze_composition(
                "Ascent", 2024, ["jett", "kayo", "killjoy", "omen", "nope"]
            ),
        ),
        (
            "team/exact-historical",
            lambda: new_team.predict("G2 Esports", "Ascent", 2024, list(AGENTS_STANDARD)),
            lambda: legacy_team.predict("G2 Esports", "Ascent", 2024, list(AGENTS_STANDARD)),
        ),
        (
            "team/unseen-composition",
            lambda: new_team.predict("G2 Esports", "Ascent", 2024, list(AGENTS_UNSEEN)),
            lambda: legacy_team.predict("G2 Esports", "Ascent", 2024, list(AGENTS_UNSEEN)),
        ),
        (
            "team/never-observed-role-pattern",
            lambda: new_team.predict(
                "G2 Esports", "Ascent", 2024, list(AGENTS_NEVER_SEEN_PATTERN)
            ),
            lambda: legacy_team.predict(
                "G2 Esports", "Ascent", 2024, list(AGENTS_NEVER_SEEN_PATTERN)
            ),
        ),
        (
            "team/unknown-team-error",
            lambda: new_team.predict("Not A Real Team", "Ascent", 2024, list(AGENTS_STANDARD)),
            lambda: legacy_team.predict("Not A Real Team", "Ascent", 2024, list(AGENTS_STANDARD)),
        ),
        (
            "options/years",
            new_options.get_available_years,
            legacy_options.get_available_years,
        ),
        (
            "options/maps",
            lambda: new_options.get_available_maps("2024"),
            lambda: legacy_options.get_available_maps("2024"),
        ),
        (
            "options/maps-unknown-year-error",
            lambda: new_options.get_available_maps("2020"),
            lambda: legacy_options.get_available_maps("2020"),
        ),
        (
            "options/teams",
            lambda: new_team.get_available_teams(year="2024", map_name="Ascent"),
            lambda: legacy_team.get_available_teams(year="2024", map_name="Ascent"),
        ),
    ]

    failures = 0
    for name, new_factory, legacy_factory in cases:
        new_value, new_error = run(new_factory)
        legacy_value, legacy_error = run(legacy_factory)

        if new_value == legacy_value and new_error == legacy_error:
            print(f"PASS  {name}")
        else:
            failures += 1
            print(f"FAIL  {name}")
            print(f"      new:    {json.dumps(new_value, sort_keys=True) if new_value is not None else new_error}")
            print(f"      legacy: {json.dumps(legacy_value, sort_keys=True) if legacy_value is not None else legacy_error}")

    total = len(cases)
    print()
    if failures:
        print(f"{failures}/{total} case(s) MISMATCHED")
        return 1

    print(f"{total}/{total} cases match the legacy Flask service output")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
