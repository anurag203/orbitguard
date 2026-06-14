# Collision Probability Engine Context

## Current Status

Tested.

## LLD Reference

`../architecture/06-collision-probability-engine-lld.md`

## Implementation Scope

Implement estimated Pc calculation, covariance assumptions, encounter-plane output, risk classification, and explanatory assumption metadata.

## Files Expected To Be Created Or Modified

- Backend Pc engine module. Created.
- Risk schemas. Created.
- Pc unit tests. Added.
- Methodology cross-links. Updated.

## Completed Work

- 2026-06-13: Context file created.
- 2026-06-13: Implemented CollisionProbabilityEngine, CovarianceModel/PcEstimate/RiskClassification schemas, encounter-plane projection, default `tle-demo-isotropic-300m` covariance assumption, small-hard-body-radius 2D Gaussian Pc approximation, degenerate-velocity fallback warnings, risk classification, ConjunctionDetail Pc metadata, and Docker detail smoke.

## Current Working Point

Collision Probability Engine implementation is complete for Round 1 foundation.

## Next Step

Move to Avoidance Maneuver Planner and use Pc estimates to rank before/after maneuver candidates.

## Commands Run

- `make test-backend` - 48 passed, 1 Starlette/httpx deprecation warning.
- Docker Compose smoke: built backend image, verified `/api/health`, `POST /api/conjunctions/screen`, and `GET /api/conjunctions/conj-protect-isro-001` includes Pc method/covariance metadata.

## Tests Run

- Backend pytest API/unit suite: 48 passed.
- Docker smoke check passed for health, screening, and detail Pc metadata.

## Decisions Made

- Pc must always be labeled as estimated because TLEs lack covariance.
- Default covariance model is `tle-demo-isotropic-300m` with 300 m x/y sigma and 20 m hard-body radius.
- Detail responses expose `pc_estimate` metadata so the UI/reporting layer can show assumptions.

## Blockers / Risks

- Pc remains an educational estimate; final-round work can replace it with Foster 2D refinement and real covariance if available.

## Demo Readiness

Protect ISRO detail response shows estimated Pc, covariance model, hard-body radius, assumptions, and warning slots.
