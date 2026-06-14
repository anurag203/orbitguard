# Route Spec — Threat detail (`/threats/:id`)

> Chapter: bridge from **Spot** (tension) → **Solve** (relief). One close approach, explained.
> **New route** — its content was previously buried in the Mission decision drawer + Risk row
> (doc 03 §2, §8). `:id` is a `conjunction_id` (e.g. `conj-protect-isro-001`).
> Obeys: doc 01, doc 02, doc 03, doc 04, doc 05, doc 07.

---

## 1. Purpose & the ONE job (Law 1)

**The one job:** explain a *single* close approach so clearly that a non-space person understands
what's wrong and how worried to be — then hand them the way out.

**The one thing to look at:** the focused mini-globe showing the two objects and the moment they
get close.

**The single primary action:** **`Plan the safe move`** → `/avoidance` (carrying this
`conjunction_id`). One glowing CTA. Everything technical hides behind "Show details".

> This page has no competing actions. "Back to threats" is a quiet ghost link; "Plan the safe move"
> is the only accent. Pc/encounter geometry are *disclosure*, not a second focal region (Law 4).

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| | |
|---|---|
| **Primary** | Non-space judge — needs the "what & how bad" in one sentence |
| **Secondary** | Technical judge — wants Pc method, covariance, encounter geometry (behind "Show details") |
| **Emotional beat** | Focused concern turning to hope — the hinge between **Tension** (Threats) and **Relief** (Avoidance), doc 01 §6 |
| **Leave with** | "I get exactly what's wrong — and there's one button to fix it." |

---

## 3. ASCII wireframe — first viewport (desktop)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD     Sky  [Threats]  Safe Move  Report     Learn  [Simple|Pro]  ▶   │
├──────────────────────────────────────────────────────────────────────────────┤
│   ← Back to threats                                                            │
│                                                                                │
│                         · ✦ ·   star field   · ✦ ·                             │
│                              ╭───────────╮                                     │
│                             ◜  ◉────✕     │   ◉ CARTOSAT-2F (cyan)             │
│                            ◜    EARTH  ↑close│  ✕ debris (red)                  │
│                             ◞    corridor   ◞│   ↑ the close-approach point     │
│                              ╰───────────╯                                     │
│                                                                                │
│         ●DANGER   CARTOSAT-2F will pass dangerously close to a piece of        │ ← the plain story
│                   debris in about 4 hours. They'll be about 600 m apart.       │   (one focal sentence)
│                                                                                │
│         How risky is it?                                                       │
│         very high  ▟▟▟▟▟▟▟▟▙░░   collision chance ≈ 1 in 3,600                  │ ← RiskMeter
│                                                                                │
│         How close ≈600 m      ·   When in ~4 h    ·   Closing speed slow       │ ← Stats
│                                                                                │
│         ▸ Show details (the math)                                              │ ← ShowDetails (collapsed)
│                                                                                │
│         ┌──────────────────────────────┐                                      │
│         │   Plan the safe move      →  │   ← ONE neon CTA → /avoidance         │
│         └──────────────────────────────┘                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

Breathing room: mini-globe up top as the hero, then a calm single column of text beneath it. No
side drawer, no metric grid of 6 boxes (the old Mission drawer). One sentence, one meter, three
stats, one disclosure, one button.

---

## 4. Section-by-section breakdown (top → bottom)

### 4.1 Back link
- Quiet `<Button variant="ghost" icon={<ArrowLeft/>}>Back to threats</Button>` → `/threats`
  (preserves `?scenario=`). Not an accent.

### 4.2 Focused mini-globe (the focal element)
- `<EarthCanvas variant="focus" primaryId={d.primary_object_id} secondaryId={d.secondary_object_id}
  encounter={d.encounter_plane} autoFrame />` (doc 07).
- Frames just the two objects + the close-approach point; primary = cyan, secondary = `--danger`,
  the corridor/closest-point marked with a risk-colored highlight. Slow auto-rotate; the closest
  point gently pulses (the live pulse).
- Smaller than Home/Sky (≈ 40–48vh), so the story text shares the first viewport.

### 4.3 The plain story (one sentence)
- A `<RiskBadge>` + one human sentence (`h1`-scale but sentence-case, Space Grotesk). This is the
  canonical doc 01 §1 sentence. Built from the detail data.

```tsx
<ThreatStory level={level}>
  <RiskBadge level={level} />
  {primaryName} will pass dangerously close to {secondaryPlain} {whenPhrase}.
  They'll be about {missPlain} apart.
</ThreatStory>
```

### 4.4 RiskMeter (`components/ui/RiskMeter`)
- A single horizontal meter: fills to the risk level, colored by `--danger/--warning/--watch/--safe`.
  Word on the left ("very high"), the "1 in N" framing on the right. The number counts up on reveal.
- Driven by `risk.severity` (band) + `risk.pc` (fill within band).

```tsx
<RiskMeter level={level} pc={d.risk.pc} mode={mode}
  label="How risky is it?"
  caption={mode === "simple" ? "collision chance ≈ 1 in 3,600" : "Pc = 2.78 × 10⁻⁴"} />
```

### 4.5 Key stats (one calm row)
- Three `<Stat>`s only: **How close**, **When**, **Closing speed**. No 6-box grid.
```tsx
<StatRow>
  <Stat label="How close" value={missPlain} />                         {/* ≈600 m */}
  <Stat label="When"      value={whenPhrase} />                        {/* in ~4 h */}
  <Stat label="Closing speed" value={speedPlain}
        hint={<Term k="relative-velocity">how fast they approach</Term>} />
</StatRow>
```

### 4.6 ShowDetails — "the math" (`components/ui/ShowDetails`, collapsed)
- All Pro/technical content lives here (Law 4). Reveals the Pc method + margin-of-error model +
  encounter geometry, each row a Pro label with a plain hint. Maps 1:1 to `ConjunctionDetail`:

| Shown label (Pro) | Plain hint | From `ConjunctionDetail` field |
|---|---|---|
| Collision probability `Pc` | "collision chance" | `risk.pc` / `pc_estimate.pc` |
| Closest approach distance | "how close" | `risk.miss_distance_m` |
| Time of closest approach (TCA) | "when they're nearest" | `tca_utc` |
| Relative velocity | "closing speed" | `risk.relative_velocity_km_s` |
| Pc method | "how we estimated the chance" | `pc_estimate.method` |
| Margin of error (σx, σy) | "how unsure we are about positions" | `pc_estimate.covariance.sigma_x_m`, `sigma_y_m` |
| Hard-body radius | "combined size used for contact" | `pc_estimate.covariance.hard_body_radius_m` |
| Covariance model | "the uncertainty model used" | `pc_estimate.covariance.model_id`, `.source` |
| Encounter geometry | "their positions at the close moment" | `encounter_plane[]`, `relative_position_m` |
| Assumptions / Warnings | shown verbatim (honesty, doc 01 anti-goals) | `pc_estimate.assumptions`, `.warnings`, `assumptions` |

```tsx
<ShowDetails label="Show details (the math)">
  <DataPair term="pc"        label="Collision probability">2.78 × 10⁻⁴ (≈ 1 in 3,600)</DataPair>
  <DataPair term="miss-distance" label="Closest approach">611.8 m</DataPair>
  <DataPair term="tca"       label="Closest approach (time)">{formatTcaUtc(d.tca_utc)}</DataPair>
  <DataPair term="relative-velocity" label="Closing speed">0.7 m/s</DataPair>
  <DataPair label="Method">{d.pc_estimate.method}</DataPair>
  <DataPair term="covariance" label="Margin of error (σ)">
    σx {d.pc_estimate.covariance.sigma_x_m} m · σy {d.pc_estimate.covariance.sigma_y_m} m
  </DataPair>
  <DataPair label="Hard-body radius">{d.pc_estimate.covariance.hard_body_radius_m} m</DataPair>
  <DataPair label="Uncertainty model">{d.pc_estimate.covariance.model_id}</DataPair>
  <EncounterPlot points={d.encounter_plane} />
  <Notes assumptions={d.assumptions} warnings={d.pc_estimate.warnings} />
</ShowDetails>
```

Worked example with real fixture values (2009 replay — fully specified in code):
```text
Collision probability  Pc = 4.12 × 10⁻⁴ (≈ 1 in 2,400)
Closest approach       742.5 m
Closing speed          11.7 km/s
Method                 fixture-backed-2d-gaussian-small-hard-body-radius-approximation
Margin of error (σ)    σx 350 m · σy 350 m
Hard-body radius       18 m
Uncertainty model      historical-demo-isotropic-350m  (committed final-round replay fixture)
Note                   Historical replay is educational, not an operational reconstruction.
```

### 4.7 Primary CTA
- `<Button variant="primary" size="lg" glow to={`/avoidance?conjunction=${id}`}>Plan the safe
  move →</Button>`. The single accent on the page; routes into Solve carrying the conjunction.

### 4.8 Data hooks (`features/`) → real endpoints (`api.ts`)
| Hook | Backend call | Feeds |
|---|---|---|
| `useThreatDetail(id)` | `GET /api/conjunctions/:id` | Everything: `risk`, `tca_utc`, `pc_estimate`, `covariance`, `encounter_plane`, `relative_position_m`, `assumptions` |
| `useScenarioRun(scenarioId)` | `POST /api/scenarios/:id/run` | Friendly names for primary/secondary IDs |
| `useCatalog()` *(or scenario run)* | `GET /api/catalogs/full` | Plain descriptor for the secondary ("a piece of debris") |
| `usePlanManeuver(id)` *(prefetch)* | `POST /api/maneuvers/plan` | Prefetch on CTA hover so `/avoidance` opens with the plan ready |

Notes:
- `id` comes from the route param; `useThreatDetail` (`queryKey:["threat",id]`, `staleTime:60s`,
  doc 04 §5.1). Deep links cold-boot (doc 03 §7).
- The scenario for name-resolution is inferred from the id prefix
  (`conj-protect-isro-001` → `protect-isro`) matching backend `_request_for_known_conjunction`.

---

## 5. Plain-language copy (real strings)

```text
Back:      ← Back to threats

— Hero (conj-protect-isro-001) —  DANGER
Story:     CARTOSAT-2F will pass dangerously close to a piece of debris in about 4 hours.
           They'll be about 600 m apart.
RiskMeter: How risky is it?   very high   ·   collision chance ≈ 1 in 3,600
Stats:     How close ≈ 600 m   ·   When in about 4 hours   ·   Closing speed slow (≈ 0.7 m/s)
Disclose:  ▸ Show details (the math)
CTA:       Plan the safe move  →

— 2009 Replay (conj-2009-replay-001) —  DANGER
Story:     Iridium 33 and Cosmos 2251 came within about 740 m of each other — the real 2009
           collision, replayed so you can see how avoidance would have worked.
RiskMeter: very high · collision chance ≈ 1 in 2,400
Stats:     How close ≈ 740 m · When 10 Feb 2026, 16:56 UTC · Closing speed fast (11.7 km/s)
CTA:       Plan the safe move  →

— Kessler Sandbox (conj-kessler-sandbox-001) —  WARNING
Story:     A policy satellite passes about 4.9 km from a debris cloud — close enough to watch
           as debris builds up, but not urgent.
RiskMeter: low · collision chance ≈ 1 in 130,000
Stats:     How close ≈ 4.9 km · When 13 Jun 2026, 02:30 UTC · Closing speed 7.2 km/s
CTA:       Plan the safe move  →   (education-mode note shown: this scenario teaches, no live burn)
```

Jargon via `<Term>`: `<Term k="conjunction">close approach</Term>`,
`<Term k="pc">collision chance</Term>`, `<Term k="tca">closest approach (time)</Term>`,
`<Term k="relative-velocity">closing speed</Term>`, `<Term k="covariance">margin of error</Term>`.

Helpers: `missPlain` (≥1 km → "≈ X km", else "≈ N00 m" rounded); `speedPlain`
(<0.1 km/s → "slow (≈ 0.7 m/s)", else "fast (X km/s)"); `whenPhrase` (future→"in about 4 hours",
past→absolute date).

---

## 6. Simple vs Pro differences

| Element | Simple (default) | Pro |
|---|---|---|
| Story sentence | plain ("about 600 m apart") | same sentence, exact figure ("611.8 m apart") |
| RiskMeter caption | "collision chance ≈ 1 in 3,600" | "Pc = 2.78 × 10⁻⁴" |
| Closing speed stat | "slow" / "fast" word | exact: "0.7 m/s" / "11.7 km/s" |
| "Show details" | collapsed; opens to plain-labelled rows | **expanded by default**; shows σ, hard-body radius, covariance model_id, method string, encounter plot, raw assumptions/warnings |
| Encounter geometry | hidden | `<EncounterPlot>` from `encounter_plane` + `relative_position_m` vector |
| IDs | hidden | shows `conjunction_id`, `covariance.source` for audit |

Pro never changes the layout or the single CTA — it only deepens "Show details" and exacts the
numbers. Mode from `missionStore.mode`.

---

## 7. Loading / empty / error states (doc 03 §5)

| State | Trigger | Treatment & copy |
|---|---|---|
| **Loading** | `useThreatDetail` pending | Mini-globe frame + `<Skeleton>` for story line, meter, and stats. Plain line: "Loading this close approach…". No "acquiring corridor" copy. |
| **Not found** | `:id` unknown → API 404 (`conjunction_not_found`) | `<EmptyState>`: "We couldn't find that close approach. [Back to threats]". (Typed `ApiError` from `lib/api.ts`, doc 04 §5.3.) |
| **Error** | `useThreatDetail` errors (non-404) | `<ErrorState>`: "We couldn't load this close approach. [Try again]" → `refetch`. |
| **Education mode** | Kessler `:id` | Show a calm info chip near the CTA: "This scenario is for learning — it shows the risk, not a live maneuver." (CTA still routes to `/avoidance`, which explains education mode.) |
| **Warnings present** | `pc_estimate.warnings` non-empty | Surface the first warning as a small honest note under the meter, even in Simple (doc 01 §7: be honest). |
| **Source** | detail source | Chip "Offline demo data" / "Live data". |

---

## 8. Motion (doc 02 §6)

- **Page in:** mini-globe fades up; story line + meter + stats fade/rise 8px, `slow`, staggered.
- **Mini-globe:** auto-rotate + the closest-approach point pulses (live pulse); on first settle the
  camera eases to frame both objects (`spring`).
- **RiskMeter:** fill animates from 0 to level and the "1 in N" number counts up, once, on reveal.
- **ShowDetails:** height auto-expand + fade; `<EncounterPlot>` points fade in.
- **CTA hover:** lifts 1px + `--glow-cyan` intensifies (`fast`).
- **(Cross-route nod):** when the user proceeds to `/avoidance` and applies the move, the shared
  `<RiskBadge>`/meter morphs red→green there (doc 02 §6.2) — this page sets up that payoff.
- **Reduced motion:** no rise/rotate/pulse/count-up/camera-ease; meter and numbers render final.

---

## 9. Mobile layout notes

- Single column: mini-globe top (~38vh) → story → RiskMeter → stats (stack or 1×3 compact) →
  ShowDetails → sticky bottom CTA bar ("Plan the safe move") so the action is always reachable.
- Back link as a top-left chevron in the header.
- ShowDetails rows stack label-over-value; `<EncounterPlot>` scales to width; mono notes scroll-x.
- EarthCanvas low-power profile; single WebGL context (doc 04 §6 — don't stack canvases when
  navigating from `/sky`).

---

## 10. Acceptance criteria (reviewer checklist)

- [ ] Route exists at `/threats/:id`; `:id` is a `conjunction_id`; deep-link cold-boots via
      `useThreatDetail` (doc 03 §7).
- [ ] First viewport shows the focused mini-globe + one plain story sentence as the focal pair — no
      6-box metric grid, no decision drawer, no phase stepper (content that was in old Mission).
- [ ] Exactly one accent CTA: "Plan the safe move" → `/avoidance` carrying the conjunction; "Back to
      threats" is a ghost link.
- [ ] Plain story is the canonical sentence (who + from what + when + how close), risk word+color via
      `<RiskBadge>` consistent with `/threats` and the globe (doc 02 §2.4).
- [ ] `<RiskMeter>` reflects severity + Pc; Simple caption "1 in N", Pro caption "Pc = …".
- [ ] All Pc/covariance/encounter geometry is **collapsed** behind "Show details" in Simple; expanded
      in Pro (Law 4); fields map to real `ConjunctionDetail` data (no invented values).
- [ ] `pc_estimate.warnings` / `assumptions` are shown honestly (not hidden), per doc 01 §7.
- [ ] All jargon via `<Term>`; tooltips keyboard-accessible.
- [ ] 404 → friendly "couldn't find that close approach"; error → retry; loading → skeleton + plain
      sentence (no "acquiring corridor").
- [ ] Kessler id shows the education-mode note; the CTA still works.
- [ ] `prefers-reduced-motion` disables globe rotation, meter fill, count-up, and camera ease.
- [ ] Mobile: stacked column with a sticky CTA; single WebGL context.
- [ ] Tokens only; numbers use `format.ts` `formatPlain`/`formatPro`; React Query owns status
      (doc 04 §5).
