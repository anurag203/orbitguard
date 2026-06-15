# OrbitGuard Demo Script

A tight 2.5-minute judge walkthrough. Run it in **Simple** mode by default, then flip to **Pro** only when a judge asks for raw values or methodology.

One-line setup:

> OrbitGuard is a collision-avoidance copilot: see what is in orbit, spot the close approach, solve it with one small safe move, and prove the new path is clear.

## Beat Sheet

| Time | Screen | On-screen action | Narration |
| --- | --- | --- | --- |
| 0:00-0:10 | `/` | Start on the pinned Earth hero. | "Space is getting crowded. OrbitGuard turns a dangerous close approach into a guided decision instead of a wall of orbital jargon." |
| 0:10-0:25 | `/sky` | Click **or just explore the sky** or the **Sky** nav item. Point to the FlowStepper: **Step 1 - See the sky**. | "First we see the operating picture. This is a real TLE-driven orbital field, rendered in the browser so the user can inspect the sky instead of reading a table first." |
| 0:25-0:43 | `/sky` | Open **Filters**, set **Data source** to **Live data**, and point to the count chip plus source note. | "Live mode uses the Netlify `/celestrak` edge proxy for current public CelesTrak TLEs and SATCAT metadata. If CelesTrak rate-limits the large active group, OrbitGuard says so and backfills from the baked snapshot so the field stays complete." |
| 0:43-0:55 | `/sky?object=25544` | Open an object panel, for example ISS. | "Click any glowing object and the side panel translates the raw catalog facts into plain language, with Pro details available when needed." |
| 0:55-1:10 | `/threats` | Move to **Threats**. Point to **Step 2 of 4 - Spot the danger** and the ranked first row. | "Now we rank the close approaches worst-first. The Protect ISRO scenario says CARTOSAT-2F will pass about 612 m from debris-demo-001, with the closest moment at 20:47 UTC." |
| 1:10-1:28 | `/avoidance` | Move to **Safe Move**. Click **Find the safe move**. | "Step 3 is the decision. OrbitGuard compares candidate maneuvers and recommends the smallest safe nudge: 0.12 m/s along-track, 4 hours before closest approach." |
| 1:28-1:48 | `/avoidance` | Show the before/after panel, click **Apply this move**, confirm **Apply the move**. | "The before/after panel is the hero moment: the pass opens from about 612 m to 8.4 km, and the crash chance drops from 2.779e-4 to effectively zero." |
| 1:48-2:02 | `/avoidance` | Point to the revealed double-check. | "OrbitGuard does not stop at the first safe-looking burn. It re-screens the new path and shows that 3 nearby objects are clear." |
| 2:02-2:18 | `/report` | Click **See the report** or open the sample report. Point to **Step 4 - Prove it worked**. | "The final artifact is a mission briefing: source IDs, before/after metrics, the chosen maneuver, secondary screening, and limitations in one exportable report." |
| 2:18-2:27 | `/system` | Flip **Detail** to **Pro** and open **Under the hood** if there is time. | "For technical judges, Pro mode exposes the pipeline, raw API contracts, Pc model, covariance assumptions, and validation checks." |
| 2:27-2:30 | Any | Close on the tagline. | "Do not just see the risk. Clear it, then prove it." |

## Required Callouts

- **FlowStepper:** explicitly name the step transition: See -> Spot -> Solve -> Prove, including "Step 2 of 4" on Threats.
- **Plain language:** stay in Simple mode during the story; use Pro only to answer technical follow-ups.
- **Live Sky:** show Filters -> Data source -> Live data. If the source note says CelesTrak rate-limited `active`, call that out as intentional honesty plus offline backfill.
- **Deterministic Protect ISRO numbers:** about 612 m before, 8.4 km after, 0.12 m/s nudge, 4 hours before closest approach, 3 objects secondary-screened.

## Backup Path

- If live CelesTrak is slow, stay on the baked Sky field and say: "The live edge proxy is optional; the committed bake keeps the demo deterministic."
- If WebGL is weak, continue with **Threats -> Safe Move -> Report**. The decision flow does not depend on the globe.
- If you lose navigation state, open `/report?scenario=protect-isro&report=report-protect-isro-001` for the finished briefing.
