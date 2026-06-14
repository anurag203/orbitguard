# Collision Probability Engine LLD

## Purpose

Estimate collision probability for conjunctions using encounter geometry and transparent covariance assumptions.

## Responsibilities

- Convert conjunction geometry into a risk estimate.
- Project uncertainty into an encounter-plane representation.
- Return Pc, uncertainty assumptions, hard-body radius, and explanatory inputs.
- Support visualization data for the frontend.

## Non-Responsibilities

- Do not claim operational-grade probability without real covariance data.
- Do not screen conjunctions.
- Do not recommend maneuvers.

## Implementation Plan

- Define a configurable covariance assumption model for TLE-based scenarios.
- Use encounter geometry from the screening engine.
- Estimate Pc with a simplified, documented method suitable for MVP.
- Return enough intermediate values for judge-facing explanation.
- Add a methodology note link in API output metadata.

## Data Flow

Conjunction geometry enters the Pc engine. The engine applies covariance and hard-body assumptions, computes risk, assigns severity support values, and returns display-ready risk metrics.

## APIs / Interfaces

- `estimate_pc(conjunction, covariance_model, hard_body_radius_m)`
- `build_encounter_plane(conjunction, covariance_model)`
- `classify_risk(pc, miss_distance, config)`

Round 1 implementation:

- `CollisionProbabilityEngine.estimate_pc(pc_input, covariance)`
- `CollisionProbabilityEngine.build_encounter_plane(pc_input)`
- `CollisionProbabilityEngine.classify_risk(pc, miss_distance_m)`
- `ConjunctionDetail.pc_estimate` exposes method, covariance model, hard-body radius, assumptions, and warnings.

## Data Models

- `CovarianceModel`
- `PcEstimate`
- `EncounterPlane`
- `RiskClassification`
- `AssumptionNote`

## Algorithms / Logic

- Use relative position and velocity to define encounter orientation.
- Apply assumed combined covariance.
- Estimate probability as a bounded value between 0 and 1.
- Ensure monotonic behavior for controlled fixtures.
- Use a small-hard-body-radius approximation over a 2D Gaussian encounter-plane distribution.
- Default Round 1 covariance model is `tle-demo-isotropic-300m` with 300 m x/y sigma and 20 m hard-body radius.

## Error Handling

- Invalid covariance returns validation error.
- Degenerate relative velocity returns fallback risk explanation.
- Negative or missing hard-body radius is rejected.
- Invalid relative position/velocity vectors return structured validation errors.

## Performance Considerations

- Pc estimation should be lightweight compared with propagation.
- Cache repeated estimates for deterministic conjunction IDs.

## Security / Safety Considerations

- Display assumptions with every Pc.
- Use "estimated Pc" wording in UI and reports.
- Avoid false precision in formatted numbers.

## Test Architecture

- Numeric bound tests.
- Monotonicity tests.
- Degenerate geometry tests.
- Snapshot tests for scenario Pc explanations.

## Test Cases

- Pc is always between 0 and 1.
- Larger miss distance produces lower risk under fixed covariance.
- Larger covariance produces higher uncertainty/risk for fixed geometry.
- Invalid covariance is rejected.
- Encounter-plane output contains visualization coordinates.
- Protect ISRO detail response contains Pc method/covariance metadata.
- Docker smoke verifies Pc metadata in the detail endpoint.

## Demo Acceptance Criteria

- Detail panel shows Pc with assumptions.
- Pc visibly drops after successful maneuver.
- Judges can see that the number is estimated, not magic.

## Final-Round Extensions

- Add Foster 2D implementation refinement.
- Add real covariance ingestion if public samples are available.
- Add sensitivity sliders for educational mode.

## Context File Reference

`../context/06-collision-probability-engine-context.md`
