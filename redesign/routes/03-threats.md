# Route Spec — Threats (`/threats`)

> Chapter: **Spot** (the tension). One calm ranked list of close approaches in plain language.
> **Replaces** `RiskRoute` — and deletes its severity lanes, mini-radar, scenario-comparison panel,
> and playbook prose (those go to `/learn` + `/threats/:id`, doc 03 §8).
> Obeys: doc 01, doc 02, doc 03, doc 04, doc 05.
> Replaces: `frontend/src/routes/RiskRoute.tsx`.

---

## 1. Purpose & the ONE job (Law 1)

**The one job:** show, ranked, *which things are about to get dangerously close* — each as one
plain sentence anyone can read.

**The one thing to look at:** the ranked list, with the most urgent threat at the top.

**The single primary action:** **open a threat** → tapping any row goes to `/threats/:id`. The #1
row doubles as the primary CTA ("the worst one, open it"). One accent only — the top row.

> The scenario tabs (Protect ISRO / 2009 / Kessler) are a *context switch on the same list*, not a
> second job — they swap which sky we're ranking, the list stays the hero (doc 03 §4). This is the
> only place the scenario switcher lives (moved off `/sky` and the old mission deck, doc 03 §8).

What we drop vs old `RiskRoute`: the focus card, status strip, three severity "lanes" with a
sweeping radar, the scenario-comparison sidebar, and the long playbook. The page becomes: a header,
tabs, and a readable list. Calm.

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| | |
|---|---|
| **Primary** | Non-space judge — must feel the stakes without reading telemetry |
| **Secondary** | Operator triaging a worklist; technical judge sanity-checking ranking |
| **Emotional beat** | **Tension — "Oh no, something's about to get close."** (doc 01 §6, row 2) |
| **Leave with** | "I know which one is worst, why, and I can open it." |

Design consequence: quiet, serious, legible. Color carries urgency (one red row), not loud panels.

---

## 3. ASCII wireframe — first viewport (desktop)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD     Sky  [Threats]  Safe Move  Report     Learn  [Simple|Pro]  ▶   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│   Threats                                                                      │
│   What's about to get dangerously close.                                       │
│                                                                                │
│   ┌ Protect ISRO ┐  2009 Replay   Kessler Sandbox            ⌁ Offline data   │ ← ScenarioTabs
│   └──────────────┘                                                             │
│                                                                                │
│   ┌────────────────────────────────────────────────────────────────────────┐ │
│   │ ● DANGER   CARTOSAT-2F will pass dangerously close to a piece of        │ │ ← lead row
│   │            debris in about 4 hours — about 600 m apart.                 │ │   (emphasis +
│   │            collision chance: very high, about 1 in 3,600        Open → │ │    soft glow)
│   └────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│     ○ SAFE     RISAT-2BR1 has no close approaches right now.          Open →  │ │ ← calmer rows
│     ○ SAFE     Sentinel comparison object is clear.                   Open →  │ │
│                                                                                │
│            (one red row draws the eye; everything else recedes)                │
└──────────────────────────────────────────────────────────────────────────────┘
```

Breathing room: generous vertical rhythm between rows (no dense table). Only the lead/danger row
carries a soft `--glow-danger`; the rest are flat surfaces. One focal element = that top sentence.

---

## 4. Section-by-section breakdown (top → bottom)

### 4.1 PageHeader
- `<PageHeader eyebrow="Threats" title="What's about to get dangerously close." />`
- One `h1`. No status badge cluster, no "Risk Board / Closest Approach" eyebrow soup.
- A single `<Chip>` (Offline/Live) sits top-right, fed by `useThreats().mode`.

### 4.2 ScenarioTabs (`components/domain/ScenarioTabs`, Radix Tabs)
- Three tabs in fixed order: **Protect ISRO** (default/hero), **2009 Replay**, **Kessler Sandbox**.
- Active tab has the cyan underline (doc 03 §3.1). Switching tabs re-queries the list and writes
  `?scenario=<id>` (doc 03 §7). Tab labels come from `useScenarios()`; order pinned by
  `["protect-isro","2009-replay","kessler-sandbox"]` (matches store `scenarioOrder`).

```tsx
<ScenarioTabs value={scenarioId} onChange={setScenario}
  tabs={scenarios.map(s => ({ id: s.scenario_id, label: s.title }))} />
```

### 4.3 The ranked list (the focal element)
- A vertical list of `<ThreatRow>`s, sorted by urgency (miss distance ascending / severity), exactly
  the sort the store already uses. The top row is rendered with `emphasis` (larger, soft glow).
- Each row is **one plain sentence**: *who* (primary) + *from what* (secondary, plain) + *when*
  (TCA, humanized) + *how bad* (RiskBadge word + color, then "1 in N").
- Whole row is a link to `/threats/:id`.

```tsx
<ThreatRow
  emphasis={index === 0}
  level={riskLevel(t.risk)}                     // safe | watch | warning | danger
  to={`/threats/${t.conjunction_id}`}
  primary={primaryName(t)}                       // "CARTOSAT-2F"
  secondaryPlain={plainSecondary(t)}             // "a piece of debris"
  when={humanizeTca(t.tca_utc)}                  // "in about 4 hours"
  miss={t.risk.miss_distance_m}                  // → "about 600 m apart"
  pc={t.risk.pc}                                 // → "about 1 in 3,600"
  mode={mode}
/>
```

`<ThreatRow>` anatomy:
```text
[RiskBadge ●WORD]   <sentence: who + from what + when + how close>          [Open →]
                    <secondary line: collision chance: <word>, about 1 in N>
```

- `<RiskBadge>` is the only color in the row; the same word+color used on the globe and detail page
  (doc 02 §2.4 — risk color is sacred).
- Rows that are not real conjunctions (e.g. clear assets) read as calm SAFE one-liners, no figures.

### 4.4 Lead-row CTA
- The emphasized top row shows an explicit `Open →` affordance and is keyboard-focused first. It is
  the page's single primary action. (No separate "Open burn planner" button in the header — that
  belonged to the old route; the path to the fix is *through* the threat detail.)

### 4.5 Data hooks (`features/`) → real endpoints (`api.ts`)
| Hook | Backend call | Feeds |
|---|---|---|
| `useScenarios()` | `GET /api/scenarios` | Tab labels + order |
| `useThreats(scenarioId)` | `POST /api/conjunctions/screen` (`{scenario_id, step_seconds:10, max_results:5}`) | The ranked rows (`conjunctions[]` + `risk` + `tca_utc`) |
| `useScenarioRun(scenarioId)` | `POST /api/scenarios/:id/run` | Protected/primary object name + secondary names |
| `useThreatDetail(topId)` *(prefetch)* | `GET /api/conjunctions/:id` | Prefetched on hover of row 1 for instant detail nav |

Notes:
- Names: the API gives `primary_object_id` / `secondary_object_id` (IDs). Resolve to friendly names
  via the catalog (`useCatalog`) or `useScenarioRun().protected_object.name`. Fallback to the ID.
- Tabs query independently and are cached by React Query (`queryKey: ["threats", scenarioId]`), so
  switching is instant after first load — replacing the store's `Promise.allSettled` snapshot hack.

---

## 5. Plain-language copy (real strings)

Per scenario, the lead row sentence (jargon via `<Term>`):

```text
— Protect ISRO (conj-protect-isro-001) —  DANGER
CARTOSAT-2F will pass dangerously close to a piece of debris in about 4 hours — about 600 m apart.
collision chance: very high — about 1 in 3,600.
   (<Term k="conjunction">close approach</Term>, <Term k="pc">collision chance</Term>)

— 2009 Replay (conj-2009-replay-001) —  DANGER
Iridium 33 and Cosmos 2251 came within about 740 m of each other — the real 2009 crash, replayed.
collision chance: very high — about 1 in 2,400.

— Kessler Sandbox (conj-kessler-sandbox-001) —  WARNING
A policy satellite passes about 4.9 km from a debris cloud — worth watching, not urgent.
collision chance: low — about 1 in 130,000.

Calm / clear rows (no conjunction):
RISAT-2BR1 has no close approaches right now.                                    SAFE
Sentinel comparison object is clear.                                             SAFE

Affordance:  Open →
Tabs:        Protect ISRO   ·   2009 Replay   ·   Kessler Sandbox
Header:      Threats / What's about to get dangerously close.
Chip:        Offline demo data
```

Humanizers:
- `humanizeTca`: future → "in about 4 hours" / "in 2 days"; past (replay) → "on 10 Feb 2026" or
  "the real 2009 crash, replayed".
- `plainSecondary`: debris → "a piece of debris"; debris cloud → "a debris cloud"; named sat →
  the name (e.g. "Cosmos 2251").
- Risk word from level: danger→"very high", warning→"low", watch→"slight", safe→"none".

---

## 6. Simple vs Pro differences

| Element | Simple (default) | Pro |
|---|---|---|
| Distance | "about 600 m apart" | "611.8 m" |
| Collision chance | "very high — about 1 in 3,600" | "Pc = 2.78 × 10⁻⁴" (mono) |
| When | "in about 4 hours" | exact TCA UTC: "2026-… 16:56 UTC" |
| Closing speed | hidden | adds "<Term k="relative-velocity">closing speed</Term> 11.7 km/s" (2009) / "0.7 m/s" (ISRO) |
| Extra columns | none | adds a compact right cluster: miss · Pc · closing speed · `conjunction_id` (a `<DataTable>`-style row) |
| Sentence | full plain sentence | sentence stays, but figures switch to exact inline |

Pro keeps the same calm list — it does not add lanes or radars — it just makes every number exact
and exposes the conjunction ID for auditing. Mode from `missionStore.mode`.

---

## 7. Loading / empty / error states (doc 03 §5)

| State | Trigger | Treatment & copy |
|---|---|---|
| **Loading** | `useThreats` pending | Header + tabs render instantly; list shows 3 `<Skeleton>` rows (badge pill + two text bars). Plain line: "Checking for close approaches…". No "syncing scenario" copy. |
| **Empty** | `conjunctions` = [] for a scenario | `<EmptyState>` (calm, not alarming): "Good news — no close approaches in this scenario right now." + ghost link "Pick another scenario" (doc 03 §5 empty pattern). |
| **Error** | `useThreats` errors | `<ErrorState>`: "We couldn't load the threat list. [Try again]" → `refetch`. Tabs still switchable. |
| **Tab switching** | new scenario fetch | Keep previous list visible, dim 50% + tiny inline spinner on the active tab, until new data arrives (React Query `keepPreviousData`). No full-page flash. |
| **Source** | `useThreats().mode` | Chip "Offline demo data" / "Live data". |

---

## 8. Motion (doc 02 §6)

- **Page in:** header + tabs + list fade/rise 8px, `slow`, once.
- **List stagger:** rows rise ~40ms apart on first load and on scenario change.
- **Lead row:** a single, brief `--glow-danger` pulse on the top row when the list first settles —
  draws the eye to the worst one, then holds steady (no looping). Respect reduced-motion.
- **Tab change:** underline slides (`base`); list cross-fades (`base`).
- **Row hover/focus:** lifts 2px; `Open →` arrow nudges right 2px (`fast`).
- **Reduced motion:** no rise/stagger/glow-pulse/arrow-nudge; instant list, instant tab swap.

---

## 9. Mobile layout notes

- Header compact; ScenarioTabs become a horizontally scrollable tab strip (or a `<select>` on very
  small screens), active tab pinned visible.
- Rows are full-width cards stacked with comfortable spacing; the sentence wraps to 2–3 lines, the
  RiskBadge sits top-left of each card, `Open →` bottom-right.
- The whole card is the tap target (≥44px, doc 02 §9). Lead row keeps its subtle danger tint.
- Pro extra figures wrap below the sentence as small mono chips instead of a side cluster.

---

## 10. Acceptance criteria (reviewer checklist)

- [ ] `/threats` renders one ranked list; `/risk`, `/closest-approach` redirect here (doc 03 §2).
- [ ] First viewport = header + tabs + list only — **no** severity lanes, mini-radar, focus card,
      status strip, or scenario-comparison sidebar (regression vs old `RiskRoute`).
- [ ] Each row is one plain sentence: who + from what (plain) + when + how close, with a
      `<RiskBadge>` word+color and a "1 in N" chance line.
- [ ] Exactly one emphasized/glowing row (the #1 threat); all others are flat (Law 3, doc 02 §10).
- [ ] Tapping any row navigates to `/threats/:id` with the correct `conjunction_id`.
- [ ] Scenario tabs switch the list and write `?scenario=<id>`; deep-linking a scenario cold-boots
      that list (doc 03 §7); order is Protect ISRO → 2009 → Kessler.
- [ ] Risk word/color matches the globe and detail page exactly (doc 02 §2.4).
- [ ] Jargon via `<Term>`; tooltips keyboard-accessible.
- [ ] Simple shows "about 600 m / 1 in 3,600"; Pro shows "611.8 m / Pc 2.78 × 10⁻⁴" + closing speed
      + conjunction_id, toggled live.
- [ ] Empty state is reassuring ("no close approaches"), not an error; error state has working retry;
      tab switching keeps previous data (no flash).
- [ ] Loading uses skeleton rows + plain sentence (no "syncing scenario").
- [ ] `prefers-reduced-motion` disables stagger, glow-pulse, and arrow nudge.
- [ ] Mobile: scrollable tabs + stacked full-width cards, whole-card tap target.
- [ ] Tokens only; React Query owns loading/error (no store `busy` flag, doc 04 §5).
