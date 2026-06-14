# Secondary Risk Screening LLD

## Purpose

Verify that an avoidance maneuver does not create unacceptable new conjunction risks.

## Responsibilities

- Screen post-maneuver trajectory against relevant catalog objects.
- Identify new or worsened conjunctions.
- Produce pass/warn/fail status for maneuver recommendation.
- Provide details for the UI and report.

## Non-Responsibilities

- Do not generate the primary maneuver candidates.
- Do not conceal secondary risks to simplify the demo.
- Do not replace the primary conjunction screening engine.

## Implementation Plan

- Implement `SecondaryRiskService` and `SecondaryRiskEngine` as a typed screening subsystem.
- Load deterministic Round 1 fixture results from `data/secondary-screening/`.
- Classify secondary result as clear, watch, warning, or blocked.
- Normalize inconsistent fixture statuses based on concern severity.
- Return top secondary concerns and a plain-language status.
- Treat missing candidate-specific fixtures as incomplete screening and return warning, not clear.
- Integrate secondary screening into `POST /api/maneuvers/apply`.

Final-round implementation should reuse the conjunction screening engine with a propagated post-maneuver protected-object trajectory and compare post-maneuver risks against pre-maneuver baselines.

## Data Flow

Maneuver candidate and post-burn trajectory enter secondary screening. The module screens against the catalog, compares results to thresholds, and returns a safety status to the planner and frontend.

## APIs / Interfaces

- `screen_secondary_risk(candidate, catalog_series, config)`
- `compare_secondary_results(before, after, config)`
- `classify_secondary_status(results)`

Current backend integration:

- `SecondaryRiskService.screen(plan, candidate)`
- `SecondaryRiskEngine.classify(candidate, fixture_result)`
- `POST /api/maneuvers/apply` returns a full `secondary` result.

## Data Models

- `SecondaryScreeningRequest`
- `SecondaryRiskResult`
- `SecondaryConcern`
- `SecondaryStatus`

Current response fields:

- `status`: `clear`, `watch`, `warning`, or `blocked`
- `summary`
- `screened_object_count`
- `concerns`
- `assumptions`
- `warnings`

## Algorithms / Logic

- Use the same distance/TCA methods as primary screening.
- Treat newly critical post-maneuver conjunctions as blocking.
- Treat small new watch-level events as warnings.
- Include number of objects re-screened for trust.

Round 1 fixture behavior:

- `mnv-protect-isro-a` returns `clear`.
- `mnv-protect-isro-high-fuel-watch` returns `watch`.
- `mnv-protect-isro-risk-demo` returns `blocked` with a critical RISAT-2BR1 concern.

## Error Handling

- Missing catalog data returns incomplete-screening warning.
- Screening failure blocks "safe" status.
- Excessive catalog size returns bounded-mode fallback.
- Missing candidate fixture returns `warning` with zero screened objects.
- Invalid fixture JSON/schema returns a structured backend error.

## Performance Considerations

- Re-screen only relevant time window around maneuver impact.
- Limit detailed results to top concerns.
- Cache scenario catalog states.

## Security / Safety Considerations

- Never display "safe" if screening was incomplete.
- Make blocked and warning statuses visually distinct.
- Never let missing fixture data become a clear response.

## Test Architecture

- Fixture tests for clear maneuver.
- Fixture tests for maneuver introducing a new risk.
- Threshold boundary tests.
- Integration tests with maneuver planner.

Implemented test coverage:

- Recommended candidate returns clear.
- Deliberate introduced-risk fixture returns blocked.
- Missing fixture directory returns warning, not clear.
- Apply API exposes the full secondary result.

## Test Cases

- Clear candidate returns pass.
- Candidate creating new critical conjunction returns blocked.
- Incomplete catalog returns warning, not pass.
- Secondary result includes screened object count.
- UI-facing status text is deterministic.

Current test files:

- `../backend/tests/test_secondary_risk_engine.py`
- `../backend/tests/test_maneuvers_reports.py`

## Demo Acceptance Criteria

- Protect ISRO selected maneuver shows "no new critical conjunctions introduced."
- If a rejected alternative is shown, it demonstrates secondary screening value.
- Report includes secondary screening summary.

## Final-Round Extensions

- Add full-catalog re-screening.
- Add visual secondary-risk map.
- Add comparison against maneuver alternatives.

## Context File Reference

`../context/08-secondary-risk-screening-context.md`
