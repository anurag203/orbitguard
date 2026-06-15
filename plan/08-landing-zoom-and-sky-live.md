# Plan 08 — Landing-page framing + a LIVE, REAL, ACCURATE orbital picture on Netlify

> Plan only; another agent implements. The **Netlify build is the judged "final project,"** so the
> bar is: **everything live, real, and as accurate as a public-data tool can be — yet cool, modern,
> and legible to non-experts.** No backend exists on Netlify, so "live" = fetched in the browser
> from CelesTrak (positions) + SATCAT (metadata), via a same-origin proxy, propagated client-side.
>
> Tasks are `what · files · acceptance`. Cite-checked against current code.

---

## ⚠️ Reconciliation with plan 07 (read first)
**Part 2 SUPERSEDES `plan/07-pro-mode-and-pending.md` §P0-2** (which said "hide the Sky *Live data*
toggle on the static build"). Do **not** hide it. The owner wants Live to *work* on Netlify; we make
it a client-side CelesTrak fetch. Honesty is still satisfied: Live shows *real current* public TLEs
(no fakery), Offline stays the deterministic default for the scripted judge demo.

**Scientific-credibility guardrail (keep this true):** the `/threats → /avoidance → /report` flow stays
**deterministic, scenario-based** (real SGP4 + real conjunction/Pc math, baked for reproducibility).
The new **live Sky** is *situational awareness*. Live conjunction screening (Part 6, stretch) is
explicitly labeled "informational, no operational covariance" — mirrors the backend's own note
(`backend/app/services/catalog_service.py` L393).

---

## Build order (so the agent sequences correctly)
1. **Part 1** — Landing zoom (small, independent, ship first).
2. **Part 2** — Same-origin CelesTrak/SATCAT proxy + live data plumbing (foundation for everything).
3. **Part 3** — Accuracy: SATCAT join → real country/type/owner → ISRO/China actually populate.
4. **Part 4** — Performance: Web Worker SGP4 + density control so thousands render at 60fps.
5. **Part 5** — Feature set: country/cloud filters, named objects, debris clouds, facts, search, time.
6. **Part 6** — Stretch: live conjunction screening for a selected primary ("fully live" threats).
7. **Part 7** — Stars/background polish. **Part 8** — Honesty, caching, risks, verification.

---

# Part 1 — Landing page: max-zoom Earth, no zoom control

### Goal
Hero Earth fills the frame like the owner's reference (large, day-side facing, surface detail).
Drag still rotates; **wheel/pinch/buttons do not zoom**; the wheel **scrolls the page** normally.

### Why it's not that today
- Hero renders `<EarthScene phase="alert" …/>` with **no `framing` override**, so it uses
  `framingFor("protect-isro","alert")` → **`distance: 6.8`** (wide) — `scene.config.ts` L167–170,
  `frontend/src/routes/home/Hero.tsx` L47–54.
- Zoom is on: `<OrbitControls>` has no `enableZoom` prop (defaults `true`) — `SceneControls.tsx`
  L86–102; so the wheel is captured and the page can't scroll over the globe. Buttons + keys exist
  (`SceneControlsOverlay.tsx` L42–47; `EarthCanvas.tsx onKeyDown` L141–175). Container is
  `touch-action: none` (`EarthCanvas.tsx` L182, L206–208).

### Tasks
**HERO-1 — thread `enableZoom` (default `true`)** · `types.ts` (EarthSceneProps + EarthCanvasProps),
`EarthScene.tsx`, `EarthCanvas.tsx`. Acceptance: `tsc` clean; `/sky` + `/threats/:id` still zoom.

**HERO-2 — honor it** · `SceneControls.tsx` (`<OrbitControls enableZoom={enableZoom}>`),
`EarthCanvas.tsx` (skip `+`/`=`/`-`/`_` dolly keys when false). Acceptance: wheel over the hero
scrolls the page; pinch no-ops; drag still rotates.

**HERO-3 — hide zoom buttons on the hero** · `EarthCanvas.tsx` (pass prop), `SceneControlsOverlay.tsx`
(render only the "drag to rotate" hint, omit zoom +/-). Acceptance: hero has no zoom buttons; `/sky`
still does.

**HERO-4 — let the page scroll over the globe** · `EarthCanvas.tsx`: when `enableZoom===false`, set
container `touch-action: pan-y`. Acceptance: touch devices scroll the hero vertically; drag rotates.

**HERO-5 — set the max-zoom framing** · `Hero.tsx`: pass `enableZoom={false}` and a `framing`
override — start `distance ≈ 3.4`, **pin** it (`minDistance: 3.4, maxDistance: 3.4`), keep gentle
`autoRotate: true`; tune `distance` (3.2–3.9) + `azimuth`/`polar` to match the reference. (`framing`
merges over `framingFor` in `EarthCanvas` `resolvedFraming`.) Acceptance: hero matches the reference
at 1440×900 (screenshot); headline stays legible over the left scrim.

> `minDistance` stays `3.2` globally (`scene.config.ts` BASE) — only the hero pins distance, so other
> routes are unaffected.

---

# Part 2 — Live data on Netlify (client-side CelesTrak + SATCAT)

### Why it doesn't work on Netlify today
- "Live" calls the backend (`POST /api/catalogs/live/refresh` → `useRefreshLiveCatalog`,
  `SkyRoute.tsx` L142–166). Netlify has no `/api`, so code force-disables it (`effectiveSource =
  STATIC_API ? "fixture" : source`, L76) and the toolbar drops the option (`SkyToolbar.tsx` L105–107).
- The "everything in orbit" cloud is **always** the committed `public/data/catalog-sky.json`
  (`useSkyCatalog.ts`), regardless of source — so even `source=live` never changes the cloud today.

### Data sources (all browser-fetchable through one proxy)
| Need | CelesTrak endpoint | Notes |
|---|---|---|
| Positions (TLE) | `…/NORAD/elements/gp.php?GROUP=<g>&FORMAT=tle` | name + line1 + line2 → `satellite.js` directly |
| Metadata | `…/satcat/records.php?GROUP=<g>&FORMAT=json` | per-object **OWNER (country), OBJECT_TYPE, LAUNCH_DATE, RCS, PERIOD, INCLINATION** |
| Full master meta (fallback) | `…/pub/satcat.csv` | whole SATCAT; cache 24h; only if records.php per-group is insufficient |
| Named lookup | `gp.php?CATNR=25544` / `?NAME=STARLINK` | resolve a specific object (e.g. ISS) |

Join GP↔SATCAT by **NORAD id** (TLE line1 cols 3–7; SATCAT `NORAD_CAT_ID`).

**SKY-1 — same-origin proxy (prod + dev) — DECIDED: Netlify Edge Function**
> **Decision (owner-approved): use the Edge Function**, not a plain redirect. Reasons: it caches at
> Netlify's CDN (fast + polite to CelesTrak), sets a real upstream `User-Agent` (CelesTrak's usage
> policy asks for this), and lets us **allowlist** exactly what we proxy so we never ship an open
> proxy (SSRF). The plain redirect stays documented only as an emergency fallback if edge functions
> are unavailable.

- What: an Edge Function at `netlify/edge-functions/celestrak.ts` (Deno runtime) handling `/celestrak/*`.
  - **Signature/wiring:** `export default async (request: Request, context: Context): Promise<Response>`
    plus `export const config = { path: "/celestrak/*" }` (or declare `[[edge_functions]] path="/celestrak/*" function="celestrak"` in `netlify.toml`).
  - **SSRF-safe allowlist (required):** only `GET`; strip the `/celestrak` prefix; **only** forward to
    `https://celestrak.org` with a path matching an allowlist:
    `^/NORAD/elements/gp\.php`, `^/satcat/records\.php`, `^/pub/satcat\.csv`. Reject anything else with
    `400`. Never honor a user-supplied host/scheme — the upstream origin is hardcoded to
    `https://celestrak.org`. (Mirrors the API/SSRF rule: fixed host, scheme allowlist, no redirects.)
  - **Upstream call:** `fetch("https://celestrak.org" + path + search, { headers: { "User-Agent": "OrbitGuard/1.0 (hackathon; contact)" }, redirect: "error" })`.
  - **Caching:** copy the body through and set `Cache-Control: public, max-age=3600` (GP) /
    `max-age=86400` (SATCAT) — optionally `Netlify-CDN-Cache-Control` for edge-only TTL — so repeat
    requests hit the CDN, not CelesTrak. Pass through `Content-Type`.
  - **Dev parity:** `server.proxy["/celestrak"] = { target:"https://celestrak.org", changeOrigin:true, rewrite:p=>p.replace(/^\/celestrak/,"") }` in `frontend/vite.config.ts` (dev has no edge fn).
- Files: `netlify/edge-functions/celestrak.ts`, `netlify.toml` (edge_functions decl), `frontend/vite.config.ts`.
  Emergency fallback only (do NOT ship unless edge fns fail): `public/_redirects` line
  `/celestrak/* https://celestrak.org/:splat 200`.
- Acceptance: `GET /celestrak/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle` and
  `GET /celestrak/satcat/records.php?GROUP=stations&FORMAT=json` return data in `npm run dev` AND a
  `VITE_STATIC_API=1` Netlify deploy, no CORS error; a repeat request is a CDN cache hit; a request to
  a non-allowlisted path (e.g. `/celestrak/anything-else`) returns `400`.

**SKY-2 — a live catalog client that returns enriched `SkyCatalogEntry[]`**
- What: add a `fetchLiveCatalog(groups[])` (new `frontend/src/routes/sky/liveCatalog.ts`) that:
  fetches GP TLEs for the chosen groups, parses triplets → `{id,name,line1,line2}`; fetches SATCAT
  JSON for the same groups → `Map<norad, {country, objectType, launchDate, rcs, period, inclination}>`;
  **joins** them; classifies `kind` from SATCAT `OBJECT_TYPE` (PAY→satellite, R/B & DEB→debris);
  sets `owner`/`country` from SATCAT `OWNER` mapped to friendly names (Part 3). De-dupe by NORAD.
- Extend `SkyCatalogEntry` (type-only, safe) with optional `country?`, `objectType?`, `launchDate?`,
  `rcs?`, `noradId?`, `cloud?` (named debris-cloud id) — `frontend/src/components/earth/types.ts`.
- Wire `useSkyCatalog` to switch between baked (offline) and live: `useSkyCatalog(source)` →
  offline reads `catalog-sky.json` (unchanged), live calls `fetchLiveCatalog(...)` with React Query
  caching (`staleTime` ~1h GP / ~24h SATCAT) and `retry: 1`. — `frontend/src/routes/sky/useSkyCatalog.ts`.
- Files: new `liveCatalog.ts`, `useSkyCatalog.ts`, `types.ts`.
- Acceptance: live mode yields ≥3,000 joined, propagatable entries; each renders; sample entries
  show a real country + object type.

**SKY-3 — drive BOTH the cloud and availability from the source switch**
- What: (a) when `source==="live"`, feed the **field** from the live catalog (today only the 4 hero
  tracks switch); (b) **stop forcing fixture under `STATIC_API`** — allow Live in static builds
  (remove the `effectiveSource` override L76, the `useEffect` reset L80–82, the `SkyToolbar` filter
  L105–107, and the `STATIC_LIVE_REASON`/"Snapshot" badge L60,227); (c) keep graceful fallback
  (`liveError` notice → revert to Offline) on fetch failure; (d) Offline remains the **default**.
- Files: `SkyRoute.tsx` (L59–82, 142–168, 218–228), `SkyToolbar.tsx` (L87–88, 105–107, 151–159),
  `useSkyObjects.ts` (so hero-track facts can also reflect live where matched).
- Acceptance: on the Netlify build, choosing **Live data** loads real current objects into the cloud;
  the `N of M in orbit` chip + `LiveChip` reflect it; failure falls back to Offline with the calm notice.

---

# Part 3 — Accuracy: real country/operator/type (why ISRO & China are sparse today)

### Root cause (from the code)
- `scripts/fetch-sky-catalog.mjs`: caps the baked cloud at **`TARGET_COUNT=500`**, parsed from only the
  **first `FETCH_LIMIT=900`** of `GROUP=active`, then sliced — India/China barely appear.
- **Owner is guessed from name prefixes only** (`OWNER_PREFIXES`, L57–84). Most ISRO/Chinese objects
  don't match → `owner: undefined` → "Unlabelled" → not filterable, wrong counts.
- **No country/SATCAT data anywhere.** `kind` is name-heuristic (`kindFor`, L86–92), not authoritative.
- Backend live has the same gap (no SATCAT, `owner=None`) — `catalog_service.py` L366–377.

### Fix: join SATCAT for authoritative metadata (both live AND the baked offline set)
**ACC-1 — country/operator from SATCAT `OWNER`**
- What: map SATCAT source codes → friendly names + flag. Key codes:
  `IND→India (ISRO)`, `PRC→China (CNSA)`, `US→United States`, `CIS→Russia`, `ESA→Europe (ESA)`,
  `JPN→Japan (JAXA)`, `UK`, `FR`, `GER`, `IT`, `CA`, `SKOR→South Korea`, `IT/ITSO→Intelsat`, … Keep a
  small table + a `flagEmoji(code)` helper; unknown → "Other / unlabelled".
- For operator (vs country) keep the name-prefix table for mega-constellations (Starlink, OneWeb,
  Iridium, BeiDou, GPS) where SATCAT OWNER is a country but the *operator* is the recognizable brand.
- Files: new `frontend/src/routes/sky/owners.ts` (shared by live + bake), refactor `sky-data.ts`
  `OWNER_COUNTRY`/`OWNER_PREFIXES` into it; `scripts/fetch-sky-catalog.mjs` imports the same table.
- Acceptance: filtering by **India (ISRO)** shows the real ISRO fleet (dozens+, incl. CARTOSAT, RISAT,
  GSAT, IRNSS/NavIC, Oceansat, EOS, Astrosat); **China** shows hundreds (BeiDou, Yaogan, Gaofen,
  Tiangong, Fengyun). Counts are no longer near-zero.

**ACC-2 — accurate object type & debris**
- What: `kind`/`objectType` from SATCAT `OBJECT_TYPE` (PAY=payload→satellite; R/B=rocket body→debris;
  DEB=debris→debris; UNK→unknown). Show the precise type in Pro mode facts.
- Files: `liveCatalog.ts`, `scripts/fetch-sky-catalog.mjs` (`kindFor` → SATCAT-backed), `ObjectPanel.tsx`.
- Acceptance: debris vs payload counts match SATCAT; Pro facts show "Rocket body" / "Debris" / "Payload".

**ACC-3 — bigger, accurate OFFLINE bake (so even the demo default is real)**
- What: raise `TARGET_COUNT` (e.g. 2,000–3,000) and fetch **multiple groups** at bake time
  (`active` + `geo` + `navigation` + the 4 named debris clouds in FEAT-2) and **join SATCAT** so the
  committed `catalog-sky.json` carries real country/type. Keep the deterministic synthetic fallback
  for offline builds. Regenerate the committed JSON.
- Files: `scripts/fetch-sky-catalog.mjs`, `frontend/public/data/catalog-sky.json` (regenerated),
  optional new `frontend/public/data/satcat-min.json` (norad→country/type map, also an offline fallback).
- Acceptance: Offline mode already shows accurate ISRO/China counts and types (not just Live).

---

# Part 4 — Performance: render thousands at 60fps (Web Worker SGP4)

### Ceiling today
`SatelliteField.tsx`: single `InstancedMesh`, throttled propagation (`SAMPLE_WALL_MS=200` ≈5 Hz) +
interpolation — good. But **caps are `HIGH_CAP=600`/`LOW_CAP=200`** (even-sampled), and `fillPositions`
runs **on the main thread** every 200ms. At thousands that loop will hitch.

**PERF-1 — move SGP4 off the main thread**
- What: a Web Worker (`frontend/src/components/earth/propagate.worker.ts`) that holds the `satrec[]`
  and, on each `{epochMs}` tick, returns a **transferable** `Float32Array` of positions. Main thread
  keeps the existing double-buffer + interpolation + instance-matrix write (no visual change), just
  swaps `fillPositions(...)` for `worker.postMessage` / `onmessage`. Reuse `propagate.ts` math inside
  the worker. Fall back to main-thread `fillPositions` if workers are unavailable.
- Files: new `propagate.worker.ts`, `SatelliteField.tsx` (replace the sample step), `propagate.ts`
  (export the per-batch fill so the worker can import it).
- Acceptance: 5,000 instances hold ~60fps on an M-class laptop; no main-thread long tasks >50ms during
  steady state (DevTools). Reduced-motion still renders one static frame.

**PERF-2 — density control + smart capping**
- What: raise caps and expose a **render density** control (e.g. `Lite 800 · Balanced 2,000 · Max 6,000`),
  default Balanced on desktop, Lite on mobile (replace the fixed `fieldCap = isDesktop?undefined:220`,
  `SkyRoute.tsx` L178). Keep even-sampling for the *unfiltered* "everything" view, but when a filter is
  active (country/cloud/search), render **all** matches (bounded counts) so e.g. ISRO shows every
  object, not a sample.
- Files: `SatelliteField.tsx` (`HIGH_CAP`/`LOW_CAP` → density prop), `SkyRoute.tsx`/`SkyToolbar.tsx`
  (density selector), `SkyStage.tsx` (pass-through).
- Acceptance: "Max" renders ~6,000 smoothly with the honest `N of M` chip; filtered views show 100% of
  matches; mobile stays smooth on Lite.

**PERF-3 — real-time vs accelerated time**
- What: `SatelliteField` already accepts `timeScale` (default `DEFAULT_TIME_SCALE=120`) but no route
  passes it. Add a small **speed control** (`Real-time 1× · 60× · 120×`) + play/pause, and a tiny
  "as of <epoch> UTC" stamp so the motion reads as *real propagation*, not decoration.
- Files: `SatelliteField.tsx` (already supports `timeScale`/`epoch`), `SkyStage.tsx`, `SkyRoute.tsx`,
  `SkyToolbar.tsx`.
- Acceptance: 1× shows true real-time motion; the epoch stamp matches the TLE fetch time; pause freezes.

---

# Part 5 — Feature set: make it read as a real, useful mission tool

**FEAT-1 — Country / operator filter (the headline "accurate" feature)**
- What: add a **Country** dimension to `SkyFilters` (`sky-data.ts` L32–39) populated from SATCAT
  (ACC-1), with friendly names + flags and **live counts** in the dropdown ("India (ISRO) — 112",
  "China — 780", …). Keep the existing operator/owner filter for brands. Both drive the cloud +
  list (reuse `filterCatalog`).
- Files: `sky-data.ts`, `SkyToolbar.tsx`, `SkyRoute.tsx`.
- Acceptance: selecting India highlights/keeps only ISRO objects on the globe with a correct count.

**FEAT-2 — Named debris clouds tied to real events (ties to the 2009 scenario!)**
- What: fetch the four famous breakup groups as labeled clouds and color/group them:
  `cosmos-2251-debris`, `iridium-33-debris` (the 2009 collision — **same event as the deterministic
  `2009-replay` threat scenario**), `fengyun-1c-debris` (2007 ASAT), `cosmos-1408-debris` (2021 ASAT).
  Add a "Debris clouds" filter chip set with counts ("Cosmos-2251: N fragments"). Tag entries with
  `cloud` (SKY-2 type field).
- Files: `liveCatalog.ts` (fetch these groups), `sky-data.ts` (cloud filter), `SkyToolbar.tsx`,
  `SkyStage.tsx` (legend). 
- Acceptance: selecting a cloud isolates real fragments with a real count; narration can link Sky's
  live Iridium/Cosmos debris to the `/threats` 2009 replay.

**FEAT-3 — Pin & search marquee objects**
- What: a small "Notable" quick-pick (ISS, China Space Station/Tianhe, Hubble, and ISRO marquee:
  CARTOSAT-2F, RISAT-2BR1, a NavIC sat) resolved by **SATCAT NAME → NORAD** (don't hardcode possibly-
  wrong IDs; resolve at runtime/bake). Clicking flies the camera to it (selection already focuses).
  Search already exists (`SkyToolbar` search box) — ensure it queries name + NORAD + country.
- Files: `liveCatalog.ts` (resolve notable NORADs), `SkyToolbar.tsx` (quick-pick), `sky-data.ts`
  (search haystack already includes name/owner/norad — extend with country).
- Acceptance: "ISS" search/quick-pick selects 25544 and focuses it; ISRO marquee objects resolve.

**FEAT-4 — Accurate per-object facts panel**
- What: `ObjectPanel` shows real facts from SATCAT + TLE: country/operator (flag), object type,
  launch date, RCS size bucket, and **derived** orbit facts (altitude, period, inclination, velocity)
  computed from the satrec (we already have mean motion/ecc/incl). Simple mode = plain words; Pro mode
  = raw values + NORAD + intl-designator + epoch + source URL.
- Files: `ObjectPanel.tsx`, `sky-data.ts` (`catalogEntryToSkyObject` enrich), small derive helpers in
  `propagate.ts` (period/altitude from satrec).
- Acceptance: clicking a live object shows correct, sourced facts; Pro shows the raw TLE epoch + NORAD.

**FEAT-5 — ISRO watchlist view** (was plan 07 P2)
- What: a one-click "ISRO assets" view = country filter India + the marquee pins + a count summary.
- Files: `SkyToolbar.tsx`/`SkyRoute.tsx`. Acceptance: one click shows India's tracked fleet with counts.

---

# Part 6 — Stretch: live conjunction screening (makes the *threats* story live too)

> P2 / final-round only. Keep the deterministic scenario flow as the credible centerpiece; this is an
> *additional, clearly-labeled* "informational" capability so judges see real math on live data.

**LIVE-CA-1 — client-side close-approach screen for a selected primary**
- What: for a selected live object, screen it against the live catalog over a 24–72h window: coarse
  pre-filter by apogee/perigee shell overlap; sample relative SGP4 positions; bisect to the true TCA;
  report **miss distance, relative velocity, TCA**. Compute a **simplified Pc** (2D Foster method, stated
  spherical covariance assumption). Run entirely in a Web Worker (reuse PERF-1). Surface the top N
  closest approaches in the panel with a "See in Threats" affordance.
- Files: new `frontend/src/lib/conjunction/clientScreen.ts` (+ worker), `ObjectPanel.tsx`.
- Acceptance: selecting ISS lists plausible real close approaches; every number carries the
  "informational, not operational; assumed covariance" caveat; main thread stays smooth (worker).
- Risk: O(n) per primary is fine; **never** O(n²) over the whole catalog. Cap the window + candidates.

---

# Part 7 — Sky: space-dark background with stars

### Current state (already starry — needs strengthening, not building)
`EarthCanvas` always mounts `<Starfield>` = drei `<Stars radius=120 depth=60 count=6000 …>` + `<Nebula>`
over `<color attach="background" args={[SPACE.void]}>` (`EarthCanvas.tsx` L210–214; `Starfield.tsx`).
Sky wraps it in `bg-deep` (`SkyStage.tsx` L96); the route section is `bg-void`.

**STARS-1 — strengthen the field** · `Starfield.tsx` (`Nebula.tsx` if tuning haze): raise `count`
(6000→8000 high tier), brighten/less-fade for visible stars without competing with satellite bloom.
(Shared → also improves Home, desirable.) Acceptance: clearly starry behind the globe on `/sky` at
1440×900; **re-verify the black-strobe fix is intact** (PostFX `multisampling={0}` + `<SMAA/>`
unchanged; real-GPU probe = 0% black frames).

**STARS-2 — (optional) space feel in List view** · subtle CSS radial-gradient star layer behind the
List branch only (never over the 3D canvas, which has real stars). · `SkyRoute.tsx`. Acceptance: List
view reads as "space," globe view unchanged.

---

# Part 8 — Honesty, caching, risks, verification

### Honesty / determinism (non-negotiable)
- **Offline demo is the default source**; Live is opt-in (the scripted demo must stay deterministic).
- Live chip/label says, in plain words: *"Live — current public TLEs from CelesTrak (situational
  awareness; no operational covariance)."*
- Live conjunction numbers (Part 6) always carry the assumption caveat. The deterministic
  `/threats→/avoidance→/report` flow is unchanged and remains the scientific centerpiece.

### Caching & CelesTrak politeness
- **Decided:** the **Edge Function** (SKY-1) sets the upstream UA + CDN `Cache-Control` (GP ~1h, SATCAT
  ~24h) and is SSRF-locked to a CelesTrak path allowlist, so CelesTrak isn't hammered and we ship no
  open proxy. Client-side: React Query `staleTime` (GP ~1–2h, SATCAT ~24h) + optionally persist to
  Cache Storage / IndexedDB so reloads don't refetch multi-thousand-object payloads.
- Ship a **build-time offline fallback** (ACC-3's bigger `catalog-sky.json` + `satcat-min.json`) so the
  first paint is instant and the site still works if CelesTrak is down at view time.

### Risks / decisions
- **Payload size:** `GROUP=active` ≈ 11k objects; don't render all. Default density ≈2,000 (PERF-2),
  filtered views show all matches. Fetch only the groups in use.
- **CORS:** the proxy makes everything same-origin (moot). Edge function also avoids browser UA limits.
- **SATCAT availability:** if `records.php?GROUP=` is insufficient, fall back to cached `pub/satcat.csv`
  (24h) or the committed `satcat-min.json`.
- **Live data is non-deterministic** (changes over time) — that's why Offline stays default for judging.
- **Don't regress:** the strobe fix (`PostFX multisampling={0}`) and bundle budget (`npm run size`) —
  `satellite.js`/workers must stay in the lazy 3D chunk, never the eager bundle (see `propagate.ts`
  header note). Worker file is bundled by Vite's worker support.

### Verify (every part)
`npx tsc -b` · `npx vitest run` · Playwright suite (journey/a11y/visual) · `npm run build` ·
`npm run size` · real-GPU flash probe (0% black) · screenshots of `/` (zoomed hero), `/sky`
(Live + accurate India/China counts + stars + thousands of objects at 60fps).

### Deploy discipline
Netlify credits are limited — **only deploy on the owner's explicit go-ahead.**

---

# Part 9 — Execution playbook (subagents · order · step-by-step)

> Goal: implement plan 08 with **maximum safe parallelism and zero merge thrash.** The whole strategy
> rests on one idea: **land the shared contracts (types/stubs) ONCE in Wave 0**, then fan out agents
> that each **own a disjoint set of files**. The "hot" integration files have a **single writer**.

## 9.1 The conflict map (why we sequence the way we do)
These files are touched by many parts → treat as **single-writer, hot**:
- `frontend/src/components/earth/types.ts` — landed in Wave 0, then frozen.
- `frontend/src/routes/sky/SkyRoute.tsx` — **owner: the "Sky integration" agent only.**
- `frontend/src/routes/sky/SkyToolbar.tsx` — **owner: Sky integration agent only.**
- `frontend/src/routes/sky/sky-data.ts` — **owner: Sky integration agent only** (after Wave 0 types).
- `frontend/src/components/earth/SatelliteField.tsx` — **owner: the "Field/perf" agent only.**
- `frontend/src/routes/sky/ObjectPanel.tsx` — **owner: the "facts/panel" agent only.**
- `frontend/src/routes/sky/liveCatalog.ts` — **owner: the "live client" agent only.**

Everything else (new files, `Hero.tsx`, `Starfield.tsx`, the bake script, the edge function,
`vite.config.ts`, `netlify.toml`) is naturally disjoint → safe to parallelize.

## 9.2 Wave 0 — Contracts & scaffolds (ONE agent, sequential, ~30 min) — **do this first**
Land *only* the shared interfaces + empty stubs so every downstream agent codes against stable types.
No behavior yet. This is what unlocks parallelism.

1. **Extend `types.ts`** (type-only, safe to import eagerly):
```ts
// EarthSceneProps + EarthCanvasProps: add
enableZoom?: boolean; // default true; hero passes false

// SkyCatalogEntry: add optional, SATCAT-derived fields
noradId?: string;
country?: string;        // friendly, e.g. "India (ISRO)"
countryCode?: string;    // raw SATCAT OWNER code, e.g. "IND"
objectType?: "PAYLOAD" | "ROCKET BODY" | "DEBRIS" | "UNKNOWN";
launchDate?: string;     // ISO yyyy-mm-dd
rcs?: "SMALL" | "MEDIUM" | "LARGE" | null;
cloud?: string;          // named debris-cloud id, e.g. "cosmos-2251-debris"
```
2. **Extend `SkyFilters`** in `sky-data.ts` (+ `DEFAULT_FILTERS`):
```ts
export type SkyFilters = {
  q: string; type: "all" | "satellite" | "debris"; owner: string;
  orbit: "any" | "low" | "other";
  country: string; // "any" | friendly country name
  cloud: string;   // "any" | debris-cloud id
};
export const DEFAULT_FILTERS: SkyFilters = { q:"", type:"all", owner:"any", orbit:"any", country:"any", cloud:"any" };
```
   (Update `applyFilters`/`filterCatalog`/`filtersActive` to pass the new keys through as no-ops for now.)
3. **Create stub modules** (compile, return empty/identity):
   - `frontend/src/routes/sky/liveCatalog.ts`:
     ```ts
     export type LiveCatalogOptions = { groups: string[]; signal?: AbortSignal };
     export async function fetchLiveCatalog(_o: LiveCatalogOptions): Promise<SkyCatalogEntry[]> { return []; }
     ```
   - `frontend/src/routes/sky/owners.ts`:
     ```ts
     export function countryFromOwnerCode(code?: string): { name: string; flag: string } { /* table */ }
     export function operatorFromName(name: string): string | undefined { /* prefix table */ }
     ```
   - `frontend/src/components/earth/propagate.worker.ts` (stub protocol):
     ```ts
     // init: {type:"init", tles:{line1,line2}[]}  tick:{type:"tick", epochMs}
     // → {type:"positions", buffer:ArrayBuffer /*Float32 xyz*/} (transferable)
     ```
   - `netlify/edge-functions/celestrak.ts` (stub passthrough) + `export const config = { path: "/celestrak/*" }`.
4. **Define the Field prop contract** (don't implement yet): add to `SatelliteFieldProps`
   `density?: "lite"|"balanced"|"max"`, `playing?: boolean`, `showAllMatches?: boolean`
   (and `timeScale`/`epoch` already exist).
5. **Gate:** `npx tsc -b` is green; nothing rendered differently. **Commit Wave 0.** Tag the commit so
   parallel branches all fork from it.

## 9.3 Wave 1 — Parallel, fully independent (spawn 4 subagents) ✅ safe to run at once
Fork each from the Wave-0 commit in **its own git worktree/branch** (use the `using-git-worktrees`
skill or `best-of-n-runner` subagents) so concurrent edits never collide. Subagent type:
`generalPurpose`.

| Agent | Mission (Task description) | Owns (writes) | Tasks |
|---|---|---|---|
| **A · Landing zoom** | "Pin hero Earth at max zoom; disable zoom; let page scroll." | `Hero.tsx`, `EarthScene.tsx`, `EarthCanvas.tsx`, `SceneControls.tsx`, `SceneControlsOverlay.tsx` | HERO-1..5 |
| **B · Proxy/edge** | "SSRF-locked CelesTrak/SATCAT **Edge Function** (CDN-cached, allowlisted) + vite dev proxy." | `netlify/edge-functions/celestrak.ts`, `netlify.toml`, `frontend/vite.config.ts` | SKY-1 |
| **C · Owners + bake** | "SATCAT owner/country table; bigger SATCAT-joined offline bake." | `owners.ts`, `scripts/fetch-sky-catalog.mjs`, `public/data/catalog-sky.json`, `public/data/satcat-min.json` | ACC-1(table), ACC-3 |
| **D · Stars** | "Strengthen starfield without regressing the strobe fix." | `Starfield.tsx`, `Nebula.tsx` | STARS-1 |

- A consumes the `enableZoom` type from Wave 0 — no `types.ts` edit needed.
- C produces the **owners table** that the live client (Wave 2) imports; ship it early.
- **Merge order:** D → A → B → C (least to most likely to need a data review). Run `tsc`+tests after each merge.

## 9.4 Wave 2 — Live data client (sequential pair; depends on B+C merged)
| Agent | Mission | Owns | Tasks |
|---|---|---|---|
| **E · Live client** | "Fetch GP TLE + SATCAT JSON via /celestrak, join by NORAD, enrich entries." | `liveCatalog.ts`, `useSkyCatalog.ts` | SKY-2, ACC-1(client), ACC-2(client) |
| **F · Sky integration** | "Wire source switch → cloud + availability; remove static lockout." | `SkyRoute.tsx`, `SkyToolbar.tsx`, `useSkyObjects.ts` | SKY-3 |

- Run **E first**, then **F** (F imports E's `fetchLiveCatalog`/`useSkyCatalog`). They can overlap only
  if F codes against the Wave-0 stub signatures (it can — signatures are frozen).
- Implementation notes for E:
  - GP parse: reuse the triplet parser shape from `fetch-sky-catalog.mjs` `parseTleText` (replicate a
    tiny browser version in `liveCatalog.ts`).
  - SATCAT JSON fields: `NORAD_CAT_ID`, `OBJECT_NAME`, `OBJECT_TYPE`, `OWNER`, `LAUNCH_DATE`, `RCS`,
    `PERIOD`, `INCLINATION`, `APOGEE`, `PERIGEE`. Build `Map<norad, meta>`; join by NORAD.
  - React Query: key `["sky-catalog", source, groups.join(",")]`; `staleTime` GP ~1h / SATCAT ~24h; `retry:1`.
- **Gate:** Live toggle on a local `VITE_STATIC_API=1 npm run preview` loads thousands of real objects
  with correct India/China counts; failure falls back to Offline with the calm notice.

## 9.5 Wave 3 — Performance (one agent; depends on E producing big sets)
| Agent | Mission | Owns | Tasks |
|---|---|---|---|
| **G · Field/perf** | "Move SGP4 to a Web Worker; density + time controls (renderer side)." | `propagate.worker.ts`, `propagate.ts`, `SatelliteField.tsx` | PERF-1, PERF-2(renderer), PERF-3(renderer) |

- Worker wiring (Vite): `new Worker(new URL("./propagate.worker.ts", import.meta.url), { type: "module" })`;
  transfer positions: `postMessage(msg, [buffer])`. Keep `satellite.js` imported **only** inside the
  worker + `propagate.ts` (lazy chunk) — never eager (bundle budget).
- The **UI** for density/time (selectors) is added by **F** in `SkyToolbar`/`SkyRoute` using the prop
  contract from Wave 0 → G and F meet at the contract, no shared-file edit.
- **Gate:** 5–6k instances ≥60fps; no main-thread long task >50ms; reduced-motion = one static frame.

## 9.6 Wave 4 — Feature set (Sky integration agent F continues + 1 panel agent in parallel)
| Agent | Mission | Owns | Tasks |
|---|---|---|---|
| **F (cont.)** | "Country/cloud filters w/ counts; debris-cloud chips; notable quick-pick; ISRO view; density/time UI." | `SkyRoute.tsx`, `SkyToolbar.tsx`, `sky-data.ts`, `SkyStage.tsx` | FEAT-1, FEAT-2(UI), FEAT-3(UI), FEAT-5, PERF-2/3(UI) |
| **H · Panel/facts** | "Accurate per-object facts from SATCAT + derived orbit facts." | `ObjectPanel.tsx`, derive helpers in `propagate.ts` (read-only w/ G via separate exports) | FEAT-4 |
| **E (cont.)** | "Fetch the 4 named debris-cloud groups; tag `cloud`; resolve notable NORADs." | `liveCatalog.ts` | FEAT-2(data), FEAT-3(data) |

- F and H touch different files → parallel OK. E adds data the others consume.
- **Coordination:** if both G and H need helpers in `propagate.ts`, H adds *new exported functions*
  (period/altitude/velocity from satrec) in a clearly separate block; G owns the worker/fill path.
  Agree on this split in the kickoff message to avoid a `propagate.ts` clash (or move H's helpers to a
  new `orbitFacts.ts` to be 100% safe — **recommended**).

## 9.7 Wave 5 — Stretch: live conjunction screening (1 agent; optional, after Wave 4)
| Agent | Mission | Owns | Tasks |
|---|---|---|---|
| **I · Live screening** | "Client-side close-approach screen for a selected primary; simplified Pc; worker." | `frontend/src/lib/conjunction/clientScreen.ts` (+ its worker), small hook in `ObjectPanel.tsx` | LIVE-CA-1 |
- Only touches a new module + a tiny `ObjectPanel` addition (coordinate the one insertion point with H,
  or expose a `<LiveApproaches objectId>` component H slots in).

## 9.8 Wave 6 — Integration, verify, screenshots (ONE agent, sequential)
1. Merge all branches in order: **A,B,C,D → E → F/G → H,E(feat) → I.** `tsc`+tests after each.
2. Run the full gate (Part 8 "Verify"): `npx tsc -b`, `npx vitest run`, Playwright (journey/a11y/visual),
   `npm run build`, `npm run size`, **real-GPU flash probe (0% black)**.
3. Capture screenshots: `/` (zoomed hero, no zoom buttons), `/sky` Live with India + China counts,
   thousands of objects, a selected debris cloud, an object facts panel.
4. Run a `code-reviewer` subagent over the merged diff against this plan + the honesty guardrail.
5. Report; **await owner go-ahead before any Netlify deploy.**

## 9.9 Dependency graph (text)
```
Wave0 (contracts)
  ├─▶ A (zoom)        ┐
  ├─▶ B (proxy)       ├─ parallel ─▶ merge
  ├─▶ C (owners+bake) ┘                 │
  └─▶ D (stars) ──────────────────────▶ │
                                        ▼
                         E (live client)  ◀── needs B(proxy)+C(owners)
                                        │
                                        ▼
                      F (sky integration) + G (worker/perf)   ◀── meet at Wave-0 prop contract
                                        │
                                        ▼
                 Wave4 features: F(cont) ∥ H(panel) ∥ E(debris data)
                                        │
                                        ▼
                          Wave5 I (live screening, optional)
                                        │
                                        ▼
                          Wave6 integration + verify + review
```

## 9.10 Parallelism rules (give these verbatim to every subagent)
- **Only edit the files in your "Owns" list.** If you think you need another file, STOP and report —
  don't edit a hot file another agent owns.
- **Code against the Wave-0 contracts** (types/stubs); never change a shared signature unilaterally.
- Add new exports/components instead of rewriting shared functions where possible.
- Keep `satellite.js` + workers in the lazy 3D chunk (`components/earth/**`) — never import from eager
  route code (bundle budget; see `propagate.ts` header).
- After your task: run `npx tsc -b` and any tests touching your files; report file list + acceptance.
- **Never deploy.** Integration/verify/deploy is Wave 6 only, on owner go-ahead.

## 9.11 Solo fallback (if not using parallel subagents)
Linear order, smallest-risk first: **HERO-1..5 → SKY-1 → ACC-1(owners) → ACC-3(bake) → SKY-2 →
SKY-3 → PERF-1 → PERF-2/3 → FEAT-1 → FEAT-2 → FEAT-3/4/5 → STARS-1 → (LIVE-CA-1) → verify.**
Commit after each task; run `tsc`+tests; never batch unrelated tasks in one commit.

## 9.12 How to dispatch (orchestrator quick-reference)
- Wave 1: send **one message with 4 `Task` calls** (`generalPurpose`, `run_in_background: true`), each
  given its row from 9.3 + the §9.10 rules + the Wave-0 commit to fork from (own worktree). Relevant
  skills: `dispatching-parallel-agents`, `using-git-worktrees`, `subagent-driven-development`.
- Waves 2–5: dispatch per the tables; respect the single-writer rule on hot files.
- Between waves: a short integration/`tsc`/test checkpoint before fanning out the next wave.

---

# Part 10 — Clarity & first-timer UX (make it instantly understandable)

> The owner's feedback: the site is still hard to understand for a non-expert. Root problem (from the
> code): OrbitGuard is secretly a **linear story — See → Spot → Solve → Prove** — but the nav presents
> it as disconnected, metaphor-y labels (`Sky · Threats · Safe Move · Report · Under the hood`,
> `AppShell.tsx` L13–24) with **no sense of sequence or "what do I do next."** That arc is only revealed
> by the **opt-in** tour (`GuidedTour.tsx` STOPS L9–35), which most users never open. The good news:
> the building blocks already exist — `ModeProvider`/`useMode` (Simple is the **default**, per
> `e2e/journey.spec.ts` L63), the `Term` jargon-tooltip, and the Learn/Glossary route. This part makes
> the story **legible without the tour** and enforces plain-first language everywhere.

### Principles (apply to every screen)
1. **One job per screen**, stated in one sentence at the top.
2. **Show the answer first**, details on demand (progressive disclosure). Lead with the takeaway, not the math.
3. **Plain words first, jargon second** (jargon only via `Term` tooltip or Pro mode).
4. **Always show "where am I / what's next"** in the core flow.
5. **One controlled vocabulary** — the same plain word for the same concept on every route.
6. **The new Sky power (Parts 2–6) must stay behind disclosure** so first-timers see a clean scene, not a cockpit.

### Controlled vocabulary (use EXACTLY these; Pro mode may show the technical term in parentheses)
| Concept | Simple (default, lead with this) | Pro / tooltip |
|---|---|---|
| conjunction | **close approach** | conjunction |
| time of closest approach | **closest moment** | TCA |
| miss distance | **how close they pass** | miss distance |
| relative velocity | **closing speed** | relative velocity |
| collision probability (Pc) | **chance of a crash** | Pc (collision probability) |
| delta-v / burn / maneuver | **small nudge** | Δv burn (maneuver) |
| secondary screening | **double-check** | secondary screening |
| catalog object | **tracked object** | catalog object (NORAD id) |
| debris / rocket body | **space junk** | debris / rocket body |
| SGP4 propagation | **where it will be** | SGP4 propagation |
| RAAN / inclination / arg-of-perigee | *(Pro only — never in Simple)* | raw orbital elements |

### Tasks
**CLR-1 — Make the See→Spot→Solve→Prove flow visible (orientation)**
- What: add a lightweight **step indicator** shown ONLY on the four core-flow routes (`/sky`,`/threats`,
  `/avoidance`,`/report`): "Step 1 of 4 · See the sky → next: Spot the danger". Add one-word **sublabels**
  to the desktop nav chapters so the sequence reads at a glance (e.g. `Sky` "see", `Threats` "spot",
  `Safe Move` "solve", `Report` "prove"); visually group the secondary `Learn`/`Under the hood` cluster.
- Files: `frontend/src/app/AppShell.tsx` (CHAPTERS get a `subtitle`/`step`; render sublabels + grouping),
  new `frontend/src/components/ui/FlowStepper.tsx` (the per-route indicator), and a one-line mount in the
  four core routes' intro (see CLR-2).
- Acceptance: a new user can see the app is a 4-step flow and what the next step is, **without** opening
  the tour. Nav clearly separates the 4 story steps from the 2 utility links.

**CLR-2 — One "purpose header" per route (`RouteIntro`)**
- What: a standard `RouteIntro` = eyebrow (step, on core routes) · **H1** · **one plain sentence** of
  purpose · **one primary action** · optional "next step" link. Put it at the top of every route so each
  screen answers "what is this / what do I do" in <5 seconds. Replace ad-hoc headers.
- Files: new `frontend/src/components/ui/RouteIntro.tsx`; adopt in `SkyRoute.tsx`, `ThreatsRoute.tsx`,
  `ThreatDetailRoute.tsx`, `AvoidanceRoute.tsx`, `ReportRoute.tsx`, `LearnRoute.tsx`, `SystemRoute.tsx`.
- Acceptance: every route opens with a single clear H1 + one-sentence purpose + one obvious next action.

**CLR-3 — Gentle first-visit onboarding (don't rely on the opt-in tour)**
- What: on first visit (localStorage `orbitguard.seenTour`), show a **dismissible** nudge on Home — "New
  here? Take the 60-second tour" → starts the existing `GuidedTour`. Do **not** auto-launch (respect the
  user). Keep Simple as the default mode (already is). After the tour or dismiss, never nag again.
- Files: `frontend/src/app/AppShell.tsx` or `HomeRoute.tsx` (nudge), reuse `GuidedTour.tsx`.
- Acceptance: first-time users are offered the tour once, unobtrusively; returning users aren't nagged.

**CLR-4 — Plain-first language pass (kill unexplained jargon in Simple)**
- What: audit **every user-visible string** in Simple mode against the vocabulary table; lead with the
  plain word, wrap the technical term in `Term` (tooltip) or show it only in Pro. Fix inconsistent
  synonyms (the codebase mixes "conjunction / close approach / threat / risky pass" and "Safe Move /
  avoidance / burn / nudge"). Centralize the strings so they can't drift.
- Files (sweep): `ThreatsRoute.tsx`, `ThreatRow.tsx`, `ThreatsSummary.tsx`, `ThreatDetailRoute.tsx`,
  `AvoidanceRoute.tsx`/`ThreatConfirm.tsx`/`BeforeAfterRisk.tsx`/`DoubleCheckPanel.tsx`, `ReportRoute.tsx`,
  `ObjectPanel.tsx`, `sky-data.ts` (descriptor/plainDescription), `SystemRoute.tsx`; lean on existing
  `Term` (`components/ui/Term.tsx`) + `lib/format.ts`.
- Acceptance: in Simple mode, no acronym (TCA/Pc/Δv/RAAN/SGP4) appears without a plain phrase + tooltip;
  the same concept uses the same word on every route. Add a Vitest that scans rendered Simple text for a
  banned-jargon list.

**CLR-5 — Teaching empty/loading/error states (every dead-end has a next action)**
- What: standardize a `GuidanceState` (icon · one plain line · one primary button). Apply to: `/report`
  before a report exists (`ReportEmptyState.tsx`), `/avoidance` before a threat is chosen, `/sky` while
  the catalog loads / when filters match nothing, `/threats` empty. Each tells the user exactly what to do.
- Files: new/extend `frontend/src/components/ui/` empty-state atom; `ReportEmptyState.tsx`, `AvoidanceRoute.tsx`,
  `SkyRoute.tsx`/`SkyStage.tsx`, `ThreatsRoute.tsx`.
- Acceptance: no screen ever shows a blank/confusing state without a clear next step.

**CLR-6 — Keep the (now much more powerful) Sky simple by default**
- What: Simple Sky = a clean scene: explore + click an object → plain panel. **Move the new advanced
  controls — filters, country/cloud, density, time-scale, Live toggle (Parts 2–6) — behind a single
  "Filters / Advanced" disclosure** (open by default only in Pro). The globe and "click to learn" must
  read instantly for a first-timer; power is opt-in.
- Files: `SkyToolbar.tsx` (collapse advanced controls into a disclosure), `SkyRoute.tsx` (default-collapsed
  in Simple). Coordinate with Part-5 FEAT tasks (same files → same owner; see sequencing below).
- Acceptance: first paint of `/sky` in Simple mode shows a clean globe + a one-line hint + a single
  "Filters" button; opening it reveals the full power. Pro mode shows controls expanded.

**CLR-7 — Mode toggle clarity**
- What: label the header toggle "Detail: Simple / Pro" with a tooltip ("Simple = plain language;
  Pro = full technical detail"); keep Simple default; persist the choice (already via `ModeProvider`).
- Files: `AppShell.tsx`, `components/ui/Switch.tsx`/`ModeProvider.tsx` (label/tooltip only).
- Acceptance: a first-timer understands what the toggle does before clicking it.

**CLR-8 — Consistent 3D affordances + iconography**
- What: consistent, quiet hints across the scene ("drag to rotate" on hero/sky; "click any glowing
  object" on sky); consistent icons/tone for the same action everywhere. No conflicting overlays
  (de-conflict the tour card vs the globe controls — also noted in plan 07 P1).
- Files: `SceneControlsOverlay.tsx`, `SkyStage.tsx`, `GuidedTour.tsx`.
- Acceptance: the same action looks/reads the same on every screen; no overlapping controls.

### How Part 10 slots into the Part 9 waves (avoid hot-file clashes)
Clarity touches broad files, several of which the Sky agents own — so split it by dependency:
- **Early, independent (Wave 1, its own agent "J · Clarity-core"):** CLR-1 (`AppShell.tsx`, new
  `FlowStepper.tsx`), CLR-2 (new `RouteIntro.tsx`), CLR-3 (nudge), CLR-7 (toggle label). These touch
  `AppShell.tsx` + new components — **no Sky-data file** — so they're safe alongside Wave-1 agents A/B/C/D
  (none of which own `AppShell.tsx`).
- **Late, after features land (Wave 4.5, agent "K · Clarity-sweep"):** CLR-4 (plain-language sweep across
  route files), CLR-5 (empty states), CLR-6 (Sky disclosure), CLR-8 (affordances). Run **after** Parts
  2–6 so it polishes the final copy/controls rather than fighting feature edits. CLR-6 shares
  `SkyToolbar.tsx`/`SkyRoute.tsx` with agent F → **fold CLR-6 into agent F** (single writer) or run K
  strictly after F merges.
- Adopting `RouteIntro` in each route (CLR-2) is a one-line mount per route → have each route's owning
  agent add it, or do it in the Wave-6 integration pass to avoid touching their files mid-flight.

### Implementation guardrails — keep the green suite green (READ FIRST)
> These come from the actual test files (verified against the current tree: `npm test` 82 pass, `tsc -b`
> clean). Part 10 touches nav, headers, the mode toggle, and the Sky toolbar — all of which existing
> tests assert on. Follow each rule or the suite goes red. Cite the file when you change it.

- **CLR-1 nav sublabels MUST be `aria-hidden="true"`.** `e2e/tour.spec.ts` selects the nav with
  `getByRole("link", { name: "Threats", exact: true })`. If a "spot" sublabel sits inside the same
  `<a>` without `aria-hidden`, the accessible name becomes "Threats spot" and the exact match breaks.
  Render the one-word step sublabel in an `aria-hidden` span so the link's accessible name stays the
  bare chapter word. Keep the header **"Tour"** button label unchanged (tour.spec clicks
  `getByRole("button",{name:"Tour"})`).
- **CLR-6: do NOT call `useMode()` inside `SkyToolbar`.** `SkyToolbar.rtl.test.tsx` renders the toolbar
  wrapped in `TooltipProvider` only — no `ModeProvider` — so `useMode()` throws "must be used within a
  ModeProvider". Pass the default expand state in as a prop from `SkyRoute` (e.g. `advancedDefaultOpen={isPro}`),
  and keep a local `expanded` state in the toolbar.
- **CLR-6 collapse breaks 3 existing specs — update them in the same change (single owner):**
  - `e2e/sky.spec.ts` drives `getByLabel("Filter by type" | "Filter by country" | "Filter by debris cloud" | "Pick a notable object").selectOption(...)`. Collapsed selects aren't actionable → add one line to open the disclosure first (`await page.getByRole("button",{name:/filters/i}).click()`), or assert from Pro.
  - `e2e/static-sky.spec.ts` uses `getByLabel(/data source/i)` (the Live source select) → same: open Filters first.
  - `SkyToolbar.rtl.test.tsx` asserts the data-source combobox + the country/cloud options render → open the disclosure in the test (click "Filters") before the assertions, or render with `advancedDefaultOpen`.
  - **Keep these `<select>` accessible labels byte-identical** (tests query them verbatim): `"Filter by type"`, `"Filter by owner"`, `"Filter by country"`, `"Filter by orbit"`, `"Filter by debris cloud"`, `"Data source"`, `"Render density"`, `"Propagation speed"`, `"Pick a notable object"`. Also preserve the count chip `data-testid="sky-count-chip"` and `data-testid="sky-band-legend"`.
- **CLR-2 RouteIntro: exactly one `<h1>` per route, and Sky stays headless.** `e2e/journey.spec.ts`
  counts `getByRole("heading",{level:1})` **+** `[data-webgl]` and needs ≥1 per route. Every non-Sky route
  must keep a single h1 (reuse `PageHeader`, which renders the h1 — don't add a second). `/sky` is allowed
  to have **no** h1 because it has the `[data-webgl]` scene — keep its intro to a slim one-line hint/FlowStepper,
  not a big header (also satisfies CLR-6's "clean first paint").
- **CLR-1 FlowStepper is not a heading.** Render it as a `nav`/`ol` with an `aria-label` (e.g. "Workflow
  progress"), never as `<h1>/<h2>`, so it doesn't fight the route's single h1 or screen-reader landmarks.
- **CLR-7 mode toggle must stay `role="switch"`.** `journey.spec.ts` flips it via
  `getByRole("switch").first()` and asserts `<html data-mode>` persists. Add the "Detail: Simple / Pro"
  label + tooltip around the existing Radix `Switch` — do not replace the switch element or remove the
  `orbitguard.mode` persistence in `ModeProvider`.
- **CLR-3 nudge must not regress the hero.** `e2e/earth.spec.ts` asserts on `/` that there are **zero**
  "zoom in" buttons and that "drag to rotate" is visible. Place the first-visit nudge so it doesn't add a
  zoom control or cover the hint; gate it on `localStorage["orbitguard.seenTour"]`, dismissible, never
  auto-launch, and write the key on dismiss/tour-finish so returning users aren't nagged.
- **CLR-4 language pass must not leak bare jargon in Simple.** `e2e/demo-gate.spec.ts` ("Simple keeps the
  avoidance story jargon-free") fails if TCA/Pc/Δv/RAAN/SGP4 render unwrapped in Simple. Lead with the
  plain word; wrap the technical term in the existing `Term` component or show it only in Pro.
- **Mechanical reuse, don't reinvent:** the atoms already exist — `PageHeader`, `Disclosure`/`ShowDetails`,
  `EmptyState`, `ErrorState`, `LoadingState`, `Term`, `Tooltip`, `Steps`, `ModeToggle`. Build `FlowStepper`
  + `RouteIntro` on top of these and export both from `components/ui/index.ts`.
- **Gate before declaring done (no push):** `npx tsc -b`; `npm test`; full Playwright; static Playwright
  (`VITE_STATIC_API=1`); `npm run build && npm run size` in **both** default and `VITE_STATIC_API=1`; `npm run lhci`.
  Add a journey assertion that the FlowStepper + RouteIntro render on a core route, and a Vitest that scans
  Simple-mode rendered text for the banned-acronym list (CLR-4 acceptance).

### Usability acceptance (the real test)
- **5-second test:** show Home to someone non-technical → can they say what the product does?
- **Unaided task:** "find a risky close approach, make it safe, and open the proof" — can they complete
  See→Spot→Solve→Prove **without** the tour? Time it; fix the first place they hesitate.
- **Jargon scan (automated):** Vitest asserts no banned acronym renders in Simple mode (CLR-4).
- Keep the Playwright a11y/journey/visual suite green; add a journey assertion for the FlowStepper + RouteIntro.
