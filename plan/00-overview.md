# OrbitGuard — "First Place" Upgrade Plan

**Goal:** take OrbitGuard from "works" to *demo-winning*: a cinematic, intuitive mission-control
experience anyone can understand in 30 seconds, backed by credible science, deployable as a
100% static site on Netlify.

This plan is the synthesized output of a 3-agent recon pass:
- `plan/audit/ui-ux-audit.md` — UI/UX critique + 24 screenshots ([UI audit](d9566aea-e6a6-428d-948d-a0d6d017718d))
- Architecture & feature-gap recon ([architecture](35f0430c-200d-45fa-bcbf-2f7edc7c34d3))
- Backend + Netlify feasibility ([backend/netlify](c0810271-7a1b-4f20-92b8-0fa3d767344c))

---

## What's already strong (keep)
The alert → rank → plan → apply → secondary-check → report pipeline is fully implemented and
API-backed (React Query). The 3D Earth, postprocessing, design system, Simple/Pro mode, and the
test/CI safety net are all in good shape. We are **polishing and extending**, not rebuilding.

## What's breaking the demo (must fix — P0)
1. **Guided Tour is frozen on step 1/5.** Reproduced: clicking "Next" never advances; URL stays `/`.
   Root cause: in `GuidedTour.tsx` the reset effect depends on `[active, navigate]`; with
   react-router v7 `useNavigate()` returns a *new identity on every location change*, so each
   advance re-fires the reset (`setStep(0)` + `navigate("/")`). See `plan/02-tour-fix.md`.
2. **The whole narrative reads "41 hours ago."** `relativeFromNow()` compares fixed fixture TCAs to
   real `now`, so the core story self-contradicts ("*will* pass … 41 hours *ago*"). Fix with a
   front-end "demo clock" that rebases scenario times to a near-future window. See `plan/04-ui-polish.md`.
3. **Below-the-fold content can render blank.** `Section` gates content behind `whileInView`; harden
   so content is robust for judges/screenshots. See `plan/04-ui-polish.md`.

## The signature feature gap (biggest wow — P1)
4. **`/sky` shows only 4 objects.** The globe renders the 4 hardcoded `DEMO_OBJECTS`; the catalog
   only *enriches* them. The "see everything in orbit" moment never lands. Plan: render hundreds of
   real, SGP4-propagated objects as an instanced point cloud beneath the named hero tracks. See
   `plan/03-sky-all-satellites.md`.

## Polish (P1/P2)
5. Empty `/threats` and `/report` layouts; protected asset shown red like debris; globe label
   readability; overlapping controls; dead code. See `plan/04-ui-polish.md`.

## Deployment
6. **Netlify, fully static.** See "Netlify reality check" below + `plan/05-netlify-static.md`.

---

## Netlify reality check (correcting the assumption)
> "since there is static backend, it can be fully hosted on netlify, right?"

**Half-right.** The *data* is static/deterministic, but the backend itself is a **FastAPI (Python)
server** — Netlify does **not** run long-lived Python servers (only static assets + JS/Go
serverless functions). So we can't just "run the backend" on Netlify.

**But we don't need to.** Because every demo response is deterministic, we **bake the API to static
JSON at build time** and ship a 100% static SPA:
- A build step snapshots the ~25 required endpoint responses (GET + the deterministic POST results
  for the fixed demo inputs) into `frontend/public/api-static/**`.
- A `VITE_STATIC_API=1` adapter in `lib/api.ts` resolves calls from those baked files instead of
  `fetch('/api')` (POSTs keyed by a hash of the request body).
- `netlify.toml` builds `frontend`, publishes `dist`, and SPA-redirects `/* → /index.html`.
- Live CelesTrak refresh is disabled in static mode (offline-fallback snapshot baked).

Result: `git push` → Netlify → fully working static demo, no server. Full detail in
`plan/05-netlify-static.md`.

---

## Decisions taken (no blocking questions)
- **Sky scale:** target ~400–600 real objects, SGP4-propagated client-side (`satellite.js`),
  instanced rendering, LOD + cap, procedural fallback. Real TLE data = strongest judge story and is
  fully offline/static-friendly.
- **Time:** front-end demo clock (rebases display to "now"); keeps backend determinism + tests intact.
- **Hosting:** static bake on Netlify (above). Docker/compose stays for the "real backend" story.
- **Dead code:** quarantine `src/api.ts`, `missionStore.ts`, `layout/TopNav.tsx`, `src/format.ts`,
  `ui/Primitives.tsx` (unused) — low risk, done last.

## Execution
See `plan/06-execution.md` for the wave/subagent breakdown and file partitioning.
