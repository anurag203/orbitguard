# 08 — Route Spec: Under the Hood (`/system`)

> The credibility route, **explicitly framed for the engineers.** It keeps the real substance — the
> pipeline, the orbital math (SGP4), the Pc model, validation, and honest limitations — but presents it
> as a **scannable technical sheet**, not a wall of prose. This is where a technical judge confirms the
> science and engineering are real.
>
> Obeys docs 01–04. Reachable from the footer + the header utility cluster + from Report/Learn (doc 03
> §3.1) — it does **not** take a primary nav slot. Replaces `SystemRoute.tsx`.

---

## 1. Purpose & the ONE job (Law 1)

**One job:** *Convince a technical reviewer that the pipeline, the math, and the validation are real —
fast, and honestly.*

**The one thing to look at:** the **pipeline diagram** — the end-to-end flow from public orbit data to
an exported decision.

**The single primary action:**

```
[ Open the API contract → ]    (or "View on GitHub →" / OpenAPI docs)
```

One forward action for engineers who want to go deeper. Everything else is **reference content arranged
to be skimmed**: the pipeline (clickable stages), an engines table, a validation matrix, and a clear
limitations statement. No competing CTAs; deep-dive material sits behind per-stage expanders.

> The old route was credible but dense (hero + health card + signal strip + clickable pipeline +
> stage inspector + validation lanes + 6 engine cards + evidence grid + limitations). We keep the
> substance but make it **scannable**: a diagram first, tables second, prose minimal.

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| Audience | What they take away |
|---|---|
| **Technical judge (primary here)** | "Real SGP4 propagation, a defensible Pc model with stated covariance, a tested pipeline. Not a toy." |
| **Operator persona** | "There's a clear input/output contract per stage and a validation story." |
| **Non-space judge** | Won't usually come here — but if they do, the plain stage names still read sensibly. |

**Emotional beat: Credibility** — *"This is real engineering."* Confident, precise, and **honest about
limits**. The tone is peer-to-peer with an engineer: no marketing fluff, no fake operational precision
(doc 01 §7). Admitting the demo-grade assumptions is part of what builds trust.

---

## 3. ASCII wireframe — first viewport (desktop)

One focal element: the pipeline diagram. A small honest health line above it; details below.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD      Sky   Threats   Safe Move   Report     Learn  [Simple|Pro]│
├──────────────────────────────────────────────────────────────────────────┤
│   Under the Hood · for the engineers          [ Open the API contract → ]   │  ← PageHeader + 1 CTA
│   How public orbit data becomes an exported, verifiable decision.           │
│                                                                            │
│   ● Demo ready · 12/12 required checks passing · offline fixture mode       │  ← honest health line
│                                                                            │
│   ┌──────────────────────────────────────────────────────────────────┐    │
│   │   THE PIPELINE                                                     │    │
│   │                                                                    │    │
│   │  ┌─Load──┐  ┌─Read──┐  ┌─Propagate┐  ┌─Screen─┐  ┌─Plan──┐ ┌─Brief┐│    │
│   │  │scenario│→│catalog │→│  orbits  │→│conjunct.│→│maneuver│→│report││    │
│   │  └────────┘ └────────┘ └────SGP4───┘ └────────┘ └────────┘ └──────┘│    │
│   │     run/      TLE        state vecs    miss/Pc     Δv search   audit │    │
│   │  ↑ click any stage to see its interface · evidence · tests          │    │
│   └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│   ▼ Engines · Validation · Limitations                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

Below the fold (scannable, table-first):

```
── Engines (input → output → validation) ───────────────────────────────────
 Catalog Data Service   TLE fixture/live      → inspectable objects   ✓ fixture fallback
 Propagation (SGP4)     TLE + time window     → state vectors/traces   ✓ deterministic tests
 Conjunction Screening  primary/secondary st. → ranked conjunctions    ✓ closest-approach tests
 Collision Probability  encounter-plane cov.  → Pc + severity          ✓ scientific sanity checks
 Maneuver Planner       conjunction + limits  → recommended Δv          ✓ candidate-ranking tests
 Secondary Screening    selected burn         → secondary-clear        ✓ post-burn fixtures

── How we compute Pc (the model, briefly) ──────────────────────────────────
 2-D encounter-plane integration · covariance model {σx, σy, hard-body radius} · stated assumptions.

── Validation ──────────────────────────────────────────────────────────────
 Unit · Scenario replay (Protect ISRO / 2009 / Kessler) · Browser E2E · Visual QA

── Honest limitations ───────────────────────────────────────────────────────
 Demo-grade estimates, explicit assumptions, deterministic fixtures. Not command authority.
```

---

## 4. Section-by-section breakdown (content · components · data)

### 4.1 PageHeader + honest health line
- **Component:** `<PageHeader eyebrow="Under the Hood · for the engineers" title subtitle>`. The single
  CTA `<Button variant="primary">Open the API contract →</Button>` links to the FastAPI OpenAPI docs
  (`/docs`) or the repo.
- **Health line:** `<SystemHealth>` (domain) renders one honest status sentence + a `<RiskBadge>`-style
  dot — **not** a big "health card" hero.
- **Hook/data:** `useDemoStatus()` → `api.demoStatus()` → `DemoStatus`:
  - `status` ("ready" / other), `summary`, `offline_mode`, `missing_required_count`,
  - `checks[]` (`name`, `status`, `required`, `category`, `detail`).
  - Derived: `requiredPassing = required.length - missing_required_count`. Copy:
    `"{status==='ready' ? 'Demo ready' : 'Needs attention'} · {requiredPassing}/{requiredTotal}
    required checks passing · {offline_mode ? 'offline fixture mode' : 'live data'}"`.

### 4.2 The pipeline diagram (focal element)
- **Component:** `<PipelineDiagram>` (domain) — a horizontal 6-stage flow rendered as connected
  `<Card>`/nodes with arrows (simple line diagram in brand colors, per doc 02 §7). Each node is a
  `<button>` (keyboard-accessible) that opens that stage's detail (expander or side `<Dialog>`/popover).
- **Stages** (kept from the current pipeline; relabeled with a plain title + the real interface):

  | # | Stage | Interface (real endpoint/module) | Maps to route |
  |---|---|---|---|
  | 1 | Load scenario | `POST /api/scenarios/{id}/run` | `/threats` (scenario tabs) |
  | 2 | Read catalog | `GET /api/catalogs/full` (+ `POST /api/catalogs/live/refresh`) | `/sky` |
  | 3 | Propagate orbits | **SGP4** propagation module | `/sky` |
  | 4 | Screen conjunctions | `POST /api/conjunctions/screen` → `GET /api/conjunctions/{id}` | `/threats` |
  | 5 | Plan maneuver | `POST /api/maneuvers/plan` → `POST /api/maneuvers/apply` | `/avoidance` |
  | 6 | Brief decision | `POST /api/reports` → `GET /api/reports/{id}` | `/report` |

- **Per-stage detail** (on click): `interface`, `evidence` (what's visible in the product), `tests`
  (what proves it), and an "Open proof route →" link. These come from a static `pipeline[]` config
  (engineer-authored), since they describe architecture, not live data.

### 4.3 Engines table
- **Component:** `<Table>` (or a tidy `<Card>` grid) — one row per engine: **input → output →
  validation**. Scannable, not 6 large cards. Source: static `engines[]` config:
  - Catalog Data Service, Propagation Engine (SGP4), Conjunction Screening, Collision Probability,
    Maneuver Planner, Secondary Screening.

### 4.4 The Pc model (brief, honest)
- **Component:** `<Callout>` + an optional `<ShowDetails>` for the math. Explains the collision-probability
  approach in 2–3 lines and exposes the **real covariance parameters** so it's verifiable.
- **Data:** pulled from a representative `ConjunctionDetail.pc_estimate` (e.g., the Protect ISRO top
  conjunction via `useThreatDetail`): `method`, `covariance.model_id`, `sigma_x_m`, `sigma_y_m`,
  `hard_body_radius_m`, `source`, `covariance.notes[]`, plus `assumptions[]`/`warnings[]`. This grounds
  the model in actual numbers rather than claims.

### 4.5 Validation matrix
- **Component:** `<Table>`/lanes — four rows: **Unit · Scenario replay · Browser E2E · Visual QA**, each
  with one line of what it covers. Static config; mirrors doc 09 (testing) at a glance.
- Optionally surface `DemoStatus.checks[]` grouped by `category` as a compact pass/fail list behind a
  `<ShowDetails label="See all readiness checks">`.

### 4.6 Architecture boundary + honest limitations
- **Component:** two `<Card>`s + a `<Callout tone="muted">`:
  - **Boundary:** "One React frontend. One FastAPI backend. Logical services inside." (deployable mono,
    documented service ownership).
  - **Limitations:** demo-grade, deterministic fixtures, simplified Pc; explainable decision-support
    prototype, **not** operational spacecraft command authority (doc 01 §7 — no fake precision).
- Quiet links back to `/avoidance` (planning logic) and `/report` (auditability).

---

## 5. Plain-language copy (real example strings)

> The page is for engineers, so terms appear in full — but first use of each still gets a `<Term>` so a
> non-engineer who wanders in isn't lost. Values illustrative; health line is live from `DemoStatus`.

**Header**
```
Under the Hood · for the engineers
How public orbit data becomes an exported, verifiable decision.
```

**Health line (live)**
```
● Demo ready · 12/12 required checks passing · offline fixture mode
```
(degrades to `● Needs attention · 10/12 required checks passing · …` from `missing_required_count`.)

**Pipeline stage detail (e.g., "Plan maneuver")**
```
Plan maneuver
Interface   POST /api/maneuvers/plan  →  POST /api/maneuvers/apply
Does        Searches a small family of candidate burns, scores risk-vs-Δv,
            returns a recommendation + alternatives, then screens the applied burn.
Evidence    Candidate matrix, recommended Δv, before/after Pc — visible on Safe Move.
Tests       Candidate-ranking unit tests + apply/secondary-screening E2E.
            [ Open proof route → /avoidance ]
```

**How we compute Pc**
```
Collision chance (Pc) is estimated by integrating the position uncertainty in the
2-D encounter plane at closest approach, using a covariance model and a combined
hard-body radius.

Model: foster-1992-2d   σx 180 m · σy 75 m · hard-body radius 12 m
Source: demo covariance fixture
Assumptions: linear relative motion near TCA; Gaussian position uncertainty;
spherical hard-body. These are demo-grade — see limitations.
```

**Validation**
```
Unit            Backend engines + frontend formatters covered by deterministic tests.
Scenario replay Protect ISRO, 2009 replay, and Kessler exercise the same pipeline.
Browser E2E     Playwright walks navigation, planning, report export, responsive layouts.
Visual QA       Screenshots verify judge-facing routes are organized and overflow-free.
```

**Honest limitations**
```
OrbitGuard uses deterministic fixtures and simplified probability estimates for the
demo. It is an explainable decision-support prototype — not operational spacecraft
command authority. Every estimate ships with its assumptions on display.
```

---

## 6. Simple vs Pro differences

System is inherently technical, but the toggle still adjusts density so a non-engineer isn't ambushed:

| Element | Simple (default) | Pro |
|---|---|---|
| Pipeline nodes | Plain titles ("Plan maneuver"), interface shown on click | Interface/endpoint shown **inline** on every node |
| Pc model | 2–3 line plain explanation + "Show the math" expander | Full covariance params, `method`, assumptions, warnings expanded by default |
| Engines table | input → output → validation (plain) | adds module/endpoint names, and `DemoStatus` per-check rows by category |
| Readiness checks | summarized ("12/12 passing") | full `checks[]` list with `name`/`status`/`detail` |
| Numbers | rounded | exact σ values, radii, Pc in scientific notation |

Mode via `useMode()`. Because most System data is architectural (static config) plus `DemoStatus`/a
representative `pc_estimate`, Pro mainly **reveals more fields** rather than reformatting.

---

## 7. Loading / empty / error states (doc 03 §5) + integration risk

**Loading (`useDemoStatus`)** — the **diagram, engines, validation, and limitations render immediately**
(they're static/engineer-authored). Only the health line shows a small inline shimmer:
```
Checking demo readiness…
```
Never block the page on the health call — the credibility content must always be visible.

**Empty / degraded health** — if `DemoStatus` reports issues, show it **honestly** (that's on-brand for
this route), e.g. `● Needs attention · 10/12 required checks passing` with the failing check names behind
"See all readiness checks". Don't hide failures.

**Error (status fetch failed)** — typed `ApiError`; the health line degrades gracefully without taking
down the page:
```
Couldn't reach the readiness check.  [ Retry ]   (diagram + tables remain visible)
```

**⚠ Integration risk — apply/report hardcoded to Protect ISRO (this route should document it).**
System is the **honest place to disclose** the current hardcoding (README §"Backend hardcoded": `apply`,
`report`, and conjunction IDs are pinned to Protect ISRO). Required behavior:
- In the **Plan/Brief** pipeline stage details, add a short note: *"Today the apply and report endpoints
  return the Protect ISRO conjunction deterministically; generalizing them per-scenario is tracked in
  backend doc 08."* Framing it as a known, tracked limitation **increases** credibility with technical
  judges rather than hiding it.
- The **limitations** section reiterates that scenario coverage for apply/report is being generalized.
- When doc 08 lands (DI, error envelope, de-hardcoding), update the two stage notes and the limitations
  line; the pipeline structure and endpoints are unchanged, so **no diagram rework** is needed.

---

## 8. Motion (doc 02 §6)

| Moment | Motion | Spec |
|---|---|---|
| Page enter | Header + diagram fade/rise 8px | `slow`, `ease` |
| Pipeline flow hint | A subtle one-time pulse travels left→right along the arrows on first view, suggesting data flow | single pass, `slow`; **not** looping |
| Stage select | Selected node gets a cyan ring; detail panel fades in | `base` |
| Reveal on scroll | Engines/validation/limitations fade/rise once on entry | `base`, once |
| Health dot | Static; (no pulse unless live-data mode, then a gentle 2s pulse) | 2s loop only when truly live |

**Rules:** restraint — this is a reference page; motion orients, it does not entertain. The flow pulse is
**one pass only** (an always-on animated pipeline would violate doc 02 §6.3). `prefers-reduced-motion`:
disable rise/stagger/flow-pulse and the live health pulse; render statically.

---

## 9. Mobile layout notes

- Single column, 20px padding. `<PageHeader>` stacks; the CTA becomes full-width beneath the subtitle.
- **Pipeline diagram** rotates to **vertical** on mobile: 6 stages stacked top→bottom with downward
  arrows (a vertical flow reads better than horizontal scrolling). Each stage stays tappable to expand.
- Engines and validation render as **stacked cards** (label → input → output → validation) rather than a
  wide table.
- The Pc-model covariance params wrap into a small definition list; "Show the math" is an inline expander.
- Keep the honest health line at the top, full width, legible.

---

## 10. Acceptance criteria checklist

- [ ] Route is reachable from footer + header utility cluster (and Report/Learn), and does **not** occupy a primary nav slot.
- [ ] First viewport leads with the **pipeline diagram** as the single focal element + exactly one primary CTA (API contract / repo). Tables and prose are below the fold.
- [ ] All six stages map to **real interfaces** (`/api/scenarios/{id}/run`, `/api/catalogs/full`, SGP4, `/api/conjunctions/screen` + `/{id}`, `/api/maneuvers/plan` + `/apply`, `/api/reports` + `/{id}`) and link to their proof routes.
- [ ] Health line is **live** from `DemoStatus` (`status`, required checks passing, offline/live) and degrades honestly; the rest of the page renders without the status call.
- [ ] The Pc model section states the approach and exposes **real covariance params** from `pc_estimate.covariance` (model id, σx, σy, hard-body radius, source, notes) + assumptions.
- [ ] Engines presented as a **scannable** input→output→validation table/grid (not 6 large cards); validation matrix lists Unit / Scenario replay / E2E / Visual QA.
- [ ] Honest limitations are stated plainly (demo-grade, deterministic, not command authority); no fake operational precision.
- [ ] The Protect ISRO apply/report hardcoding is **disclosed** in the Plan/Brief stage notes + limitations, framed as tracked work (doc 08).
- [ ] First-use jargon wrapped in `<Term>`; Simple vs Pro changes density (Pro reveals endpoints inline + full readiness checks + exact params).
- [ ] Errors use typed `ApiError` + Retry and never blank the page; loading only shimmers the health line.
- [ ] `prefers-reduced-motion`: flow pulse and health pulse disabled; static render. Flow pulse is one-pass only otherwise (no infinite animation).
- [ ] Mobile: pipeline becomes a vertical stacked flow; engines/validation stack as cards; CTA full-width.
