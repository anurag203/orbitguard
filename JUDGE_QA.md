# OrbitGuard Judge Q&A

## What is real?

- The Protect ISRO hero flow uses committed TLEs, backend SGP4 propagation, closest-approach screening, a documented Pc model, maneuver ranking, secondary-screening fixtures, and report generation.
- The Sky view can use either the baked catalog or **Live data** from CelesTrak through the Netlify `/celestrak/*` edge proxy.
- Live Sky combines GP/TLE data with SATCAT metadata where available, then propagates the field client-side with `satellite.js`.
- The hosted demo is a static SPA for the application API, but it still includes the CelesTrak edge proxy for opt-in live catalog refresh.

## What is a transparent demo assumption?

- Public TLEs do not include covariance, so Pc uses the documented covariance model in `METHODOLOGY.md`.
- Maneuver effects use an along-track lead-time surrogate, not full post-burn orbit propagation.
- Protect ISRO has candidate-specific secondary-screening data. 2009 Replay and Kessler Sandbox show warning or incomplete secondary-screening when no fixture exists.
- CelesTrak can rate-limit repeated large `active` catalog requests. OrbitGuard detects the cache-guard response, keeps any live groups that did load, and backfills missing objects from the baked catalog with an explicit source note.

## What are the side scenarios?

- 2009 Replay is a historical what-if teaching path, not an operational reconstruction of the Iridium-Cosmos event.
- Kessler Sandbox is education mode. It shows debris-pressure risk and does not present a live maneuver CTA.

## What should I inspect in Pro mode?

- `/system` shows the pipeline, raw API paths, runtime mode chips, Pc model details, validation checks, and known limitations.
- `/threats/:id` shows exact Pc, covariance, relative velocity, encounter geometry, and Pro sensitivity controls.
- `/report?scenario=protect-isro&report=report-protect-isro-001` opens a baked finished report without needing to run the journey first.

## What is the static-hosting contract?

- Static production builds set `VITE_STATIC_API=1`.
- The main app reads pre-baked deterministic API snapshots from `frontend/public/api-static/**`.
- Netlify also deploys `netlify/edge-functions/celestrak.ts`, routed by `netlify.toml` at `/celestrak/*`, so the static site can offer opt-in live CelesTrak catalog data without a backend server.
- Any new deterministic API request body used by the UI must be added to `scripts/snapshot-api.mjs` and baked into `frontend/public/api-static`.
- The live CelesTrak path is best-effort and clearly labeled; the decision demo remains reproducible from committed fixtures.

## Where is the source of truth?

- Methodology: `METHODOLOGY.md`
- Backend routes: `backend/app/api/routes`
- Engines: `backend/app/engines`
- Deterministic fixtures: `data`
- Static API snapshots: `frontend/public/api-static`
- Frontend API adapter: `frontend/src/lib/api.ts`
- Live catalog adapter: `frontend/src/routes/sky/liveCatalog.ts`
- Netlify CelesTrak proxy: `netlify/edge-functions/celestrak.ts`
