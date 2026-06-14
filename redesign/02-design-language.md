# 02 — Design Language: "Neon Noir"

The visual system for OrbitGuard v2. **Minimal, dark, cinematic, with restrained neon accents
and subtle motion.** This doc is the contract for every pixel.

Design north star: *a high-end mission-control product designed by people who also love
sci-fi film UI* — think the calm, dark, glowing interfaces of a premium space app, not a
data-dense Bloomberg terminal.

---

## 1. Core principles for the visual layer

1. **Dark, deep, and quiet.** The canvas is near-black space. Content floats on it.
2. **Neon is an accent, never a fill.** Glow marks *the one thing that matters* on a screen.
3. **Hierarchy via size + weight + color + space — not borders.** Most panels have no visible border.
4. **One accent action per view.** Only the primary CTA gets the full neon glow treatment.
5. **Soft, slow, subtle motion.** Easing is gentle; durations 150–400ms for UI, slow for ambient.

---

## 2. Color system

All colors are defined as CSS variables / Tailwind theme tokens. Use semantic names in code,
never raw hex.

### 2.1 Base (space) — the dark canvas
```
--bg-void:      #05070E   /* app background, deepest */
--bg-base:      #0A0E1A   /* default surface base */
--bg-surface:   #111726   /* raised surface (cards) */
--bg-surface-2: #18202F   /* highest surface (popovers, menus) */
--hairline:     rgba(140, 170, 210, 0.10)  /* 1px separators, used sparingly */
```

### 2.2 Text
```
--text-strong: #F4F8FF   /* headings, key numbers */
--text-base:   #C3CEDE   /* body */
--text-muted:  #8090A6   /* secondary, labels */
--text-faint:  #586377   /* captions, disabled */
```

### 2.3 Neon accents (the brand)
A tight, two-hue neon palette. **Cyan is the primary brand.** Magenta is the secondary spark.
```
--neon-cyan:    #38E8FF   /* PRIMARY brand / primary actions / live data */
--neon-cyan-dim:#1FA9C4
--neon-violet:  #A571FF   /* secondary accent / selections / highlights */
--neon-magenta: #FF5CD0   /* rare third accent — use only for special emphasis */
```

### 2.4 Status (risk) — semantic, consistent EVERYWHERE
Risk color is sacred: the same level is the same color on the globe, lists, meters, and reports.
```
--safe:     #34F5C5   /* SAFE / cleared / nominal (mint-green) */
--watch:    #6EE7FF   /* WATCH (cool cyan) */
--warning:  #FFC24B   /* WARNING (amber) */
--danger:   #FF5470   /* DANGER / critical (red-pink) */
```
> Mapping to current severity bands: nominal→safe, watch→watch, warning→warning, critical→danger.

### 2.5 Usage rules
- **Background** is `--bg-void`. Surfaces step up: `base` → `surface` → `surface-2`.
- **Glow** (box-shadow with color) is allowed only on: the primary CTA, the active nav item,
  the current risk badge, and live/3D highlights. Never on every card.
- **Borders**: prefer none. When separation is needed, use `--hairline` (a 1px, ~10% line) or a
  subtle elevation/shadow — not a bright neon border.
- **Contrast**: text on surfaces must meet WCAG AA (≥4.5:1 for body). `--text-base` on
  `--bg-surface` passes; verify any new combos.

---

## 3. Typography

Two typefaces, loaded locally (no external CDN at runtime — keep offline-safe).

| Role | Font | Notes |
|---|---|---|
| UI / body | **Inter** (already used) | Variable weight, 400–700 |
| Display / big numbers | **Space Grotesk** | Distinctive, geometric, for hero headlines & big metrics |
| Data / mono (Pro mode, TLEs, IDs) | **JetBrains Mono** or system mono | For raw orbital data only |

> Self-host the fonts under `frontend/public/fonts/` and declare `@font-face` so the demo works
> offline. Do not rely on Google Fonts at runtime.

### 3.1 Type scale (desktop; clamp for fluid)
```
display:  clamp(40px, 6vw, 72px)  / 700 / -0.02em   (hero only)
h1:       32px / 600 / -0.01em
h2:       24px / 600
h3:       18px / 600
body-lg:  17px / 400 / 1.6 line-height
body:     15px / 400 / 1.6
label:    13px / 500 / 0.01em  (NOT uppercase by default)
caption:  12px / 500 / --text-muted
mono:     14px / 450  (data only)
```

### 3.2 Typography rules
- **Kill the all-caps + 950-weight default.** Uppercase is reserved for tiny eyebrow labels only,
  at `letter-spacing: 0.08em`, and even then sparingly.
- Max **one** `display`/`h1` per screen.
- Body copy max width ~68ch for readability.
- Big numbers use Space Grotesk; pair a large value with a small muted label beneath it.

---

## 4. Spacing & layout

8px base grid. Use the scale; don't invent values.
```
space: 4, 8, 12, 16, 24, 32, 48, 64, 96   (px)
radius: sm 8, md 12, lg 16, xl 24, full 999
container max-width: 1200px (content), 1440px (immersive/3D)
section vertical rhythm: 64–96px between major sections
```

### 4.1 Layout rules
- **Generous gutters.** Page padding ≥ 32px desktop, 20px mobile.
- **One focal element per viewport.** The first screen of every route shows the hero + primary
  action with nothing competing.
- **12-column grid** available, but most screens are a centered single column or a 2/3 + 1/3 split.
- **No more than 2 columns** of substantive content at desktop. Everything stacks on mobile.

---

## 5. Surfaces & depth

- Cards are `--bg-surface` with `radius-lg`, **no border**, and a soft shadow:
  `0 8px 40px rgba(0,0,0,0.4)`. They separate by elevation + spacing, not outlines.
- Optional **glass** treatment for floating panels over the 3D scene only:
  `backdrop-filter: blur(16px)` + `--bg-surface` at ~70% opacity + 1px `--hairline`.
- **Glow tokens** (use sparingly):
```
--glow-cyan:   0 0 0 1px rgba(56,232,255,0.4), 0 0 24px rgba(56,232,255,0.25)
--glow-danger: 0 0 0 1px rgba(255,84,112,0.4), 0 0 24px rgba(255,84,112,0.25)
```

---

## 6. Motion system

Library: **Framer Motion** (already installed). Ambient 3D motion: handled in the R3F scene (doc 07).

### 6.1 Timing & easing
```
fast:    150ms   (hover, taps)
base:    250ms   (most transitions)
slow:    400ms   (route/page transitions, reveals)
ease:    cubic-bezier(0.22, 1, 0.36, 1)   ("easeOutExpo"-ish, calm)
spring:  { stiffness: 120, damping: 18 }  (for playful elements like the safe-move nudge)
```

### 6.2 Signature motions (allowed & encouraged)
- **Page transition:** fade + 8px rise, `slow`.
- **Number count-up:** key metrics animate to value on first reveal (e.g., miss distance).
- **Risk transition:** when a maneuver is applied, the risk badge morphs red→green with a brief glow pulse.
- **Live pulse:** the active/live indicator gently pulses (2s loop) — the only always-on motion in UI.
- **Hover:** primary CTA lifts 1px + glow intensifies; cards lift 2px.
- **Reveal on scroll:** sections fade/rise once when entering viewport.

### 6.3 Motion rules
- Respect `prefers-reduced-motion`: disable rise/count-up/pulse, keep instant state changes.
- No infinite spinners as the only feedback — pair with plain-language status text.
- Never animate more than ~2 things at once in a viewport.

---

## 7. Iconography & imagery

- **Icons:** `lucide-react` (already installed). 1.5px stroke, sized 16/20/24. Monochrome,
  inherit text color; accent color only when active.
- **Illustrations:** prefer the live 3D scene over static art. Where diagrams are needed
  (Learn, System), use simple line diagrams in brand colors.
- **No stock photos.** The product *is* the visual.

---

## 8. Component visual defaults (atoms)

Full specs in doc 05; here are the visual rules.

- **Primary button:** cyan fill text on dark, or dark with cyan glow border for the hero CTA;
  `radius-md`, 44px tall, `--glow-cyan` on hover. **One per screen.**
- **Secondary button:** `--bg-surface-2`, `--text-base`, no glow.
- **Ghost/text button:** transparent, `--text-muted`, underline-on-hover.
- **Badge / pill:** small, `radius-full`, semantic background at ~16% opacity + solid text color.
- **Card:** see §5.
- **Input:** `--bg-base`, `--hairline` border, cyan focus ring (`--glow-cyan` at low intensity).
- **Tooltip (Term):** `--bg-surface-2`, small, appears on hover/focus; this is how jargon is explained.

---

## 9. Accessibility baseline

- AA contrast for all text (verify amber/cyan on dark especially).
- Visible focus rings (cyan) on all interactive elements.
- All interactive 3D has keyboard + button equivalents (doc 07).
- Hit targets ≥ 44px. Tooltips also openable on focus (not hover-only).
- Honor reduced-motion and reduced-transparency.

---

## 10. DO / DON'T cheat sheet

| DO | DON'T |
|---|---|
| Use whitespace to separate | Add a glowing border to every box |
| Glow the one primary action | Glow five things at once |
| Lowercase, sentence-case labels | UPPERCASE 950-WEIGHT EVERYTHING |
| One H1 per screen | Three competing headlines |
| Plain word + tooltip for jargon | Bare `Pc` / `TCA` in Simple mode |
| Risk = color + word + number | Risk = scientific notation only |
| Subtle, purposeful motion | Always-spinning decorative animation |
| Self-hosted fonts (offline-safe) | Runtime CDN font fetches |

---

## 11. Reference: token file to create

These become `frontend/src/styles/theme.css` (CSS variables) **and** the Tailwind theme (doc 04).
Keeping both in sync via Tailwind v4 `@theme` is preferred so utilities and variables share one source.
