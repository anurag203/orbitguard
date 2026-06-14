# Scenario Fixtures Plan

## Purpose

Define deterministic fixtures for Protect ISRO, 2009 Replay, and Kessler Sandbox.

## Fixture Contents

Each scenario fixture should include:

- scenario ID,
- title,
- description,
- protected object,
- involved objects,
- timeline events,
- expected top conjunction,
- expected maneuver result,
- expected secondary screening result,
- labels for real, historical, simulated, or injected data.

## Required Scenarios

- `protect-isro`
- `2009-replay`
- `kessler-sandbox`

## Current Committed Manifests

- `data/scenarios/protect-isro.json`
- `data/scenarios/2009-replay.json`
- `data/scenarios/kessler-sandbox.json`

## Current Expected Flow Fixture

- `data/demo/expected-flows/protect-isro.json`

## Validation

- fixture schema validation,
- deterministic output IDs,
- expected flow snapshot test,
- demo readiness check.

## Backend Status

- Scenario manifests are loaded by `ScenarioService`.
- `GET /api/scenarios` lists all committed manifests.
- `POST /api/scenarios/{id}/run` returns deterministic run payloads.
- `POST /api/scenarios/{id}/reset` resets to deterministic run state.
- `GET /api/scenarios/{id}/timeline` returns sorted events for frontend choreography.
