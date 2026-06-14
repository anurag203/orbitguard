# OrbitGuard Requirements

## Summary

OrbitGuard is an autonomous space-traffic collision-avoidance copilot. It must look and behave like a serious mission-control product: it ingests orbital data, visualizes satellites and debris, screens conjunctions, estimates collision risk, recommends avoidance maneuvers, re-checks for secondary conjunctions, explains its reasoning, and produces an audit-ready maneuver report.

The project is intended to carry from FAR AWAY Round 1 to the final round without being rebuilt.

## Goals

- Deliver a polished Round 1 vertical slice that judges can understand in under 30 seconds.
- Build a reusable architecture that supports deeper final-round science and features.
- Make the demo reliable through deterministic scenario data.
- Make the science defensible by documenting assumptions and limitations.
- Make the repo look like a serious engineering system through HLD, LLD, testing, context, and roadmap documents.

## Primary Users

- **Hackathon judges:** need a memorable, clear, technically deep demo.
- **Satellite operators:** need prioritized alerts and action recommendations.
- **Students and educators:** need a visual, explainable orbital safety simulator.
- **Policymakers and journalists:** need to understand debris growth and Kessler-style risk.

## Operating Modes

- **Live Mode:** loads current or snapshot orbital catalogs and screens selected objects.
- **Protect ISRO:** hero scenario centered on an Indian satellite asset with a high-risk conjunction.
- **2009 Replay:** historical Iridium 33 / Cosmos 2251 collision replay with an avoidance what-if.
- **Kessler Sandbox:** educational scenario showing how debris generation increases future risk.
- **Offline Demo Mode:** deterministic playback that works without network access.

## Functional Requirements

- Render a cinematic 3D Earth with satellites, debris, selected orbits, risk arcs, and scenario highlights.
- Load catalog snapshots from local data and later from CelesTrak refresh scripts.
- Search and filter objects by name, NORAD ID, orbit class, owner/category, and risk status.
- Maintain an ISRO watchlist for the Protect ISRO story.
- Propagate TLE-derived orbital states over a requested time window.
- Screen conjunctions and compute time of closest approach, miss distance, and relative velocity.
- Estimate collision probability using documented covariance assumptions.
- Rank conjunctions into severity categories: nominal, watch, warning, critical.
- Recommend avoidance maneuver candidates and select a minimum-fuel safe option.
- Re-screen post-maneuver trajectory for secondary conjunctions.
- Explain recommendations using computed metrics only.
- Generate maneuver reports with inputs, assumptions, candidate maneuvers, selected maneuver, before/after metrics, and secondary screening results.
- Provide a 3-minute demo path that completes reliably.

## Non-Functional Requirements

- **Credibility:** never present assumed covariance or simplified maneuvers as operational-grade precision.
- **Reliability:** scenario mode must work from a clean clone without live internet.
- **Performance:** UI should remain responsive while backend computations run.
- **Traceability:** major features must map to LLDs, tests, and context files.
- **Maintainability:** each logical service must have implementation and testing plans before code begins.
- **Security:** no user accounts, no PII, no data collection in the MVP.
- **Presentation quality:** mission-console UI should feel premium and technically serious.

## Round 1 Must-Have Scope

- Mission console shell.
- 3D globe with demo objects and selected orbits.
- Protect ISRO scenario.
- Conjunction worklist and detail panel.
- Basic propagation and seeded conjunction screening.
- Collision risk display with documented assumptions.
- Avoidance maneuver recommendation.
- Before/after risk comparison.
- Secondary risk status.
- Demo video, README, HLD, methodology, and core LLDs.

## Final-Round Expansion Scope

- More complete catalog screening.
- Better Pc modeling and richer covariance controls.
- Multi-candidate maneuver comparison.
- 2009 Replay and Kessler Sandbox polish.
- Report export.
- Performance benchmarks.
- Deployment hardening.
- Methodology cheat sheet for judges.

## Submission Requirements

- Public GitHub repository.
- Primary 3-minute video submission.
- Secondary lightweight slide deck.
- No PCB/CAD files required because OrbitGuard is software-only.

## Success Criteria

- Judges immediately understand the value: OrbitGuard moves from alert to action.
- The Protect ISRO demo completes end-to-end without manual rescue.
- The maneuver visibly improves the risk metrics.
- The system shows that secondary risks were checked.
- The documentation makes the science and architecture defensible.
