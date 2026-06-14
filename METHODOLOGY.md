# OrbitGuard Methodology

> How OrbitGuard turns public orbital data into an explainable collision-avoidance
> decision — and exactly where the model is real versus where it is a transparent
> demo assumption.

## Principle

OrbitGuard should be impressive without pretending to be an operational space-traffic
authority. The methods are standard, the math is real, and every simplifying assumption
is surfaced in the product itself (Pro mode + the report's *Limitations* section).
**Accuracy over marketing.** Where the science is approximated for a reliable hackathon
demo, this document says so plainly and points at the code.

Everything below is grounded in the committed backend (`backend/app/engines/**`,
`backend/app/services/**`, `backend/app/models/**`) and the deterministic fixtures in
`data/**`. The hero numbers cited are the *actual* committed outputs (see
`frontend/public/api-static/**`).

---

## 1. Data & Propagation

### Catalogs

- **Hero / decision pipeline** runs on a small committed fixture catalog,
  `data/catalogs/demo-protect-isro.json` (`catalog_id: demo-protect-isro`, 4 objects):
  `CARTOSAT-2F` (`isro-cartosat-2f`, NORAD 43111, ISRO, LEO), `Demo Debris Object 001`
  (`debris-demo-001`, NORAD 99001), `RISAT-2BR1` (`isro-risat-2br1`, NORAD 44804), and a
  `Sentinel Comparison` object (`sentinel-comparison-demo`, NORAD 99002). Each carries a
  real two-line element set (`TleRecord.line1` / `line2`).
- **"See everything in orbit" Sky view** renders ~**500** objects from a committed
  CelesTrak `active` snapshot (`frontend/public/data/catalog-sky.json`,
  `source: celestrak-active`; bands LEO 198 / MEO 86 / GEO 198 / HEO 18). This is a static,
  offline-safe asset — the runtime never calls CelesTrak. An optional live refresh exists
  (`/api/catalogs/live/refresh`) but is disabled in the static deploy.

### Propagation

- **Backend:** SGP4 via the Python `sgp4` package (`PropagationEngine`).
  `Satrec.twoline2rv(line1, line2)` builds the satellite record; `satrec.sgp4(jd, fraction)`
  (time via `jday`) returns a TEME state vector. Each `StateVector` carries
  `position_km` and `velocity_km_s` at an ISO-8601 UTC `timestamp_utc`.
- **Browser (Sky cloud):** SGP4 via `satellite.js` (`frontend/src/components/earth/propagate.ts`),
  so hundreds of objects propagate live in the 3D scene. TEME ECI `(x, y, z)` is mapped to
  scene space `(x, z, −y)` (a −90° rotation about X to put the orbital north pole on the
  scene's up axis). Radius is **log-compressed** (`sceneRadiusFromGeocentricKm`, Earth
  radius = 1.5 scene units) so LEO hugs the globe while GEO stays in frame. **Orbit geometry
  in the scene is visual, not GIS-accurate** — it is correct *relative* structure, deliberately
  scaled for legibility.
- **Time grid:** `PropagationEngine.build_time_grid(start, end, step_seconds)` produces a
  uniform sample grid. Defaults: `start = 2026-06-13T00:00:00Z`, window = 600 s, capped at
  `MAX_TIME_GRID_SAMPLES = 720`. The hero conjunction is screened at `step_seconds = 10`.

### Determinism / offline design

Every demo response is a pure function of committed fixtures, so the Protect ISRO flow is
byte-for-byte reproducible with no network. The whole API is pre-baked to static JSON
(`frontend/public/api-static/**`, keyed by HTTP method + path) and a `VITE_STATIC_API`
build reads those files directly — the production (Netlify) site runs with **no server**.

---

## 2. Conjunction Screening

Implemented in `ConjunctionEngine.screen_protagonist` with `ScreeningConfig`.

1. **Protagonist-vs-catalog.** The protected object is propagated against **every** other
   object in the catalog on a shared SGP4 time grid. *(There is no orbit-class/category
   pre-filter — every catalog object is a candidate.)*
2. **Closest-approach search (`refine_tca`).** For each pair, OrbitGuard takes the relative
   position at every common time sample and keeps the sample with the **minimum separation**.
   `TcaResult` records `timestamp_utc` (TCA), `miss_distance_m = |Δr|`, and
   `relative_velocity_km_s = |Δv|`. Resolution is therefore set by the grid step (10 s for the
   hero); there is **no sub-sample interpolation** — a smaller step is the way to refine TCA.
3. **Distance gate.** A pair is discarded if its best miss distance exceeds
   `coarse_threshold_m` (default **50,000 m**). This is a *distance* gate, not a coarse-time pass.
4. **Metrics produced per conjunction (`RiskMetrics` + `ConjunctionDetail`):** `tca_utc`, `pc`,
   `miss_distance_m`, `relative_velocity_km_s`, `severity`, plus the relative
   position/velocity vectors and a 2D `encounter_plane`.

### Hero conjunction `conj-protect-isro-001` (real SGP4 output)

`CARTOSAT-2F` vs `Demo Debris Object 001`:

| Field | Value |
| --- | --- |
| `tca_utc` | `2026-06-13T00:00:00Z` |
| `miss_distance_m` | **611.76 m** (~612 m) |
| `pc` | **2.779e-4** |
| `relative_velocity_km_s` | **0.00066** (~0.66 m/s) |
| `severity` / `status` | `critical` / `requires-copilot-review` |

> **Honest note on the geometry.** The two hero TLEs are deliberately near-**co-orbital**
> (their lines differ only by a tiny mean-anomaly offset), so the closing speed is *low*
> (~0.66 m/s). This makes a clean, repeatable 612 m approach for the demo, but it is **not**
> representative of a typical hyper-velocity debris conjunction (km/s). The 2009-replay and
> Kessler fixtures use realistic closing speeds (11.7 km/s and 7.2 km/s) precisely to show
> that contrast. The UI labels this hero speed as "slow (≈ 0.7 m/s)".

---

## 3. Collision Probability (Pc)

Implemented in `CollisionProbabilityEngine.estimate_pc`
(`method: "2d-gaussian-small-hard-body-radius-approximation"`).

### Encounter plane

`build_encounter_plane` projects the relative position onto the plane perpendicular to the
relative velocity and returns the **perpendicular miss** as `encounter_x_m`, with
`encounter_y_m` forced to `0`. So Pc reduces to a **1D radial miss against an isotropic 2D
Gaussian** (degenerate relative velocity falls back to inertial x/y, with a recorded warning).

### Formula

With combined encounter-plane covariance `σx, σy` and hard-body radius `R`:

```text
Pc = ( R² / (2·σx·σy) ) · exp( −0.5·( (x/σx)² + (y/σy)² ) )
```

This is the standard **small-hard-body / point-probability** approximation: the area of the
combined hard-body disc (πR²) times the Gaussian density evaluated at the miss vector. Pc is
clamped to `[0, 1]`.

### Covariance assumptions (`CovarianceModel`)

Public TLEs carry **no covariance**, so OrbitGuard uses a documented, inspectable model. The
default (`tle-demo-isotropic-300m`):

- `sigma_x_m = sigma_y_m = 300.0` (isotropic, *combined* position uncertainty),
- `hard_body_radius_m = 20.0`,
- `source = "Round 1 documented TLE covariance assumption"`.

For the hero, `encounter_x_m ≈ 611.76 m` ⇒ `Pc = 2.779e-4`.

### Severity classification (`classify_risk`)

Severity is the worse of the Pc band and the miss-distance band:

| Severity | Trigger | Status |
| --- | --- | --- |
| `critical` | `Pc ≥ 1e-4` **or** miss ≤ 1,000 m | `requires-copilot-review` |
| `warning` | `Pc ≥ 1e-5` **or** miss ≤ 5,000 m | `monitor-closely` |
| `watch` | `Pc ≥ 1e-6` **or** miss ≤ 25,000 m | `watch` |
| `nominal` | otherwise | `screened` |

Ranking (`rank_conjunctions`): severity first, then smallest miss distance, then earliest TCA.

---

## 4. Maneuver Planning

Implemented in `ManeuverPlannerEngine.plan`, constrained by `ManeuverConstraints`.

### Candidate generation

A deterministic grid of small **impulsive along-track** burns:

- **Lead times:** 14,400 / 10,800 / 7,200 s = **4 h / 3 h / 2 h** before TCA.
- **Δv grid:** **0.04, 0.08, 0.12, 0.20, 0.35, 0.50 m/s**.
- **Direction:** `along-track-prograde` only.
- ⇒ **18 candidates** (3 leads × 6 Δv × 1 direction).

### Default constraints (`ManeuverPlanRequest`)

- `max_delta_v_m_s = 0.5`
- `safety_pc_threshold = 1e-6`
- `min_miss_distance_m = 8,000` (8 km)

### Post-burn surrogate (transparent Round-1 approximation)

Rather than re-propagating the burned orbit, the planner uses a documented **lead-time
surrogate** for the miss-distance gain (`score_candidate`):

```text
Δmiss = sign · Δv · lead_time_s · 4.5      # lead_time_gain_factor = 4.5
miss_after = max(0, encounter_x_m + Δmiss)
```

Pc is then **recomputed with the same `CovarianceModel`** as the pre-burn conjunction. A
candidate is *viable* only if it reduces Pc **and** miss distance, keeps Pc below
`safety_pc_threshold`, **and** clears `min_miss_distance_m` (`_rejection_reasons`).

### Selection & scoring

Among viable candidates, selection prefers **smallest Δv, then longest lead time, then lowest
Pc** (`select_recommendation`). A separate composite score is reported for context:
`score = 0.55·pc_reduction + 0.25·clearance + 0.20·fuel_economy`. The plan returns the
recommendation plus up to four ranked alternatives (`mnv-<slug>-a … -e`).

### Hero recommendation `mnv-protect-isro-a` (real committed output)

- **0.12 m/s along-track-prograde, 4 h before TCA**, `score = 0.952`.
- Miss distance **611.8 m → 8,387.8 m (≈ 8.39 km)**.
- Pc **2.779e-4 → 3.973e-173** (effectively zero under the documented covariance).
- Why not 0.04/0.08 m/s? They reduce Pc but fall short of the 8 km clearance floor and are
  rejected (`miss-distance-below-clearance-threshold`); 0.12 m/s is the smallest Δv that clears it.

---

## 5. Secondary Screening ("the double-check")

Implemented in `SecondaryRiskEngine.classify`. A maneuver that clears the primary conjunction
but creates a **new** critical conjunction is unacceptable, so every applied burn is re-screened.

Round 1 uses deterministic, candidate-keyed fixtures in
`data/secondary-screening/protect-isro.json` (3 screened objects):

| Candidate | Result | Why |
| --- | --- | --- |
| `mnv-protect-isro-a` | **clear** | No new conjunctions (the hero path). |
| `mnv-protect-isro-high-fuel-watch` | **watch** | Drifts near `sentinel-comparison-demo` (Pc 3.2e-6, miss 14.5 km). |
| `mnv-protect-isro-risk-demo` | **blocked** | Introduces a new **critical** approach with RISAT-2BR1 (Pc 1.2e-4, miss 820 m). |

Status is normalized from the worst concern (`critical → blocked`, `warning → warning`,
`watch → watch`). Crucially, a **missing** fixture is treated as `warning` / incomplete — never
`clear` — so OrbitGuard never claims safety it did not check.

---

## 6. Plain-English Report

`ReportService` assembles `report-protect-isro-001` strictly from computed metrics. It contains:

- **`source_ids`** — full audit trail: `scenario-run-protect-isro-001`, `conj-protect-isro-001`,
  `maneuver-plan-protect-isro-001`, `mnv-protect-isro-a`.
- **Sections** — *Decision*, *Risk Reduction*, *Secondary Screening*, *Audit Trail* (with TCA).
- **Limitations** — assumed covariance, the lead-time surrogate, "simulation recommendation,
  not spacecraft command authority."

The text layer only *narrates* computed values; it never invents numbers, confidence, or
authority. Exportable as a Markdown packet (`<report_id>.md`).

---

## 7. The Side Scenarios (2009 Replay & Kessler) — and a precision note

The Protect ISRO conjunction is **genuinely SGP4-computed** (response `computation_mode: "sgp4"`).
The other two demo conjunctions are **deterministic fixtures**
(`FINAL_ROUND_CONJUNCTION_FIXTURES`, served as `computation_mode: "fixture-fallback"` when live
screening finds nothing inside the threshold):

- `conj-2009-replay-001` — Iridium 33 vs Cosmos 2251: Pc 4.12e-4, miss 742.5 m, rel-vel
  **11.7 km/s** (`historical-demo-isotropic-350m`, HBR 18 m). An educational *what-if*, **not** an
  operational reconstruction of the 2009 CDM.
- `conj-kessler-sandbox-001` — policy-sat vs debris cloud: Pc 7.6e-6, miss 4,860 m, rel-vel
  **7.2 km/s** (`kessler-demo-shell-900m`, HBR 12 m). A policy/education simulator, not maneuver advice.

### The demo clock (display-only)

The fixtures pin the hero TCA to `2026-06-13T00:00:00Z`, which against a live wall clock would
read as a *past* event and contradict the future-tense narrative. The frontend applies a pure
**display** transform (`frontend/src/lib/demoClock.ts`): `DEMO_EPOCH = 2026-06-12T06:00:00Z`, and
every *displayed* live-alert timestamp is shifted by `now − DEMO_EPOCH`, so the hero approach
always reads **~18 h in the future** and counts down live. This touches **only** rendered text —
the backend, the API, the report, and the unit tests stay on the deterministic fixture instants.
(2009 / Kessler are framed as fixed calendar dates and are not rebased.)

---

## 8. Assumptions & Limitations (read me)

- **TLEs are not enough for operational Pc.** They carry no covariance; OrbitGuard substitutes a
  documented isotropic model and labels every estimate as decision support, not command authority.
- **Pc is a 1D-in-encounter-plane, small-hard-body Gaussian approximation** — no full 3D covariance
  propagation, no Monte Carlo, no time-correlated uncertainty.
- **TCA resolution = grid step.** Closest approach is the minimum over uniform SGP4 samples
  (10 s for the hero); there is no sub-sample interpolation.
- **Maneuver effect is a lead-time surrogate**, not a re-propagated post-burn trajectory; only
  along-track-prograde burns are modeled (no radial/cross-track), and mission disruption/fuel
  budgets beyond Δv are not scored.
- **Secondary screening is fixture-backed** per candidate (not a full post-burn catalog re-screen).
- **Hero geometry is near co-orbital** (low closing speed) — a deliberate, repeatable demo choice,
  not a typical conjunction profile.
- **Scene orbits are visual, not GIS-accurate** (log-compressed radius; circularized demo tracks).
- **Side scenarios are deterministic fixtures**, not live computation; the demo clock shifts only
  *displayed* live-alert times.

### What "final round" would add

Post-burn SGP4/trajectory re-propagation, full-catalog secondary re-screening, richer/anisotropic
covariance controls, multi-axis (radial + cross-track) maneuver optimization with mission-impact
scoring, and broader live-catalog screening.

---

## Judge Defense (one line)

> OrbitGuard is an open, explainable collision-avoidance **copilot prototype** that demonstrates the
> full alert → action → proof workflow using standard orbital methods (SGP4 + a transparent,
> documented Pc model), with every assumption visible and the hero case computed end-to-end.
