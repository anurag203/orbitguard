# Route Spec — Home (`/`)

> Chapter: **See** (the hook). First screen anyone meets.
> Obeys: doc 01 (Laws 1–7), doc 02 (Neon Noir), doc 03 (IA), doc 04 (stack), doc 05 (components).
> Replaces: `frontend/src/routes/HomeRoute.tsx`.

---

## 1. Purpose & the ONE job (Law 1)

**The one job:** make a person who knows nothing about space feel *"space is crowded and
beautiful — and this thing watches it for danger"* in under 10 seconds, then pull them into the
story.

**The one thing to look at:** the live 3D Earth, turning, with glowing satellites.

**The single primary action:** **`See a live threat`** → navigates to `/threats` (the calm ranked
list, Protect ISRO active). This is the only glowing CTA on the screen.

> A single quiet ghost link ("or just explore the sky" → `/sky`) is permitted because it carries no
> glow and does not compete visually (doc 02 §1.4 "one accent action per view"). Everything else on
> the first viewport is non-interactive ambiance.

Anti-goal check: no metric strip, no mission card, no 4-tile workflow grid competing in the hero
(all of which the current `HomeRoute` stacks at once). Those move below the fold or are deleted.

---

## 2. Who it serves & the emotional beat (doc 01 §6)

| | |
|---|---|
| **Primary user** | Hackathon judge (non-space) — doc 01 §2 primary audience |
| **Secondary** | Technical judge (will scroll for proof), curious student |
| **Emotional beat** | **Hook — "Whoa, space is crowded and beautiful."** (doc 01 §6, row 1) |
| **What they must leave with** | "This app finds collisions before they happen and fixes them." |

Design consequence: cinematic over informative. The Earth and one sentence do the work; numbers
are demoted to proof *below* the fold.

---

## 3. ASCII wireframe — first viewport (desktop, 1440×900)

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  ORBITGUARD        Sky   Threats   Safe Move   Report     Learn  [Simple|Pro] ▶│  ← slim TopNav
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│                          · · ✦ ·   starfield   · ✦ · ·                         │
│                                                                                │
│                                  ╭─────────╮                                   │
│        Don't just see the        │  ◜◜◜◜◜  │   ← glowing satellite dots        │
│        risk. Clear it.           │ ◜  EARTH ◞│      orbiting the live Earth     │
│                                  │  ◞◞◞◞◞  │     (the ONE focal element)        │
│        Space is getting          ╰─────────╯                                   │
│        crowded. We spot the                                                    │
│        crashes before they                                                     │
│        happen — and show                                                       │
│        the one safe move.                                                      │
│                                                                                │
│        ┌──────────────────────┐                                               │
│        │  See a live threat  →│  ← ONE neon CTA (glow-cyan)                    │
│        └──────────────────────┘                                               │
│        or just explore the sky                ⌁ Offline demo data             │
│                                                                                │
│                              ⌄ scroll                                          │
└──────────────────────────────────────────────────────────────────────────────┘
        (below the fold ↓ : "How it works" 3 steps, then proof stats)
```

Breathing room: hero copy occupies the left ~40% column; the Earth lives center-right with wide
margins. No panels, borders, or cards in this viewport — only text on space.

---

## 4. Section-by-section breakdown (top → bottom)

### 4.1 TopNav (shared layout, `components/layout/TopNav`)
- Wordmark left; 4 chapters center (Sky · Threats · Safe Move · Report); right cluster: `Learn`,
  `Simple|Pro` `<ModeToggle>`, `▶ Demo`.
- Transparent over the hero (sits on the 3D scene); gains `bg-void/70 + backdrop-blur` after 24px
  scroll. No active item highlighted on Home (Home is not in the 4 chapters).
- Component: `<TopNav transparentOnTop />`.

### 4.2 Hero (the focal viewport)
- **Background:** `<EarthCanvas variant="hero" scenarioId="protect-isro" autoRotate ambient />`
  (doc 07). Lazy-loaded; low-power/reduced-motion fallback = a static starfield + still Earth image.
- **Eyebrow / tagline:** small caps label — the brand line.
- **Headline:** one `display` `<h1>` (Space Grotesk, clamp 40–72px). **Max one per screen.**
- **Subhead:** one `body-lg` paragraph, ≤ 2 lines, max-width ~46ch.
- **Primary CTA:** `<Button variant="primary" size="lg" glow>` → `/threats`.
- **Secondary:** `<Button variant="ghost">` (text only, underline-on-hover) → `/sky`.
- **Live chip:** `<Chip>` showing data source, fed by `useDemoStatus()`.

```tsx
<Hero>
  <p className="eyebrow">Autonomous collision-avoidance copilot</p>
  <h1 className="font-display text-display">Don't just see the risk. Clear it.</h1>
  <p className="text-body-lg text-base max-w-[46ch]">
    Space is getting crowded. OrbitGuard spots when two objects are about to get dangerously
    close — and shows the one small move that avoids a crash.
  </p>
  <div className="flex items-center gap-4">
    <Button variant="primary" size="lg" glow to="/threats" icon={<ArrowRight/>}>
      See a live threat
    </Button>
    <Button variant="ghost" to="/sky">or just explore the sky</Button>
  </div>
  <Chip tone={isLive ? "live" : "neutral"}>{isLive ? "Live data" : "Offline demo data"}</Chip>
</Hero>
```

### 4.3 "How it works" — 3 steps (below fold, section 2)
- A single row of three numbered steps (NOT links, NOT cards with glow) — just number + icon +
  one short line. This is the See → Spot → Solve story compressed.
- Component: `<HowItWorks steps={[…]} />` built from `<Stat>`-like primitives or a thin local
  `<Step>`; reveal-on-scroll (doc 02 §6.2).

```text
   01  ◐ Watch          02  ◎ Spot                 03  ✦ Clear
   We track what's      We flag when two get       We find the one tiny
   up there.            dangerously close.         nudge that avoids it.
```

### 4.4 Proof stats (below fold, section 3)
- Four `<Stat>` components in one row — the demo told as numbers, honest and demo-grounded.
- Fed by `useThreatDetail("conj-protect-isro-001")` (miss, Pc) + the canonical recommended-move
  numbers. Risk-relevant values use Simple framing.

```text
   ≈ 600 m            1 in 3,600          0.12 m/s            8.4 km
   how close it got   collision chance    the safe nudge      new safe gap
```

### 4.5 Footer
- Quiet `<Footer>` with wordmark, "Under the hood" (`/system`) link, "Learn" link, and the honest
  disclaimer: "Simulated, deterministic demo data — not a live operational warning."

### 4.6 Data hooks (`features/`) → real endpoints (`api.ts`)
| Hook | Backend call | Feeds |
|---|---|---|
| `useDemoStatus()` | `GET /api/demo/status` | Live/offline chip; readiness |
| `useScenarioRun("protect-isro")` | `POST /api/scenarios/protect-isro/run` | Protected asset name (CARTOSAT-2F) |
| `useThreatDetail("conj-protect-isro-001")` | `GET /api/conjunctions/conj-protect-isro-001` | Proof stats: miss ≈600 m, Pc → "1 in 3,600" |

> Home must render its hero **without waiting** on any fetch. Proof stats hydrate in; the headline,
> CTA, and Earth are static-first so the hook never blocks (doc 01 Law 6).

---

## 5. Plain-language copy (real strings)

All jargon wrapped in `<Term>` (doc 03 §6 dictionary).

```text
Eyebrow:    Autonomous collision-avoidance copilot
Headline:   Don't just see the risk. Clear it.
Subhead:    Space is getting crowded. OrbitGuard spots when two objects are about to get
            dangerously close — and shows the one small move that avoids a crash.
Primary CTA: See a live threat  →
Ghost link:  or just explore the sky
Live chip:   Offline demo data        (or "Live data" when source = live-celestrak)

How it works:
  01 Watch — We track what's up there.
  02 Spot  — We flag when two get dangerously close.
  03 Clear — We find the one tiny nudge that avoids it.

Proof stats (Simple mode):
  ≈ 600 m         — how close it got
  1 in 3,600      — collision chance        (<Term k="pc">collision chance</Term>)
  0.12 m/s        — the safe nudge          (<Term k="delta-v">nudge</Term>)
  8.4 km          — new safe gap

Footer note: Simulated, deterministic demo data — not a live operational warning.
```

Example one-sentence framing reused across the app (the canonical story sentence):
> **"CARTOSAT-2F will pass dangerously close to a piece of debris in about 4 hours."**

---

## 6. Simple vs Pro differences

| Element | Simple (default) | Pro |
|---|---|---|
| Collision chance stat | "1 in 3,600" | "Pc = 2.78 × 10⁻⁴" (mono) |
| Closest-approach stat | "≈ 600 m" | "611.8 m" |
| Safe-gap stat | "8.4 km" | "8,387.8 m" |
| Subhead | unchanged | unchanged |
| Extra | — | small mono line under proof stats: `conj-protect-isro-001 · demo-protect-isro` (source IDs) |

Pro reveals exact figures + the source/conjunction IDs; the hook copy never changes. Mode read from
`missionStore.mode` via context (doc 01 §4).

---

## 7. Loading / empty / error states (doc 03 §5)

| State | Trigger | Treatment & copy |
|---|---|---|
| **Loading** | `useThreatDetail` pending | Hero renders immediately. Proof stats show `<Skeleton>` shimmer bars (no spinner). No "corridor sync" text. |
| **3D loading** | EarthCanvas chunk loading | Static Earth still + faint starfield until canvas mounts; never a blank black box. |
| **Empty** | (n/a — Home always has the hero) | If the demo backend is unreachable, proof stats fall back to the canonical constants baked into copy so the story still reads. |
| **Error** | `useThreatDetail` errors | Proof stats area shows one calm line: "Live numbers are taking a moment — here's the demo." + `<Button variant="ghost" onClick={retry}>Try again</Button>`. Hook + CTA remain fully functional. |
| **Source** | `useDemoStatus` | Chip = "Offline demo data" (default) or "Live data". |

---

## 8. Motion (doc 02 §6)

- **Ambient (always-on, 3D):** Earth auto-rotates slowly; satellite dots gently glow/pulse (the
  one continuous motion allowed — doc 02 §6.2 "live pulse").
- **Entrance:** on first paint, headline + subhead + CTA fade + rise 8px, `slow` (400ms),
  staggered ~60ms; the Earth fades up from black over ~800ms.
- **Proof stats:** number **count-up** to value on first scroll into view (doc 02 §6.2).
- **"How it works":** reveal-on-scroll fade/rise, once.
- **CTA hover:** lifts 1px, `--glow-cyan` intensifies (`fast` 150ms).
- **Reduced motion:** disable rise/count-up/auto-rotate/pulse; show final values instantly, Earth
  static (doc 02 §6.3).

---

## 9. Mobile layout notes

- Hero stacks: Earth becomes a top ~45vh band; headline + subhead + CTA below it, centered, page
  padding 20px.
- One full-width primary CTA; ghost link beneath it.
- "How it works" 3 steps stack vertically; proof stats become a 2×2 grid.
- TopNav collapses to wordmark + menu button → slide-over sheet (doc 03 §3.2). No bottom demo bar.
- EarthCanvas uses the low-power profile on mobile (doc 07).

---

## 10. Acceptance criteria (reviewer checklist)

- [ ] First viewport shows exactly **one** glowing CTA and **one** `<h1>` (Law 1, doc 02 §10).
- [ ] The Earth is the single focal element; no metric strip / mission card / workflow tiles in the
      first viewport (regression vs current `HomeRoute`).
- [ ] Primary CTA "See a live threat" routes to `/threats`; ghost link routes to `/sky`.
- [ ] All jargon (collision chance, nudge) is wrapped in `<Term>`; tooltips open on hover **and**
      keyboard focus (doc 02 §9).
- [ ] Simple/Pro toggle swaps proof stats between "1 in 3,600" and "Pc = 2.78 × 10⁻⁴" live, with no
      reload (doc 01 §4).
- [ ] Hero text + CTA render and are clickable before any API resolves (Law 6).
- [ ] Loading shows skeletons (no bare spinner, no "sync" placeholder copy); error shows a calm
      retry and never blocks the hook.
- [ ] Live/offline chip reflects `useDemoStatus()` source.
- [ ] `prefers-reduced-motion` disables count-up, rise, auto-rotate, and pulse.
- [ ] Mobile: Earth band + stacked copy + full-width CTA; nav collapses to a sheet.
- [ ] Color/spacing use theme tokens only (no raw hex, doc 04 §8); risk numbers use semantic risk
      color where shown.
- [ ] Lighthouse: hero LCP element is text/CTA, not the 3D canvas (canvas is lazy, doc 04 §6).
