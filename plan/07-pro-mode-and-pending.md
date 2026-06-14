# Plan 07 — Pro mode, the exposed API surface, and what's left

> Scope of this doc: answer "why does Pro mode expose so many API endpoints", then give a
> grounded, prioritized backlog another agent can execute without re-discovery. Every claim
> below is cited to a file. Status reflects the codebase as of the black-strobe fix
> (`PostFX.tsx` / `EarthCanvas.tsx`).

---

## Part A — Why "Pro mode" exposes all those API paths

### A.1 What you're looking at
The screenshot is **"THE PIPELINE"** on the **`/system`** route (nav label **"Under the hood"**).

- Page: `frontend/src/routes/system/SystemRoute.tsx`
- Diagram: `frontend/src/routes/system/PipelineDiagram.tsx`
- Stage data (the 6 cards + endpoint strings): `frontend/src/routes/system/config.ts` (`PIPELINE`, L54–147)

The 6 stages and the literal strings shown:

| # | Stage | `interface` string in config |
|---|-------|------------------------------|
| 1 | Load scenario | `POST /api/scenarios/{id}/run` |
| 2 | Read catalog | `GET /api/catalogs/full · POST /api/catalogs/live/refresh` |
| 3 | Propagate orbits | `SGP4 propagation module` (not an HTTP path) |
| 4 | Screen conjunctions | `POST /api/conjunctions/screen → GET /api/conjunctions/{id}` |
| 5 | Plan maneuver | `POST /api/maneuvers/plan → POST /api/maneuvers/apply` |
| 6 | Brief decision | `POST /api/reports → GET /api/reports/{id}` |

Simple/Pro is a context + `localStorage` flag (`orbitguard.mode`) in
`frontend/src/components/ui/ModeProvider.tsx`; default is **simple**.

### A.2 Why it was built this way (the intent)
`/system` is a **credibility sheet for technical judges**. The pipeline exists to prove
"every screen maps to a real endpoint and a real computation, not a hard-coded slideshow."
In Pro mode the cards reveal the actual HTTP method+path so an engineer can line them up
against the FastAPI backend (`backend/app/api/routes/*.py`). These paths **are real** — they
exist and run when the backend runs (Docker / `uvicorn`), and most are exercised by the live
UI in dev (`frontend/src/lib/api.ts`).

So the exposure is **intentional transparency**, not an accident or a security hole. There are
no secrets, tokens, or auth in those paths; it's a public demo. **This is a clarity/honesty/UX
question, not a vulnerability.**

### A.3 The three real problems with it (this is the actual issue)

1. **It's misleading on the hosted demo.** The Netlify site is **100% static** — there is no
   FastAPI behind it. Every `lib/api.ts` call is served from pre-baked JSON
   (`frontend/public/api-static/*.json`, keyed by a hash of method+path+body; see
   `frontend/src/lib/staticApi.ts`, `scripts/snapshot-api.mjs`). A judge who reads
   `POST /api/maneuvers/apply` and tries to hit it against the live URL gets nothing — those
   routes don't exist on Netlify. The page currently advertises a live API the deploy doesn't serve.

2. **The paths leak into Simple mode.** Pro only gates the path **preview on the node cards**
   (`PipelineDiagram.tsx` L75–77). Once a stage is clicked, the detail panel renders
   `stage.interface` **in both modes** (L105–107). So Simple users still see `POST /api/...`,
   which contradicts the product's "plain words first" rule and the Simple-mode guardrail in
   `frontend/e2e/demo-gate.spec.ts`.

3. **Some shown endpoints are aspirational / not part of the hosted flow.** e.g.
   `POST /api/catalogs/live/refresh` and `POST /api/maneuvers/apply` are real in the backend,
   but on the static deploy the follow-up live-catalog GET isn't baked (it 404s), and `apply`
   only works for the one recommended candidate. Showing them flat, with no "live vs snapshot"
   marker, over-promises.

### A.4 Recommendation (turn the risk into a transparency win)
Keep the pipeline — it's a strong credibility device — but make it **honest and consistent**:

- **Reframe the header** of the pipeline section: "This is the real architecture. It runs live
  in the local/Docker build; the hosted demo serves **pre-baked snapshots** of these exact
  responses for determinism/offline." (One sentence; kills the misleading impression.)
- **Per-stage "live vs baked" tag.** Add a small chip on each stage: `live in dev` /
  `snapshot on web`. This *flaunts* the static design instead of hiding it. Drive it off
  `import.meta.env.VITE_STATIC_API` so the same build is correct in both contexts.
- **Gate ALL raw paths behind Pro, consistently.** Remove `stage.interface` from the Simple
  detail panel (show plain English in Simple; method+path only in Pro). Single source: a
  `mode`-aware branch in `PipelineDiagram.tsx`.
- **Curate the list.** Drop endpoints that aren't part of the hosted journey, or clearly mark
  them. Don't show dead surface (see Part B.3).

Full task breakdown for the above is **Part C, task P0-1**.

---

## Part B — What's pending (grounded; don't redo finished work)

### B.1 Already DONE — do not reopen
These were once on the backlog but are implemented in the current code:

- Guided tour reset/sync bug → fixed (`frontend/src/app/GuidedTour.tsx`, `e2e/tour.spec.ts`).
- "41 hours ago" time bug → fixed via demo clock (`frontend/src/lib/demoClock.ts`).
- `whileInView` blank-content reveal → hardened (`frontend/src/components/ui/Section.tsx`).
- `/sky` only 4 dots → ~500-object instanced field (`SatelliteField.tsx`,
  `frontend/public/data/catalog-sky.json`, `e2e/sky.spec.ts`).
- Static Netlify deploy → working (`netlify.toml`, `api-static/`).
- **Black-screen strobing → fixed** (`PostFX.tsx` `multisampling={0}` + `SMAA`; verified 0% black
  frames on Apple M3 Pro / ANGLE-Metal).

### B.2 Honest scientific limitations (intentional — decide whether to close or just label)
Documented in `METHODOLOGY.md`; not bugs, but they're the things a sharp judge will probe:

- Hero **Protect ISRO** = real SGP4 + Pc; **2009 / Kessler** conjunctions come from
  `FINAL_ROUND_CONJUNCTION_FIXTURES` (`backend/app/services/conjunction_service.py`),
  labeled `computation_mode: "fixture-fallback"`.
- **Maneuver effect** = along-track lead-time surrogate (`lead_time_gain_factor = 4.5` in
  `backend/app/engines/maneuver_planner_engine.py`), not a full post-burn re-propagation.
- **Secondary screening** fixtures exist **only** for Protect ISRO
  (`data/secondary-screening/protect-isro.json`); 2009/Kessler return
  `secondary_status: "warning"`, `screened_object_count: 0`.

### B.3 Genuinely pending / loose ends (actionable)
- **Simple mode leaks API paths** in the pipeline detail panel (Part A.3.2).
- **Sky "Live data" toggle is shown on the static build** but the follow-up
  `GET /catalogs/full?source=live` isn't baked → 404 in front of judges
  (`frontend/src/routes/sky/SkyToolbar.tsx`; gap noted in `plan/05-netlify-static.md` §4).
- **Threat-detail mini-globe hardcodes `selectedObject="CARTOSAT-2F"`** even for 2009/Kessler
  (`frontend/src/routes/threats/ThreatDetailRoute.tsx` ~L96) → wrong primary object highlighted.
- **Kessler "education only" inconsistency**: copy says no live maneuver, but the
  "Plan the safe move" CTA still renders (`ThreatDetailRoute.tsx`).
- **Secondary screening UI vs data mismatch** for 2009/Kessler (warning state vs any
  "double-checked" framing) — `frontend/src/routes/report/ReportDocument.tsx`,
  `frontend/src/routes/avoidance/` double-check panel.
- **`/report` starts empty**; no one-click sample report (`ReportEmptyState.tsx`).
- **`/threats` is sparse** (often one row per scenario) (`ThreatsRoute.tsx`).
- **Dead code still in tree** (Wave 3 cleanup never ran): `frontend/src/api.ts`,
  `frontend/src/state/missionStore.ts`, `frontend/src/layout/TopNav.tsx`,
  `frontend/src/format.ts` (+ `format.test.ts`), `frontend/src/ui/Primitives.tsx`, and the
  orphan `useDemoReplay` hook (no UI consumer).
- **10 backend routes are never called by the UI** (`/health`, `/ready`, `/catalogs`,
  `/catalogs/{id}`, `/objects/search`, `/watchlists/{id}`, `/scenarios/{id}/reset`,
  `/scenarios/{id}/timeline`, `/propagate`, `/demo/expected-flow`). Not harmful, but the
  pipeline shouldn't imply they're part of the demo journey.
- **ISRO watchlist** exists in backend (`GET /api/watchlists/{id}`) with **no UI**.

### B.4 Test / quality gaps
- No **scenario-switch ×3** end-to-end test (Protect ISRO / 2009 / Kessler) — spec'd in
  `redesign/09-testing-and-acceptance.md` §2.4 but not in `e2e/journey.spec.ts`.
- `/threats/:id` **not in the a11y sweep** (`frontend/e2e/a11y.spec.ts`); color-contrast rule
  is disabled there.
- Missing unit tests called for by the redesign: `terms.test.ts`, `BurnResult`,
  `ReportDocument`, `ObjectPanel`, `useThreatDetail`.
- **Bundle-size gate** exists (`frontend/scripts/check-bundle-size.mjs`, runs in
  `.github/workflows/ci.yml`) but is **not** wired into `scripts/release_check.sh`. (Note: the
  initial-JS budget was reported slightly over — 155/150 KB — confirm and either trim or bump.)
- No Lighthouse CI (documented only).

---

## Part C — Improvement plan (prioritized, executable tasks)

> Format per task: **what · files · acceptance**. P0 = demo credibility/correctness (do first),
> P1 = polish + tests, P2 = stretch/final-round.

### P0 — demo credibility & correctness

**P0-1 — Make `/system` pipeline honest + consistently Pro-gated**
- What: (a) add a one-line "real architecture · hosted demo serves pre-baked snapshots" note to
  the pipeline section header; (b) add a per-stage `live in dev` / `snapshot on web` chip driven
  by `import.meta.env.VITE_STATIC_API`; (c) move raw `method+path` strings to **Pro-only**
  (plain-English interface summary in Simple).
- Files: `frontend/src/routes/system/PipelineDiagram.tsx` (L75–77 cards, L105–107 detail panel),
  `frontend/src/routes/system/config.ts` (add a plain-English `interfacePlain` per stage + a
  `hosted: "live" | "baked"` flag), `frontend/src/routes/system/SystemRoute.tsx` (header copy).
- Acceptance: in Simple, no `/api/...` path appears anywhere on `/system`; in Pro, paths show
  with a live/baked chip; a Vitest/RTL test asserts Simple has no `POST /api` text and Pro does.

**P0-2 — Don't offer "Live data" on the static build**
- What: hide or disable the Sky live-catalog toggle when `VITE_STATIC_API` is set (tooltip:
  "Live CelesTrak runs in the full build; the web demo uses a baked snapshot").
- Files: `frontend/src/routes/sky/SkyToolbar.tsx`, `frontend/src/routes/sky/SkyRoute.tsx`,
  hook `frontend/src/features/useRefreshLiveCatalog.ts` (guard).
- Acceptance: on a `VITE_STATIC_API=1` build the live toggle is absent/disabled; no
  `static_missing`/404 reachable from the Sky UI. Add a Playwright assertion.

**P0-3 — Fix threat-detail mini-globe object per scenario**
- What: stop hardcoding `CARTOSAT-2F`; derive the protected object from the active conjunction.
- Files: `frontend/src/routes/threats/ThreatDetailRoute.tsx` (~L96), cross-check
  `frontend/src/components/earth/scene.config.ts`.
- Acceptance: opening a 2009/Kessler threat highlights that scenario's primary object, not ISRO.

**P0-4 — Resolve Kessler "education only" CTA contradiction**
- What: either hide "Plan the safe move" for education scenarios, or change the banner so copy
  and CTA agree.
- Files: `frontend/src/routes/threats/ThreatDetailRoute.tsx`, `frontend/src/routes/avoidance/`.
- Acceptance: education scenario has no dead-ended/contradictory maneuver path.

**P0-5 — Align secondary-screening UI with data for 2009/Kessler**
- What: when `secondary_status === "warning"` / `screened_object_count === 0`, the report and
  avoidance double-check must say "not independently re-screened in this build" — never imply a
  clean secondary pass. (Optionally instead: author `data/secondary-screening/2009-replay.json`
  and `kessler-sandbox.json` and re-bake.)
- Files: `frontend/src/routes/report/ReportDocument.tsx` (L144–147),
  `frontend/src/routes/avoidance/` double-check panel; data option:
  `data/secondary-screening/*.json` + re-run `scripts/snapshot-api.mjs`.
- Acceptance: no scenario shows a "secondary clear" affordance that isn't backed by data.

### P1 — polish + tests

**P1-1 — One-click sample report** — pre-generate/jump to a baked report so `/report` isn't
empty on first visit. Files: `frontend/src/routes/report/ReportEmptyState.tsx`, `ReportRoute.tsx`
(the 3 `report-*-001` ids are already baked). Acceptance: a "View a finished report" button loads
a real report with no prior steps.

**P1-2 — Richer `/threats` layout** — fill the empty column (scenario context, ranking rationale,
"what we screened") so it doesn't read as one lonely row. Files:
`frontend/src/routes/threats/ThreatsRoute.tsx`, `ThreatsSummary`, `RankingNote`.

**P1-3 — Delete dead code** — remove `frontend/src/api.ts`, `frontend/src/state/missionStore.ts`,
`frontend/src/layout/TopNav.tsx`, `frontend/src/format.ts` (+`format.test.ts`),
`frontend/src/ui/Primitives.tsx`, and the unused `useDemoReplay` hook. Acceptance: `tsc` + tests
+ build green; no import references remain (grep clean).

**P1-4 — Close test gaps** — add scenario-switch ×3 journey E2E; add `/threats/:id` to
`e2e/a11y.spec.ts`; add `terms.test.ts`; wire `npm run size` into `scripts/release_check.sh`.
Acceptance: new specs pass in CI; release_check fails if bundle budget is exceeded.

**P1-5 — Overlapping controls pass** — de-conflict tour card vs globe zoom/reset overlay and the
scroll hint vs camera on `/`. Files: `frontend/src/app/GuidedTour.tsx`,
`frontend/src/components/earth/SceneControlsOverlay.tsx`, `frontend/src/routes/home/Hero.tsx`.

### P2 — stretch / final-round

- **P2-1 ISRO watchlist UI** — surface `GET /api/watchlists/{id}` (already in backend + tests) as
  a "what we're protecting" panel; bake its response for static.
- **P2-2 Full-catalog screening mode** — screen more than the seeded tracks for the hero scenario;
  bake the extra responses.
- **P2-3 Richer Pc / covariance controls** — let Pro users adjust σ / hard-body radius and see Pc
  update (`/system` PcModel + threat detail).
- **P2-4 Judge collateral** — a one-page methodology cheat sheet / Q&A pack (what's real vs
  surrogate vs fixture, with file pointers) for the demo.
- **P2-5 Lighthouse CI** — add `@lhci/cli` with the redesign budgets (Perf ≥85, A11y ≥95).

---

## Execution notes for the implementing agent
- **Static-deploy contract:** anything that changes a request body/params for a `lib/api.ts`
  call must also be **baked**: update `scripts/snapshot-api.mjs`, run it against a local backend
  (`uvicorn` on :8000), and commit `frontend/public/api-static/*` + `index.json`. Unbaked
  POST bodies hard-fail on Netlify (no GET-style fallback).
- **Mode rule:** Simple = plain words only, no `/api` paths, no scientific notation; Pro = add the
  technical layer. The guardrail test is `frontend/e2e/demo-gate.spec.ts`.
- **Verify before claiming done:** `npx tsc -b`, `npx vitest run` (78 currently green),
  `npm run build`, `npm run size`, and the Playwright suite.
- **Do not auto-deploy** — Netlify credits are limited; commit/push only on the owner's go-ahead.
