# 06 — Route Spec: Mission Report (`/report`)

> The **Prove** chapter. One clean, printable briefing that says — in three calm sections — *what
> happened, what we did, and the proof it's safe*. One Export. Everything technical (source IDs,
> assumptions, warnings) lives behind "Show details."
>
> Obeys docs 01–04. Replaces `ReportsRoute.tsx` (the storyboard tabs + review-mode tabs + dossier +
> audit stack + evidence grid — far too many competing panels).

---

## 1. Purpose & the ONE job (Law 1)

**One job:** *Hand the judge a single, credible briefing they could screenshot or export and trust.*

**The one thing to look at:** the report document itself — like a one-page mission memo on a dark sheet.

**The single primary action:**

```
[ ⤓ Export (Markdown) ]
```

That's it. No "Generate briefing" vs "Regenerate" vs review-mode tabs vs storyboard chapters. The
report **is already built** when you arrive (it was produced by the one-button flow on `/avoidance`),
so this screen *shows* it and lets you *export* it. The old route made report generation a task with
4 review tabs and a 4-chapter storyboard; we replace that with a finished document + one button.

> ❌ Old: hero + build card + status strip + 4-chapter storyboard tabs + dossier with 4 review tabs +
> audit stack + source-ID grid + assumptions disclosure.
> ✅ New: one document (3 sections) + one Export + "Show details" for IDs/assumptions.

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| Audience | What they take away |
|---|---|
| **Non-space judge** | "There's a clean record of what happened and what was done. This is a real product." |
| **Technical judge** | "Show details" gives source IDs, assumptions, warnings, covariance — it's auditable. |
| **Operator persona** | A defensible decision artifact: detection → action → verification, with a paper trail. |

**Emotional beat: Credibility** — *"This is real engineering, not a toy."* The screen should feel like
a finished deliverable: quiet typographic hierarchy, a real headline, three tidy sections, and the
confidence of "here's the proof" rather than "let me assemble something."

---

## 3. ASCII wireframe — first viewport (desktop)

One focal element: the briefing document, centered, breathing. Export is the single accent.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD      Sky   Threats   Safe Move   Report     Learn  [Simple|Pro]│
├──────────────────────────────────────────────────────────────────────────┤
│   Mission Report                                          [ ⤓ Export ]      │  ← PageHeader + 1 CTA
│   Protect ISRO · close approach with debris-2014-101J                       │  ← eyebrow line
│                                                                            │
│   ┌──────────────────────────────────────────────────────────────────┐    │
│   │                                                                    │    │
│   │  CARTOSAT-2F was on track to pass dangerously close to a piece     │    │  ← headline (display)
│   │  of debris. OrbitGuard cleared it with a tiny nudge.               │    │
│   │                                                                    │    │
│   │  ── What happened ───────────────────────────────────────────     │    │  ← section 1
│   │  At 14:32 UTC the two objects were set to pass ~600 m apart.       │    │
│   │  Collision chance: high (about 1 in 3,600). RiskBadge: DANGER      │    │
│   │                                                                    │    │
│   │  ── What we did ─────────────────────────────────────────────     │    │  ← section 2
│   │  A 0.12 m/s speed-up nudge 2 hours before the closest approach.    │    │
│   │  Smallest move that clears the risk.                               │    │
│   │                                                                    │    │
│   │  ── The proof ───────────────────────────────────────────────     │    │  ← section 3
│   │  After: ~8.4 km apart, collision chance negligible. SAFE           │    │
│   │  We re-checked the new path against 47 tracked objects — all clear.│    │
│   │                                                                    │    │
│   └──────────────────────────────────────────────────────────────────┘    │
│                                                                            │
│   ⛒ Offline demo data · Protect ISRO              Show details ⌄           │  ← chip + disclosure
└──────────────────────────────────────────────────────────────────────────┘
```

Content column ~720–820px (readable measure ≤68ch for prose). The document is a single `--bg-surface`
sheet with soft shadow, no neon border. Export is the only glowing control.

---

## 4. Section-by-section breakdown (content · components · data)

### 4.1 PageHeader + Export
- **Component:** `<PageHeader eyebrow title subtitle>`; title **"Mission Report"**, subtitle the
  scenario + objects line. The **Export** `<Button variant="primary">` sits inline-right.
- **Hook/data:** `useReport()` returns the already-generated `MissionReport` from the React Query
  cache (key seeded by the `/avoidance` apply success). If not present, it lazily creates it (see §7).
- **Export action:** reuses the store's Markdown builder (`exportReport`) — assembles `report.title`,
  `briefing.headline`, `briefing.summary`, each `sections[].title/body`, `assumptions[]`, `warnings[]`
  into a `.md` blob named `${report.report_id}.md`. (Keep this exact behavior; it already works.)

### 4.2 The ReportDocument (the focal element)
- **Component:** `<ReportDocument report={report} mode={mode} />` (domain) — renders the whole briefing
  as one printable sheet. Internally uses `<RiskBadge>`, `<Term>`, and prose; **no tabs, no stepper.**
- **Headline:** `report.briefing.headline` (display type, one line, plain).
- **Three sections** map to `report.sections[]` but are presented under three plain headings. The
  backend returns richer section titles (Detection / Recommendation / Screening / Export); the document
  groups/relabels them into the human triad and pulls the supporting numbers from the cached
  `plan`/`applyResult`/`detail`:

  | Heading (UI) | Source | Key data |
  |---|---|---|
  | **What happened** | `briefing.summary` + Detection section + `detail.risk` | `miss_distance_m`, `pc`, `tca_utc`, `<RiskBadge level="DANGER">` |
  | **What we did** | Recommendation section + `plan.recommendation` | `delta_v_m_s`, `direction`, `burn_t_minus_tca_s`, plain rationale |
  | **The proof** | Screening section + `applyResult` | after `miss_distance_m`/`pc`, `<RiskBadge level="SAFE">`, `screened_object_count`, `secondary_summary` |

- **Key points:** `report.briefing.key_points[]` rendered as a tight bulleted "at a glance" strip at the
  top of the sheet (3–5 plain bullets).
- All jargon via `<Term>` (`close approach`, `collision chance`, `nudge`, `double-check`).
- **Print:** the sheet has a `@media print` style (white-on-dark inverts to ink-on-paper; nav/chip
  hidden) so judges can literally print/PDF it. "Printable briefing" is a stated goal.

### 4.3 Show details (progressive disclosure)
- **Component:** `<ShowDetails label="Show details">` — collapsed by default. Contains the audit
  material the old route splattered across the page:
  - **Source IDs** ← `report.source_ids` (`scenario_run_id`, `conjunction_id`, `plan_id`,
    `candidate_id`) in a `<Stat>`/mono list.
  - **Assumptions** ← `report.assumptions[]`.
  - **Warnings / limitations** ← `report.warnings[]` + `report.briefing.limitations[]`.
  - (Pro adds covariance from `detail.pc_estimate.covariance` and the full candidate ranking.)

### 4.4 Status chip
- **Component:** `<Badge variant="muted">` — "Offline demo data · {scenarioTitle}". Single small chip
  near the document, not a global banner (doc 03 §5).

---

## 5. Plain-language copy (real example strings)

> Computed from `MissionReport` + cached `plan`/`applyResult`/`detail`. Illustrative values shown.

**Header**
```
Mission Report
Protect ISRO · CARTOSAT-2F vs debris-2014-101J · 14:32 UTC
```

**Headline (document)**
```
CARTOSAT-2F was on track to pass dangerously close to a piece of debris.
OrbitGuard cleared it with a tiny nudge.
```

**At a glance (key_points)**
```
• Closest approach was about 600 m — collision chance high (about 1 in 3,600).
• A 0.12 m/s speed-up nudge, 2 hours early, opened the gap to 8.4 km.
• Collision chance after the move: negligible.
• New path re-checked against 47 tracked objects — all clear.
```

**What happened**
```
At 14:32 UTC, CARTOSAT-2F and a tracked piece of debris were set to pass about
600 m apart — very close in orbital terms. Collision chance was high (about 1 in
3,600). Risk level: DANGER.
```

**What we did**
```
OrbitGuard recommended the smallest move that clears the risk: a 0.12 m/s
speed-up nudge, applied about 2 hours before the closest approach.
```

**The proof**
```
After the nudge, the two objects pass about 8.4 km apart and the collision chance
is negligible. Risk level: SAFE. We re-checked the new path against everything
else we track — 47 objects screened, all clear.
```

**Export button**
```
⤓ Export (Markdown)
```

**Pro-mode "What we did" (same datum)**
```
Recommended candidate cand-03: Δv 0.120 m/s along-track prograde at TCA − 2.0 h.
Pc 2.78×10⁻⁴ → 7.4×10⁻⁹. Miss 612 m → 8,431 m. Secondary screen: CLEAR (47 objects).
```

---

## 6. Simple vs Pro differences

| Element | Simple (default) | Pro |
|---|---|---|
| Numbers in prose | "about 600 m", "1 in 3,600", "0.12 m/s nudge" | exact: `612 m`, `Pc 2.78×10⁻⁴`, `Δv 0.120 m/s`, TCA offset |
| Section depth | 3 plain sections + at-a-glance bullets | same, plus inline candidate id + score in "What we did" |
| **Show details** | Source IDs + assumptions + warnings (plain) | adds **full candidate ranking** (`alternatives[]`), **covariance** (`model_id`, sigmas, hard-body radius, notes), method (`pc_estimate.method`) |
| Raw IDs | Behind Show details, friendly labels | mono, full IDs, copy-to-clipboard |
| Export | Same Markdown packet either mode | Markdown packet is identical (already includes IDs + assumptions + warnings) |

Mode from `useMode()`; `<ReportDocument>` renders `formatPlain()`/`formatPro()` of the same values.

---

## 7. Loading / empty / error states (doc 03 §5) + integration risk

**Loading (fetching/creating the report)** — `<Skeleton>` shaped like the document sheet + one line:
```
Putting together the mission report…
```

**Empty (arrived without a completed move)** — the report depends on a planned + applied maneuver. If
the user deep-links to `/report` cold, `<EmptyState>`:
```
No report yet.
Run the safe move first and we'll write up what happened.   [ Go to Safe Move → ]
```
(If a `scenarioId`/`threatId` is present, optionally offer **"Build the Protect ISRO report"** which
runs the deterministic chain — mirrors the store's `generateProtectIsroReport` fallback.)

**Error (generation/fetch failed)** — typed `ApiError`:
```
We couldn't build the report just now.        [ Try again ]
```

**⚠ Integration risk — report hardcoded to Protect ISRO (backend doc 08 will generalize).**
`api.createReport(run_id, conjunction_id, plan_id, candidate_id)` is *called* with real IDs, but the
backend currently returns the **Protect ISRO** briefing regardless (README §"Backend hardcoded"; the
store exposes both generic `generateReport` and the pinned `generateProtectIsroReport`, and
`ReportsRoute` falls back to the pinned one). Meanwhile:

- **Protect ISRO:** the report is fully truthful and is the deterministic hero artifact — never break it.
- **Other scenarios:** if a report is shown for a non-ISRO run, display an honest chip in the document
  footer: `"This briefing currently reflects the Protect ISRO demo scenario; per-scenario reports land
  in the next backend update."` Do **not** relabel ISRO content as another scenario's objects.
- The UI already passes the correct `source_ids`; when doc 08 honors them, the chip is removed and the
  document content becomes per-scenario with **no UI change** (it just renders whatever `MissionReport`
  returns).
- Export always reflects exactly what's on screen (same `report` object), so it stays honest.

---

## 8. Motion (doc 02 §6)

| Moment | Motion | Spec |
|---|---|---|
| Page enter | Document sheet fades + rises 8px | `slow` (400ms), `ease` |
| Section reveal | Each of the 3 sections fades/rises once as it enters viewport (scroll) | `base`, staggered ~80ms; once only |
| RiskBadge pair | DANGER (What happened) and SAFE (The proof) badges settle with a soft glow on first paint | `base`; no looping |
| Export success | Button shows a brief ✓ then "Exported" for ~1.5s | `fast` swap |
| Show details | Height auto-expand, content fades in | `base`, `ease` |

**Rules:** the report is calm — no count-ups here (the drama happened on `/avoidance`); motion only
orients the reader. `prefers-reduced-motion`: disable rise/stagger/glow; instant render. No spinners as
sole feedback — the loading skeleton + sentence cover it.

---

## 9. Mobile layout notes

- Single column, 20px padding. `<PageHeader>` stacks: title, then subtitle, then a **full-width Export**
  button beneath (not cramped beside the title).
- The document sheet spans full width; sections stack naturally; key-points bullets full width.
- `<RiskBadge>` pair remains visible inline within their sections (word + color legible at small size).
- "Show details" expands inline (or as a bottom sheet in Pro for the wide covariance/candidate data).
- Print/share: a small "Share / Save PDF" affordance can map to the OS share sheet on mobile in addition
  to Markdown export.

---

## 10. Acceptance criteria checklist

- [ ] First viewport shows **one** document and **one** primary action (Export). No generate/regenerate buttons, no review-mode tabs, no storyboard chapter tabs.
- [ ] The report renders three plain sections — **What happened / What we did / The proof** — sourced from `MissionReport` + cached `plan`/`applyResult`/`detail`.
- [ ] "At a glance" bullets come from `briefing.key_points`; headline from `briefing.headline`.
- [ ] DANGER and SAFE `<RiskBadge>`s use the sacred risk colors and match the numbers shown.
- [ ] Export produces a Markdown file (`{report_id}.md`) containing title, headline, summary, all sections, assumptions, and warnings — matching on-screen content exactly.
- [ ] Source IDs, assumptions, and warnings are **collapsed** behind "Show details"; Pro additionally reveals covariance + full candidate ranking.
- [ ] Every jargon term is wrapped in `<Term>` with `lib/terms.ts` tooltips.
- [ ] Cold deep-link with no completed move shows the empty state routing to Safe Move (no crash, no blank).
- [ ] Loading uses a document-shaped skeleton + plain sentence; errors use typed `ApiError` + Retry. No "arming"/"queued" placeholder language.
- [ ] For non-Protect-ISRO runs, an honest chip notes the report reflects Protect ISRO; ISRO content is never mislabeled. Protect ISRO report is deterministic and offline-safe.
- [ ] `@media print` produces a clean one-page briefing (chrome hidden, legible on white).
- [ ] `prefers-reduced-motion`: no rise/stagger/glow; content readable instantly.
- [ ] Mobile: single column, full-width Export, sections stack, badges legible.
