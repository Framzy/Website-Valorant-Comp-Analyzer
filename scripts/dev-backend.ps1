$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

try {
    python -c "import uvicorn, fastapi, numpy, pandas, sklearn, scipy, xgboost, joblib" 2>$null
    if ($LASTEXITCODE -eq 0) {
        & python -m uvicorn app.main:app --reload --app-dir analyzer --host 127.0.0.1 --port 8000
        exit $LASTEXITCODE
    }
}
catch {
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Local analyzer dependencies are unavailable; using Docker (Python 3.11 image)."
    & docker build -t val-comp-analyzer-api ./analyzer
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    & docker run --rm -p 8000:8000 val-comp-analyzer-api
    exit $LASTEXITCODE
}

Write-Error "Analyzer dependencies are unavailable. Install Python 3.11 and run 'python -m pip install -r analyzer/requirements.txt', or install Docker Desktop."
exit 1
