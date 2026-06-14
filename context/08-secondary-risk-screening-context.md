# Secondary Risk Screening Context

## Current Status

Implemented and tested.

## LLD Reference

`../architecture/08-secondary-risk-screening-lld.md`

## Implementation Scope

Implement post-maneuver screening, new-risk comparison, secondary status classification, and reportable screening summary.

## Files Expected To Be Created Or Modified

- `../backend/app/models/secondary.py`
- `../backend/app/engines/secondary_risk_engine.py`
- `../backend/app/services/secondary_risk_service.py`
- `../backend/app/models/maneuver.py`
- `../backend/app/services/maneuver_service.py`
- `../backend/tests/test_secondary_risk_engine.py`
- `../backend/tests/test_maneuvers_reports.py`
- `../data/secondary-screening/protect-isro.json`
- `../architecture/08-secondary-risk-screening-lld.md`
- `../METHODOLOGY.md`
- `../execution/TESTING_CHECKLIST.md`

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented deterministic Round 1 secondary screening fixtures, typed response models, classifier, fixture-loading service, maneuver apply integration, clear/watch/blocked fixture paths, and backend tests.

## Current Working Point

Secondary Risk Screening is complete for the Round 1 backend slice. `POST /api/maneuvers/apply` now returns full secondary screening details for the selected maneuver.

## Next Step

Begin `../architecture/10-ai-briefing-and-reporting-lld.md`: upgrade reports so they are generated from the actual maneuver plan and secondary screening result rather than static report text.

## Commands Run

- `make test-backend` -> 56 passed, 1 warning.

## Tests Run

- `backend/tests/test_secondary_risk_engine.py`
- `backend/tests/test_maneuvers_reports.py`
- Full backend suite via `make test-backend`: 56 passed, 1 warning.

## Decisions Made

- Never show "safe" if screening is incomplete.
- Store Round 1 secondary results in `data/secondary-screening/`.
- Include a deliberate blocked fixture (`mnv-protect-isro-risk-demo`) to prove OrbitGuard can reject maneuvers that introduce new critical risk.
- Missing candidate-specific fixture returns `warning`, not `clear`.

## Blockers / Risks

- Final-round implementation should replace deterministic secondary fixtures with propagated post-burn state vectors and full catalog re-screening.

## Demo Readiness

Protect ISRO selected maneuver returns `clear`, reports three screened secondary objects, and includes no secondary concerns. Negative fixtures are available to demonstrate `watch` and `blocked` outcomes.
