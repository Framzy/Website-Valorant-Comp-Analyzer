FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /srv/analyzer

# Dependencies first (cached layer); ML pins match the legacy backend.
COPY requirements.txt requirements-dev.txt ./
ARG INSTALL_TESTS=0
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_TESTS" = "1" ]; then pip install --no-cache-dir -r requirements-dev.txt; fi

# Application code, datasets and model artifacts.
COPY app ./app
COPY data ./data
COPY artifacts ./artifacts
COPY tests ./tests

# /healthz uses only the standard library, so no curl is needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=4)"

RUN useradd --create-home --uid 10001 analyzer \
    && chown -R analyzer:analyzer /srv/analyzer
USER analyzer

EXPOSE 8000

# Single worker: the legacy services load the dataset/model once in lifespan.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
