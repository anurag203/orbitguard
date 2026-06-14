# Conjunction Screening Engine Context

## Current Status

Tested and final-round scenario fixture-ready.

## LLD Reference

`../architecture/05-conjunction-screening-engine-lld.md`

## Implementation Scope

Implement protagonist-vs-catalog screening, coarse distance sweep, TCA refinement, miss distance, relative velocity, severity, and ranking.

## Files Expected To Be Created Or Modified

- Backend screening engine module. Created.
- Screening schemas. Updated.
- Controlled conjunction fixtures. Tuned Protect ISRO demo debris TLE.
- Unit and integration tests. Added.

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented ConjunctionEngine, protagonist-vs-catalog screening, severity ranking, initial Pc bridge logic, relative position/velocity vectors, encounter-plane detail output, scenario/catalog request resolution, detail recomputation, tuned deterministic Protect ISRO TLE to produce a critical SGP4-derived near miss, and Docker screening smoke. Pc is now owned by the Collision Probability Engine.
- 2026-06-13: Added deterministic final-round conjunction fixtures for 2009 Replay and Kessler Sandbox so declared scenario IDs resolve consistently for website switching, detail views, and maneuver planning.

## Current Working Point

Conjunction Screening Engine implementation is complete for Round 1 foundation and final-round demo scenario continuity.

## Next Step

Submission packaging and video rehearsal.

## Commands Run

- `make test-backend` - 43 passed, 1 Starlette/httpx deprecation warning.
- Docker Compose smoke: built backend image, verified `/api/health`, `POST /api/scenarios/protect-isro/run`, `POST /api/propagate`, `POST /api/conjunctions/screen`, and `GET /api/conjunctions/conj-protect-isro-001`.
- `PYTHONPATH=backend .venv/bin/pytest backend/tests/test_catalogs_conjunctions.py backend/tests/test_maneuvers_reports.py -q` - 20 passed, 1 Starlette/httpx deprecation warning.

## Tests Run

- Backend pytest API/unit suite: 43 passed.
- Docker smoke check passed for health, scenario, propagation, screening, and detail endpoints.
- Backend final-round fixture tests: 20 passed for conjunction and maneuver/report paths.

## Decisions Made

- Round 1 focuses on protagonist-vs-catalog, not full all-pairs.
- Protect ISRO `conj-protect-isro-001` is generated from the screened `isro-cartosat-2f` / `debris-demo-001` pair.
- Pc in screening output now comes from the Collision Probability Engine using documented covariance assumptions.
- 2009 Replay and Kessler Sandbox use deterministic fixture-backed conjunction geometry when demo TLE screening does not naturally produce the declared final-round story event.

## Blockers / Risks

- Relative velocity in the tuned deterministic fixture is low because the demo debris TLE is intentionally near-coorbital; final-round scenario polish may use richer injected geometry for cinematic relative-speed storytelling.

## Demo Readiness

Protect ISRO critical conjunction appears at the top of the worklist with miss distance under 1 km and detail geometry available. 2009 Replay and Kessler Sandbox now also expose stable conjunction detail for final-round website demos.
