# 03 — Information Architecture

How the product is organized into routes, how users move through it, and how we translate space
jargon into plain language. This drives every per-route spec in [`routes/`](routes/).

---

## 1. The guiding idea

The product is a **story with one path**: *See → Spot → Solve → Prove*. Navigation should feel
like following that story, with the freedom to jump around. Each route is **one chapter with one job.**

```
See            Spot              Solve                  Prove
────────────   ───────────────   ────────────────────   ──────────────
Home  →  Sky →  Threats        → Avoidance            → Report
                (close approaches) (the safe move)       (the audit)

Always available:  Learn (how it works)   ·   System (under the hood)
```

---

## 2. Route map (old → new)

| New route | Name in UI | One job | Replaces |
|---|---|---|---|
| `/` | **Home** | Hook the viewer; start the story | `HomeRoute` |
| `/sky` | **The Sky** | Explore what's in orbit on the 3D globe; inspect any object | `MissionRoute` + `CatalogRoute` (merged) |
| `/threats` | **Threats** | Show ranked close approaches in plain language | `RiskRoute` |
| `/threats/:id` | **Threat detail** | Explain one close approach + offer the fix | (was inline in Mission/Risk) |
| `/avoidance` | **The Safe Move** | Run the dodge, show before/after, verify secondary | `AvoidanceRoute` |
| `/report` | **Mission Report** | The audit briefing + export | `ReportsRoute` |
| `/learn` | **Learn** | Plain-English explainer + glossary (promoted) | `LearnRoute` |
| `/system` | **Under the Hood** | Architecture & validation for technical judges | `SystemRoute` |

**Net change:** 8 → 7 primary routes + 1 detail route. The biggest move is **merging the
3D cockpit (`/mission`) and the object browser (`/catalog`) into one "Sky" route** with two views
(Globe / List). They are the same mental model — "what's up there" — and splitting them doubled
the density. Mission's "decision drawer" content moves into `/threats/:id` and `/avoidance`.

### Legacy redirects (keep links alive)
```
/mission, /mission-control      → /sky
/catalog                        → /sky
/risk, /closest-approach        → /threats
/predictor                      → /avoidance
/reports                        → /report
/architecture                   → /system
*                               → /
```

---

## 3. Navigation design

### 3.1 Top navigation (desktop)
A single slim, quiet bar. Left: wordmark. Center: the story chapters. Right: Simple/Pro toggle +
"Start demo".

```
ORBITGUARD        Sky   Threats   Safe Move   Report          [Learn]  [Simple|Pro]  ▶ Demo
                  └─ the 4 story chapters ─┘                  └ utility / education ┘
```

Rules:
- **Max 4 primary items** in the center (Sky, Threats, Safe Move, Report). This is the journey.
- **Learn** sits to the right as an always-available help affordance (NOT hidden in a dropdown).
- **System ("Under the Hood")** is reachable from the footer and from Report/Learn — it is for
  technical judges, so it doesn't need a primary slot. A small "Under the hood" link in the header
  utility cluster is acceptable.
- Active item has a cyan underline/glow; others are `--text-muted`.
- **No Mission Sync HUD.** Global status is shown inline per-screen (see §5). The persistent HUD is removed.

### 3.2 Mobile navigation
- Wordmark + a single menu button.
- Slide-over sheet listing the 4 chapters prominently, then Learn / Under the hood, then the
  Simple/Pro toggle and Start demo.
- No bottom Demo Director bar by default.

### 3.3 The guided demo (replaces the always-on Demo Director)
"▶ Demo" launches a **focused, opt-in walkthrough**: it dims the chrome, drives the user through
Home → Sky → Threats → Avoidance → Report with a small "Next" control and one sentence of
narration per stop. It is **fullscreen-feeling and removable**, not a permanent bar layered over
dense pages.

---

## 4. Per-route summary (full specs in `routes/`)

> Each route's first viewport must satisfy **Law 1 (one job)** and **Law 3 (breathe)**.

- **Home (`/`)** — Fullscreen Earth + one headline + one CTA ("See a live threat"). Below the
  fold: a 3-step "how it works" and proof stats. Nothing else.
- **Sky (`/sky`)** — Cinematic Earth as the star. A thin object filter. Click an object → a clean
  side panel with plain info + "Show raw data" (TLE) disclosure. Toggle Globe ↔ List. This is the
  "explore" route and the catalog, unified.
- **Threats (`/threats`)** — A calm ranked list: each row says, in a sentence, *who* is at risk,
  *from what*, *when*, and *how bad* (color + word). One tap → detail. A scenario switcher
  (Protect ISRO / 2009 / Kessler) lives here as simple tabs.
- **Threat detail (`/threats/:id`)** — One close approach explained: a focused mini-globe, the
  plain story ("600 m apart — very close"), risk meter, and a single CTA: **"Plan the safe move."**
- **Safe Move (`/avoidance`)** — The Earth + one button "Find the safe move." Result animates in:
  before/after risk (red→green), the human description of the nudge, then an automatic
  "We double-checked the new path ✓" secondary-screen confirmation. **Show details** reveals the
  candidate grid and delta-v table (Pro).
- **Report (`/report`)** — A clean, printable briefing: what happened, what we did, the proof.
  One "Export" action. Source IDs/assumptions behind "Show details."
- **Learn (`/learn`)** — Plain-English, scrollable explainer with analogies, a short glossary, and
  inline definitions used by `<Term>` tooltips across the app.
- **Under the Hood (`/system`)** — The pipeline diagram, engines, validation matrix, and honest
  limitations — explicitly framed as "for the engineers."

---

## 5. Status, loading, empty & error states (global pattern)

Because we remove the persistent HUD, each route owns its status inline:

- **Loading:** a centered, calm shimmer/skeleton of the content to come + one plain sentence
  ("Loading the latest orbit data…"). Never a bare spinner, never "corridor sync."
- **Empty:** a friendly explanation + the action to populate ("No threats right now. Pick a
  scenario to see one.").
- **Error:** plain language + a retry button ("We couldn't reach the data service. [Try again]").
  Errors come from the typed API client (doc 04), not scattered strings.
- **Live vs offline:** a single small chip ("Offline demo data" / "Live data") near the relevant
  content, not a global banner.

---

## 6. Plain-Language Dictionary

The canonical jargon→plain mapping. Used by the `<Term>` tooltip component and by Simple-mode
formatters. (Full definitions for Learn live in doc 06 / the route spec.)

| Technical term | Simple label | One-line tooltip |
|---|---|---|
| TCA (Time of Closest Approach) | **Closest approach (time)** | "When the two objects are nearest." |
| Miss distance | **How close (distance)** | "The smallest gap between them." |
| Pc (Probability of collision) | **Collision chance** | "How likely a crash is, e.g. '1 in 3,600'." |
| Conjunction | **Close approach** | "Two objects passing dangerously near each other." |
| Delta-v (Δv) | **Nudge / engine burn** | "How hard we push the satellite to change its path." |
| Along-track maneuver | **Speed-up/slow-down nudge** | "Changing speed along the orbit to shift timing." |
| Secondary screening | **Double-check** | "Making sure the new path isn't near anything else." |
| NORAD ID | **Catalog number** | "The official ID number for a tracked object." |
| TLE | **Orbit data** | "The standard data describing an object's orbit." |
| LEO | **Low orbit** | "A close-to-Earth orbit (under ~2,000 km)." |
| Covariance / uncertainty | **Margin of error** | "How unsure we are about exact positions." |
| Propagation | **Orbit prediction** | "Calculating where an object will be over time." |
| Relative velocity | **Closing speed** | "How fast the two objects approach each other." |
| Kessler syndrome | **Debris chain reaction** | "Collisions creating debris that cause more collisions." |

### Number framing (Simple mode)
- `Pc` → "about 1 in N" (N = round(1/Pc)); plus a word (very high / high / low / negligible).
- `Pc` (Pro) → `2.78 × 10⁻⁴`.
- Distances → meters/km with an optional comparison; speeds → km/s with "≈ X× a rifle bullet" only in Learn.
- Risk level word + color always precedes any figure.

---

## 7. URL & state conventions

- Scenario is a query param or store value, reflected in the URL where useful
  (`/threats?scenario=protect-isro`) so the demo is shareable/deep-linkable.
- Selecting an object on `/sky` updates `?object=<id>`; selecting a threat routes to `/threats/:id`.
- Simple/Pro mode is global (store + `localStorage`), not per-route.
- Deep links must work from a cold load (the store boots and hydrates from the URL).

---

## 8. What moves where (migration map for content)

| Current content | New home |
|---|---|
| `/mission` 3D cockpit + scenario deck | `/sky` (globe) + scenario tabs on `/threats` |
| `/mission` decision drawer (phase, risk metrics, burn preview) | `/threats/:id` + `/avoidance` |
| `/catalog` browser, filters, inspector, TLE | `/sky` list view + object side panel |
| `/risk` scenario comparison + ranked list | `/threats` (single ranked list + scenario tabs) |
| `/risk` triage playbook prose | `/learn` + "Show details" on threat detail |
| `/avoidance` preflight + 5-step sequence + assurance | `/avoidance` (one stepwise flow, details collapsed) |
| `/reports` storyboard tabs + review tabs | `/report` (one document + export) |
| `/system` API strings, engines | `/system` (kept, framed for engineers) |
| `/learn` glossary, training | `/learn` (promoted) + powers `<Term>` tooltips |
