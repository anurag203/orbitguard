# OrbitGuard Backend

FastAPI backend for OrbitGuard.

## Purpose

The backend owns API contracts, deterministic scenario orchestration, data service boundaries, and the future orbital computation engines.

## Local Setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
PYTHONPATH=backend pytest backend/tests
uvicorn app.main:app --app-dir backend --reload
```

Or use the root Makefile:

```bash
make setup-backend
make test-backend
make run-backend
```

Docker:

```bash
make docker-build-backend
make docker-run-backend
```

If Docker reports a missing Colima socket on macOS, start the Docker/Colima daemon before retrying.

Health check:

```bash
curl http://127.0.0.1:8000/api/health
```

Protect ISRO scenario smoke:

```bash
curl -X POST http://127.0.0.1:8000/api/scenarios/protect-isro/run \
  -H 'Content-Type: application/json' \
  -d '{"deterministic":true}'
```

Propagation smoke:

```bash
curl -X POST http://127.0.0.1:8000/api/propagate \
  -H 'Content-Type: application/json' \
  -d '{"object_ids":["isro-cartosat-2f"],"start_time_utc":"2026-06-13T00:00:00Z","end_time_utc":"2026-06-13T00:02:00Z","step_seconds":60}'
```

Conjunction screening smoke:

```bash
curl -X POST http://127.0.0.1:8000/api/conjunctions/screen \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"protect-isro","step_seconds":10}'
```

Conjunction detail with Pc metadata:

```bash
curl http://127.0.0.1:8000/api/conjunctions/conj-protect-isro-001
```

## Current Scope

This is the Round 1 backend skeleton. It includes:

- app factory,
- API routers,
- Pydantic models,
- structured errors,
- deterministic scenario endpoints,
- starter catalog, maneuver, and report services,
- pytest API coverage.

The science engines are represented by stable service boundaries and will be filled in according to the LLD build order.
