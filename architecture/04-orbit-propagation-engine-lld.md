# Orbit Propagation Engine LLD

## Purpose

Convert TLE records and time windows into orbital state vectors for visualization, screening, and scenario simulation.

## Responsibilities

- Run SGP4-compatible propagation.
- Produce position and velocity vectors at requested times.
- Support single-object and batch propagation.
- Return propagation warnings for invalid or decayed objects.
- Provide deterministic outputs for scenario fixtures.

## Non-Responsibilities

- Do not rank conjunctions.
- Do not estimate collision probability.
- Do not plan maneuvers.

## Implementation Plan

- Wrap a Python SGP4 library behind a small internal interface.
- Convert API time inputs into timezone-safe UTC datetimes.
- Provide batch propagation for protagonist-vs-catalog screening.
- Return state vectors in kilometers and kilometers per second unless otherwise documented.
- Include propagation status for every object.

## Data Flow

Catalog objects with TLE records enter the engine with a time grid. The engine outputs state samples keyed by object ID and timestamp.

## APIs / Interfaces

- `propagate_object(tle, times)`
- `propagate_batch(objects, times)`
- `state_at(tle, timestamp)`
- `build_time_grid(start, end, step_seconds)`

Backend API exposure:

- `POST /api/propagate`
- Request accepts object IDs, optional UTC start/end timestamps, and step size.
- Response returns SGP4 state vectors with `position_km` and `velocity_km_s`.

## Data Models

- `PropagationRequest`
- `StateVector`
- `PropagationSeries`
- `PropagationWarning`
- `TimeGrid`

## Algorithms / Logic

- Use SGP4 for TLE propagation.
- Normalize all timestamps to UTC.
- Report invalid state if SGP4 returns an error code.
- Keep units explicit in response schemas.
- Deterministic default window starts at `2026-06-13T00:00:00Z` and spans 10 minutes when no explicit times are supplied.

## Error Handling

- Invalid TLE returns object-level warning, not full request failure when possible.
- Invalid time window returns request-level validation error.
- Excessive time range or tiny step size returns a bounded-input error.
- Unknown object IDs return response warnings instead of failing the whole request.

## Performance Considerations

- Use vectorized or batched loops where practical.
- Avoid serializing unnecessary state samples to the frontend.
- Cache repeated scenario propagation if inputs are identical.

## Security / Safety Considerations

- Do not accept unbounded catalog sizes or time grids from clients.
- Label results as educational/decision-support, not operational control authority.

## Test Architecture

- Unit tests for time-grid generation.
- SGP4 wrapper tests with known valid TLEs.
- Error-code tests for invalid TLEs.
- Batch propagation performance smoke tests.

## Test Cases

- Propagating one valid TLE returns position and velocity.
- Repeated scenario request returns deterministic values.
- Invalid time order is rejected.
- Excessive step count is rejected.
- Batch propagation returns per-object status.
- Unknown object IDs return warnings.
- Docker smoke verifies propagation inside the container.

## Demo Acceptance Criteria

- Protect ISRO scenario produces smooth enough orbit samples for visualization.
- Propagation output feeds screening without manual conversion.
- Invalid noncritical objects do not break the whole demo.

## Final-Round Extensions

- Add higher-fidelity propagation options for short post-burn arcs.
- Add propagation cache keyed by catalog version and time grid.
- Add benchmark reports.

## Context File Reference

`../context/04-orbit-propagation-engine-context.md`
