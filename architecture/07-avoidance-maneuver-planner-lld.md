# Avoidance Maneuver Planner LLD

## Purpose

Recommend an avoidance maneuver that reduces primary conjunction risk while minimizing fuel and preserving mission credibility.

## Responsibilities

- Generate maneuver candidates.
- Evaluate before/after risk.
- Rank candidates by safety and delta-v cost.
- Select a recommended maneuver.
- Provide explanation inputs for the briefing/reporting layer.

## Non-Responsibilities

- Do not execute real spacecraft commands.
- Do not hide uncertainty.
- Do not approve a maneuver without secondary screening.

## Implementation Plan

- Implement `ManeuverPlannerEngine` as a deterministic planner behind the FastAPI service.
- Start with small impulsive along-track delta-v candidates.
- Generate candidate burns across a bounded delta-v grid and lead-time set.
- Use a documented Round 1 lead-time surrogate for post-burn miss-distance gain.
- Recompute primary conjunction Pc with the Collision Probability Engine for each candidate.
- Hard reject candidates that fail Pc or miss-distance thresholds.
- Select the lowest-delta-v candidate that satisfies safety constraints.
- Mark the selected candidate as requiring secondary screening before it can be treated as demo-clear.
- Return the selected candidate, alternatives, constraints, assumptions, and warnings.

## Data Flow

Selected conjunction and protected object state enter planner. Planner generates candidates, requests risk recomputation, sends best candidates to secondary screening, and returns a recommendation package.

## APIs / Interfaces

- `plan_maneuver(conjunction_id, constraints)`
- `generate_candidates(conjunction, constraints)`
- `score_candidate(candidate, before_metrics, after_metrics)`
- `select_recommendation(candidates)`

Implemented backend API:

- `POST /api/maneuvers/plan`
- `POST /api/maneuvers/apply`

## Data Models

- `ManeuverConstraints`
- `ManeuverCandidate`
- `ManeuverPlan`
- `ManeuverScore`
- `BeforeAfterRisk`

Current API response fields:

- `status`: `recommended` or `no-safe-plan`
- `recommendation`: selected maneuver or `null`
- `alternatives`: viable or rejected alternatives with reasons
- `before` and `predicted_after`: Pc, miss distance, relative velocity, severity
- `candidate_count`
- `constraints`
- `assumptions`
- `warnings`

## Algorithms / Logic

- Candidate dimensions: burn lead time, direction, delta-v magnitude.
- Hard reject candidates that do not reduce risk enough.
- Prefer minimum delta-v among candidates that meet safety threshold.
- Include "why rejected" reasons for alternatives.

Round 1 deterministic grid:

- Lead times: 4 hours, 3 hours, 2 hours before TCA.
- Delta-v values: 0.04, 0.08, 0.12, 0.20, 0.35, 0.50 m/s.
- Direction: along-track prograde for the hero scenario.
- Default constraints: max delta-v 0.5 m/s, Pc threshold `1e-6`, minimum miss distance 8 km.

Protect ISRO current result:

- Evaluates 18 candidates.
- Selects `mnv-protect-isro-a`.
- Recommends 0.12 m/s along-track prograde, 4 hours before TCA.
- Predicts miss distance increase from about 612 m to about 8.39 km.
- Predicts Pc drop from `2.779e-4` to effectively zero under the Round 1 covariance assumption.

## Error Handling

- If no candidate clears threshold, return best-effort alternatives and a no-safe-plan status.
- If post-burn propagation fails, mark candidate invalid.
- If conjunction is stale or missing, return 404/validation error.
- If the delta-v budget is too small to generate candidates, return `no-safe-plan` with warnings.

## Performance Considerations

- Limit candidate grid size for Round 1.
- Cache repeated candidate evaluations in deterministic scenarios.
- Return progress-friendly statuses for future long-running jobs.
- Current Protect ISRO grid evaluates in-process and is covered by backend unit/API tests.

## Security / Safety Considerations

- Label outputs as simulation recommendations only.
- Include assumptions and no-operational-use warning in reports.
- Never phrase a recommendation as a real command authorization.
- Keep the lead-time surrogate visible until final-round post-burn propagation replaces it.

## Test Architecture

- Unit tests for candidate generation.
- Ranking tests for minimum-fuel safe candidate.
- Integration tests with Pc and secondary screening fixtures.
- Failure tests where no safe maneuver exists.

Implemented test coverage:

- Candidate generation respects `max_delta_v_m_s`.
- Planner selects the minimum-delta-v candidate satisfying Pc and clearance thresholds.
- No-safe-plan response is returned for an insufficient delta-v budget.
- Rejected candidates include concrete rejection reasons.
- API returns recommendation telemetry and no-safe-plan telemetry.

## Test Cases

- Candidate generator respects delta-v limits.
- Planner selects lower delta-v among equally safe candidates.
- Planner rejects candidate that increases risk.
- No-safe-plan fixture returns clear status.
- Recommendation includes explanation fields.

Current test files:

- `../backend/tests/test_maneuver_planner_engine.py`
- `../backend/tests/test_maneuvers_reports.py`

## Demo Acceptance Criteria

- Protect ISRO produces one clear recommended maneuver.
- Delta-v, burn timing, Pc before/after, and miss-distance gain are visible.
- Apply flow cannot proceed until secondary screening passes or warns.

## Final-Round Extensions

- Add radial/cross-track maneuver options.
- Add multi-objective optimization.
- Add mission-disruption scoring.
- Add multi-burn planning.

## Context File Reference

`../context/07-avoidance-maneuver-planner-context.md`
