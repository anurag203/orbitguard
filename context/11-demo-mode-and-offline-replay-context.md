# Demo Mode and Offline Replay Context

## Current Status

Implemented and tested for backend offline replay.

## LLD Reference

`../architecture/11-demo-mode-and-offline-replay-lld.md`

## Implementation Scope

Implement deterministic demo manifests, offline readiness checks, expected flow data, and network-independent Protect ISRO playback.

## Files Expected To Be Created Or Modified

- `../backend/app/models/demo.py`
- `../backend/app/services/demo_service.py`
- `../backend/app/api/routes/demo.py`
- `../backend/app/api/router.py`
- `../backend/tests/test_demo_service.py`
- `../architecture/11-demo-mode-and-offline-replay-lld.md`
- `../HLD.md`
- `../execution/TESTING_CHECKLIST.md`

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented backend demo status, expected-flow, and replay endpoints; readiness checks for required fixtures; Protect ISRO full backend replay assertions; and demo service/API tests.

## Current Working Point

Backend demo/offline replay is complete. Frontend offline/presenter mode remains for the Mission Console implementation.

## Next Step

Begin `../architecture/01-mission-console-frontend-lld.md`: build the actual mission console UI against the now-stable backend APIs.

## Commands Run

- `make test-backend` -> 64 passed, 1 warning.
- `PYTHONPATH=backend ./.venv/bin/python` demo status/replay probes -> status `ready`, replay `passed`.

## Tests Run

- `backend/tests/test_demo_service.py`
- Full backend suite via `make test-backend`: 64 passed, 1 warning.

## Decisions Made

- Hero demo cannot depend on live internet.
- Backend readiness output uses relative fixture labels, not local absolute paths.
- Protect ISRO replay must check scenario, conjunction, maneuver, secondary, and report outputs.

## Blockers / Risks

- Needs frontend later, but backend offline readiness can be implemented now.
- Full offline demo acceptance still depends on the frontend mission console.

## Demo Readiness

Backend status returns `ready` and backend replay returns `passed` for `protect-isro-round1`. Full demo readiness will require frontend offline mode and visual QA.
