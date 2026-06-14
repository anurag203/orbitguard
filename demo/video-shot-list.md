# Video Shot List

## Goal

Make judges feel OrbitGuard is a working autonomous mission copilot, not a static dashboard. The video should follow the in-app Mission Director rail exactly.

## Five-Scene Recording Path

| Time | Mission Director Scene | Route | What To Show | Judge Takeaway |
| --- | --- | --- | --- | --- |
| 0:00-0:25 | Command / Scene 01 | `/mission-control` | Start Mission, cinematic Earth, Protect ISRO strip, TCA corridor, critical conjunction, Plan Avoidance CTA. | OrbitGuard is a live mission-control simulator with a concrete protected satellite and threat. |
| 0:25-0:50 | Source / Scene 02 | `/catalog` | Click Next Cue, inspect CARTOSAT-2F, show owner/orbit/type tags and raw TLE evidence. | The decision is grounded in inspectable public orbit data. |
| 0:50-1:15 | Rank / Scene 03 | `/closest-approach` | Click Next Cue, show severity lanes, closest approach ranking, and scenario comparison. | The system prioritizes threats instead of dumping a catalog. |
| 1:15-2:10 | Simulate / Scene 04 | `/predictor` | Click Next Cue, run Plan Avoidance, show candidate matrix, recommended burn, and before/after Pc collapse. | OrbitGuard does not only warn; it proposes a justified maneuver. |
| 2:10-2:45 | Brief / Scene 05 | `/reports` | Click Next Cue, generate report, show source IDs, assumptions, warnings, and Markdown export. | The copilot leaves an audit trail suitable for real operators and judges. |
| 2:45-3:00 | Closing proof | `/architecture` or `/` | Quick cut to System tech-tree or cinematic Home with release-ready status. | The project has depth, tests, offline reliability, and final-round scope. |

## Required On-Screen Proof

- Real Earth texture and moving orbital objects are visible.
- Mission Director rail shows all five scenes.
- Protect ISRO / CARTOSAT-2F remains the hero scenario.
- Raw TLE evidence appears in Catalog.
- Candidate maneuver matrix appears before the report.
- Report export button appears before the ending.
- No mobile drawer or menu overlay covers the guided demo rail.

## Avoid

- Long pauses on dense text.
- Explaining equations verbally before showing the result.
- Switching scenarios before the Protect ISRO story is clear.
- Ending without showing the report/export evidence.
