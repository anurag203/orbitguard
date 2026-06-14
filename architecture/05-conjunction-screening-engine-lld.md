# Conjunction Screening Engine LLD

## Purpose

Find and rank close approaches between a protected object and catalog objects, then provide refined conjunction geometry for risk analysis.

## Responsibilities

- Screen candidate object pairs.
- Compute time of closest approach.
- Compute miss distance and relative velocity.
- Assign preliminary severity.
- Produce ranked worklist items for the frontend.

## Non-Responsibilities

- Do not estimate final Pc beyond passing geometry to the Pc engine.
- Do not choose maneuvers.
- Do not decide whether a conjunction is operationally actionable alone.

## Implementation Plan

- Start with protagonist-vs-catalog screening for Round 1.
- Use coarse sampling over the screening window to find local minima.
- Refine candidate minima using smaller time steps around the best coarse point.
- Return top N ranked conjunction candidates.
- Keep thresholds configurable per scenario.

## Data Flow

Propagation series enter the screening engine. Candidate close approaches are identified and refined into conjunction summaries. These summaries are enriched by the Pc engine and returned to the UI.

## APIs / Interfaces

- `screen_protagonist(protagonist_series, catalog_series, config)`
- `refine_tca(pair_series, coarse_min_time, config)`
- `rank_conjunctions(candidates, config)`

Backend API exposure:

- `POST /api/conjunctions/screen`
- `GET /api/conjunctions/{conjunction_id}`
- Screening request accepts scenario/catalog context, optional UTC time window, step size, coarse threshold, and max results.

## Data Models

- `ScreeningConfig`
- `ConjunctionCandidate`
- `ConjunctionSummary`
- `TcaResult`
- `SeverityBand`

## Algorithms / Logic

- Compute relative position at each sampled time.
- Find local minima under coarse threshold.
- Refine closest approach by selecting the closest sampled common timestamp in the Round 1 implementation.
- Rank by severity, Pc when available, miss distance, and time to TCA.
- Use the Collision Probability Engine for estimated Pc and risk classification.

## Error Handling

- Missing state series returns object-level warning.
- No conjunctions returns an empty worklist with healthy status.
- Insufficient samples returns validation error.
- Unknown/missing protected object returns a structured API error.

## Performance Considerations

- Avoid all-pairs catalog screening in Round 1.
- Limit candidate refinement count.
- Use numpy arrays for distance calculations.
- Cache screening results for deterministic scenarios.

## Security / Safety Considerations

- Clamp catalog size and time range.
- Clearly identify scenario-injected conjunctions.

## Test Architecture

- Unit tests for distance and relative velocity calculations.
- Controlled fixture tests with known closest approach.
- Boundary tests around screening thresholds.
- Integration tests with propagation output.

## Test Cases

- Seeded fixture produces expected top conjunction.
- Protect ISRO deterministic fixture produces `conj-protect-isro-001` with critical severity from SGP4-derived state vectors.
- 2009 Replay returns deterministic final-round fixture `conj-2009-replay-001` when demo TLE screening does not reproduce the declared historical what-if event.
- Kessler Sandbox returns deterministic final-round fixture `conj-kessler-sandbox-001` for debris-pressure education mode.
- No-risk fixture returns empty worklist.
- Two candidates rank in correct severity order.
- Detail endpoint returns relative position vector, relative velocity vector, encounter-plane points, and assumptions.
- Missing object series produces warning without crash.

## Demo Acceptance Criteria

- Protect ISRO critical conjunction appears at the top of the worklist.
- TCA, miss distance, and relative velocity are visible and stable.
- Screening response arrives quickly enough for live demo flow.
- Docker smoke verifies screening and detail endpoints inside the backend container.
- Final-round scenario IDs resolve consistently for website mode switching and maneuver planning.

## Final-Round Extensions

- Add spatial binning for broader catalog screening.
- Add all-pairs batch mode.
- Add historical analytics and trend views.

## Context File Reference

`../context/05-conjunction-screening-engine-context.md`
