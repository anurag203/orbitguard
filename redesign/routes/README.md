# Route Design Specs

One detailed design spec per screen in the redesigned OrbitGuard. Each spec obeys the foundation
docs (`../01`–`../04`) and maps content/components/data to real backend endpoints.

Read the foundation docs first, then these in journey order.

| # | Spec | Route | One job |
|---|---|---|---|
| 01 | [`01-home.md`](01-home.md) | `/` | Hook the viewer; start the story |
| 02 | [`02-sky.md`](02-sky.md) | `/sky` | Explore what's in orbit; inspect any object (merges old `/mission` + `/catalog`) |
| 03 | [`03-threats.md`](03-threats.md) | `/threats` | Show ranked close approaches in plain language |
| 04 | [`04-threat-detail.md`](04-threat-detail.md) | `/threats/:id` | Explain one close approach + offer the fix |
| 05 | [`05-avoidance.md`](05-avoidance.md) | `/avoidance` | The hero "safe move": before/after + secondary check |
| 06 | [`06-report.md`](06-report.md) | `/report` | The audit briefing + export |
| 07 | [`07-learn.md`](07-learn.md) | `/learn` | Plain-English explainer + glossary (powers `<Term>`) |
| 08 | [`08-system.md`](08-system.md) | `/system` | Architecture & validation, framed for engineers |

The user journey: **See** (Home → Sky) → **Spot** (Threats → detail) → **Solve** (Avoidance) →
**Prove** (Report). Learn and System are always available.
