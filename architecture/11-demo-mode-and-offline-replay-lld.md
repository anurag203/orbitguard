# Demo Mode and Offline Replay LLD

## Purpose

Guarantee that OrbitGuard can be demonstrated reliably even if live data, internet, or external services fail.

## Responsibilities

- Provide deterministic demo data.
- Coordinate offline scenario playback.
- Expose a known-good demo flow.
- Store expected outputs for acceptance testing.
- Make the video and live pitch repeatable.

## Non-Responsibilities

- Do not replace normal APIs with fake UI-only data.
- Do not disguise simulated data as live.
- Do not skip scientific disclosures.

## Implementation Plan

- Create deterministic fixture manifests for all scenarios.
- Add a demo mode flag or endpoint option.
- Make Protect ISRO the default demo.
- Store expected conjunction and maneuver outputs for acceptance checks.
- Add a backend readiness endpoint that validates required offline fixtures.
- Add a backend replay endpoint that runs the Protect ISRO flow through scenario, conjunction, maneuver, secondary screening, and report generation.
- Add a clean-clone demo checklist.
- Ensure frontend has local asset fallbacks.

## Data Flow

Demo mode loads committed fixtures, runs deterministic scenario APIs, renders the same UI as normal mode, and returns stable outputs for recording and judging.

## APIs / Interfaces

- `GET /api/demo/status`
- `POST /api/scenarios/{id}/run` with deterministic mode.
- `GET /api/demo/expected-flow`
- `POST /api/demo/replay/{flow_id}`

## Data Models

- `DemoManifest`
- `DemoStep`
- `ExpectedDemoOutput`
- `OfflineReadinessStatus`

Current response models:

- `DemoStatusResponse`
- `ExpectedDemoFlow`
- `DemoReplayResponse`
- `DemoReadinessCheck`
- `DemoReplayCheck`

## Algorithms / Logic

- Validate required files before declaring demo-ready.
- Use scenario IDs and expected output IDs for repeatability.
- Prefer graceful fallback over blank panels.

Current backend readiness checks:

- Protect ISRO catalog.
- Protect ISRO scenario.
- 2009 Replay scenario.
- Kessler Sandbox scenario.
- Protect ISRO expected flow.
- Protect ISRO secondary screening fixture.

Current backend replay checks:

- scenario run ID,
- top conjunction ID,
- conjunction detail ID,
- maneuver plan ID,
- recommended candidate ID,
- secondary status,
- report candidate source ID.

## Error Handling

- Missing fixture returns demo-not-ready.
- Missing globe texture falls back to simple Earth material.
- Backend offline shows frontend recovery message with startup command.
- Readiness output reports relative fixture labels, not local absolute paths.

## Performance Considerations

- Keep demo fixture size small enough for quick startup.
- Preload hero scenario.
- Avoid long-running live refresh during demo.

## Security / Safety Considerations

- Clearly label offline/simulated mode.
- Do not leak local paths in readiness output.

## Test Architecture

- Network-off tests.
- Clean-clone startup test.
- Expected-flow snapshot tests.
- Playwright demo route test.

Implemented backend test coverage:

- Demo status returns ready when fixtures exist.
- Missing fixture root returns not-ready without leaking absolute paths.
- Expected Protect ISRO flow loads stable IDs.
- Backend replay matches expected Protect ISRO outputs.
- Demo API status and replay endpoints work.

## Test Cases

- Demo status returns ready when all fixtures exist.
- Missing fixture returns missing file category.
- Protect ISRO expected flow matches actual IDs.
- Frontend completes demo path using only local data.
- Globe fallback still shows usable mission console.

Current test file:

- `../backend/tests/test_demo_service.py`

## Demo Acceptance Criteria

- Full demo can be recorded without internet.
- The same click path works repeatedly.
- No panel displays raw stack traces or placeholder text.

## Final-Round Extensions

- Add presenter mode with scripted scene steps.
- Add automatic camera choreography.
- Add deterministic replay recording export.

## Context File Reference

`../context/11-demo-mode-and-offline-replay-context.md`
