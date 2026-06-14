# OrbitGuard Redesign Plan (v2)

This folder is the **single source of truth** for the OrbitGuard full refactor: a complete
frontend redesign and a backend robustness pass. It is written to be executed by multiple
engineers and AI agents working in parallel.

> **One-line goal:** Turn a dense, jargon-heavy mission dashboard into a **clean, neon,
> cinematic product that anyone can understand in 30 seconds** — backed by a robust,
> credible API.

---

## Why we are doing this

The current build *works* (frontend builds, backend has 74 passing tests) but **loses the
competition on first impression**:

| Problem | Evidence | Impact |
|---|---|---|
| Everything is dumped on every page | Every route = hero + metric strip + 2–3 column workspace + lists + explain panel, all at once (Avoidance route is 499 lines) | Judges can't tell what to look at |
| Global overlays stack on top | TopNav + Mission Sync HUD + route hero + Demo Director bar = 4–5 layers | Feels chaotic, not premium |
| Space jargon is the default language | `Pc`, `TCA`, `delta-v`, `NORAD` everywhere; `/learn` is hidden in a dropdown | Non-space judges feel lost |
| Visual system shouts | `font-weight: 950`, uppercase, bordered + glowing panels everywhere across 6,300 lines of CSS | Nothing recedes; no hierarchy |
| 3D Earth feels broken | Reversed drag (`EarthScene.tsx:345`), satellites render as 2–3px dots, no real space background | Kills the "wow" moment |
| Backend hardcoded to one scenario | `apply`, `report`, conjunction IDs all pinned to Protect ISRO | Looks like a demo hack under questioning |

**This redesign keeps the strong product idea and the working orbital math**, and rebuilds the
experience and robustness around them.

---

## The vision in one sentence

> **OrbitGuard watches what's in orbit, spots when two objects are about to get dangerously
> close, and shows the single safe move to avoid a collision — explained so clearly that
> someone who knows nothing about space gets it instantly.**

Tagline stays: **"Don't just see the risk. Clear it."**

---

## How to read this folder

Read in order. Docs 01–04 are the **constitution** — every other doc and every line of code
must obey them.

| # | Doc | What it defines | Owner |
|---|---|---|---|
| 01 | [`01-vision-and-ux-principles.md`](01-vision-and-ux-principles.md) | Product story, target users, the 7 UX laws, plain-language strategy | Foundation |
| 02 | [`02-design-language.md`](02-design-language.md) | The neon-minimal design system: color, type, space, motion, glow rules | Foundation |
| 03 | [`03-information-architecture.md`](03-information-architecture.md) | New route map, navigation, the guided journey, jargon→plain dictionary | Foundation |
| 04 | [`04-frontend-architecture-and-stack.md`](04-frontend-architecture-and-stack.md) | Libraries to install, folder structure, state & data fetching, migration | Foundation |
| 05 | [`05-component-library.md`](05-component-library.md) | Spec for every reusable component (Button, Card, Stat, Tooltip, RiskMeter…) | Agent A |
| 06 | [`routes/`](routes/) | One detailed design spec per screen | Agents B/C |
| 07 | [`07-earth-3d-scene.md`](07-earth-3d-scene.md) | The 3D redesign: correct controls, real satellites, cinematic space, bloom | Agent D |
| 08 | [`08-backend-robustness.md`](08-backend-robustness.md) | Backend refactor: DI, error envelope, logging, de-hardcoding, readiness | Agent E |
| 09 | [`09-testing-and-acceptance.md`](09-testing-and-acceptance.md) | Unit/E2E/visual QA strategy and the demo acceptance gate | Agent F |
| 10 | [`10-execution-roadmap.md`](10-execution-roadmap.md) | Phased plan + **parallel-agent work breakdown** + dependencies + gates | Foundation |

---

## Non-negotiable principles (the short version)

1. **One job per screen.** If a screen has two primary actions, split it.
2. **Plain words first, the technical term second** (in a tooltip).
3. **Let it breathe.** Whitespace > borders. Neon is an *accent*, not a fill.
4. **Subtle motion with purpose.** Every animation must explain or guide, never decorate noise.
5. **Progressive disclosure.** Raw numbers and TLEs live behind "Show details."
6. **The hero demo must run offline and deterministically.** Never break Protect ISRO.
7. **Be honest about the science.** Show assumptions; never fake operational precision.

---

## What success looks like

- A non-technical person watching the 3-minute demo can explain *what OrbitGuard does* afterward.
- The 3D Earth makes people lean in (correct drag, glowing satellites, real starfield).
- Every screen has an obvious single next step.
- Switching scenarios (Protect ISRO / 2009 Replay / Kessler) works end-to-end, not just Protect ISRO.
- The codebase is clean enough that a new engineer ships a change in under an hour.

---

## Status of the existing codebase (verified 2026-06-14)

- Frontend: `npm run build` ✅ (single 922 KB bundle — needs code-splitting).
- Backend: `pytest` ✅ 74 passed.
- Deps installed: frontend `node_modules` present, root `.venv` present, Node 22, Earth texture present.
- This means we **refactor on a green baseline** — keep tests green throughout.
