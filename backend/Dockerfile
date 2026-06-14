# syntax=docker/dockerfile:1
FROM python:3.12-slim

# Deterministic, quiet Python; the app reads bundled data relative to this root.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    ORBITGUARD_PROJECT_ROOT=/app

WORKDIR /app

# Install dependencies first so they cache independently of app code.
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Application code + fixture data.
COPY backend/app /app/app
COPY data /app/data

# Least privilege: run as a dedicated non-root user.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Container-native healthcheck (stdlib only — no extra packages installed).
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
