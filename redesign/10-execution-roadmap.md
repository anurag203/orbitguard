# 10 — Execution Roadmap & Parallel-Agent Work Breakdown

How to actually build the redesign. This sequences every doc into **phases and parallel "waves"**
so multiple engineers or AI agents can work simultaneously without colliding, while the build and
tests stay green the entire time.

> Golden rule: **every task ends with `npm run build` ✅, `npm test` ✅, and (backend) `pytest` ✅.**
> Never merge red. Never break the offline Protect ISRO demo.

---

## 1. Dependency graph (what blocks what)

```
                 ┌─────────────────────────────────────────────┐
                 │  STREAM C: Backend robustness (doc 08)        │  ← fully independent,
                 │  no frontend dependency — start immediately   │     run start-to-finish in parallel
                 └─────────────────────────────────────────────┘

 P0 Scaffold ──┬──► P1 UI Component Kit (doc 05) ──┐
 (doc 04)      │                                    ├──► P3 Route Migrations (routes/*) ──► P4 Demo polish
               ├──► P2 3D Earth Rebuild (doc 07) ───┤        (parallel per route)            + guided demo
               └──► P1b features/ data hooks ───────┘                                         + nav
                        (doc 04 §5)

 Testing (doc 09) runs continuously; final Demo Acceptance Gate at the end.
```

Key facts:
- **Backend (Stream C) shares nothing with the frontend redesign** → start it on day one in parallel.
- **P0 scaffold unblocks everything frontend.** It must land first and stay small.
- **P1 (components), P1b (data hooks), and P2 (3D) can run in parallel** once P0 is in.
- **Route migrations (P3) need P1 + P1b**, and the Earth-using routes also need P2.
- Routes are **independent of each other** → parallelize one agent per route once components exist.

---

## 2. The waves (parallel schedule)

### WAVE 0 — Scaffold + kick off backend (2 agents in parallel)

| Agent | Task | Reads | Produces | Done when |
|---|---|---|---|---|
| **W0-FE** | Frontend scaffold | docs 02, 04 | Install Tailwind v4 + Radix + React Query + R3F/drei/postprocessing + tailwind-merge; `styles/theme.css` (@theme tokens) + `base.css` + self-hosted fonts; `lib/cn.ts`, `lib/queryClient.ts`, `app/providers.tsx` (QueryClient + Radix Tooltip + Mode), `app/routes.tsx` with **lazy** routes + legacy redirects; slim `missionStore` to client-state only (mode/selections/demo) | `npm run build` green; app still renders; tokens usable as utilities |
| **W0-BE** | Backend robustness | doc 08 | Execute doc 08 phases 1–7 (DI container, global error handler, logging + request-id, pydantic-settings, de-hardcode apply/report/conjunction-GET, computation_mode, /ready, cleanup) | 74 existing tests green + ~9 new tests green; Protect ISRO replay byte-identical |

> W0-BE is large; it may itself be split into 2 agents (one for infra: DI/errors/logging/settings/ready; one for de-hardcoding apply/report/conjunction + tests). They touch overlapping files, so coordinate or sequence those two.

### WAVE 1 — Component kit + data hooks + 3D (3 agents in parallel, after W0-FE)

| Agent | Task | Reads | Produces | Done when |
|---|---|---|---|---|
| **W1-UI** | Build `components/ui/` kit | doc 05 (+02) | Every component in doc 05: Button, IconButton, Surface/Card, PageHeader, Stat, Badge, RiskBadge, RiskMeter, Term (+`lib/terms.ts`), Tooltip, Tabs, Switch, Dialog, Sheet, ShowDetails, ScenarioTabs, Skeleton/Loading, EmptyState, ErrorState, LiveChip, Steps, CountUp; `lib/format.ts` (formatPlain/formatPro); a dev-only `/__styleguide` page | Styleguide renders all components in Simple+Pro; component tests pass |
| **W1-DATA** | `features/` data hooks + typed API | doc 04 §5 | `lib/api.ts` (typed, throws ApiError), `features/useScenarios`, `useThreats`, `useThreatDetail`, `useCatalog`, `usePlanManeuver`, `useApplyManeuver`, `useReport`, `useDemoStatus`; wire to new backend fields (computation_mode) | Hooks unit-tested with mocked api; loading/error/success paths covered |
| **W1-3D** | Rebuild Earth as R3F | doc 07 (+02) | `components/earth/*`: EarthCanvas, Earth, Atmosphere, Starfield, Satellite, OrbitTrail, ConjunctionMarker, CameraRig, OrbitControls config, Bloom; keep a compatible `<EarthScene>` prop shape | Correct grab-the-globe drag; satellites glow + trails; starfield + bloom; 60fps; reduced-motion fallback; drag-direction smoke test passes |

### WAVE 2 — Route migrations (up to 4–5 agents in parallel, after Wave 1)

Convert routes in journey order; each agent owns one route end-to-end (compose `ui/` + `earth/` +
`domain/` widgets, wire `features/` hooks, implement Simple/Pro + states + motion + mobile).

| Agent | Route | Reads | Notes |
|---|---|---|---|
| **W2-HOME** | `/` Home | routes/01 | First; sets the visual bar. Uses EarthCanvas (hero framing). |
| **W2-SKY** | `/sky` | routes/02 | Biggest: merges mission cockpit + catalog; Globe/List + ObjectPanel. |
| **W2-THREATS** | `/threats` + `/threats/:id` | routes/03, 04 | One agent owns the list + detail pair (shared widgets). |
| **W2-AVOID** | `/avoidance` | routes/05 | The hero moment: risk red→green + secondary reveal. Needs usePlan/useApply. |
| **W2-REPORT** | `/report` | routes/06 | Document + export. Needs useReport. |
| **W2-LEARN+SYS** | `/learn` + `/system` | routes/07, 08 | One agent; both are content-heavy but logic-light. |

Then a small follow-up:

| Agent | Task | Reads | Produces |
|---|---|---|---|
| **W2-NAV** | New nav + guided demo | docs 03 §3 | `layout/TopNav`, `MobileNav`, `Footer`, opt-in `GuidedDemo` (replaces the persistent HUD + Demo Director); Simple/Pro toggle in header |

### WAVE 3 — Integrate, test, polish (1–2 agents + reviewer)

| Agent | Task | Reads | Produces |
|---|---|---|---|
| **W3-TEST** | E2E + visual QA | doc 09 | Migrate to `@playwright/test`; journey + guided-demo + scenario-switch + Simple/Pro tests; drag-direction + risk-collapse regressions; per-route desktop/mobile screenshots |
| **W3-CLEAN** | Delete dead code/CSS | — | Remove old route files, `routes.css`/`layout.css` remnants, retired components; fix the bundle-size budget |
| **Reviewer** | Run the Demo Acceptance Gate (doc 09 §4) | doc 09 | Sign-off the offline 3-min Protect ISRO run + "non-space person understands it" check |

---

## 3. Recommended first vertical slice (fastest path to "wow")

If you want a demoable result before doing everything, build this slice first — it covers the whole
story and the highest-impact fixes:

1. **W0-FE** scaffold + **W0-BE** de-hardcode (so scenarios work).
2. **W1-3D** Earth rebuild (fixes drag + satellites + space bg — the most visible win).
3. **W1-UI** the subset used by the slice: Button, PageHeader, RiskMeter, RiskBadge, Term, Stat, ShowDetails, Loading/Empty/Error.
4. **W1-DATA** the hooks for: scenarios, threats, threat detail, plan, apply, report.
5. **W2-HOME**, **W2-THREATS**(+detail), **W2-AVOID** + **W2-NAV**.

That gives: a stunning Home, a clear Threats list, the hero Avoidance moment with red→green +
secondary check — the emotional arc end-to-end. Sky / Report / Learn / System follow.

---

## 4. Per-phase Definition of Done

- **P0 Scaffold:** build green; tokens work as utilities; routes lazy-load; providers mounted; fonts offline.
- **P1 Components:** every doc-05 component on the styleguide in both modes; component tests pass; a11y (focus, tooltip-on-focus) verified.
- **P2 3D:** all doc-07 acceptance criteria met (incl. signed drag-direction test); lazy-loaded; reduced-motion fallback.
- **P3 Routes:** each route passes its acceptance checklist (doc 09 §3) — one job, breathes, plain language, Simple/Pro, states, mobile, no overflow.
- **Backend:** all gaps in doc 08 closed; 74 + new tests green; Protect ISRO deterministic & offline; 2009/Kessler now plan→apply→report.
- **Final:** Demo Acceptance Gate (doc 09 §4) passes; performance budgets met; dead code removed.

---

## 5. Coordination rules for parallel agents

1. **File ownership is exclusive per wave.** Two agents never edit the same file in the same wave.
   Routes own their route file; the kit owns `components/ui/*`; 3D owns `components/earth/*`;
   backend owns `backend/*`.
2. **Shared contracts are frozen before the wave starts:** the design tokens (doc 02/04), the
   component APIs (doc 05), the data-hook signatures (doc 04 §5), and the backend response shapes
   (doc 08). If an agent must change a shared contract, it updates the doc first (per `RULES.md`)
   and flags dependents.
3. **Keep green or revert.** If a task can't land green, it stays on its branch; it does not block others.
4. **Update context** (`context/CURRENT_STATE.md` + the relevant doc) at the end of each task, per repo rules.
5. **Screenshots are part of "done"** for any visual task (desktop 1440 + mobile 390).

---

## 6. Effort sizing (relative, for planning)

| Stream | Size | Risk |
|---|---|---|
| W0-FE scaffold | S | Low |
| W0-BE backend | L | Medium (de-hardcoding touches several services) |
| W1-UI kit | L | Low (well-specced) |
| W1-DATA hooks | M | Low |
| W1-3D Earth | L | Medium (R3F migration, perf tuning) |
| W2 routes (×6 agents) | M each | Medium (Sky is the biggest) |
| W2-NAV + guided demo | M | Low |
| W3 test/clean | M | Low |

Critical path: **P0 → P1/P2 → Sky & Avoidance routes → demo gate.** Backend runs alongside and
must finish before the multi-scenario demo claims.

---

## 7. Risk register

| Risk | Mitigation |
|---|---|
| R3F migration regresses perf/visuals | Build behind the compatible `<EarthScene>` prop shape; keep old scene until new passes acceptance; perf budget test |
| Tailwind migration churns 6.3k lines of CSS | Migrate route-by-route; delete old CSS only after a route is green; styleguide locks the system early |
| De-hardcoding backend breaks Protect ISRO determinism | Doc 08's rollout keeps Protect ISRO IDs identical; replay test guards it |
| Parallel agents drift visually | Foundation docs 02/05 are frozen contracts; styleguide + visual QA catch drift |
| Single 922 KB bundle persists | Lazy routes + lazy 3D chunk + bundle-size guard in CI |
| Scope creep | First vertical slice (§3) is the priority; everything else is additive |

---

## 8. How to dispatch each agent (template)

When launching an implementation agent, give it:

```
ROLE: Implement <task> for the OrbitGuard redesign.
READ FIRST (obey exactly): redesign/README.md, redesign/01..04, and <the specific doc(s) for this task>.
SCOPE: Only edit <these files/folders>. Do not touch files owned by other agents this wave.
CONTRACTS (frozen): design tokens (doc 02/04), component APIs (doc 05), data-hook signatures (doc 04 §5), backend shapes (doc 08).
DEFINITION OF DONE: <phase DoD> + `npm run build` green + `npm test` green (+ `pytest` for backend) + screenshots if visual.
RULES: keep the build green, never break offline Protect ISRO, update context/ at the end.
```

This roadmap, plus docs 01–09, is everything needed to execute the full refactor in parallel.
