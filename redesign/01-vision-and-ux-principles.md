# 01 — Vision & UX Principles

> Read this first. Docs 02–10 are implementations of the ideas here.

---

## 1. The product, told as a story

Imagine a single screen in a calm, dark control room. A glowing Earth turns slowly. A small
satellite icon pulses. A line of plain text reads:

> **"CARTOSAT-2F will pass dangerously close to a piece of debris in 4 hours."**

One button: **"Show me the safe move."**

Click it. The satellite nudges onto a slightly higher path, the danger line fades from red to
green, and the text updates:

> **"Done. A tiny 0.12 m/s nudge moves it from 600 m to 8.4 km away. Collision chance: now
> effectively zero. We also checked — this nudge doesn't put it near anything else."**

That is the entire product. Everything we build serves that moment.

---

## 2. Who we are designing for (in priority order)

| User | What they need | Design consequence |
|---|---|---|
| **Hackathon judge (non-space)** | To *get it* in 30 seconds and remember it | Plain language, one idea per screen, cinematic hero |
| **Hackathon judge (technical)** | Proof the science & engineering are real | "Show details" reveals math, assumptions, architecture |
| **Satellite operator (persona)** | Prioritized risk + a recommended action | Clear worklist → clear decision → clear confirmation |
| **Student / curious person** | To learn how orbital safety works | A first-class Learn experience with analogies |

The **non-space judge is the primary audience.** If they understand and remember us, we win.
Everyone else is served by progressive disclosure on top of that clarity.

---

## 3. The seven UX laws

These are testable. A screen either obeys them or gets sent back.

### Law 1 — One job per screen
Each route has exactly **one primary action** and **one primary thing to look at**. Sub-tasks
become steps, drawers, or child routes — never a second column competing for attention.

> ❌ Today: `/avoidance` shows sim + 5-step sequence + before/after + candidate matrix + assurance.
> ✅ Target: `/avoidance` shows the Earth + one "Run safe-move scan" button. Results appear *in place*.

### Law 2 — Plain words first, jargon second
The visible label is always human. The technical term is available on demand.

> "Closest approach" (hover: *"Time of Closest Approach — TCA"*).
> "Collision chance: 1 in 3,600" (hover: *"Probability of collision, Pc = 2.8 × 10⁻⁴"*).

### Law 3 — Let it breathe
Whitespace is the primary tool for hierarchy. Borders, glows, and panels are rationed. Aim for
**one focal element per viewport**, generous margins, and a calm background.

### Law 4 — Progressive disclosure
The default view is the simplest honest version. Raw TLEs, covariance settings, candidate
grids, and scientific notation live behind **"Show details" / "Advanced."**

### Law 5 — Motion explains, never decorates
Animation is allowed only when it (a) guides the eye to what changed, (b) shows a state
transition (risk red→green), or (c) makes the Earth feel alive. Everything respects
`prefers-reduced-motion`.

### Law 6 — Status is obvious and trustworthy
Loading, empty, error, and success states are designed first-class. No "corridor sync" /
"arming" placeholder copy that reads as broken. A spinner says **what** it's doing in plain words.

### Law 7 — Consistency over cleverness
A button looks like a button everywhere. A risk level is the same color everywhere. A metric is
shown the same way everywhere. Reuse components from doc 05; never hand-roll a new pattern.

---

## 4. The "Simple / Pro" idea (signature feature)

A single global toggle in the header: **`Simple`** (default) ↔ **`Pro`**.

- **Simple mode** (for judges, students): plain language, rounded human numbers, analogies,
  hides advanced panels. "Collision chance: very high (about 1 in 3,600)."
- **Pro mode** (for technical judges, operators): exact values, scientific notation, covariance
  model IDs, raw TLEs shown inline, extra columns.

This single switch lets us be *both* "understandable by anyone" **and** "technically serious"
without compromise. It is stored in the mission store and respected by every component.

> Implementation note: components read a `mode` from context and choose between a `plain` and a
> `pro` rendering of the same datum. The formatter layer (`format.ts`) gains `formatPlain()` vs
> `formatPro()` variants. See doc 05.

---

## 5. Plain-language strategy

Every number that matters to a layperson must answer **"is this good or bad, and how much?"**
*before* it shows a figure.

- **Risk** is shown as a **word + color first** (SAFE / WATCH / WARNING / DANGER), the number second.
- **Probabilities** get a "1 in N" framing in Simple mode (`Pc 2.8e-4` → "about 1 in 3,600").
- **Distances** get human comparisons where helpful ("600 m — about 6 football fields").
- **Every jargon term** is wrapped in a `<Term>` component that shows a tooltip and links to Learn.
- **Learn is promoted to top-level nav**, not hidden under "Intel."

A full jargon→plain dictionary lives in doc 03 (§ Plain-Language Dictionary).

---

## 6. Emotional arc of the demo (what each beat should *feel* like)

| Beat | Screen | Feeling |
|---|---|---|
| Hook | Home | "Whoa, space is crowded and beautiful." |
| Tension | Threats | "Oh no — something's about to get close." |
| Relief | Avoidance | "Phew, there's a simple safe move." |
| Trust | Avoidance (secondary check) | "Smart — it double-checked the new path." |
| Credibility | Report / System | "This is real engineering, not a toy." |

Design decisions should amplify the intended feeling of the beat they serve.

---

## 7. Anti-goals (things we will NOT do)

- ❌ No multi-column dashboards where everything is visible at once.
- ❌ No uppercase-950-weight-on-everything typography.
- ❌ No stacked global HUDs over already-busy pages.
- ❌ No unexplained acronyms in the default (Simple) view.
- ❌ No fake precision — we never present TLE-based estimates as operational truth.
- ❌ No breaking the offline, deterministic Protect ISRO demo.
