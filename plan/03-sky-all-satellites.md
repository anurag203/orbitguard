# Plan 03 — "See Everything in Orbit" (the signature Sky view)

## Why
The #1 wow-moment gap: `/sky` renders only the **4** hardcoded `DEMO_OBJECTS`. Judges expect to see
*the sky full of satellites*. We will render **hundreds of real, SGP4-propagated objects** as a
performant instanced cloud, with the 4 named hero tracks layered on top for the story.

## Approach (decided)
- **Data:** bake a real CelesTrak snapshot (~400–600 active objects with TLEs) as a committed static
  JSON (`frontend/public/data/catalog-sky.json`). This is deterministic + offline + static-friendly
  and gives the strongest "real tracked objects" judge story. Keep a procedural fallback generator
  for resilience.
- **Propagation:** `satellite.js` (SGP4) in the lazy 3D chunk. Propagate each TLE to the current
  display epoch (rebased by the demo clock) → ECI → scene units. Recompute on a throttled cadence
  (e.g., every ~250ms of sim time) and animate smoothly; respect reduced-motion (static positions).
- **Rendering:** a single `THREE.InstancedMesh` (or points) for the whole field — one draw call.
  Color by orbit band / risk; size kept constant on-screen. **No `<Html>` labels** for the cloud
  (labels only for selected/hero objects). This is the key scalability change (today everything is
  O(n) React components + 256-pt line per orbit).
- **LOD & caps:** quality tier from `useEarthEnv` → cap visible instances (e.g., high=600, low=200);
  draw orbit trails only for the selected + hero/top-risk objects, never for the whole cloud.
- **Hero tracks:** the existing 4 named objects (and the conjunction marker / threat line) render on
  top of the cloud, unchanged, so the mission story still reads.

## Interaction / UX
- **Filters** (already client-side in `sky-data.ts`) now also filter the instanced cloud:
  orbit class (LEO/MEO/GEO), object type (payload/rocket body/debris), owner, search, risk band.
- **Selection:** click a point → nearest-instance pick → select; show its label + a trail; sync
  `?object=<id>` (URL already supports it). Hover → lightweight tooltip (single shared `<Html>`).
- **Counts:** "N of M shown" chip so the scale reads honestly.
- **Legend:** small key for the orbit-band / risk colors.
- Mobile: cap harder, keep it smooth.

## Performance budget
- 1 instanced draw call for the cloud; trails only for ≤ ~6 objects.
- Propagation off the main render path where possible (precompute arrays; update instance matrices in
  `useFrame` without per-object React state).
- Target 60fps desktop high tier with 600 objects; degrade gracefully on low tier / no-WebGL.

## Files
- Add `frontend/public/data/catalog-sky.json` (baked TLE snapshot) + a small generator script
  `scripts/fetch-sky-catalog.mjs` (dev-time; output committed).
- Add `frontend/src/components/earth/SatelliteField.tsx` (instanced cloud + SGP4).
- Add `frontend/src/components/earth/propagate.ts` (satellite.js wrapper, TLE→scene units, caching).
- Edit `frontend/src/components/earth/EarthCanvas.tsx` + `EarthScene.tsx` (accept a `field` prop /
  `showField`), `scene.config.ts` (band colors, scaling), `types.ts`.
- Edit `frontend/src/routes/sky/SkyRoute.tsx` + `SkyStage.tsx` + `sky-data.ts` (feed catalog →
  field, wire filters/selection/counts/legend).
- Add dep: `satellite.js`.
- Tests: extend `e2e/earth.spec.ts` / a new `sky.spec.ts` — field renders, count chip, select a
  point, filter reduces the cloud, reduced-motion still renders, no-WebGL fallback.

## Acceptance
- `/sky` shows a dense, animated field of hundreds of objects orbiting Earth at 60fps (high tier).
- Filtering and selection work against the full field; counts are honest.
- The 4 hero tracks + conjunction story still read clearly on top.
- Fully offline/static (no network needed at runtime); reduced-motion + no-WebGL degrade cleanly.
