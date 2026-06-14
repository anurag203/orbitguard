# Scenario Engine Context

## Current Status

Tested.

## LLD Reference

`../architecture/09-scenario-engine-lld.md`

## Implementation Scope

Implement scenario manifests and deterministic runners for Protect ISRO, 2009 Replay, and Kessler Sandbox.

## Files Expected To Be Created Or Modified

- Backend scenario engine module. Updated.
- Scenario fixture files. Created.
- Scenario tests. Added.
- Demo expected-flow files. Created.

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented fixture-backed scenario manifests, deterministic runs for Protect ISRO, 2009 Replay, and Kessler Sandbox, scenario reset API, timeline API, camera hints, demo beats, expected outcomes, expected Protect ISRO flow fixture, manifest validation tests, and Docker-compatible project-root resolution.

## Current Working Point

Scenario Engine implementation is complete for Round 1 foundation.

## Next Step

Move to Orbit Propagation Engine and implement state-vector generation from catalog TLEs.

## Commands Run

- `make test-backend` - 29 passed, 1 Starlette/httpx deprecation warning.
- Docker Compose smoke: built backend image, started backend, verified `/api/health`, verified `POST /api/scenarios/protect-isro/run`, then stopped services.

## Tests Run

- Backend pytest API/unit suite: 29 passed.
- Docker smoke check passed for health and Protect ISRO scenario.

## Decisions Made

- Protect ISRO is the hero scenario.
- Scenario manifests live under `data/scenarios/`.
- Scenario API responses include `expected_outcome`, `demo_beats`, and event `camera_hint` fields for future frontend/demo choreography.
- Docker Compose sets `ORBITGUARD_PROJECT_ROOT=/app`; local path discovery also works without the env var.

## Blockers / Risks

- 2009 Replay and Kessler Sandbox have foundation fixtures; their deeper science/visuals are final-round work.

## Demo Readiness

Protect ISRO launches through the API with stable run ID, top conjunction ID, expected maneuver plan ID, demo beats, and labels.
