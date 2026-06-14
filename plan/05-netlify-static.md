# Plan 05 — 100% Static Netlify Deploy

## Why static works here
FastAPI can't run on Netlify (no long-lived Python server). But every demo response is
**deterministic**, so we bake them to static JSON at build time and resolve them client-side.

## Pieces
### 1. Snapshot script — `scripts/snapshot-api.mjs`
- Boot the backend locally (`uvicorn app.main:app` with `ORBITGUARD_PROJECT_ROOT=<repo>`), wait for
  `/api/health`.
- Hit every endpoint the UI calls and write JSON into `frontend/public/api-static/**`:
  - **GET** (verbatim path → file): `demo/status`, `scenarios`, `conjunctions/<id>` (×3),
    `reports/<id>` (×2–3), `catalogs/full?source=fixture&limit=...`.
  - **POST** (keyed by sha256 of `method+path+sortedBody`): `scenarios/<id>/run` (×3),
    `conjunctions/screen` (×3), `maneuvers/plan` (×3), `maneuvers/apply` (×2), `reports` (×2),
    `demo/replay/protect-isro-round1`, `catalogs/live/refresh` (offline-fallback).
- ~25 files total. Also emit a manifest mapping POST hashes → files.

### 2. Static API adapter — `frontend/src/lib/api.ts`
- When `import.meta.env.VITE_STATIC_API` is set, wrap `request()`:
  - GET → `fetch('/api-static' + path + '.json')` (or query-keyed file).
  - POST → compute the same `(path, normalized body)` hash → fetch the baked file; throw a normal
    `ApiError` for any non-baked input (demo paths only need the success snapshots).
- No behavior change in dev (proxy to `:8000`) when the env var is unset.

### 3. `netlify.toml` (repo root)
```toml
[build]
  base = "frontend"
  command = "npm ci && npm run snapshot-api && VITE_STATIC_API=1 npm run build"
  publish = "dist"
[build.environment]
  NODE_VERSION = "22"
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```
(`snapshot-api` needs Python available at build; alternatively commit `api-static/` and drop the
snapshot step from the Netlify command — simplest + most reliable for CI. **Decision: commit the
baked `api-static/` and the sky catalog**, and keep the snapshot script for regeneration. Then the
Netlify build is just `npm ci && VITE_STATIC_API=1 npm run build` — no Python needed on Netlify.)

### 4. Live-mode guard
When `VITE_STATIC_API` is set: hide/disable the Sky "Live data" toggle and force `source=fixture`;
Home `isLive` already shows "Offline demo data".

## Files
- Add `netlify.toml`, `scripts/snapshot-api.mjs`, `frontend/public/api-static/**` (committed),
  `frontend/public/_redirects` (optional).
- Edit `frontend/src/lib/api.ts` (adapter), `frontend/package.json` (`snapshot-api` + build env),
  `frontend/src/routes/sky/SkyRoute.tsx` (live-toggle guard).
- `.gitignore`: keep `api-static/` committed (do not ignore).

## Sequencing
Run **after** Plan 03 (Sky) so the baked catalog + any new endpoints are included.

## Acceptance
- `VITE_STATIC_API=1 npm run build` + `npx serve dist` → the full demo (home → sky → threats →
  avoidance plan+apply → report) works with **no backend running**.
- Netlify deploy from a clean clone produces a working public URL.
- Dev mode (no env var) still proxies to the live FastAPI backend unchanged.
