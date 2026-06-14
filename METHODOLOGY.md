# OrbitGuard Methodology

## Principle

OrbitGuard must be impressive without pretending to be an operational satellite-control authority. The science should be real, the assumptions should be visible, and the limitations should be easy to explain to judges.

## Propagation

OrbitGuard uses TLE-derived propagation through the Python `sgp4` package. TLEs are public, accessible, and sufficient for an educational and decision-support MVP, but they do not include full covariance and are not precise enough for final operational collision avoidance.

## Conjunction Screening

The initial implementation screens a selected protagonist object against a catalog. This gives a strong story, manageable compute, and a clear demo path. Screening uses:

- orbital/category prefilters where possible,
- coarse time sampling,
- local refinement around the closest approach,
- TCA, miss distance, and relative velocity outputs.

The Round 1 implementation uses protagonist-vs-catalog screening over SGP4 state vectors and ranks candidates by severity, miss distance, and TCA. The Protect ISRO scenario uses committed deterministic TLE fixtures and clearly labeled simulated geometry so the hero demo is repeatable.

## Collision Probability

Collision probability is estimated using encounter geometry and documented covariance assumptions. Because TLEs do not carry covariance, OrbitGuard must display the assumed uncertainty model and avoid false precision.

The Round 1 implementation uses a simplified 2D Gaussian encounter-plane approximation with an assumed combined covariance model:

- model ID: `tle-demo-isotropic-300m`,
- sigma x/y: 300 m,
- hard-body radius: 20 m.

This is intentionally labeled as an estimate. The goal is to show the decision workflow and make the assumptions inspectable, not to claim operational-grade collision assessment.

## Maneuver Planning

The maneuver planner starts with small impulsive along-track delta-v candidates. Candidate maneuvers are compared by:

- risk reduction,
- delta-v cost,
- miss-distance gain,
- timing,
- secondary conjunction outcome.

The Round 1 implementation uses a deterministic candidate grid and a documented lead-time surrogate for post-burn miss-distance gain:

- lead times: 4 hours, 3 hours, and 2 hours before TCA,
- delta-v grid: 0.04, 0.08, 0.12, 0.20, 0.35, and 0.50 m/s,
- default safety constraints: Pc below `1e-6` and miss distance at least 8 km,
- post-burn Pc is recomputed using the same covariance model as the pre-maneuver conjunction.

For Protect ISRO, the planner currently evaluates 18 candidates and recommends `mnv-protect-isro-a`: a 0.12 m/s along-track prograde burn 4 hours before TCA. The surrogate increases miss distance from about 612 m to about 8.39 km and drives estimated Pc from `2.779e-4` to effectively zero under the documented covariance assumption.

This is a transparent Round 1 maneuver-planning approximation. Final-round work should replace the surrogate with post-burn SGP4/trajectory propagation, add radial and cross-track options, and score mission disruption alongside fuel and safety.

## Secondary Screening

Every proposed avoidance maneuver must be re-screened. This is a core differentiator: a maneuver that clears the primary conjunction but creates a new critical conjunction is not acceptable.

The Round 1 implementation uses deterministic secondary-risk fixtures under `data/secondary-screening/`:

- `mnv-protect-isro-a` returns clear with no secondary concerns.
- `mnv-protect-isro-high-fuel-watch` demonstrates a watch-level secondary concern.
- `mnv-protect-isro-risk-demo` is a deliberate negative fixture that blocks the maneuver because it introduces a new critical conjunction with RISAT-2BR1.

Missing candidate-specific secondary screening is treated as warning/incomplete, not clear. Final-round work should replace fixture lookup with post-burn trajectory propagation and full catalog re-screening.

## AI Briefings

Briefings must be grounded in computed metrics. The text generation layer may improve readability, but it must not invent values, confidence, or operational authority.

## Known Limitations

- TLEs are not enough for operational-grade Pc.
- Simplified covariance assumptions are used initially.
- Initial maneuver models are educational approximations.
- Round 1 scenarios prioritize deterministic demonstration over full-catalog operational scale.

## Judge Defense

The correct framing is:

> OrbitGuard is an open, explainable collision-avoidance copilot prototype that demonstrates the full decision workflow using standard orbital methods and transparent assumptions.
