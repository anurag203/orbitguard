# Avoidance Maneuver Planner Context

## Current Status

Implemented and tested.

## LLD Reference

`../architecture/07-avoidance-maneuver-planner-lld.md`

## Implementation Scope

Implement delta-v candidate generation, candidate scoring, risk reduction evaluation, recommendation selection, and alternative rejection reasons.

## Files Expected To Be Created Or Modified

- `../backend/app/engines/maneuver_planner_engine.py`
- `../backend/app/services/maneuver_service.py`
- `../backend/app/models/maneuver.py`
- `../backend/tests/test_maneuver_planner_engine.py`
- `../backend/tests/test_maneuvers_reports.py`
- `../architecture/07-avoidance-maneuver-planner-lld.md`
- `../METHODOLOGY.md`
- `../execution/TESTING_CHECKLIST.md`

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented deterministic Round 1 maneuver planner with candidate generation, Pc recomputation, delta-v ranking, no-safe-plan behavior, assumptions, warnings, API response telemetry, and backend unit/API tests.

## Current Working Point

Avoidance Maneuver Planner implementation is complete for the Round 1 backend slice. Secondary screening is still a deterministic apply-flow placeholder and should be implemented next.

## Next Step

Begin `../architecture/08-secondary-risk-screening-lld.md`: replace the apply-flow placeholder with a post-maneuver screening module that can return clear, warn, and fail statuses.

## Commands Run

- `make test-backend` -> 53 passed, 1 warning.
- `PYTHONPATH=backend ./.venv/bin/python` service probes for recommended and no-safe-plan maneuver payloads -> produced deterministic Protect ISRO outputs.

## Tests Run

- `backend/tests/test_maneuver_planner_engine.py`
- `backend/tests/test_maneuvers_reports.py`
- Full backend suite via `make test-backend`: 53 passed, 1 warning.

## Decisions Made

- Start with small impulsive along-track maneuvers.
- Use a documented Round 1 lead-time surrogate for post-burn miss-distance gain.
- Keep candidate IDs stable for the demo: `mnv-protect-isro-a` is the recommended candidate when default constraints allow it.
- Default constraints are Pc below `1e-6`, minimum miss distance 8 km, and maximum delta-v 0.5 m/s.
- Return `no-safe-plan` rather than overclaiming if no candidate satisfies both Pc and clearance thresholds.

## Blockers / Risks

- Final-round science should replace the lead-time surrogate with post-burn trajectory propagation.
- Secondary screening remains to be implemented as its own module.

## Demo Readiness

Protect ISRO produces one clear recommended maneuver with before/after risk metrics:

- Before: Pc `2.779e-4`, miss distance about 612 m, severity critical.
- Recommended: 0.12 m/s along-track prograde, 4 hours before TCA.
- Predicted after: miss distance about 8.39 km, Pc effectively zero under the documented Round 1 covariance assumption.
- Apply flow still needs the dedicated Secondary Risk Screening module for final credibility.
