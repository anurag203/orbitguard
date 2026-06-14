# Orbit Propagation Engine Context

## Current Status

Tested.

## LLD Reference

`../architecture/04-orbit-propagation-engine-lld.md`

## Implementation Scope

Implement SGP4 wrapper, time-grid generation, single-object and batch propagation, units, warnings, and deterministic scenario propagation.

## Files Expected To Be Created Or Modified

- Backend propagation engine module. Created.
- Propagation schemas. Updated.
- Unit tests with known TLE fixtures. Added.

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented SGP4 dependency, propagation engine wrapper, UTC time-grid generation, state-vector response schemas, catalog-backed propagation service, bounded time-window validation, unknown-object warnings, invalid/missing TLE warnings, propagation API tests, engine unit tests, and Docker propagation smoke.

## Current Working Point

Orbit Propagation Engine implementation is complete for Round 1 foundation.

## Next Step

Move to Conjunction Screening Engine and consume propagation state vectors for TCA/miss-distance screening.

## Commands Run

- `.venv/bin/python -m pip install -r backend/requirements-dev.txt` - installed `sgp4`.
- `PYTHONPATH=backend .venv/bin/python - <<'PY' ...` - verified committed Protect ISRO TLEs propagate with SGP4 error code 0.
- `make test-backend` - 37 passed, 1 Starlette/httpx deprecation warning.
- Docker Compose smoke: built backend image, verified `/api/health`, `POST /api/scenarios/protect-isro/run`, and `POST /api/propagate` for `isro-cartosat-2f`.

## Tests Run

- Backend pytest API/unit suite: 37 passed.
- Docker smoke check passed for health, Protect ISRO scenario, and SGP4 propagation.

## Decisions Made

- Use kilometers and kilometers per second internally unless documented otherwise.
- Add `sgp4>=2.24,<3.0` as the backend propagation dependency.
- Default propagation window is deterministic: `2026-06-13T00:00:00Z` through `2026-06-13T00:10:00Z` when request times are omitted.
- Maximum generated time-grid samples is 720 for the Round 1 API.

## Blockers / Risks

- Conjunction Screening Engine will need efficient access to propagation series; current API returns full state vectors and can be reused directly.

## Demo Readiness

Protect ISRO object propagates through SGP4 locally and in Docker, returning position in km and velocity in km/s.
