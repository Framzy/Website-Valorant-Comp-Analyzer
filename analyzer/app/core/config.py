"""
Analyzer configuration
======================

Copied from production/backend/config.py.

ONLY difference vs the legacy module: BASE_DIR points at the analyzer/
application root (the folder that contains data/ and artifacts/) because the
sidecar no longer lives inside production/backend.

Dataset and artifact semantics are unchanged:

    analyzer/app/core/config.py  -> BASE_DIR = analyzer/
    data/valorant_dataset_general_v2.csv
    data/valorant_dataset_team_v2.csv
    artifacts/team/team_model_v2.joblib
    artifacts/team/encoders.joblib
    artifacts/team/feature_names.joblib
    artifacts/team/metadata.json
"""

from pathlib import Path

# BASE DIRECTORY

# app/core/config.py -> parents[0] = app/core, parents[1] = app,
# parents[2] = analyzer/.
BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BASE_DIR / "data"
ARTIFACT_DIR = BASE_DIR / "artifacts"

# DATASET

GENERAL_DATASET_PATH = (
    DATA_DIR / "valorant_dataset_general_v2.csv"
)

TEAM_DATASET_PATH = (
    DATA_DIR / "valorant_dataset_team_v2.csv"
)

# ARTIFACT

ARTIFACT_TEAM_DIR = (
    ARTIFACT_DIR / "team"
)
