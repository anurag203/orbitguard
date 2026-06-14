# 05 — Route Spec: The Safe Move (`/avoidance`)

> **This is the hero screen.** The single moment the whole demo builds toward. Everything here
> serves the beat: *Relief* ("phew, there's a simple safe move") immediately followed by *Trust*
> ("smart — it double-checked the new path"). If only one screen is perfect, it is this one.
>
> Obeys docs 01–04. Replaces the 499-line, 5-panel `AvoidanceRoute.tsx`.

---

## 1. Purpose & the ONE job (Law 1)

**One job:** *Show the single safe move that clears the collision — and prove the new path is safe too.*

**The one thing to look at:** the Earth with the threatened satellite, and one glowing button.

**The single primary action:**

```
[ Find the safe move ]   ← the only neon CTA on the screen
```

Everything else (candidate grid, delta-v table, covariance, raw IDs) is **collapsed behind "Show
details"** or revealed only in Pro mode. There is **no second column competing for attention**, no
preflight checklist, no 5-step "burn sequence" board, no separate candidate matrix section. The old
route violated Law 1 five times over; this one has exactly one action and one result that animates
*in place*.

> ❌ Old: hero + target card + Earth + control panel + preflight + burn-sequence stepper + before/after
> board + reduction strip + 2 action buttons + candidate board + assurance panel + explain + disclosure.
> ✅ New: Earth + one button → result morphs in place → auto double-check → "Show details".

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| Audience | What they take away here |
|---|---|
| **Non-space judge (primary)** | "I pressed one button and the red danger turned green. I get it." |
| **Technical judge** | "Show details" reveals the candidate search, Δv, and covariance assumptions — it's real. |
| **Operator persona** | A single recommended action with a believable Δv and a mandatory safety screen. |

**Emotional arc (the two beats this screen owns):**
1. **Relief** — the risk meter slides **red → green**, one plain sentence explains the tiny nudge.
2. **Trust** — *without the user asking*, a second panel reveals: **"We double-checked the new path ✓"**.

The design must make the red→green transition feel like exhaling, and the double-check feel like the
product being conscientious on the user's behalf.

---

## 3. ASCII wireframe — first viewport (desktop, before action)

One focal element (Earth), one headline, one CTA. Generous breathing room. Nothing else.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD      Sky   Threats   Safe Move   Report     Learn  [Simple|Pro]│  ← slim TopNav
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                                                                            │
│                         ╭───────────────────────╮                          │
│                        (        ●  the Earth      )                        │
│                        (    ·  CARTOSAT-2F  ·     )   ← one pulsing sat     │
│                         ╰───────────────────────╯       + faint debris dot │
│                                                                            │
│              CARTOSAT-2F has a close approach in 4 hours.                  │  ← h1, plain
│              Right now they pass about 600 m apart.                        │  ← subtitle
│                                                                            │
│                      ┌───────────────────────────┐                         │
│                      │   ▸  Find the safe move    │   ← ONE neon CTA        │
│                      └───────────────────────────┘                         │
│                                                                            │
│              ⛒ Offline demo data · Protect ISRO        Show details ⌄      │  ← quiet chip + link
│                                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### After the action (result animates *in place* — same viewport, no navigation)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ╭───────────────────────╮                          │
│                        (   ●  Earth — sat nudged  )   ← trail shifts up,    │
│                        (   ·······  ↗ new path    )     danger line fades   │
│                         ╰───────────────────────╯       red → green        │
│                                                                            │
│   ┌─────────────────────────  RiskMeter  ─────────────────────────────┐    │
│   │  Before  ███████████ DANGER  600 m   →   After  ▏ SAFE  8.4 km     │    │  ← red→green morph
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│   Done. A tiny 0.12 m/s nudge moves it from 600 m to 8.4 km away —          │  ← one human sentence
│   collision chance now effectively zero.                                   │
│                                                                            │
│   ┌────────────────────────────────────────────────────────────────────┐  │
│   │ ✓ We double-checked the new path.                                    │  │  ← auto-reveals ~600ms
│   │   The nudge doesn't bring CARTOSAT-2F near anything else we track    │  │     after the result
│   │   (47 objects screened, all clear).                                  │  │
│   └────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│        [ See the report → ]            Show details ⌄                       │  ← next step + disclosure
└──────────────────────────────────────────────────────────────────────────┘
```

Layout: a centered single column over the immersive Earth canvas (container max 1440px for the 3D,
content column ~720px). The Earth is the only thing above the headline; the result stack replaces the
CTA in the same vertical slot so the eye never jumps.

---

## 4. Section-by-section breakdown (content · components · data)

### 4.1 Earth stage (focal element, persistent)
- **Component:** `<EarthCanvas>` from `components/earth/` (doc 07), lazy-loaded. Shows the protected
  satellite (emissive, gently pulsing), the threat object (small red dot), and — after the move — the
  shifted `<OrbitTrail>` plus the danger connector fading red→green.
- **Data:** `useThreatDetail(threatId)` → `ConjunctionDetail` for `primary_object_id`,
  `secondary_object_id`, geometry. The selected threat comes from the store (`threatId`, set on
  `/threats/:id`); if absent, default to the current scenario's `top_conjunction_id`.
- Only the satellite/trail animate. No HUD overlays stacked on the canvas (old route had two).

### 4.2 PageHeader / plain framing
- **Component:** `<PageHeader>` (compact variant) — `eyebrow="Safe Move"`, `title` and `subtitle` are
  the plain sentences. No `StatusBadge` clutter, no "Predictor / Maneuver Planner" label.
- **Copy is data-driven** from `ConjunctionDetail`:
  - title: `"{primaryName} has a close approach in {humanizeTime(tca)}."`
  - subtitle: `"Right now they pass about {formatDistancePlain(miss_distance_m)} apart."`
- Jargon wrapped: `<Term k="conjunction">close approach</Term>`.

### 4.3 Primary action
- **Component:** `<Button variant="primary" size="lg">` with `--glow-cyan`. Label **"Find the safe
  move."** This is the only glowing element pre-result.
- **Hook:** `usePlanManeuver()` → `useMutation` calling `api.planManeuver(conjunction_id)` →
  `ManeuverPlan`. On click: `plan.mutate(detail.conjunction_id)`.
- On success, **auto-chains** the apply (see 4.6) so the user presses **one** button, not two. The old
  route required two clicks (Run scan → Apply); we collapse that into one "Find the safe move."

### 4.4 RiskMeter (before → after)
- **Component:** `<RiskMeter before={beforeRisk} after={afterRisk} />` — the signature before/after
  visualization. Renders two `<RiskBadge>` (word + color) and the numbers; animates the fill from the
  DANGER color to the SAFE color (doc 02 §6 "Risk transition").
- **Data:** `before = plan.before` (RiskMetrics), `after = applyResult.after ?? plan.predicted_after`.
  - `formatRiskWord(severity)` → SAFE / WATCH / WARNING / DANGER (color is sacred per doc 02 §2.4).
  - `<Term k="missDistance">how close</Term>`, `<Term k="pc">collision chance</Term>`.

### 4.5 BurnResult — the one human sentence
- **Component:** `<BurnResult plan={plan} apply={applyResult} />` (domain widget). Renders the single
  plain-language sentence and nothing else in Simple mode.
- **Data:** `plan.recommendation` (`delta_v_m_s`, `direction`, `miss_distance_gain_m`,
  `pc_reduction_factor`), `plan.before`, `plan.predicted_after`.
- Builds the sentence from real values (see §5).

### 4.6 The automatic double-check panel (the Trust beat)
- **Component:** `<DoubleCheckPanel apply={applyResult} />` (domain) — reveals automatically ~600ms
  after the result lands, with a green check that draws in. **Not** behind a button; the product does it
  for you.
- **Hook:** `useApplyManeuver()` → `useMutation` calling `api.applyManeuver(plan_id, candidate_id)` →
  `ManeuverApply`. Auto-fired in `usePlanManeuver().onSuccess` so the secondary screen is part of the
  one-button flow.
- **Data:** `applyResult.secondary_status`, `applyResult.secondary_summary`,
  `applyResult.screened_object_count`. Copy: *"We double-checked the new path. The nudge doesn't bring
  {primaryName} near anything else we track ({screened_object_count} objects screened, all clear)."*
  `<Term k="secondaryScreening">double-check</Term>`.

### 4.7 Next step + Show details
- **Next step:** `<Button variant="secondary">See the report →</Button>` → routes to `/report`
  (carries `scenarioId`, `threatId`). Appears only after the double-check completes.
- **Show details:** `<ShowDetails label="Show details">` (Radix collapsible). Collapsed by default;
  contents differ by mode (see §6).

---

## 5. Plain-language copy (real example strings)

> Numbers below are illustrative of the Protect ISRO fixture; the components must compute them from
> live `ManeuverPlan` / `ManeuverApply`, never hardcode.

**Pre-action headline / subtitle**
```
CARTOSAT-2F has a close approach in 4 hours.
Right now they pass about 600 m apart — closer than the length of 6 football fields.
```

**While planning (button → loading, see §7)**
```
Finding the smallest safe nudge…
```

**Result sentence (BurnResult, Simple mode)**
```
Done. A tiny 0.12 m/s nudge moves it from 600 m to 8.4 km away —
collision chance now effectively zero.
```

**RiskMeter labels**
```
Before:  DANGER · 600 m apart · collision chance high (about 1 in 3,600)
After:   SAFE   · 8.4 km apart · collision chance negligible (less than 1 in 10 million)
```

**Double-check panel (auto-reveal)**
```
✓ We double-checked the new path.
  The nudge doesn't bring CARTOSAT-2F near anything else we track —
  47 objects screened, all clear.
```

**Jargon wrapping examples (every technical word goes through `<Term>`):**
```tsx
<Term k="deltaV">nudge</Term>            // tooltip: "How hard we push the satellite to change its path."
<Term k="conjunction">close approach</Term>
<Term k="pc">collision chance</Term>
<Term k="secondaryScreening">double-check</Term>
<Term k="alongTrack">speed-up nudge</Term>   // shown in details when direction is along-track
```

**Pro-mode result line (same datum, `formatPro`)**
```
Recommended burn: Δv 0.120 m/s, along-track prograde, at TCA − 2.0 h.
Pc 2.78×10⁻⁴ → 7.4×10⁻⁹  (reduction ×3.8×10⁴). Miss 612 m → 8,431 m. Score 0.94.
```

---

## 6. Simple vs Pro differences

| Element | Simple (default) | Pro |
|---|---|---|
| Result | One sentence + RiskMeter words | Adds Δv, direction, burn time, exact Pc, score inline |
| Numbers | "about 1 in 3,600", "8.4 km", "0.12 m/s nudge" | `2.78×10⁻⁴`, `8,431 m`, `Δv 0.120 m/s` |
| **Show details** | Hidden by default; opens to: plain "why this move" + assumptions in plain English | Opens to the **candidate grid** + **delta-v table** + **covariance/assumptions** + **raw IDs** |
| Candidate grid | Not shown | `<Table>`/`<Card>` grid of `plan.recommendation + plan.alternatives`: Δv, direction, predicted Pc, miss gain, reduction, burn `TCA − t`, status, reason |
| Covariance | "Margin of error" one-liner | `pc_estimate.covariance`: `model_id`, `sigma_x_m`, `sigma_y_m`, `hard_body_radius_m`, `source`, notes |
| IDs | Hidden | `plan_id`, `conjunction_id`, recommended `candidate_id` (mono font) |
| Earth | Same cinematic view both modes | Optional encounter-plane mini-plot from `encounter_plane[]` |

Mode comes from `useMode()` (Zustand `mode`, persisted). Components render `formatPlain()` vs
`formatPro()` of the **same** value (doc 01 §4). The `<ShowDetails>` block swaps its body by mode.

**Details block contents (Pro), all from real data:**
- Candidate grid ← `plan.recommendation`, `plan.alternatives[]` (`ManeuverCandidate`).
- Delta-v / timing table ← `delta_v_m_s`, `burn_t_minus_tca_s`, `direction`, `score`,
  `pc_reduction_factor`, `miss_distance_gain_m`, `rejection_reasons[]`.
- Assumptions & warnings ← `plan.assumptions[]`, `plan.warnings[]`, plus `apply.secondary.assumptions[]`.
- Covariance ← `detail.pc_estimate.covariance`.

---

## 7. Loading / empty / error states (doc 03 §5) + integration risk

All states come from the React Query hooks; no scattered `busy`/`error` strings, no "arming" /
"corridor sync" placeholder language.

**Loading (plan in flight)** — the CTA becomes a calm in-place status, not a bare spinner:
```
Finding the smallest safe nudge…        (subtext) Comparing a few candidate moves and
                                          checking the result against nearby objects.
```
The Earth keeps turning; a faint scan shimmer plays over the satellite trail. Respects reduced-motion.

**Loading (secondary double-check, auto-chained)** — a brief inline shimmer inside the
`<DoubleCheckPanel>`:
```
Double-checking the new path against everything else we track…
```

**Empty (no threat selected / scenario has no close approach)** — `<EmptyState>`:
```
Nothing to dodge right now.
Pick a scenario or a threat to see the safe move in action.   [ Go to Threats → ]
```

**Error (plan/apply failed)** — `<ErrorState>` from typed `ApiError`:
```
We couldn't work out a safe move just now.        [ Try again ]
(plain detail from ApiError.message, e.g. "The data service didn't respond.")
```

**⚠ Integration risk — apply/report hardcoded to Protect ISRO (backend doc 08 will generalize).**
Today `api.planManeuver(conjunction_id)` is per-conjunction and works for any scenario, **but the
backend `apply` and `report` paths are pinned to the Protect ISRO conjunction** (README §"Backend
hardcoded"; store keeps a fallback `generateProtectIsroReport`). Until doc 08 makes `apply` honor the
real `plan_id`/`candidate_id`:

- **Protect ISRO:** full one-button flow is truthful — plan → apply (double-check) → report all match.
- **2009 replay / Kessler (or any non-ISRO threat):** the **plan + before/after is real**, but the
  secondary double-check and exported report may echo Protect ISRO values. The UI must **not** silently
  present ISRO numbers as another scenario's. Required behavior meanwhile:
  - Show the real plan result (red→green) for the selected scenario.
  - On the `<DoubleCheckPanel>`, when `scenarioId !== "protect-isro"`, render an honest inline chip:
    `"Double-check shown for the Protect ISRO demo; full per-scenario screening lands in the next
    backend update."` (a `Badge variant="muted"`, not an error).
  - Keep **Protect ISRO as the default** selected scenario so the hero demo is always truthful and
    deterministic (Law/principle 6: never break Protect ISRO).
- When doc 08 ships the generalized `apply`/`report`, remove the chip; no UI restructure needed because
  the hooks already pass the real IDs.

---

## 8. Motion (doc 02 §6) — the signature transitions

| Moment | Motion | Spec |
|---|---|---|
| **Risk red→green** (the money shot) | RiskMeter fill morphs DANGER→SAFE with a brief glow pulse | color + width tween `slow` (400ms), `ease`; one glow-pulse on the SAFE badge at the end |
| **Result reveal** | CTA fades/lifts out, RiskMeter + sentence fade + rise 8px into the same slot | `slow`, `ease`; staggered ~80ms |
| **Number count-up** | miss distance 600 m → 8.4 km and Pc count toward final value | count-up over `base`–`slow`; only on first reveal |
| **Satellite nudge** | the 3D trail springs onto the higher path | `spring { stiffness:120, damping:18 }` |
| **Double-check ✓ reveal** | panel slides/fades in ~600ms *after* result; the check mark draws (stroke) then a soft green glow | `base` fade+rise, then check draw 250ms |
| **Live pulse** | protected satellite gently pulses pre-action (the only always-on motion) | 2s loop |

**Rules:** never more than ~2 animated things in the viewport at once (so the nudge + meter, then the
check). `prefers-reduced-motion`: skip count-up/rise/pulse and the trail spring — **the red→green color
change still happens instantly** (state must read correctly), the ✓ appears without drawing.

---

## 9. Mobile layout notes

- Single column, page padding 20px. Earth canvas becomes a shorter top band (~40vh) with the satellite
  centered; it is decorative-but-correct, not interactive-heavy (pinch-zoom optional, button equivalents
  per doc 07).
- Order: Earth band → headline/subtitle → **full-width primary CTA** (44px+ tall, glow) → chip.
- After action: Earth band → `<RiskMeter>` stacks the Before above the After (vertical arrow between) →
  one-sentence result → `<DoubleCheckPanel>` (full width) → "See the report" (full width) → Show details.
- Show details opens as a bottom sheet (`vaul`-style) in Pro mode so the candidate grid scrolls without
  cramping.
- The red→green transition is the centerpiece on mobile too; keep the meter large and legible.

---

## 10. Acceptance criteria checklist

- [ ] First viewport shows the Earth + headline + exactly **one** glowing CTA ("Find the safe move"). No second primary action, no preflight/stepper/candidate panels visible.
- [ ] One button press runs plan **and** the secondary double-check (no manual second click).
- [ ] Result animates **in place**: `<RiskMeter>` morphs **red→green**, numbers count up, one plain sentence appears.
- [ ] The double-check panel reveals **automatically** (~600ms later) with `screened_object_count` and an honest "all clear" / concerns summary.
- [ ] Result sentence and numbers are computed from `ManeuverPlan`/`ManeuverApply` (no hardcoded copy); Δv, distances, and Pc match the API.
- [ ] Every jargon term (`close approach`, `nudge`, `collision chance`, `double-check`) is wrapped in `<Term>` and shows a tooltip sourced from `lib/terms.ts`.
- [ ] Simple mode hides candidate grid / Δv table / covariance / IDs; **Show details** (or Pro) reveals them from real data.
- [ ] Loading copy is plain ("Finding the smallest safe nudge…"); no "arming"/"corridor sync"; error uses typed `ApiError` + Retry; empty state offers a route to Threats.
- [ ] For non-Protect-ISRO scenarios, the double-check shows the honest "Protect ISRO demo" chip and never presents ISRO numbers as another scenario's. Protect ISRO remains the default and works offline/deterministically.
- [ ] `prefers-reduced-motion`: red→green state still reads correctly with motion disabled; no infinite spinners.
- [ ] Mobile: single column, full-width CTA ≥44px, RiskMeter stacks before/after vertically, the red→green moment stays prominent.
- [ ] Route JS (excluding shared 3D chunk) < 250 KB gzip; Earth canvas lazy-loaded.
