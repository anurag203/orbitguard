# Scenario Engine LLD

## Purpose

Provide deterministic, story-driven scenarios that make OrbitGuard demoable and educational regardless of live catalog conditions.

## Responsibilities

- Run Protect ISRO, 2009 Replay, and Kessler Sandbox.
- Load scenario fixtures and timelines.
- Provide deterministic conjunctions, events, and camera/story hints.
- Reset scenarios to initial state.
- Support offline demo mode.

## Non-Responsibilities

- Do not hide which events are scenario-injected.
- Do not replace live catalog mode.
- Do not generate final report text directly.

## Implementation Plan

- Define scenario manifests with ID, title, description, required fixtures, protected object, timeline, and expected demo beats.
- Implement scenario runners that produce stable object sets and event timelines.
- Protect ISRO is the Round 1 hero scenario.
- 2009 Replay and Kessler Sandbox can begin as deterministic fixtures with richer final-round behavior later.
- Return scenario hints for frontend camera movement and panel focus.

## Data Flow

Frontend requests scenario list, user selects a scenario, backend loads fixtures, scenario runner outputs objects/events/conjunction seeds, and downstream modules compute or replay risk/maneuver results.

## APIs / Interfaces

- `list_scenarios()`
- `run_scenario(scenario_id, options)`
- `reset_scenario(scenario_id)`
- `get_scenario_event_timeline(scenario_id)`

Backend API exposure:

- `GET /api/scenarios`
- `POST /api/scenarios/{id}/run`
- `POST /api/scenarios/{id}/reset`
- `GET /api/scenarios/{id}/timeline`

## Data Models

- `ScenarioManifest`
- `ScenarioRun`
- `ScenarioEvent`
- `ScenarioObjectRef`
- `ScenarioExpectedOutcome`
- `demo_beats`
- `camera_hint`

## Algorithms / Logic

- Scenario mode can combine TLE-based catalog fixtures with clearly labeled injected encounter geometry.
- Event timelines are deterministic.
- Scenario runners must produce stable IDs so reports and UI replay remain consistent.

## Error Handling

- Missing fixture blocks scenario with clear error.
- Unknown scenario returns 404.
- Partial scenario data returns not-demo-ready status.

## Performance Considerations

- Preload hero scenario metadata.
- Cache scenario runs during a session.
- Keep scenario object count appropriate for demo performance.

## Security / Safety Considerations

- Clearly label simulated/injected events.
- Avoid misleading claims about live risk for scenario-only events.

## Test Architecture

- Determinism tests.
- Required fixture tests.
- Event timeline snapshot tests.
- End-to-end scenario flow tests.

## Test Cases

- Protect ISRO run returns same critical conjunction ID every time.
- 2009 Replay returns historical context metadata.
- Kessler Sandbox returns debris growth timeline.
- Reset returns scenario to initial state.
- Missing fixture fails loudly before demo.

## Demo Acceptance Criteria

- Protect ISRO can be launched in one click.
- Scenario title and simulated/live labels are clear.
- Timeline events guide the 3-minute video.

## Final-Round Extensions

- Add scenario editor controls.
- Add richer Kessler cascade visualization.
- Add multiple Indian asset cases.
- Add comparison mode across scenarios.

## Context File Reference

`../context/09-scenario-engine-context.md`
