# OrbitGuard Demo Script

A tight, ~3-minute live walkthrough for judges. It mirrors the upgraded, separately-routed UI:
**Home → Sky → Threats → Avoidance → Report**, ending on the one idea worth remembering:

> **Don't just see the risk. Clear it.**

**Before you start:** open the static build (or `http://localhost:5173`), set the **Detail level**
toggle to **Simple** (top-right; switch to **Pro** only when a judge wants the raw numbers), and
make sure you're on the **Protect ISRO** scenario (the deterministic default). Everything runs
offline.

---

## The one-liner (say this first, 10s)

> "OrbitGuard is a collision-avoidance copilot. It spots when two objects in orbit are about to get
> dangerously close, shows the **one small move** that avoids the crash, and proves the new path is
> safe — in plain language. And it's running **fully offline and deterministic**, so it shows the
> same thing every time."

---

## Shot List (~3:00)

### 0:00 – 0:25 · Home `/` — the hook

- Cinematic 3D Earth in a starfield; the one-sentence pitch and a single call to action.
- **Say:** "Space isn't empty anymore. OrbitGuard protects a working satellite — India's
  CARTOSAT-2F — from a piece of debris *before* the close approach becomes a crisis."
- Click the primary CTA (or **Sky** in the top nav) to go in.

### 0:25 – 0:55 · Sky `/sky` — "everything in orbit"

- The interactive Blue-Marble globe with **~500 real, SGP4-propagated objects** glowing by risk.
- **Drag to spin** the Earth; mention you can **zoom**, **filter** (satellite/debris, owner, orbit),
  and **search**.
- Click **CARTOSAT-2F** (or the red debris object) → the side panel explains it in one plain
  sentence, with facts (owner, orbit) and a forward action.
- **Say:** "These are actual two-line element sets, propagated live in the browser. One of these
  objects is on a worrying path — let's rank the danger."
- Forward action / nav → **Threats**.

### 0:55 – 1:25 · Threats `/threats` — ranked worst-first

- A calm list titled **"What's about to get dangerously close."**, sorted **worst-first** (risk band,
  then smallest miss distance).
- Read the top row **as a sentence**:
  > "CARTOSAT-2F will pass **dangerously close** to a piece of debris **in about 18 hours** —
  > about **612 m** apart."
- **Say:** "Notice it's ~18 hours *out* — a live countdown, not a stale alert. That's the moment to
  act." *(Optional Pro toggle: miss `611.8 m`, Pc `2.779e-4`, severity `critical`.)*
- Click the worst row → **Avoidance** (carries the conjunction through).

### 1:25 – 2:25 · Avoidance `/avoidance` — the hero moment

This is the screen that wins the demo. The slim stepper reads **Confirm threat → Plan a safe move →
Apply → Report**.

1. Click **"Find the safe move."**
   - **Say:** "The copilot evaluates **18 candidate burns** and picks the smallest safe nudge: a
     **0.12 m/s** along-track burn **4 hours** before closest approach."
2. The **Before / After risk** panel animates **red → green**. Click **"Apply this move,"** confirm
   in the dialog (**"Apply the move"**).
   - **Say:** "Miss distance opens from **~612 m to ~8.4 km**, and collision probability collapses
     from **2.8 × 10⁻⁴ to essentially zero**."
3. The **double-check** reveals itself automatically (no button) with a drawn check-mark:
   > "We double-checked the new path — **3 objects screened, all clear.**"
   - **Say:** "This is the part most tools skip: it re-screens the *new* orbit so the dodge doesn't
     quietly create a *different* collision."
4. Click **"See the report."**

### 2:25 – 2:55 · Report `/report` — the proof

- A clean, printable mission briefing: the threat, the chosen maneuver, before/after metrics,
  secondary-screening result, and a full **source-ID audit trail** + honest **limitations**.
- Click **"Export (Markdown)"** (downloads `report-protect-isro-001.md`; **Print/Save-as-PDF** and
  **Copy** are also there).
- **Say:** "Every number traces back to a source ID, and the assumptions are stated up front — no
  false precision."

### 2:55 – 3:00 · Close

- **Say:** "OrbitGuard makes space safety **explainable, accessible, and actionable**.
  Don't just see the risk — **clear it.**"

---

## Credibility beat (drop in anywhere, ~5s)

> "All of this runs **fully offline and deterministic** — the API is pre-baked to static JSON, so
> there's no server in production and the Protect ISRO flow is byte-for-byte reproducible. The hero
> conjunction is computed end-to-end with **SGP4**; the Pc model and every assumption are visible in
> **Pro mode** and 'Under the hood'."

## Optional: Guided Tour (hands-free fallback)

If you'd rather not click around, hit **Tour** (top-right). It walks the same five stops —
**Welcome → See the sky → Spot the danger → Make the safe move → Prove it** — with one narration
card; arrow keys advance, **Esc** exits, and it never locks the page.

## Optional: Simple / Pro toggle

**Simple** tells the story in plain language ("about 612 m apart, in about 18 hours"). Flip to
**Pro** to expose exact figures (`611.8 m`, `2.779e-4`, `Δv 0.12 m/s @ T−4h`, UTC TCA) for a
technical judge.

---

## If something breaks (fallbacks)

- **A route looks empty / data didn't load:** every screen has a retry/empty state. Refresh once;
  the static JSON is committed, so a reload fixes transient hiccups.
- **3D Earth is slow or won't render** (weak GPU / WebGL off): the scene degrades to a fallback —
  keep narrating; **Threats → Avoidance → Report** don't depend on the globe.
- **Lost the conjunction selection on `/avoidance`:** it defaults to the Protect ISRO hero
  (`conj-protect-isro-001`); just click **"Find the safe move."**
- **Live data toggle errors:** ignore it — the demo is offline by design; the committed snapshot is
  the source of truth.
- **Worst case:** open `/report` directly and click **Export (Markdown)** — the briefing alone tells
  the whole alert → action → proof story.

## Backup beats (if you have extra time)

- **2009 Replay:** switch scenario on Threats — "If OrbitGuard had existed before the
  Iridium 33 / Cosmos 2251 collision…" (a fixed historical *what-if*, ~11.7 km/s closing speed).
- **Kessler Sandbox:** "Why a single debris cloud raises everyone's risk." (education mode — it
  shows the threat, never a live maneuver.)
