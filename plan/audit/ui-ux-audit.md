# OrbitGuard — UI/UX Audit (Recon)

**Auditor stance:** demanding senior product designer, judging this as a first-place hackathon contender.
**Method:** automated Playwright pass (`frontend/e2e/_audit.mjs`) against the live dev server
(`http://127.0.0.1:5173`), full-page screenshots at desktop **1440×900** and mobile **390×844**,
per-route console/page-error capture, a dedicated Guided Tour probe, and a Sky object-count probe.
Raw machine-readable findings: `plan/audit/results.json`. Screenshots: `plan/audit/screens/`.

**Headline verdict:** The visual language is genuinely strong — the 3D Earth is beautiful, the
typography is confident, the "Simple/Pro" idea is smart, and the empty/loading/error states exist
and look intentional. But three things actively undercut a winning demo: **(1) the Guided Tour is
broken — it never leaves step 1**, **(2) the entire narrative reads "41 hours *ago*"** (a stale-fixture
time bug that makes the core story nonsensical), and **(3) the "Sky" view shows only 4 objects**, so
the signature "all the satellites around Earth" moment never lands. Fix those three and tighten the
vertical rhythm, and this is a top-tier entry.

---

## 0. Console / page errors per route

**Clean.** Across all 8 routes × 2 viewports, and across the entire Tour run, the audit captured
**zero console errors and zero page errors** (`results.json` → every route `consoleErrors: []`,
`pageErrors: []`; `tour.consoleErrors: []`, `tour.pageErrors: []`).

Important implication: **the Tour bug is NOT a crash.** Nothing throws. It is a silent state/logic
bug (see §6). Good engineering hygiene otherwise — no noisy warnings, no failed chunk loads, no WebGL
fatals even under software rendering.

---

## 1. Per-route critique

### `/` — Landing (`home-desktop.png`, `home-mobile.png`)
**Good:** The hero is the strongest screen in the app. "Don't just see the risk. Clear it." is a
punchy, benefit-led headline; the eyebrow ("AUTONOMOUS COLLISION-AVOIDANCE COPILOT"), the cyan-rimmed
Earth with colored orbit arcs, the single glowing primary CTA ("See a live threat") plus a quiet
secondary ("or just explore the sky"), and the provenance chips ("Offline demo data", "Protecting
CARTOSAT-2F") are textbook. Mobile reflows cleanly.

**Wrong:**
- **Massive dead zone below the fold.** In the full-page capture the hero fills the viewport, then
  there is a tall band of empty black before the footer (`home-desktop.png`, `home-mobile.png`). The
  sections that should live there — `HowItWorks`, `ProofStats`, `ExploreChapters` — **render
  invisible** because they animate in on scroll (framer-motion `whileInView`) and never trigger during
  a static/full-page render. This is a real demo risk: any screenshot, any "reduced motion" path, or a
  judge who doesn't scroll sees a half-empty page. It also means your *proof numbers* (your credibility)
  are hidden by default.
- The scroll hint ("Scroll ⌄") sits very close to the scene's bottom-right camera controls — they
  compete in the same corner.

### `/sky` — 3D globe + objects (`sky-desktop.png`, `sky-mobile.png`)
**Good:** Visually the hero moment of the whole app. The Earth is photoreal-ish with a convincing
atmosphere rim, day-side terrain, soft city-light glow, and tasteful colored orbit rings. Toolbar
(search + All objects / All owners / Any orbit / source + Globe|List) is clean and scannable. Mobile
sensibly defaults to the **List** view, which is the right call for small screens.

**Wrong (this is the big one):**
- **Only ~4 objects exist.** Probe result: `"· 4 shown"`, `canvasCount: 1`, list heuristic = 4. The
  globe renders the four hardcoded demo tracks (`CARTOSAT-2F`, `DEBRIS-001`, `RISAT-2BR1`, `SENTINEL`).
  It reads as "a few demo dots on a nice Earth," not "everything in orbit right now" — which is exactly
  what the copy promises ("Everything in orbit right now"). See §5.
- Desktop globe has no on-canvas object labels by default (Names toggle is off), so the 4 dots are
  unlabeled glints until you hover/click — low information scent.
- On the mobile list, names truncate aggressively ("Sentinel Comparison Demo …", "India (IS…") and the
  **protected** satellite CARTOSAT-2F is tagged **"Danger"** (red) — the same treatment as the debris.
  Tagging the thing you're protecting as "Danger" is confusing (it's *in* a dangerous conjunction, but
  the badge doesn't say that).

### `/threats` — Worklist (`threats-desktop.png`, `threats-mobile.png`)
**Good:** "What's about to get dangerously close." is a great plain-language title. The single
emphasized danger card with the red glow, the plain sentence, and "collision chance: very high (about
1 in 3,599)" is exactly the right altitude for a non-expert. Scenario tabs (Protect ISRO / 2009
Iridium-Cosmos Replay / Kessler Sandbox) are clear. Mobile is excellent.

**Wrong:**
- **"…41 hours *ago* — about 612 m apart."** A *threat* (a future close approach) is described in the
  past tense. This is a stale-fixture time bug (see §6.B) and it torpedoes the narrative.
- **Only one row, then a huge empty page.** With a single threat, the desktop layout is ~85% empty
  black below the card. The "ranked worklist" promise needs more rows (or a denser, more designed empty
  area: a "we also screened N other pairs, all clear" reassurance line).

### `/threats/:id` — Threat detail (`threat-detail-desktop.png`, `threat-detail-mobile.png`)
**Good:** Arguably the most polished content screen. Framed Earth scene at top, Danger badge, a big
human headline, a full-width red risk meter, three big legible stats (612 m / time / "slow (≈0.7
m/s)"), a "Show details (the math)" disclosure for Pro depth, and a strong "Plan the safe move" CTA.
This is the model the other routes should aspire to.

**Wrong:** Same "**41 hours ago**" bug in both the headline and the "When" stat. The headline becomes
self-contradictory: "*will* pass dangerously close … 41 hours *ago*."

### `/avoidance` — Plan the safe move (`avoidance-desktop.png`, `avoidance-mobile.png`)
**Good:** Beautiful. Wide Earth banner, clear 4-step progress rail (Confirm threat ✓ → Plan a safe
move → Apply → Report), a concise "Dodging this close approach" summary card, and a single confident
CTA ("Find the safe move"). The "≈ 6 football fields" analogy is delightful and on-brand. Mobile holds
up well.

**Wrong:** "CARTOSAT-2F has a close approach **41 hours ago**." again. Also the headline is centered
and *very* large on mobile (wraps to 3 lines) — borderline shouty, but acceptable.

### `/report` — Mission report (`report-desktop.png`, `report-mobile.png`)
**Good:** A genuinely well-designed **empty state** ("No report yet" + icon + explanation +
"Generate briefing" / "Go to Safe Move"). Header "Mission Report / Protect ISRO · CARTOSAT-2F vs
debris-demo-001 · 00:00 UTC". This is the right default and shows maturity.

**Wrong:** "**00:00 UTC**" reads like a zero/placeholder timestamp. And because the default state is
empty, a judge landing directly on `/report` sees "nothing happened yet" — consider pre-generating the
demo report so the most impressive screen isn't empty on arrival.

### `/learn` (`learn-desktop.png`, `learn-mobile.png`)
**Good:** Friendly, plain-language explainer. "Space is getting crowded. Here's how we keep satellites
from crashing — explained simply." + a "Why it matters" section and a "chain-reaction risk" card with
inline glossary terms. Good tone.

**Wrong:** Same **scroll-reveal invisibility** as home — the Glossary / Analogies sections below the
first card are blank in the full-page capture (`learn-desktop.png`), leaving a long empty page.

### `/system` — Under the hood (`system-desktop.png`, `system-mobile.png`)
**Good:** Credibility screen for judges. "How public orbit data becomes an exported, verifiable
decision," an "Open the API contract" CTA, a "Demo ready · 6/6 required checks passing" health chip,
and a horizontal pipeline (Load scenario → Read catalog → Propagate orbits → Screen conjunctions →
Plan maneuver → Brief decision) with a selected-stage detail panel (endpoint, evidence, tests). This
is a strong "this is real, not a mockup" argument.

**Wrong:** Again, content below the pipeline is hidden until scrolled (`system-desktop.png` shows
empty space below). The pipeline cards are dense and the labels are tiny — readable on desktop, tight.

---

## 2. Global issues

**Visual hierarchy & vertical rhythm.** The biggest cross-cutting problem after the bugs: **too much
empty vertical space** on content routes (`/threats`, `/report`, and the reveal-hidden lower sections
everywhere). Pages feel under-filled rather than calm. Either bring content up / cap max page height,
or design the empty regions deliberately (reassurance copy, secondary context, a persistent footer
CTA).

**Reveal-on-scroll fragility.** `whileInView` animations leave entire sections at opacity 0 in static
capture and likely in any non-scrolling glance. For a *demo*, motion that hides content by default is a
liability. Make content visible by default and let motion *enhance*, not gate, it.

**Clutter / spacing.** Low clutter overall — restraint is a strength. The few collisions: home scroll
hint vs. camera controls; the Tour card vs. the globe's bottom-right controls (see §6).

**Typography.** Confident and consistent display/sans pairing; good size jumps. Watch the centered
giant headlines on `/avoidance` at mobile (3-line wraps).

**Color / neon usage.** Tasteful and disciplined — cyan as the single accent, risk colors (green/amber/
red) reserved for risk. The neon doesn't scream. Keep it. Only nit: the protected asset showing a red
"Danger" tag dilutes the meaning of red (see `/sky`).

**Consistency.** Strong shared component system (Button, RiskBadge, chips, Surface). One semantic
inconsistency: risk/tag treatment of the protected object. One data inconsistency: the "41 hours ago"
string vs. future-tense verbs.

**Motion.** Generally elegant (route transitions, the one-time danger pulse on the lead threat row).
The two motion problems are functional, not aesthetic: the reveal-on-scroll hiding content, and the
Tour's broken navigation.

**Empty / loading / error states.** A real highlight — they exist across routes (skeletons on
`/threats` and `/sky` list, `EmptyState` on `/report` and filtered `/sky`, `ErrorState` with retry,
inline "Live source unavailable" notice). This is above hackathon norm.

**Mobile.** Better than desktop in places (Sky→List default, threat/avoidance reflow). Main mobile
issues: truncated names in the Sky list and the same empty-band/reveal problem.

---

## 3. 3D scene quality

- **Earth:** Excellent. Realistic textured day side, believable atmosphere/limb glow, subtle
  city lights, gentle auto-rotate. This is genuinely demo-grade and the app's best asset
  (`sky-desktop.png`, `threat-detail-desktop.png`, `avoidance-desktop.png`).
- **Orbits:** The colored orbit rings (cyan/red/amber) read well and imply risk. Good.
- **Satellites/debris:** Too few and too generic — 4 glowing blobs. At default zoom they're easy to
  miss and unlabeled. No size/shape differentiation between a satellite and debris beyond color.
- **Readability:** Without the Names toggle on, the globe is pretty but low-information. The threat line
  (the highlighted conjunction) is the clearest storytelling element when present.
- **Robustness:** Rendered correctly under headless software WebGL (swiftshader) with no errors — the
  scene degrades gracefully.

---

## 4. The Sky-view gap

**Finding:** `/sky` shows **exactly 4 objects** (`results.json` → `sky.shown: 4`, `canvasCount: 1`,
list heuristic 4). They are the hardcoded `DEMO_OBJECTS` in
`frontend/src/components/earth/scene.config.ts` (CARTOSAT-2F, DEBRIS-001, RISAT-2BR1, SENTINEL).

**Why it matters:** The copy and the Tour both promise "**Everything in orbit right now**." Four dots
cannot deliver that. The single most impressive, screenshot-worthy moment in a space app — a globe
*swarmed* with hundreds/thousands of tracked objects — is missing.

**Root of the gap:** `useSkyObjects` correctly fetches up to 120 catalog records
(`useCatalog({ limit: 120 })`), but the **geometry source of truth is `scenarioObjects()`**, which
always returns only the 4 demo tracks. The catalog is used merely to *enrich* those 4 tracks with
facts — it never spawns additional rendered objects. So no matter how big the catalog is, the globe is
capped at 4 dots.

**What's missing for an impressive "all satellites around Earth" view:**
1. Render the full catalog (hundreds+) as instanced points on the globe (one `InstancedMesh` /
   points cloud for performance), with color = risk/type.
2. Keep the 4 hero tracks as the *named, interactive* layer on top of the swarm.
3. A live count ("12,438 tracked objects") and a density/“declutter” toggle.
4. Optional: LEO/MEO/GEO shells or a faint great-circle field so the swarm reads as orbital, not random.

---

## 5. THE TOUR — exact behavior + root cause

### Observed behavior (evidence)
- The **"Tour" button is found** and clicking it **does open the card** (`results.json` →
  `tour.tourButtonFound: true`, `tour.dialogAppears: true`). So "clicking Tour does nothing" is *not*
  the failure — the card appears (`tour-step-1.png`: "GUIDED TOUR · 1 / 5 · Welcome to OrbitGuard").
- **Clicking "Next" does nothing.** The probe clicked "Next" **8 times**; every captured step is
  identical: `title: "Welcome to OrbitGuard"`, `counter: "1 / 5"`, `url: "http://127.0.0.1:5173/"`
  (`results.json` → `tour.steps[1..8]`). It **never advanced to step 2, never navigated to `/sky`, and
  never reached "Finish."** Visually, `tour-step-1.png` and `tour-step-2.png` are pixel-for-pixel the
  same card (progress shows only the first dot filled).
- **No errors** during any of this (`tour.consoleErrors: []`, `tour.pageErrors: []`). Silent freeze.

So the precise bug is: **the Guided Tour is frozen on stop 1/1-of-5; "Next"/"Back" cannot move it, and
it never drives navigation through Sky → Threats → Safe Move → Report.**

### Best root-cause hypothesis (high confidence)
The reset effect in `frontend/src/app/GuidedTour.tsx` lines **60–65**:

```60:65:frontend/src/app/GuidedTour.tsx
  useEffect(() => {
    if (active) {
      setStep(0);
      navigate(STOPS[0].path);
    }
  }, [active, navigate]);
```

and the advance handler, lines **51–58**:

```51:58:frontend/src/app/GuidedTour.tsx
  const go = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(STOPS.length - 1, index));
      setStep(clamped);
      navigate(STOPS[clamped].path);
    },
    [navigate]
  );
```

The dependency array of the reset effect includes **`navigate`**. With **react-router-dom v7**
(`package.json` → `"react-router-dom": "^7.17.0"`), the function returned by `useNavigate()` **changes
identity whenever the current location changes**. That creates a self-cancelling loop:

1. User clicks **Next** → `go(1)` runs `setStep(1)` and `navigate("/sky")`.
2. The location changes to `/sky` → `useNavigate()` returns a **new** `navigate` reference.
3. Because `navigate` is in `[active, navigate]`, the **reset effect re-runs** (`active` is still true).
4. It executes `setStep(0)` + `navigate("/")` → the step snaps back to 0 and the route returns to `/`.
5. `navigate("/")` again changes identity, but since the location is already `/`, it stabilizes — at
   **step 0, URL `/`, counter 1/5**. Every Next is instantly undone.

This is an exact match for the captured evidence (counter stuck at 1/5, URL never leaves `/`,
`tour-step-1.png` === `tour-step-2.png`, no errors). The tour started by `AppShell.startTour`
(`AppShell.tsx` lines 78–81) and rendered via `<GuidedTour active={tourActive} … />`
(`AppShell.tsx` line 190) is wired correctly — the defect is solely the effect's dependency.

### Fix (one-liner-class)
Make the "open" reset run **once per open**, not on every navigation. Either:
- Remove `navigate` from the dependency array so the effect only fires when `active` flips
  (`}, [active]);` — `navigate` is safe to call without being a dependency), **or**
- Guard with a ref that only resets when `active` transitions `false → true`:
  ```ts
  const wasActive = useRef(false);
  useEffect(() => {
    if (active && !wasActive.current) { setStep(0); navigate(STOPS[0].path); }
    wasActive.current = active;
  }, [active, navigate]);
  ```
Either removes the loop and lets `go()` advance normally. (A secondary nicety: the bottom-center Tour
card slightly overlaps the globe's bottom-right camera controls — once navigation works, nudge the card
or hide the scene controls during the tour.)

---

## 6. Prioritized improvement backlog

### P0 — must fix before judging (these break the demo narrative)
1. **Fix the Guided Tour** (`GuidedTour.tsx:60–65`): drop `navigate` from the reset effect's deps (or
   ref-guard it). The tour is the guided "happy path" for judges; right now it dead-ends on slide 1.
   *Verify by re-running `e2e/_audit.mjs` — `tour.steps` should show 1/5 → 5/5 across `/`→`/report`.*
2. **Kill the "41 hours ago" time bug.** The canonical conjunction's TCA is a fixed past timestamp, so
   every "time to closest approach" renders in the past tense across `/threats`, `/threats/:id`, and
   `/avoidance`. Make the demo TCA relative to "now" (e.g. `now + 41h`) or freeze a sensible "now."
   The core story currently reads as grammatically broken ("will pass … 41 hours ago").
3. **Make below-the-fold content visible by default.** Replace reveal-gating `whileInView` (opacity 0
   until scrolled) with always-visible content + subtle enhancement. Today the home proof numbers, the
   learn glossary, and the system detail are invisible in static views — hiding your credibility.

### P1 — high impact on "first-place polish"
4. **Populate the Sky globe with the full catalog** (instanced points for hundreds/thousands of objects)
   while keeping the 4 hero tracks named/interactive, plus a live "N tracked objects" count and a
   declutter toggle (see §4). This converts "nice Earth, few dots" into the signature wow moment.
5. **Tighten vertical rhythm / fill empty pages.** `/threats` (one card + 85% void) and `/report`
   (empty by default) need denser layouts or designed empty space (e.g. "Screened 412 pairs · 1 needs
   action · rest clear"). Consider pre-generating the demo report so `/report` isn't empty on arrival.
6. **Fix the protected-asset risk tagging** so CARTOSAT-2F isn't shown as plain "Danger" identical to
   debris — distinguish "Protected (at risk)" from "Threat/Debris" so red keeps its meaning (`/sky`).
7. **Default the Sky globe to show object names** (or label the 4 hero objects on canvas) so the scene
   has information scent without requiring a hover/click; fix mobile name truncation in the list.

### P2 — refinement
8. **De-conflict overlapping controls:** home scroll hint vs. camera controls; Tour card vs. globe
   controls during a tour.
9. **Replace placeholder timestamps** like `00:00 UTC` on `/report` with real, formatted values.
10. **Differentiate satellite vs. debris glyphs** in 3D (size/shape, not just color) and consider a
    faint orbital-shell backdrop for depth.
11. **System pipeline legibility:** the stage labels are tiny; bump size or add hover affordances.

---

## Appendix — artifacts
- Audit script: `frontend/e2e/_audit.mjs` (read-only; no app source modified).
- Machine-readable findings: `plan/audit/results.json`.
- Screenshots (`plan/audit/screens/`):
  `home-desktop.png`, `home-mobile.png`, `sky-desktop.png`, `sky-mobile.png`,
  `threats-desktop.png`, `threats-mobile.png`, `threat-detail-desktop.png`, `threat-detail-mobile.png`,
  `avoidance-desktop.png`, `avoidance-mobile.png`, `report-desktop.png`, `report-mobile.png`,
  `learn-desktop.png`, `learn-mobile.png`, `system-desktop.png`, `system-mobile.png`,
  `tour-step-1.png` … `tour-step-8.png` (all 8 identical — the freeze).
