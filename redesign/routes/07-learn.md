# 07 — Route Spec: Learn (`/learn`)

> The promoted, first-class **plain-English explainer**. Friendly, scrollable, full of analogies — and
> home to the **glossary that powers every `<Term>` tooltip in the app**. Learn is no longer hidden in a
> dropdown; it sits in the top-nav utility cluster and is where curiosity is rewarded.
>
> Obeys docs 01–04. Replaces `LearnRoute.tsx` (training-stepper + readiness checks + dead `/mission`,
> `/catalog`, `/risk` links). The glossary becomes a **single source of truth**, not a static array.

---

## 1. Purpose & the ONE job (Law 1)

**One job:** *Let anyone understand what OrbitGuard does — and what each term means — in plain English,
with analogies.*

**The one thing to look at:** a calm, readable explainer that begins with the 30-second story.

**The single primary action:**

```
[ See it live → ]   → /avoidance (the hero "safe move")
```

One forward action into the product. The page is otherwise a **scroll**, not a task: story → how it
works (3 steps) → analogies → glossary → honest limitations. Secondary links (to System, Report) are
quiet text links, never competing CTAs. The old route had a primary link, a secondary link, a 4-stage
training stepper with its own CTA, a readiness panel, a 5-item "learning paths" grid, and a footer nav —
many competing actions pointing at routes that no longer exist (`/mission`, `/catalog`, `/risk`).

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| Audience | What they take away |
|---|---|
| **Student / curious person (primary here)** | "Oh — *that's* how orbital safety works. The football-field analogy makes it click." |
| **Non-space judge** | A safety net: any term they didn't catch in the demo is explained here (and on hover via `<Term>`). |
| **Technical judge** | A clean bridge: "for the math and architecture, see Under the Hood." |

**Emotional beat: Comprehension / "I get it now."** A calm, confident *aha*. The page should feel like a
friendly expert explaining over coffee — short paragraphs, concrete comparisons, zero condescension, no
wall of acronyms. (This complements the demo arc in doc 01 §6; Learn is the always-available "make it
click" companion.)

---

## 3. ASCII wireframe — first viewport (desktop)

One focal element: the plain-English story headline. Generous space; the rest is below the fold.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD      Sky   Threats   Safe Move   Report     Learn  [Simple|Pro]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   Learn                                                                    │  ← eyebrow
│                                                                            │
│   Space is getting crowded. Here's how we keep                            │  ← h1 (display), plain
│   satellites from crashing — explained simply.                            │
│                                                                            │
│   OrbitGuard watches what's in orbit, spots when two objects are about     │  ← body-lg, ≤68ch
│   to get dangerously close, and shows the one safe move to avoid a         │
│   collision. No space background required.                                 │
│                                                                            │
│        [ See it live → ]        Read the glossary ↓                         │  ← 1 primary + jump link
│                                                                            │
│   · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·  │
│                                                                            │
│   ▼ scroll: How it works · Analogies · Glossary · Honest limits            │  ← scroll hint
└──────────────────────────────────────────────────────────────────────────┘
```

Below the fold, in order (each a calm section with 64–96px rhythm):

```
── How it works (3 steps) ──────────────────────────────────────────────────
 (1) See        (2) Spot                 (3) Solve
 What's up      When two objects will     The one small nudge that
 there now.     pass too close.           opens the gap — safely.

── Analogies ───────────────────────────────────────────────────────────────
 "600 m in orbit"  →  two cars drifting into the same lane at 27,000 km/h.
 "A 0.12 m/s nudge" →  a gentle tap on the gas, hours early, so you arrive a
                       moment later and miss completely.
 "Double-check"     →  after changing lanes, glancing at every other mirror.

── Glossary (powers <Term> tooltips) ───────────────────────────────────────
 Closest approach · Collision chance · Close approach · Nudge · Double-check ·
 Catalog number · Orbit data · Low orbit · Margin of error · …

── Honest limitations ──────────────────────────────────────────────────────
 A learning tool with demo-grade estimates — not operational command authority.
 For the engineering: Under the Hood →
```

---

## 4. Section-by-section breakdown (content · components · data)

### 4.1 Hero / the 30-second story
- **Component:** `<PageHeader eyebrow="Learn" title subtitle>` over a calm background (optionally a very
  subtle, slow starfield — not the full interactive Earth; Learn is text-first and reduced-motion-safe).
- **Primary:** `<Button variant="primary">See it live →</Button>` → `/avoidance`.
- **Jump link:** `<Button variant="ghost">Read the glossary ↓</Button>` smooth-scrolls to the glossary
  anchor (`#glossary`).
- **Data:** none required (static, evergreen copy). Optionally personalize one line with the current
  scenario's protected asset via `useScenarios()` (e.g., "Right now we're protecting **CARTOSAT-2F**"),
  but it must read fine with no data.

### 4.2 How it works — 3 steps
- **Component:** `<Steps variant="cards">` (3 `<Card>`s: See / Spot / Solve), mirroring the IA story
  *See → Spot → Solve → Prove*. Each card: an icon (`lucide-react`, 1.5px stroke), a plain title, 1–2
  sentences. Each maps to a route so it doubles as gentle navigation:
  - **See** → `/sky`, **Spot** → `/threats`, **Solve** → `/avoidance` (and a note that **Prove** = the
    Report).
- **Data:** none (evergreen). No dead links — only the 7 real routes.

### 4.3 Analogies (the signature friendly bit)
- **Component:** `<AnalogyList>` (a thin domain wrapper over `<Card>`), each row = a jargon idea paired
  with an everyday comparison. This is where Learn earns its keep for non-space people.
- Distances/speeds get human comparisons (doc 03 §6 number framing): football fields, lane-changing,
  "≈ X× a rifle bullet" for closing speed (this comparison is *allowed only in Learn*, per doc 03 §6).
- **Data:** evergreen, but the numeric examples should match the canonical Protect ISRO figures so the
  analogies line up with what judges saw in the demo.

### 4.4 Glossary — **the single source that powers `<Term>` tooltips**
This is the most important architectural point of the route.

- **Source of truth:** `lib/terms.ts` exports the plain-language dictionary (doc 03 §6). Both the
  `<Term>` tooltip component **and** this glossary section import the **same** object — definitions can
  never drift.

```ts
// lib/terms.ts  — ONE source for tooltips AND the Learn glossary
export type TermEntry = {
  short: string;      // plain label shown in body text:  "collision chance"
  technical: string;  // the jargon:                      "Pc — Probability of Collision"
  tooltip: string;    // one-liner shown on hover/focus:   "How likely a crash is, e.g. '1 in 3,600'."
  long?: string;      // optional richer paragraph for the Learn glossary card
  analogy?: string;   // optional everyday comparison
  learnHref?: string; // anchor into this page, e.g. "/learn#pc"
};

export const TERMS = {
  tca:                { short: "closest approach", technical: "TCA — Time of Closest Approach", tooltip: "When the two objects are nearest." },
  missDistance:       { short: "how close",        technical: "Miss distance",                  tooltip: "The smallest gap between them." },
  pc:                 { short: "collision chance", technical: "Pc — Probability of Collision",  tooltip: "How likely a crash is, e.g. '1 in 3,600'." },
  conjunction:        { short: "close approach",   technical: "Conjunction",                    tooltip: "Two objects passing dangerously near each other." },
  deltaV:             { short: "nudge",            technical: "Delta-v (Δv)",                   tooltip: "How hard we push the satellite to change its path." },
  alongTrack:         { short: "speed-up nudge",   technical: "Along-track maneuver",           tooltip: "Changing speed along the orbit to shift timing." },
  secondaryScreening: { short: "double-check",     technical: "Secondary screening",            tooltip: "Making sure the new path isn't near anything else." },
  norad:              { short: "catalog number",   technical: "NORAD ID",                       tooltip: "The official ID number for a tracked object." },
  tle:                { short: "orbit data",       technical: "TLE",                            tooltip: "The standard data describing an object's orbit." },
  leo:                { short: "low orbit",        technical: "LEO",                            tooltip: "A close-to-Earth orbit (under ~2,000 km)." },
  covariance:         { short: "margin of error",  technical: "Covariance / uncertainty",       tooltip: "How unsure we are about exact positions." },
  propagation:        { short: "orbit prediction", technical: "Propagation",                    tooltip: "Calculating where an object will be over time." },
  relativeVelocity:   { short: "closing speed",    technical: "Relative velocity",              tooltip: "How fast the two objects approach each other." },
  kessler:            { short: "debris chain reaction", technical: "Kessler syndrome",          tooltip: "Collisions creating debris that cause more collisions." },
} as const satisfies Record<string, TermEntry>;

export type TermKey = keyof typeof TERMS;
```

- **`<Term>` usage everywhere else:** `<Term k="pc">collision chance</Term>` renders the child text with
  a dotted underline; on hover/focus a Radix tooltip shows `TERMS.pc.technical` + `TERMS.pc.tooltip` and
  a "Learn more" link to `/learn#pc`. (Accessibility: openable on focus, not hover-only — doc 02 §9.)
- **Glossary section component:** `<Glossary>` maps over `Object.entries(TERMS)` into `<Card id={key}>`
  entries showing `short` (heading), `technical` (muted sub), `long || tooltip` (body), and `analogy` if
  present. Each card has the `id` anchor so `<Term>`'s "Learn more" deep-links land here.
- **Search/filter (optional, nice):** a `<Input>` to filter the glossary; pure client filter over `TERMS`.
- **Result:** add a term once in `lib/terms.ts` → it appears in the glossary **and** is hoverable
  app-wide. This is the route's defining contract.

### 4.5 Honest limitations + bridge to System
- **Component:** `<Callout tone="muted">` — plain statement that this is a learning tool with demo-grade
  estimates, not operational authority (mirrors doc 01 §7 anti-goals, no fake precision).
- Quiet text links: **"Under the Hood →"** (`/system`) and **"See a finished report →"** (`/report`).

---

## 5. Plain-language copy (real example strings)

**Hero**
```
Space is getting crowded. Here's how we keep satellites from crashing — explained simply.

OrbitGuard watches what's in orbit, spots when two objects are about to get
dangerously close, and shows the one safe move to avoid a collision.
```

**How it works**
```
1 · See    — We map what's up there: working satellites and old debris.
2 · Spot   — We flag when two of them are about to pass too close for comfort.
3 · Solve  — We find the smallest nudge that opens the gap — then prove it's safe.
```

**Analogies**
```
“600 metres apart” sounds far — but these objects move at about 7.6 km every
second. It's like two cars drifting into the same lane at 27,000 km/h.

A “0.12 m/s nudge” is a feather-light tap on the gas, hours early. The satellite
arrives a moment later than it would have — and the danger simply passes by.

The “double-check” is the glance in every mirror after you change lanes: making
sure the new path isn't about to surprise something else.
```

**Glossary entries (verbatim from `lib/terms.ts`, so tooltips match exactly)**
```
Closest approach   (TCA — Time of Closest Approach)
  When the two objects are nearest.

Collision chance   (Pc — Probability of Collision)
  How likely a crash is, e.g. “1 in 3,600”. In the demo we also show it as a word —
  negligible, low, high, very high.

Nudge   (Delta-v / Δv)
  How hard we push the satellite to change its path. Smaller is cheaper and gentler.

Double-check   (Secondary screening)
  After planning a move, making sure the new path isn't near anything else we track.
```

**Honest limitations**
```
This is a learning and demo tool. It uses public orbit data and simplified,
deterministic estimates so the demo always runs the same way. Real missions need
authoritative tracking, flight-dynamics review, and a human in the loop.
```

---

## 6. Simple vs Pro differences

Learn is **plain by design in both modes** — it must never become jargon-first. Pro adds depth, never
replaces the plain text:

| Element | Simple (default) | Pro |
|---|---|---|
| Glossary card | `short` + plain `long`/tooltip + analogy | also shows `technical` prominently and a tiny example value (e.g., `Pc = 2.78×10⁻⁴`) |
| Number framing | "about 1 in 3,600", "≈ 7.6 km/s" | exact `2.78×10⁻⁴`, `7.61 km/s` alongside the plain phrasing |
| Bridge links | "Under the Hood" as a friendly link | same; Pro readers are nudged there sooner |
| Analogies | always shown | always shown (kept — analogies help everyone) |

Mode via `useMode()`. Because the glossary is generated from `TERMS`, Pro simply reveals the `technical`
field and example values; Simple hides them. The `<Term>` tooltip itself always shows both `short`
context and `technical`, since hovering a word is an explicit ask to learn the jargon.

---

## 7. Loading / empty / error states (doc 03 §5) + integration risk

Learn is **static/evergreen** — it renders fully with **no network**. This is deliberate: the help page
must work even if the API is down.

- **Loading:** none required for core content. If the optional personalization (current protected asset
  via `useScenarios()`) is in flight, render the **neutral evergreen sentence** immediately and swap in
  the name only if/when it resolves — never block the page or show a spinner.
- **Empty:** not applicable (content is always present). The glossary is never empty because it's sourced
  from the in-bundle `TERMS` object.
- **Error:** if the optional personalization call fails, **silently** keep the evergreen copy (no error
  UI on a help page).

**Integration note (scenario hardcoding):** Learn does **not** call `apply`/`report`, so the Protect
ISRO hardcoding (README §"Backend hardcoded"; backend doc 08) doesn't affect correctness here. The only
care: keep analogy example numbers aligned with the canonical Protect ISRO figures so they match the
demo. When doc 08 generalizes scenarios, Learn's evergreen copy needs no change; only the optional
"currently protecting X" line follows the active scenario.

---

## 8. Motion (doc 02 §6)

| Moment | Motion | Spec |
|---|---|---|
| Page enter | Hero fades + rises 8px | `slow`, `ease` |
| Reveal on scroll | Each section (How it works, Analogies, Glossary, Limits) fades/rises once on entry | `base`, once; IntersectionObserver |
| Glossary anchor jump | Smooth scroll; target card gets a brief cyan highlight ring | `base` scroll, 1s highlight fade |
| Term tooltip | Fade/scale in on hover/focus | `fast` (150ms) |
| Step cards | Hover lift 2px | `fast` |

**Rules:** Learn is the calmest route — text-first, no count-ups, no looping animation, no heavy 3D.
`prefers-reduced-motion`: disable rise/stagger/highlight and any background drift; tooltips appear
instantly. (Reduced-motion friendliness matters most here since this is the read-heavy page.)

---

## 9. Mobile layout notes

- Single column, 20px padding, comfortable line-height (1.6) and ≤68ch measure preserved by the viewport.
- Hero: title, paragraph, then a **full-width** "See it live →" button; "Read the glossary ↓" beneath as
  a ghost link.
- How-it-works steps stack vertically (1 → 2 → 3) with the connecting story implied by order.
- Analogies stack as full-width cards.
- Glossary: a single-column list of cards; the optional filter `<Input>` sticks to the top of the section
  while scrolling within it. `<Term>` tooltips open on tap (Radix), dismiss on outside tap, and remain
  reachable by keyboard/AT.
- Generous vertical rhythm (48–64px) so the long scroll never feels dense.

---

## 10. Acceptance criteria checklist

- [ ] Learn is reachable from the **top-nav utility cluster** (not a dropdown) and from Report/System links.
- [ ] First viewport is the plain 30-second story + exactly **one** primary action ("See it live →"); no competing CTAs, no dead links (`/mission`, `/catalog`, `/risk` are gone).
- [ ] The page renders **fully with no network** (evergreen content); optional personalization degrades silently.
- [ ] The glossary is generated from `lib/terms.ts` (`TERMS`), and the **same** object powers every `<Term>` tooltip — definitions cannot drift.
- [ ] Each glossary card has an `id` anchor; `<Term>`'s "Learn more" deep-links (e.g. `/learn#pc`) scroll to and highlight the right card.
- [ ] Analogies section presents at least 3 everyday comparisons; distance/speed comparisons match the Protect ISRO demo figures.
- [ ] `<Term>` tooltips open on **hover and focus**, show `technical` + `tooltip`, and are keyboard/AT accessible.
- [ ] Simple mode is plain-first; Pro reveals `technical` + example values without removing plain text.
- [ ] Honest-limitations callout present; bridges to Under the Hood and Report as quiet links.
- [ ] `prefers-reduced-motion`: no rise/stagger/highlight/background drift; tooltips instant.
- [ ] Mobile: single column, full-width primary, glossary tappable tooltips, comfortable rhythm.
- [ ] Adding a new term to `lib/terms.ts` makes it appear in the glossary **and** hoverable app-wide with no other edits (verified once).
