# 05 — Component Library

The implementation-ready spec for the reusable UI kit in `frontend/src/components/ui/`. Every
screen (doc 06 `routes/`) and every domain widget (`components/domain/`) is assembled from these
parts. **Obey docs 01–04.** If a component here conflicts with the constitution, the constitution
wins and this doc gets fixed.

> **Stack:** React 18 + TypeScript + Tailwind v4 + Radix UI primitives + Framer Motion +
> lucide-react. State: Zustand (client) + React Query (server) per doc 04.

> **Three rules that govern this whole kit:**
> 1. **Tokens only — never raw hex.** Use `bg-surface`, `text-cyan`, `text-danger`, `font-display`,
>    `rounded-lg` (doc 02 / doc 04 §3). A literal `#38E8FF` in a component is a bug.
> 2. **Plain words first, jargon in a `<Term>` tooltip** (doc 01 Law 2). Every acronym in UI goes
>    through `<Term>`.
> 3. **Respect `mode` (`simple` | `pro`).** Any component that renders a number reads `useMode()`
>    and chooses a `formatPlain`/`formatPro` rendering (doc 01 §4).

---

## 0. Contents

- [1. Conventions every component shares](#1-conventions-every-component-shares)
  - 1.1 File & export layout · 1.2 Token → utility cheat sheet · 1.3 Motion primitives ·
    1.4 Shared types & the risk model · 1.5 Accessibility & reduced-motion baseline
- [2. Primitives](#2-primitives) — `cn()`, `ModeProvider`/`useMode`, `Button`, `IconButton`,
  `Surface`/`Card`, `PageHeader`, `Section`, `Stack`/`Row`
- [3. Data display](#3-data-display) — `Stat`, `CountUp`, `Badge`, `Pill`, `RiskBadge`,
  `RiskMeter`, `DataRow`, `KeyValue`
- [4. Explanation & jargon](#4-explanation--jargon) — `Tooltip`, `Term`, `InfoDot`
- [5. Disclosure & navigation](#5-disclosure--navigation) — `Disclosure`/`ShowDetails`, `Tabs`,
  `ScenarioTabs`, `Switch`/`ModeToggle`, `Dialog`, `Sheet`
- [6. Status & feedback](#6-status--feedback) — `Skeleton`, `LoadingState`, `EmptyState`,
  `ErrorState`, `LiveChip`, `Steps`/`Stepper`
- [7. Formatter contract](#7-formatter-contract-formatplain-vs-formatpro)
- [8. Do / Don't for component authors](#8-do--dont-for-component-authors)
- [9. Build checklist & styleguide](#9-build-checklist--styleguide)

---

## 1. Conventions every component shares

### 1.1 File & export layout

```
frontend/src/
  components/ui/
    cn.ts                 # re-export of lib/cn (optional convenience)
    ModeProvider.tsx      # ModeProvider + useMode()
    Button.tsx            # Button, buttonVariants
    IconButton.tsx
    Surface.tsx           # Surface, Card (Card = Surface preset)
    PageHeader.tsx
    Section.tsx
    layout.tsx            # Stack, Row
    Stat.tsx              # Stat
    CountUp.tsx
    Badge.tsx             # Badge, Pill
    RiskBadge.tsx
    RiskMeter.tsx
    DataRow.tsx           # DataRow, KeyValue
    Tooltip.tsx           # Tooltip (Radix wrapper)
    Term.tsx
    InfoDot.tsx
    Disclosure.tsx        # Disclosure / ShowDetails
    Tabs.tsx
    ScenarioTabs.tsx
    Switch.tsx            # Switch, ModeToggle
    Dialog.tsx
    Sheet.tsx
    Skeleton.tsx          # Skeleton, LoadingState
    EmptyState.tsx
    ErrorState.tsx
    LiveChip.tsx
    Steps.tsx             # Steps / Stepper
    index.ts              # barrel: re-export everything above
  ...
  lib/
    cn.ts                 # clsx + tailwind-merge
    motion.ts             # shared Framer constants/variants (§1.3)
    format.ts             # formatPlain/formatPro + risk mapping (§7)
    terms.ts              # plain-language dictionary (doc 03 §6)
```

Conventions:

- Every component is a typed, **presentational** function component. No data fetching inside `ui/`
  (that lives in `features/`). No business logic — they render props.
- Every component takes `className?: string` and merges it with `cn()` **last**, so callers can
  override spacing/layout without `!important`.
- Use `forwardRef` for anything that can receive focus or be measured (`Button`, `IconButton`,
  inputs, `Surface` when interactive). Radix `asChild` patterns require ref forwarding.
- Import icons from `lucide-react`, default stroke `1.5`, sizes `16 | 20 | 24` (doc 02 §7).
- Barrel exports from `components/ui/index.ts`; routes import `from "@/components/ui"`.

### 1.2 Token → utility cheat sheet

These are the **only** color/spacing/type values components may use. They come from doc 02 and the
Tailwind `@theme` in doc 04 §3.

**Surfaces (backgrounds), low → high elevation**

| Utility | Token | Use |
|---|---|---|
| `bg-void` | `#05070E` | app background (the deepest layer) |
| `bg-deep` | `#0A0E1A` | default surface base / inputs (token `--color-deep`; named `deep` not `base` to avoid the `text-base` font-size collision) |
| `bg-surface` | `#111726` | **cards** (default raised surface) |
| `bg-surface-2` | `#18202F` | popovers, menus, tooltips, dialogs |

**Foreground (text).** Resolve the doc-04 naming once here so nobody hits `text-text-strong`:
expose the foreground scale in the `@theme` as `--color-strong`, `--color-body`, `--color-muted`,
`--color-faint` (renamed from doc 02's `--text-*` to avoid the `text-text-*` double prefix **and**
the collision with Tailwind's built-in `text-base` font-size utility). Resulting utilities:

| Utility | Token | Use |
|---|---|---|
| `text-strong` | `#F4F8FF` | headings, key numbers |
| `text-body` | `#C3CEDE` | body copy |
| `text-muted` | `#8090A6` | labels, secondary |
| `text-faint` | `#586377` | captions, disabled |

**Neon accents & risk** (these names already read cleanly):

| Utility(s) | Token | Use |
|---|---|---|
| `text-cyan` / `bg-cyan` | `#38E8FF` | **primary brand**, primary CTA, live data |
| `text-violet` / `bg-violet` | `#A571FF` | selection / secondary highlight |
| `text-magenta` | `#FF5CD0` | rare third accent only |
| `text-safe` / `bg-safe` | `#34F5C5` | SAFE / cleared |
| `text-watch` / `bg-watch` | `#6EE7FF` | WATCH |
| `text-warning` / `bg-warning` | `#FFC24B` | WARNING |
| `text-danger` / `bg-danger` | `#FF5470` | DANGER / critical |

- **Tinted fills** (badges, meters) use opacity modifiers: `bg-danger/15` + `text-danger`,
  `bg-cyan/15` + `text-cyan`, etc. (doc 02 §8: "semantic background ~16% opacity + solid text").
- **Hairline** separators: `border-hairline` (maps to `--color-hairline`, `rgba(140,170,210,.10)`),
  used sparingly. Prefer spacing/elevation over borders (doc 02 §1.3).

**Type:** `font-sans` (Inter, default), `font-display` (Space Grotesk — hero + big numbers only),
`font-mono` (JetBrains Mono — raw orbital data / Pro only). Sizes use the doc 02 §3.1 scale; map to
Tailwind text utilities or a small set of `@utility` classes (`text-display`, `text-h1`, `text-h2`,
`text-h3`, `text-body-lg`, `text-label`, `text-caption`). **Uppercase only for eyebrow labels**
(`tracking-[0.08em]`), never headings/body.

**Radius:** `rounded-sm` 8 · `rounded-md` 12 · `rounded-lg` 16 · `rounded-xl` 24 · `rounded-full`.
(Add `--radius-sm/-xl/-full` to the `@theme` alongside the `md/lg` already in doc 04.)

**Spacing:** the 8px grid (doc 02 §4) maps to Tailwind units — `1`=4, `2`=8, `3`=12, `4`=16, `6`=24,
`8`=32, `12`=48, `16`=64, `24`=96px. Layout helpers below accept these unit numbers.

**Glow (rationed — primary CTA / active nav / current risk / live only, doc 02 §2.5):** component
or `@utility` classes `glow-cyan` and `glow-danger` (box-shadows from doc 02 §5). Derive
`glow-safe` for the risk→green pulse using the same recipe with `--color-safe`.

```css
/* styles/theme.css — illustrative @utility classes (doc 04 §3) */
@utility glow-cyan   { box-shadow: 0 0 0 1px rgb(56 232 255 / .4),  0 0 24px rgb(56 232 255 / .25); }
@utility glow-danger { box-shadow: 0 0 0 1px rgb(255 84 112 / .4),  0 0 24px rgb(255 84 112 / .25); }
@utility glow-safe   { box-shadow: 0 0 0 1px rgb(52 245 197 / .4),  0 0 24px rgb(52 245 197 / .25); }
```

### 1.3 Motion primitives (`lib/motion.ts`)

One source for the doc 02 §6 timing/easing so every component animates identically.

```ts
// lib/motion.ts
import type { Transition, Variants } from "framer-motion";

export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4 } as const; // seconds
export const EASE = [0.22, 1, 0.36, 1] as const;                        // calm easeOutExpo-ish
export const SPRING: Transition = { type: "spring", stiffness: 120, damping: 18 };

/** Page / reveal-on-scroll: fade + 8px rise (doc 02 §6.2). */
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
};

/** Live indicator: the ONLY always-on motion in UI (2s loop). */
export const livePulse: Variants = {
  pulse: { opacity: [1, 0.4, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
};
```

- Read reduced-motion with Framer's `useReducedMotion()`. When true: skip `rise` offset and `livePulse`,
  set count-ups to land instantly, keep state changes instant (doc 02 §6.3).
- **Never** animate more than ~2 things in a viewport; **never** use an infinite spinner as the only
  feedback (doc 01 Law 6).

### 1.4 Shared types & the risk model

```ts
// lib/format.ts (types live here; see §7 for the formatters)
export type Mode = "simple" | "pro";
export type RiskLevel = "safe" | "watch" | "warning" | "danger";

/** Backend `RiskMetrics.severity` strings → canonical RiskLevel (doc 02 §2.4). */
export function toRiskLevel(severity: string): RiskLevel {
  switch (severity?.toLowerCase()) {
    case "nominal":  return "safe";
    case "watch":    return "watch";
    case "warning":  return "warning";
    case "critical": return "danger";
    default:         return "watch"; // unknown → neutral-cautious, never throws
  }
}

/** Friendly word + token class for a level. The word + color come BEFORE any number (doc 01 §5). */
export const RISK_WORD: Record<RiskLevel, string> = {
  safe: "Safe", watch: "Watch", warning: "Warning", danger: "Danger",
};
export const RISK_TEXT: Record<RiskLevel, string> = {
  safe: "text-safe", watch: "text-watch", warning: "text-warning", danger: "text-danger",
};
export const RISK_FILL: Record<RiskLevel, string> = {
  safe: "bg-safe/15", watch: "bg-watch/15", warning: "bg-warning/15", danger: "bg-danger/15",
};
```

> Risk **color** is always derived from `severity` (authoritative). The Pc magnitude word
> ("very high" / "high" / "low" / "negligible") is a *separate* qualifier produced by `formatPc`
> (§7) and must not be used to pick the color — that keeps the globe, lists, meters, and reports in
> agreement.

### 1.5 Accessibility & reduced-motion baseline (applies to all)

- Visible **cyan focus ring** on every interactive element: `focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-cyan/70 focus-visible:ring-offset-2
  focus-visible:ring-offset-void` (doc 02 §9).
- Hit targets ≥ **44px** (doc 02 §9). Icon-only controls require `aria-label`.
- Tooltips/popovers open on **focus**, not hover-only.
- Honor `prefers-reduced-motion` and `prefers-reduced-transparency` (drop `backdrop-blur` glass when
  the latter is set).
- Text meets WCAG AA on its surface; verify amber/cyan-on-dark combos.

---

## 2. Primitives

### `cn()` — class composition

1. **Purpose / used in** — Merge conditional classes and resolve Tailwind conflicts (so a caller's
   `className` reliably overrides defaults). Used by **every** component.
2. **Props / signature**

```ts
// lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

3. **Variants & states** — n/a (pure function).
4. **Visual** — n/a.
5. **Motion** — n/a.
6. **A11y** — n/a (but it's the mechanism that lets callers add focus/aria utility classes).
7. **Simple/Pro** — n/a.
8. **Example**

```tsx
<div className={cn("rounded-lg bg-surface p-6", isActive && "glow-cyan", className)} />
```

### `ModeProvider` / `useMode()` — Simple ↔ Pro context

1. **Purpose / used in** — Exposes the global `mode` ergonomically to any component that renders a
   number or hides advanced UI. The **source of truth is the Zustand `missionStore`** (`mode`,
   persisted to `localStorage`, doc 04 §5.2); `ModeProvider` mirrors it into React context so deep
   components don't import the store, and so the dev styleguide/tests can **force** a mode.
2. **Props / signature**

```tsx
type Mode = "simple" | "pro";

interface ModeContextValue {
  mode: Mode;
  isPro: boolean;            // convenience: mode === "pro"
  setMode: (m: Mode) => void;
  toggle: () => void;
}

interface ModeProviderProps {
  children: React.ReactNode;
  /** Override the store (styleguide / tests). When set, setMode is a no-op on the store. */
  forceMode?: Mode;
}

export function ModeProvider(props: ModeProviderProps): JSX.Element;
export function useMode(): ModeContextValue; // throws if used outside the provider
```

3. **Variants & states** — `mode = "simple"` (default) | `"pro"`. `forceMode` for isolated rendering.
4. **Visual** — none (logic only). The visible control is `ModeToggle` (§5).
5. **Motion** — none.
6. **A11y** — none directly; consumers must label mode-dependent changes (e.g., `aria-live` when a
   value's representation changes on toggle is **not** needed since the user initiated it).
7. **Simple/Pro** — this *is* the mechanism. `mode` boots from `localStorage`, hydrates the store,
   and every component reads it via `useMode()`.
8. **Example**

```tsx
function MissDistance({ meters }: { meters: number }) {
  const { mode } = useMode();
  return <span className="font-display text-strong">{formatDistance(meters, mode)}</span>;
}
```

### `Button`

1. **Purpose / used in** — The one canonical button. Primary CTA per screen (doc 01 Law 1), plus
   secondary/ghost actions. Used everywhere.
2. **Props / signature**

```tsx
type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // default "secondary"
  size?: ButtonSize;       // default "md"
  loading?: boolean;       // shows spinner + keeps a plain label (never bare spinner)
  loadingText?: string;    // default "Working…"
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  asChild?: boolean;       // render as child (e.g. a Router <Link>) via @radix-ui/react-slot
}

export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
```

> `asChild` uses `@radix-ui/react-slot` (add it — it's the standard shadcn pattern doc 04 endorses).
> A `<Button asChild><Link to="/threats">…</Link></Button>` gets button styling on a real anchor.

3. **Variants & states**
   - **primary** — cyan, the screen's single accent action. `default → hover (lift 1px + glow
     intensifies) → active (settle) → disabled (50% opacity, no glow) → loading (spinner + text,
     non-interactive)`.
   - **secondary** — `bg-surface-2` neutral; hover lightens; no glow.
   - **ghost** — transparent, `text-muted`, underline on hover; for tertiary/text actions.
   - All: `disabled` and `loading` set `aria-disabled`/`disabled` and block clicks.
4. **Visual** (tokens)
   - Base: `inline-flex items-center justify-center gap-2 rounded-md font-sans font-medium
     select-none transition`.
   - Sizes: `sm` `h-9 px-3 text-[13px]` · `md` `h-11 px-4 text-[15px]` (44px target) ·
     `lg` `h-12 px-6 text-[17px]`.
   - primary: `bg-cyan text-void hover:glow-cyan` (cyan fill, near-black text for AA contrast);
     hero variant alt = `bg-base text-cyan glow-cyan` (dark with glowing cyan border) — pick one per
     screen, never both.
   - secondary: `bg-surface-2 text-body hover:bg-surface-2/80`.
   - ghost: `bg-transparent text-muted hover:text-strong hover:underline underline-offset-4`.
   - disabled: `opacity-50 pointer-events-none`.
5. **Motion** — hover lift via `hover:-translate-y-px` + glow (Tailwind transition,
   `DURATION.fast`). The primary CTA may use Framer `whileHover`/`whileTap` for a springier feel on
   hero screens. Disable lift under reduced-motion.
6. **A11y** — native `<button>`; `type="button"` unless `submit`. Spinner gets `aria-hidden`; while
   `loading`, set `aria-busy`. Cyan focus ring (§1.5). Icon-only? Use `IconButton` instead.
7. **Simple/Pro** — n/a (label copy is the caller's job; keep it a plain verb, e.g. "Find the safe
   move").
8. **Example**

```tsx
<Button variant="primary" size="lg" loading={plan.isPending} loadingText="Scanning…"
        iconRight={<ArrowRight size={20} />} onClick={() => plan.mutate()}>
  Find the safe move
</Button>
```

### `IconButton`

1. **Purpose / used in** — Square, icon-only control: dialog close, toolbar toggles, "expand" on the
   globe, list affordances.
2. **Props / signature**

```tsx
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;                 // REQUIRED → aria-label (no visible text)
  icon: React.ReactNode;         // a lucide icon
  variant?: "ghost" | "surface"; // default "ghost"
  size?: "sm" | "md";            // 36 / 44px box
}
export const IconButton: React.ForwardRefExoticComponent<IconButtonProps & React.RefAttributes<HTMLButtonElement>>;
```

3. **Variants & states** — `ghost` (transparent, `text-muted` → `text-strong` on hover) ·
   `surface` (`bg-surface-2`). States: hover/active/disabled/focus as Button.
4. **Visual** — `inline-flex items-center justify-center rounded-md`; `sm h-9 w-9`, `md h-11 w-11`.
   Icon inherits color; accent (`text-cyan`) only when "on"/active.
5. **Motion** — subtle `active:scale-95` (skip under reduced-motion).
6. **A11y** — **`label` is mandatory** and applied as `aria-label`; icon `aria-hidden`. Focus ring.
7. **Simple/Pro** — n/a.
8. **Example**

```tsx
<IconButton label="Close" icon={<X size={20} />} variant="ghost" onClick={onClose} />
```

### `Surface` / `Card`

1. **Purpose / used in** — The neutral container that gives elevation without borders. `Card` is a
   `Surface` preset (the common case). Used for object panels, report sections, stat groups.
2. **Props / signature**

```tsx
type Elevation = "base" | "surface" | "surface-2";

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;        // default "div" (e.g. "section", "article")
  elevation?: Elevation;         // default "surface"
  padding?: 0 | 4 | 6 | 8;       // Tailwind units (16/24/32px); default 6
  radius?: "md" | "lg" | "xl";   // default "lg"
  glass?: boolean;               // backdrop-blur glass — ONLY over the 3D scene (doc 02 §5)
  interactive?: boolean;         // adds hover lift (2px) + cursor; for clickable cards
  glow?: "none" | "cyan" | "danger" | "safe"; // rationed; default "none"
}
export const Surface: React.ForwardRefExoticComponent<SurfaceProps & React.RefAttributes<HTMLElement>>;
export function Card(props: SurfaceProps): JSX.Element; // = <Surface elevation="surface" radius="lg" padding={6} />
```

3. **Variants & states** — elevation `base|surface|surface-2`; `glass`; `interactive` (hover lift);
   `glow` (one of the four). Default has **no border**.
4. **Visual** — `bg-{elevation}` + `rounded-{radius}` + `shadow-[0_8px_40px_rgba(0,0,0,0.4)]`
   (doc 02 §5). Glass: `bg-surface/70 backdrop-blur-[16px] border border-hairline` (dropped under
   reduced-transparency). No outline otherwise.
5. **Motion** — `interactive` → `hover:-translate-y-0.5 transition` (`DURATION.base`); disabled
   under reduced-motion.
6. **A11y** — if `interactive` and clickable, render `as="button"`/wrap a real control; don't put
   `onClick` on a bare div without `role`/`tabIndex`. Decorative only by default.
7. **Simple/Pro** — n/a.
8. **Example**

```tsx
<Card aria-label="Object details">
  <KeyValue label="Owner"><Term k="norad-id">Catalog number</Term> 25544</KeyValue>
</Card>

<Surface glass className="absolute left-6 top-6 max-w-sm"> {/* floating over the globe */}
  …
</Surface>
```

### `PageHeader`

1. **Purpose / used in** — The **single** title block per route: optional eyebrow, the one `h1`,
   an optional subtitle, and an actions slot. Enforces doc 02 §3.2 ("max one h1 per screen") and
   doc 01 Law 1. Replaces today's `RouteIntro`.
2. **Props / signature**

```tsx
interface PageHeaderProps {
  eyebrow?: string;           // tiny uppercase label, tracking 0.08em (optional)
  title: string;             // the ONE h1
  subtitle?: React.ReactNode; // one sentence of plain-language context
  actions?: React.ReactNode;  // usually a single primary <Button>
  align?: "start" | "center"; // center for hero screens (Home); default "start"
  className?: string;
}
export function PageHeader(props: PageHeaderProps): JSX.Element;
```

3. **Variants & states** — `align start` (most routes) | `center` (Home/hero). No interactive state.
4. **Visual** — eyebrow `text-caption uppercase tracking-[0.08em] text-muted`; title
   `font-display text-h1 text-strong` (or `text-display` on Home); subtitle `text-body-lg text-muted
   max-w-[68ch]`. Vertical gaps from the scale (`space-y-3`).
5. **Motion** — appears with the `rise` variant on route mount (`DURATION.slow`).
6. **A11y** — `title` renders a real `<h1>`; **exactly one per screen** (lint/QA check). `eyebrow`
   is a `<p>`, not a heading.
7. **Simple/Pro** — copy stays plain in both modes; wrap any unavoidable jargon in the subtitle in
   `<Term>`.
8. **Example**

```tsx
<PageHeader
  eyebrow="Spot"
  title="Threats"
  subtitle={<>Ranked <Term k="conjunction">close approaches</Term> for the selected scenario.</>}
  actions={<ScenarioTabs value={scenarioId} onValueChange={setScenario} />}
/>
```

### `Section`

1. **Purpose / used in** — A vertical-rhythm wrapper for the stacked blocks below the hero
   (Home "how it works", Learn sections, Report sections). Owns the 64–96px section spacing.
2. **Props / signature**

```tsx
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;           // optional h2
  description?: React.ReactNode;
  spacing?: "md" | "lg";    // 64 / 96px top rhythm; default "lg"
  revealOnScroll?: boolean; // fade/rise when entering viewport; default true
}
export function Section(props: SectionProps): JSX.Element;
```

3. **Variants & states** — spacing `md|lg`; with/without `title`.
4. **Visual** — renders `<section>` with `pt-16`/`pt-24`; optional `h2`
   `font-display text-h2 text-strong` + `description text-body text-muted`.
5. **Motion** — `revealOnScroll` uses Framer `whileInView` with the `rise` variant, `once: true`
   (doc 02 §6.2). No-op under reduced-motion.
6. **A11y** — `title` → `<h2>`; sections are landmarks where appropriate (`aria-labelledby`).
7. **Simple/Pro** — n/a (content decides).
8. **Example**

```tsx
<Section title="How it works" spacing="lg">
  <Row gap={6}>{steps.map((s) => <Card key={s.id}>…</Card>)}</Row>
</Section>
```

### `Stack` / `Row` — layout helpers

1. **Purpose / used in** — Thin flexbox wrappers so spacing always comes from the scale (no
   ad-hoc margins). `Stack` = column, `Row` = row. Used pervasively instead of bespoke flex classes.
2. **Props / signature**

```tsx
type Space = 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24; // Tailwind units (×4px)

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Space;                                   // default 4 (16px)
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  as?: React.ElementType;
}
interface RowProps extends StackProps {
  wrap?: boolean;     // flex-wrap
}
export function Stack(props: StackProps): JSX.Element; // flex-col
export function Row(props: RowProps): JSX.Element;      // flex-row, align defaults to "center"
```

3. **Variants & states** — none; pure layout.
4. **Visual** — `flex flex-col`/`flex-row` + `gap-{n}` + alignment utilities mapped from props.
5. **Motion** — none.
6. **A11y** — none (use semantic `as` when it's a list/nav).
7. **Simple/Pro** — n/a.
8. **Example**

```tsx
<Row gap={3} justify="between">
  <RiskBadge severity={risk.severity} />
  <ShowDetails label="Show details">{/* pro grid */}</ShowDetails>
</Row>
```

---

## 3. Data display

### `Stat`

1. **Purpose / used in** — A big value + small muted label. Home proof stats ("18,400 objects
   tracked"), threat detail figures, report numbers.
2. **Props / signature**

```tsx
interface StatProps {
  value: React.ReactNode;       // pre-formatted string OR a number to count up
  label: string;                // small muted caption beneath
  hint?: React.ReactNode;       // optional <Term> / <InfoDot>
  tone?: "default" | RiskLevel | "cyan"; // colors the value; default "default" (text-strong)
  size?: "md" | "lg" | "xl";    // 24 / 32 / 48px display
  countUp?: boolean;            // animate numeric values on first reveal (doc 02 §6.2)
  countTo?: number;             // required if countUp && value should animate from 0
  format?: (n: number) => string; // applied during count-up
}
export function Stat(props: StatProps): JSX.Element;
```

3. **Variants & states** — `tone` (neutral / risk color / cyan); sizes; static vs `countUp`.
4. **Visual** — value `font-display` at the size; label `text-caption text-muted mt-1`. `tone` maps
   to `RISK_TEXT[level]` / `text-cyan` / `text-strong`.
5. **Motion** — `countUp` via `<CountUp>`; respects reduced-motion (lands instantly).
6. **A11y** — value + label are read together; if count-up, set the final value as text content for
   screen readers (the animated node is `aria-hidden`, a visually-hidden final value is present).
7. **Simple/Pro** — pass a **mode-aware formatted string** as `value` (caller uses §7 formatters), or
   use `format` for the count-up. The figure itself doesn't decide mode; the caller does.
8. **Example**

```tsx
<Stat size="xl" countUp countTo={8400} format={(n) => `${Math.round(n).toLocaleString()} m`}
      value="8,400 m" label="New miss distance" tone="safe" />
```

### `CountUp`

1. **Purpose / used in** — Animate a number to its value on first reveal (miss distance, object
   counts). Used by `Stat` and the avoidance before/after.
2. **Props / signature**

```tsx
interface CountUpProps {
  to: number;
  from?: number;                 // default 0
  durationMs?: number;           // default 900
  format?: (n: number) => string; // default String(Math.round(n))
  className?: string;
}
export function CountUp(props: CountUpProps): JSX.Element;
```

3. **Variants & states** — animates once when scrolled into view; re-runs if `to` changes.
4. **Visual** — inherits type from parent (usually `font-display`).
5. **Motion** — Framer `useMotionValue` + `animate(mv, to, { duration, ease: EASE })`, started on
   `useInView(..., { once: true })`. **Under reduced-motion: render `format(to)` immediately, no
   tween.**
6. **A11y** — wrap in a node whose accessible name is the final `format(to)`; mark the ticking text
   `aria-hidden` so SRs don't announce every frame.
7. **Simple/Pro** — n/a (format function carries any mode formatting).
8. **Example**

```tsx
<span className="font-display text-h1 text-safe">
  <CountUp to={8412} format={(n) => `${(n / 1000).toFixed(1)} km`} />
</span>
```

### `Badge`

1. **Purpose / used in** — Tiny static status/category label. Object types, scenario mode tags,
   "Hero", counts.
2. **Props / signature**

```tsx
type BadgeTone = "neutral" | "cyan" | "violet" | RiskLevel;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;     // default "neutral"
  size?: "sm" | "md";   // default "sm"
  icon?: React.ReactNode;
}
export function Badge(props: BadgeProps): JSX.Element;
```

3. **Variants & states** — tone (neutral/cyan/violet/safe/watch/warning/danger), size. Non-interactive.
4. **Visual** — `inline-flex items-center gap-1 rounded-full`; tone → `RISK_FILL`-style tint
   (`bg-{tone}/15 text-{tone}`); neutral → `bg-surface-2 text-muted`. `sm` `px-2 py-0.5 text-[12px]`,
   `md` `px-2.5 py-1 text-[13px]`. No glow.
5. **Motion** — none.
6. **A11y** — purely visual; if it conveys state not in adjacent text, add visually-hidden text.
7. **Simple/Pro** — n/a.
8. **Example** `<Badge tone="violet">Sandbox</Badge>`

### `Pill`

1. **Purpose / used in** — The **interactive** sibling of Badge: filter chips and toggleable tags on
   the Sky list / Threats filters.
2. **Props / signature**

```tsx
interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  tone?: BadgeTone;        // default "neutral"
  onRemove?: () => void;   // shows a small ✕ when provided
}
export const Pill: React.ForwardRefExoticComponent<PillProps & React.RefAttributes<HTMLButtonElement>>;
```

3. **Variants & states** — `default → hover → selected (filled/accented) → disabled`; optional
   removable (✕).
4. **Visual** — `rounded-full px-3 h-8 text-[13px]`; unselected `bg-surface-2 text-muted`; selected
   `bg-cyan/15 text-cyan` (or `RISK_FILL` for risk filters). `onRemove` adds a trailing `IconButton`-
   like ✕.
5. **Motion** — `active:scale-95`; selection color transition `DURATION.fast`.
6. **A11y** — real `<button>`; selected → `aria-pressed`. If part of a single-select group, prefer
   `Tabs`/`role="radiogroup"` instead.
7. **Simple/Pro** — n/a.
8. **Example** `<Pill selected={f.leo} onClick={() => toggle("leo")}>Low orbit</Pill>`

### `RiskBadge`

1. **Purpose / used in** — The canonical **word + color** risk chip. The "is this good or bad?"
   answer that precedes any number (doc 01 §5). On threat rows, detail headers, the globe legend,
   report.
2. **Props / signature**

```tsx
interface RiskBadgeProps {
  severity: string;        // raw backend severity; mapped via toRiskLevel()
  // OR: level?: RiskLevel; // when you already have a level
  size?: "sm" | "md" | "lg";
  showDot?: boolean;       // leading filled dot; default true
  className?: string;
}
export function RiskBadge(props: RiskBadgeProps): JSX.Element;
```

3. **Variants & states** — one of the four levels; sizes. Static. (For the current/active risk you
   may pass it through a glow wrapper, but the badge itself is unglowed by default.)
4. **Visual** — `rounded-full bg-{level}/15 text-{level}` + leading `●` dot in the same color +
   the `RISK_WORD[level]` text. Consistent everywhere — this is the "risk color is sacred" rule.
5. **Motion** — none by default. The **risk transition** (red→green) is owned by `RiskMeter`/the
   avoidance flow, which can cross-fade two badges with a brief `glow-safe` pulse.
6. **A11y** — text carries the meaning (not color alone): the word "Danger" is always present.
7. **Simple/Pro** — identical in both modes (the word is already plain). Pro screens may render the
   raw `severity` string in a `<Term>` next to it.
8. **Example** `<RiskBadge severity={risk.severity} size="md" />`

### `RiskMeter`

1. **Purpose / used in** — The hero risk visual: a semicircular **arc gauge** (or bar fallback) that
   maps risk level → color, shows the **plain word** big, and the number only as a quiet secondary /
   Pro detail. Threat detail, avoidance before/after.
2. **Props / signature**

```tsx
interface RiskMeterProps {
  severity: string;          // → level + color
  pc?: number;               // optional: drives the "1 in N" / sci-notation sub-label
  /** 0..1 fill; if omitted, derived discretely from level (safe .25 → danger 1.0). */
  value?: number;
  variant?: "arc" | "bar";   // default "arc"
  size?: "md" | "lg";
  animateFrom?: number;      // for the red→green transition (previous value)
  className?: string;
}
export function RiskMeter(props: RiskMeterProps): JSX.Element;
```

3. **Variants & states** — `arc` (default, for detail/hero) | `bar` (compact, inline). Resting vs
   **transitioning** (when `animateFrom` differs from current → morph + pulse).
4. **Visual**
   - Arc: an SVG semicircle. Track = `stroke` at `--color-hairline`; filled arc =
     `stroke-{level}` (`stroke-safe`/…/`stroke-danger`). Center: `RISK_WORD[level]` in
     `font-display text-h2 RISK_TEXT[level]`; below it a `text-caption text-muted` sub-label from
     `formatPc(pc, mode)` (§7) when `pc` is given.
   - Bar: a `rounded-full bg-surface-2` track with a `bg-{level}` fill at `value*100%`.
5. **Motion** — fill length animates with `DURATION.base`/`EASE`. The **risk transition** (doc 02
   §6.2): when `animateFrom` → current crosses from a worse to a better level, the arc color
   cross-fades red→green and emits a one-shot `glow-safe` pulse (~600ms). Reduced-motion: snap to the
   final state, no pulse.
6. **A11y** — `role="meter"` with `aria-valuemin/now/max` and an `aria-label` that includes the word
   ("Collision risk: Danger"). The big word is real text, so the meaning never depends on color.
7. **Simple/Pro** — Simple: word + arc + "Collision chance: very high (about 1 in 3,600)".
   Pro: same arc, sub-label becomes `Pc = 2.78 × 10⁻⁴` (via `formatPc(pc, "pro")`), optionally with a
   `<Term k="pc">` and a "Show details" to the covariance model.
8. **Example**

```tsx
<RiskMeter severity={before.severity} pc={before.pc} animateFrom={beforeFill} size="lg" />
```

### `DataRow`

1. **Purpose / used in** — A full-width labeled row used inside cards/lists: left = label (+ optional
   `Term`/`InfoDot`), right = value (often a `RiskBadge`/`Stat`/formatted number). Threat list rows,
   report key points, object panel facts. Rows separate by `hairline`, not boxes.
2. **Props / signature**

```tsx
interface DataRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;       // may contain a <Term>
  value: React.ReactNode;       // right-aligned content
  hint?: React.ReactNode;       // <InfoDot> after the label
  href?: string;                // makes the whole row a navigable link (Router <Link>)
  onSelect?: () => void;        // OR an interactive row
  divider?: boolean;            // bottom hairline; default true
}
export function DataRow(props: DataRowProps): JSX.Element;
```

3. **Variants & states** — static | interactive (`href`/`onSelect` → hover bg, chevron, focusable).
   `divider` on/off.
4. **Visual** — `flex items-center justify-between gap-4 py-3`; label `text-body text-muted`, value
   `text-body text-strong`; `divider` → `border-b border-hairline`. Interactive → `hover:bg-surface-2/60
   rounded-md px-2` + trailing `ChevronRight`.
5. **Motion** — interactive hover bg `DURATION.fast`.
6. **A11y** — interactive rows render a real `<a>`/`<button>` spanning the row (≥44px tall); not an
   `onClick` div.
7. **Simple/Pro** — the **value** is mode-aware (caller formats via §7). Label stays plain.
8. **Example**

```tsx
<DataRow
  label={<Term k="miss-distance">How close</Term>}
  value={formatDistance(risk.miss_distance_m, mode)}
/>
```

### `KeyValue`

1. **Purpose / used in** — Compact label→value pair for dense fact lists (object panel, report
   source IDs). Lighter than `DataRow`; can stack into a definition grid.
2. **Props / signature**

```tsx
interface KeyValueProps {
  label: React.ReactNode;
  children: React.ReactNode;     // the value (ReactNode → can hold <Term>, mono IDs, etc.)
  layout?: "row" | "stacked";    // default "stacked" (label above value)
  mono?: boolean;                // render value in font-mono (Pro IDs / TLE)
  className?: string;
}
export function KeyValue(props: KeyValueProps): JSX.Element;
```

3. **Variants & states** — `stacked` (default) | `row`; `mono` for IDs.
4. **Visual** — label `text-caption text-muted`; value `text-body text-strong`
   (`font-mono text-mono` when `mono`). `stacked` → `space-y-0.5`; `row` → `flex justify-between`.
5. **Motion** — none.
6. **A11y** — render as `<dt>`/`<dd>` inside a `<dl>` when grouped (a `KeyValueList` wrapper is fine).
7. **Simple/Pro** — `mono` raw values typically appear only in Pro / behind "Show details".
8. **Example**

```tsx
<KeyValue label="Catalog number" mono>25544</KeyValue>
```

---

## 4. Explanation & jargon

> This group is the heart of "intuitive for non-space people." Every acronym in the product flows
> through `<Term>`; `Tooltip` and `InfoDot` are its supporting cast.

### `Tooltip`

1. **Purpose / used in** — The styled Radix Tooltip wrapper used by `Term`, `InfoDot`, and any
   "hover for a hint" affordance. A single `Tooltip.Provider` lives in `app/providers.tsx`.
2. **Props / signature**

```tsx
interface TooltipProps {
  content: React.ReactNode;     // the hint (kept short)
  side?: "top" | "right" | "bottom" | "left"; // default "top"
  align?: "start" | "center" | "end";
  delayDuration?: number;       // default 150ms
  children: React.ReactElement; // the trigger (asChild) — must be focusable
}
export function Tooltip(props: TooltipProps): JSX.Element;        // built on @radix-ui/react-tooltip
export { TooltipProvider } from "@radix-ui/react-tooltip";        // re-exported for providers.tsx
```

3. **Variants & states** — closed | open (hover or focus). Positions via `side`/`align`.
4. **Visual** — content: `bg-surface-2 text-body text-caption rounded-md px-3 py-2 max-w-xs
   shadow-[0_8px_40px_rgba(0,0,0,0.4)]` + a matching arrow. No glow.
5. **Motion** — Radix mount → fade + 4px slide from `side`, `DURATION.fast`/`EASE`
   (`data-[state]`-driven or Framer). Instant under reduced-motion.
6. **A11y** — Radix manages `aria-describedby`, opens on **hover and focus**, closes on `Esc`/blur.
   Trigger must be focusable (use a real button/link via `asChild`). Don't put focusable interactive
   content **inside** a tooltip (use `Popover` for that).
7. **Simple/Pro** — n/a (mechanism). `Term` decides the content per mode.
8. **Example**

```tsx
<Tooltip content="When the two objects are nearest.">
  <button type="button" className="underline decoration-dotted">closest approach</button>
</Tooltip>
```

### `Term` — the jargon translator (spec carefully)

1. **Purpose / used in** — Wraps a single jargon word/acronym, shows its plain-language definition in
   a tooltip (from `lib/terms.ts`, the doc 03 §6 dictionary), and links to `/learn`. **This is how
   we satisfy "plain words first, jargon second" (doc 01 Law 2) everywhere.** Used in every route's
   copy, every metric label, every risk explanation.
2. **Dictionary contract (`lib/terms.ts`)**

```ts
export type TermKey =
  | "tca" | "miss-distance" | "pc" | "conjunction" | "delta-v" | "along-track"
  | "secondary-screening" | "norad-id" | "tle" | "leo" | "covariance"
  | "propagation" | "relative-velocity" | "kessler";

export interface TermDef {
  label: string;        // plain default label shown if no children (e.g. "Closest approach")
  full: string;         // technical/full name (e.g. "Time of Closest Approach (TCA)")
  short: string;        // one-line tooltip definition (doc 03 §6)
  learnAnchor?: string; // anchor on /learn; defaults to the key
}

export const TERMS: Record<TermKey, TermDef> = {
  "tca": { label: "Closest approach (time)", full: "Time of Closest Approach (TCA)",
           short: "When the two objects are nearest." },
  "miss-distance": { label: "How close", full: "Miss distance",
           short: "The smallest gap between them." },
  "pc": { label: "Collision chance", full: "Probability of collision (Pc)",
           short: "How likely a crash is, e.g. ‘1 in 3,600’." },
  "conjunction": { label: "Close approach", full: "Conjunction",
           short: "Two objects passing dangerously near each other." },
  "delta-v": { label: "Nudge", full: "Delta-v (Δv)",
           short: "How hard we push the satellite to change its path." },
  "along-track": { label: "Speed-up / slow-down nudge", full: "Along-track maneuver",
           short: "Changing speed along the orbit to shift timing." },
  "secondary-screening": { label: "Double-check", full: "Secondary screening",
           short: "Making sure the new path isn’t near anything else." },
  "norad-id": { label: "Catalog number", full: "NORAD ID",
           short: "The official ID number for a tracked object." },
  "tle": { label: "Orbit data", full: "Two-Line Element set (TLE)",
           short: "The standard data describing an object’s orbit." },
  "leo": { label: "Low orbit", full: "Low Earth Orbit (LEO)",
           short: "A close-to-Earth orbit (under ~2,000 km)." },
  "covariance": { label: "Margin of error", full: "Covariance / uncertainty",
           short: "How unsure we are about exact positions." },
  "propagation": { label: "Orbit prediction", full: "Propagation",
           short: "Calculating where an object will be over time." },
  "relative-velocity": { label: "Closing speed", full: "Relative velocity",
           short: "How fast the two objects approach each other." },
  "kessler": { label: "Debris chain reaction", full: "Kessler syndrome",
           short: "Collisions creating debris that cause more collisions." },
};
```

3. **Props / signature**

```tsx
interface TermProps {
  k: TermKey;                 // dictionary key
  children?: React.ReactNode; // visible plain label; defaults to TERMS[k].label
  /** "link" (default): clicking goes to /learn#anchor. "static": no navigation. */
  as?: "link" | "static";
  className?: string;
}
export function Term(props: TermProps): JSX.Element;
```

4. **Variants & states** — `default → hover/focus (tooltip open)`; `as="link"` (clickable → /learn)
   vs `as="static"`. Pro mode adds the technical term inline (see §7 below).
5. **Visual** — trigger renders the plain label with a subtle **dotted underline**
   (`underline decoration-dotted decoration-text-faint underline-offset-4 text-body`), color
   unchanged so copy stays calm. Tooltip content shows `full` (in `text-strong`), `short` (in
   `text-muted`), and a quiet "Learn more →" hint. **No neon** — this affordance is everywhere, so it
   must whisper.
6. **Motion** — inherits `Tooltip` fade/slide. No extra motion.
7. **A11y** — trigger is a real focusable element: `as="link"` → Router `<Link to="/learn#anchor">`
   wrapped as `Tooltip` trigger (`asChild`), so the tooltip opens on hover **and** focus and click
   navigates; `as="static"` → a `<button type="button">`. The accessible name is the visible plain
   label; the definition is exposed via the tooltip's `aria-describedby`. Never rely on hover only.
8. **Simple/Pro behavior** — the central requirement:
   - **Simple:** render `children ?? TERMS[k].label` (the plain word). Tooltip reveals `full`/`short`.
     The technical term is *hidden* until hover/focus.
   - **Pro:** render the plain label **and** the technical term inline and quiet, e.g.
     `How close (Miss distance)` — pattern `<plain> (<full-or-acronym>)`, with the acronym in
     `text-muted`. Tooltip still available. This matches doc 01 §4 ("Pro shows the technical term
     inline").
9. **Example**

```tsx
{/* In Simple mode shows "Collision chance"; in Pro shows "Collision chance (Pc)" */}
We rate the <Term k="pc">collision chance</Term> as{" "}
<RiskBadge severity={risk.severity} />.
```

### `InfoDot`

1. **Purpose / used in** — A small circular "i" affordance for contextual help **not tied to a
   single word** (e.g., "what's a scenario?", an assumption note). Sits after labels/headings.
2. **Props / signature**

```tsx
interface InfoDotProps {
  /** Provide a dictionary term OR free-form content. */
  term?: TermKey;
  content?: React.ReactNode;
  label?: string;           // aria-label; default "More information"
  side?: "top" | "right" | "bottom" | "left";
}
export function InfoDot(props: InfoDotProps): JSX.Element;
```

3. **Variants & states** — `default → hover/focus (open)`; sourced from `term` or `content`.
4. **Visual** — a 16px `Info`/`HelpCircle` lucide icon in `text-faint`, → `text-muted` on hover;
   inside a ≥24px hit box. Tooltip styling as `Tooltip`.
5. **Motion** — inherits `Tooltip`.
6. **A11y** — `<button type="button" aria-label={label}>`; opens on focus; `Esc` closes. For
   longer/interactive help, swap the underlying primitive to Radix `Popover`.
7. **Simple/Pro** — when `term` is given, content mirrors `Term`'s Simple/Pro definition.
8. **Example** `<InfoDot content="Scenarios are saved, replayable situations." /> `

---

## 5. Disclosure & navigation

### `Disclosure` / `ShowDetails`

1. **Purpose / used in** — Collapses advanced/Pro content behind a "Show details" toggle —
   progressive disclosure (doc 01 Law 4): candidate grids, delta-v tables, raw TLEs, covariance,
   source IDs. `ShowDetails` is a `Disclosure` preset with the standard label/affordance.
2. **Props / signature**

```tsx
interface DisclosureProps {
  label?: string;            // trigger text; ShowDetails defaults to "Show details"
  defaultOpen?: boolean;     // default false
  open?: boolean;            // controlled
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode; // the advanced content
  className?: string;
}
export function Disclosure(props: DisclosureProps): JSX.Element;
export function ShowDetails(props: Omit<DisclosureProps, "label"> & { label?: string }): JSX.Element;
```

3. **Variants & states** — `collapsed (default) → expanded`; controlled/uncontrolled. Trigger label
   flips "Show details" ↔ "Hide details"; chevron rotates.
4. **Visual** — trigger is a `ghost` Button-like row: `text-muted hover:text-strong` + a
   `ChevronDown` that rotates 180° when open. Content panel: `pt-4`, often a `Card`/`mono` table.
5. **Motion** — height/opacity expand via Framer `AnimatePresence` (`DURATION.base`, `EASE`) or
   `@radix-ui/react-collapsible` if added. Chevron rotate `DURATION.fast`. Instant under reduced-motion.
6. **A11y** — trigger `<button aria-expanded aria-controls={id}>`; content `id` + `role="region"`.
   Keyboard: Enter/Space toggles.
7. **Simple/Pro** — In **Simple** mode this stays **collapsed by default** and may even be hidden
   entirely for deep-Pro content (caller decides). In **Pro** mode it can `defaultOpen`. The pattern
   is the seam between the two modes.
8. **Example**

```tsx
<ShowDetails defaultOpen={isPro}>
  <CandidateTable candidates={plan.alternatives} /> {/* Pro grid + delta-v */}
</ShowDetails>
```

### `Tabs`

1. **Purpose / used in** — Switch between sibling views without leaving the screen: Sky's
   Globe ↔ List, Learn sections, report views. Built on `@radix-ui/react-tabs`.
2. **Props / signature**

```tsx
interface TabItem { value: string; label: React.ReactNode; icon?: React.ReactNode; }

interface TabsProps {
  items: TabItem[];
  value?: string;                  // controlled
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  variant?: "underline" | "segmented"; // default "underline"
  children?: React.ReactNode;      // <Tabs.Panel value=…> contents (or render externally)
}
export function Tabs(props: TabsProps): JSX.Element;
```

3. **Variants & states** — `underline` (quiet, for in-page view switches) | `segmented` (pill group).
   Tab states: `default → hover → active → disabled`.
4. **Visual** — `underline`: triggers `text-muted` → active `text-strong` with a `bg-cyan` 2px
   underline + soft `glow-cyan` (active nav is one of the allowed glow spots, doc 02 §2.5).
   `segmented`: `bg-base` track, active pill `bg-surface-2 text-strong`.
5. **Motion** — the active underline slides between tabs via Framer `layoutId` (`DURATION.base`).
   Reduced-motion: snap.
6. **A11y** — Radix provides `role="tablist"/"tab"/"tabpanel"`, arrow-key nav, focus management.
7. **Simple/Pro** — n/a structurally; panels inside may be mode-aware.
8. **Example**

```tsx
<Tabs items={[{ value: "globe", label: "Globe" }, { value: "list", label: "List" }]}
      value={view} onValueChange={setView} variant="underline" />
```

### `ScenarioTabs`

1. **Purpose / used in** — The scenario switcher (doc 03 §4: "Protect ISRO / 2009 / Kessler"). Lives
   on Threats and drives the whole journey. A thin preset over `Tabs` wired to the three scenario IDs.
2. **Props / signature**

```tsx
type ScenarioId = "protect-isro" | "2009-replay" | "kessler-sandbox";

interface ScenarioTabsProps {
  value: ScenarioId;
  onValueChange: (id: ScenarioId) => void;
  /** Optional: pass loaded ScenarioSummary[] to render titles/modes from data. */
  scenarios?: { scenario_id: string; title: string; mode: string; hero?: boolean }[];
}
export function ScenarioTabs(props: ScenarioTabsProps): JSX.Element;
```

3. **Variants & states** — three tabs; active = current scenario; loading (skeleton tabs while
   scenarios fetch). Order fixed: Protect ISRO → 2009 Replay → Kessler.
4. **Visual** — `segmented` Tabs; labels are the plain titles ("Protect ISRO", "2009 Collision",
   "Kessler"); the hero scenario (Protect ISRO) may carry a tiny `Badge tone="cyan"`. Active uses the
   allowed glow.
5. **Motion** — inherits `Tabs` slide.
6. **A11y** — inherits Radix Tabs semantics; each tab's accessible name is the full scenario title.
7. **Simple/Pro** — same in both modes. Scenario selection is reflected in the URL
   (`?scenario=…`, doc 03 §7); changing it triggers the React Query scenario hooks.
8. **Example**

```tsx
<ScenarioTabs value={scenarioId} onValueChange={setScenario} scenarios={scenarios.data} />
```

### `Switch` / `ModeToggle`

1. **Purpose / used in** — `Switch` is the generic accessible toggle (`@radix-ui/react-switch`).
   `ModeToggle` is its headline use: the global **Simple ↔ Pro** control in `TopNav`/`MobileNav`
   (doc 03 §3.1). The signature feature of doc 01 §4.
2. **Props / signature**

```tsx
interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;             // accessible label (visually-hidden if needed)
  disabled?: boolean;
}
export function Switch(props: SwitchProps): JSX.Element;

interface ModeToggleProps { className?: string; } // reads/writes mode via useMode()
export function ModeToggle(props: ModeToggleProps): JSX.Element;
```

3. **Variants & states** — Switch: `off → on → disabled`, focus. ModeToggle reads `mode` from
   `useMode()`; `pro = on`.
4. **Visual** — `ModeToggle` is a labeled segmented control reading **`Simple  |  Pro`**: the active
   side is `text-strong` with a `bg-surface-2` thumb; track `bg-base rounded-full`. The "Pro" side
   accent is cyan when active. Keep it small and quiet in the header.
5. **Motion** — thumb slides `DURATION.fast`/`EASE`; reduced-motion snaps.
6. **A11y** — Radix Switch: `role="switch"` + `aria-checked` + the `label`. Keyboard toggle with
   Space/Enter. The two text labels ("Simple"/"Pro") are associated with the control.
7. **Simple/Pro** — this **is** the control. On change → `setMode("pro"|"simple")` (store +
   localStorage). All number-rendering components re-render via `useMode()`.
8. **Example**

```tsx
function ModeToggle() {
  const { isPro, setMode } = useMode();
  return <Switch checked={isPro} label="Pro mode (show technical detail)"
                 onCheckedChange={(on) => setMode(on ? "pro" : "simple")} />;
}
```

### `Dialog`

1. **Purpose / used in** — Modal for focused, interruptive tasks: export options, confirmations,
   "raw data" deep-dive. Built on `@radix-ui/react-dialog`.
2. **Props / signature**

```tsx
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;                 // required → accessible name (DialogTitle)
  description?: string;          // DialogDescription
  children: React.ReactNode;     // body
  footer?: React.ReactNode;      // actions (one primary Button)
  size?: "sm" | "md" | "lg";
}
export function Dialog(props: DialogProps): JSX.Element;
```

3. **Variants & states** — closed | open; sizes.
4. **Visual** — overlay `bg-void/70 backdrop-blur-sm`; panel = `Surface elevation="surface-2"
   radius="xl"` centered, `max-w` per size, generous padding (`p-8`), close `IconButton` top-right.
   No neon border.
5. **Motion** — overlay fades; panel fades + 8px rise + slight scale (0.98→1), `DURATION.base`/`EASE`.
   Reduced-motion: fade only.
6. **A11y** — Radix handles focus trap, `Esc` to close, `aria-modal`, labelled by `title` and
   described by `description`. Return focus to trigger on close.
7. **Simple/Pro** — n/a (content decides).
8. **Example**

```tsx
<Dialog open={open} onOpenChange={setOpen} title="Export report"
        footer={<Button variant="primary" onClick={onExport}>Download .md</Button>}>
  Choose what to include in the briefing export.
</Dialog>
```

### `Sheet` (mobile)

1. **Purpose / used in** — Edge-anchored slide-over for mobile: the nav menu (doc 03 §3.2), filters,
   an object panel on small screens. A `Dialog` variant that slides from a side.
2. **Props / signature**

```tsx
interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right" | "bottom"; // default "right"
  title: string;                       // accessible name
  children: React.ReactNode;
}
export function Sheet(props: SheetProps): JSX.Element;
```

3. **Variants & states** — `side` left/right/bottom; closed | open.
4. **Visual** — full-height (or bottom) `Surface elevation="surface-2"`, `max-w-sm` for side sheets;
   overlay as `Dialog`. Drag-to-dismiss optional (consider `vaul`, doc 04, if a real need appears).
5. **Motion** — slides in from `side` (`DURATION.base`/`EASE`); overlay fades. Reduced-motion: fade.
6. **A11y** — same Radix Dialog guarantees (focus trap, `Esc`, labelled). Trigger is a real button.
7. **Simple/Pro** — n/a.
8. **Example**

```tsx
<Sheet open={menu} onOpenChange={setMenu} side="right" title="Menu">
  <nav>{/* 4 chapters → Learn → Under the hood → ModeToggle → Start demo */}</nav>
</Sheet>
```

---

## 6. Status & feedback

> Doc 01 Law 6 + doc 03 §5: loading/empty/error are **first-class** and **plain-spoken**. Never a
> bare spinner; never "corridor sync"/"arming" jargon. These four components make every screen's
> states uniform (they're typically driven straight from React Query `isPending`/`isError`/`data`).

### `Skeleton` / `LoadingState`

1. **Purpose / used in** — `Skeleton` is a calm shimmering placeholder block; `LoadingState`
   composes skeletons + **one plain sentence** for a whole region (lists, panels, the report).
2. **Props / signature**

```tsx
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number; height?: string | number; radius?: "md" | "lg" | "full";
}
export function Skeleton(props: SkeletonProps): JSX.Element;

interface LoadingStateProps {
  message?: string;          // default "Loading the latest orbit data…"
  lines?: number;            // # of skeleton rows; default 3
  variant?: "list" | "panel" | "stat";
}
export function LoadingState(props: LoadingStateProps): JSX.Element;
```

3. **Variants & states** — shimmer animating; `LoadingState` shapes: `list | panel | stat`.
4. **Visual** — `bg-surface-2` block with a slow left→right sheen (gradient via `--color-surface`).
   `LoadingState` message in `text-muted text-body`, centered, **calm**.
5. **Motion** — sheen loop ~1.4s `easeInOut`. **Under reduced-motion: static muted block, no sheen**
   (the message alone communicates progress).
6. **A11y** — container `role="status" aria-live="polite"` so SRs announce the plain sentence;
   skeleton blocks `aria-hidden`.
7. **Simple/Pro** — identical; the **copy is always plain English** ("Loading the latest orbit
   data…"), never a jargon status string.
8. **Example**

```tsx
{threats.isPending ? <LoadingState variant="list" message="Finding close approaches…" /> : …}
```

### `EmptyState`

1. **Purpose / used in** — Friendly "nothing here yet" with the action to populate (doc 03 §5):
   "No threats right now. Pick a scenario to see one."
2. **Props / signature**

```tsx
interface EmptyStateProps {
  icon?: React.ReactNode;        // a quiet lucide glyph
  title: string;                 // plain, e.g. "No threats right now"
  description?: React.ReactNode;
  action?: React.ReactNode;      // a Button / ScenarioTabs
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
```

3. **Variants & states** — with/without action.
4. **Visual** — centered in a `Card`: icon in `text-faint`, `title` `font-display text-h3
   text-strong`, `description` `text-muted`, `action` below. No alarm colors.
5. **Motion** — optional `rise` on mount.
6. **A11y** — `title` is a heading at the right level for context; action is a real control.
7. **Simple/Pro** — plain copy in both modes.
8. **Example**

```tsx
<EmptyState title="No threats right now"
  description="Pick a scenario to see a real close approach."
  action={<ScenarioTabs value={scenarioId} onValueChange={setScenario} />} />
```

### `ErrorState`

1. **Purpose / used in** — Plain-language failure + retry, fed by the typed `ApiError` from the
   client (doc 04 §5.3 / doc 08 envelope). "We couldn't reach the data service. [Try again]".
2. **Props / signature**

```tsx
interface ErrorStateProps {
  title?: string;                // default "Something went wrong"
  message?: string;              // human message (NOT a raw stack / code)
  onRetry?: () => void;          // wires to React Query refetch / mutation reset
  retryLabel?: string;           // default "Try again"
  detail?: React.ReactNode;      // raw error behind a ShowDetails (Pro)
}
export function ErrorState(props: ErrorStateProps): JSX.Element;
```

3. **Variants & states** — with/without `onRetry`; with/without `detail`.
4. **Visual** — `Card` with a small `AlertTriangle` in `text-danger`; `title` `text-strong`,
   `message` `text-muted`. Retry is a `secondary` Button (not the screen's primary glow). Raw error
   tucked in a `ShowDetails` (mono), Pro-facing.
5. **Motion** — none beyond optional `rise`.
6. **A11y** — `role="alert"` so it's announced; retry is keyboard-reachable.
7. **Simple/Pro** — Simple: just the human message + retry. Pro: `detail` disclosure exposes the
   error code/correlation ID from the envelope.
8. **Example**

```tsx
{detail.isError && (
  <ErrorState message="We couldn’t load this close approach." onRetry={() => detail.refetch()}
              detail={<code>{String(detail.error)}</code>} />
)}
```

### `LiveChip`

1. **Purpose / used in** — The single small chip that states data provenance near the relevant
   content (doc 03 §5): **"Offline demo data"** vs **"Live data"**. Not a global banner.
2. **Props / signature**

```tsx
interface LiveChipProps {
  live: boolean;             // true → "Live data" (cyan, pulsing dot); false → offline (muted)
  label?: string;            // override copy
  sourceUrl?: string;        // optional → chip links out (e.g. CelesTrak) with rel noopener
  className?: string;
}
export function LiveChip(props: LiveChipProps): JSX.Element;
```

3. **Variants & states** — `live` (cyan + pulse) | offline (muted, static). Optional link.
4. **Visual** — a `Badge`: live → `bg-cyan/15 text-cyan` with a leading pulsing dot; offline →
   `bg-surface-2 text-muted` with a static dot. Text: "Live data" / "Offline demo data".
5. **Motion** — the live dot uses `livePulse` (the **only** always-on UI motion, doc 02 §6.2);
   offline dot is static. Reduced-motion: live dot solid, no pulse.
6. **A11y** — the words carry meaning (not the dot color); if it links out, it's a real `<a target=
   "_blank" rel="noopener noreferrer">`.
7. **Simple/Pro** — identical; provenance honesty matters in both (doc 01 anti-goal: no fake
   precision).
8. **Example** `<LiveChip live={catalog.source === "live"} sourceUrl={catalog.source_url ?? undefined} />`

### `Steps` / `Stepper`

1. **Purpose / used in** — Visualizes the avoidance flow as ordered steps with status — the
   "one stepwise flow" of doc 03 §4: **Scan → Plan the nudge → Apply → Double-check → Done.**
2. **Props / signature**

```tsx
type StepStatus = "pending" | "active" | "done" | "error";

interface Step { id: string; label: string; description?: React.ReactNode; }

interface StepsProps {
  steps: Step[];
  current: number;                  // index of the active step
  statuses?: Record<string, StepStatus>; // optional per-step overrides (e.g. error)
  orientation?: "horizontal" | "vertical"; // default horizontal (desktop), vertical (mobile)
}
export function Steps(props: StepsProps): JSX.Element;
```

3. **Variants & states** — per step: `pending (faint) → active (cyan, emphasized) → done (safe,
   check) → error (danger)`. Orientation horizontal/vertical.
4. **Visual** — node circles connected by a `hairline` track; `done` fills `bg-safe` with a `Check`;
   `active` ring in `text-cyan` (+ soft `glow-cyan`); `pending` `text-faint`; `error` `text-danger`.
   Labels `text-label`, active label `text-strong`.
5. **Motion** — the connector fills toward the active step (`DURATION.base`); a step → `done`
   triggers a brief check-pop (spring). The final transition pairs with the `RiskMeter` red→green.
   Reduced-motion: status colors change instantly, no fill animation.
6. **A11y** — `<ol>` with each step an `<li>`; active step `aria-current="step"`; status conveyed by
   icon + text, not color alone. If steps aren't user-clickable, they're not buttons.
7. **Simple/Pro** — labels stay plain ("Double-check", not "Secondary screening" — wrap the
   technical term in a `<Term k="secondary-screening">` inside the description if shown). Pro may
   reveal per-step detail via `ShowDetails`.
8. **Example**

```tsx
<Steps current={step}
  steps={[
    { id: "scan", label: "Scan" },
    { id: "plan", label: "Plan the nudge" },
    { id: "apply", label: "Apply" },
    { id: "check", label: "Double-check",
      description: <Term k="secondary-screening">Make sure the new path is clear</Term> },
    { id: "done", label: "Done" },
  ]}
  statuses={{ check: applyResult ? "done" : "active" }} />
```

---

## 7. Formatter contract (`formatPlain` vs `formatPro`)

All numbers shown to users go through `lib/format.ts`, which implements the doc 03 §6 number-framing
rules. Each metric exposes a mode-aware function (and the underlying `*Plain`/`*Pro` pair) so
components stay dumb. **Rule of thumb:** risk **word + color first** (via `RiskBadge`/`RiskMeter`),
the figure second; Simple humanizes, Pro is exact.

```ts
// lib/format.ts  (extends today's format.ts; keep the existing fns or fold them in)
import type { Mode } from "./format"; // Mode = "simple" | "pro"

/* ---------- Pc: the flagship transformation (doc 03 §6) ---------- */
export function pcOneInN(pc: number): number { return pc > 0 ? Math.round(1 / pc) : Infinity; }

export type PcWord = "very high" | "high" | "low" | "negligible";
export function pcWord(pc: number): PcWord {        // tunable; align with backend severity bands
  if (pc >= 1e-4) return "very high";               // 2.8e-4 → "very high" (matches doc 01 §4)
  if (pc >= 1e-5) return "high";
  if (pc >= 1e-7) return "low";
  return "negligible";
}
/** Simple: "very high (about 1 in 3,600)".  Pro: "2.78 × 10⁻⁴". */
export function formatPc(pc: number, mode: Mode): string {
  if (mode === "pro") return formatPcPro(pc);
  if (pc <= 0) return "effectively zero";
  return `${pcWord(pc)} (about 1 in ${pcOneInN(pc).toLocaleString()})`;
}
export function formatPcPro(pc: number): string {   // "2.78 × 10⁻³" with a real ×10 superscript
  if (pc === 0) return "0";
  const [m, e] = pc.toExponential(2).split("e");
  return `${m} × 10${superscript(e)}`;              // superscript() maps "-4" → "⁻⁴"
}

/* ---------- Distance (miss distance, separations) ---------- */
/** Simple: rounded human ("600 m", "8.4 km") + optional comparison.  Pro: precise. */
export function formatDistance(meters: number, mode: Mode, opts?: { comparison?: boolean }): string {
  if (mode === "pro") return meters >= 1000 ? `${(meters / 1000).toFixed(3)} km` : `${meters.toFixed(1)} m`;
  const base = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  return opts?.comparison ? `${base} ${distanceComparison(meters)}` : base; // e.g. "≈ 6 football fields"
}

/* ---------- Speed (relative / closing velocity) ---------- */
/** Both modes use km/s (already intuitive); Pro adds precision. The rifle-bullet analogy is Learn-only. */
export function formatSpeed(kmps: number, mode: Mode): string {
  return mode === "pro" ? `${kmps.toFixed(3)} km/s` : `${kmps.toFixed(1)} km/s`;
}

/* ---------- Delta-v (the nudge) ---------- */
export type DvSize = "tiny" | "small" | "moderate" | "large";
export function dvSize(mps: number): DvSize {
  if (mps < 0.2) return "tiny"; if (mps < 1) return "small"; if (mps < 5) return "moderate"; return "large";
}
/** Simple: "a tiny 0.12 m/s nudge".  Pro: "0.12 m/s". */
export function formatDeltaV(mps: number, mode: Mode): string {
  return mode === "pro" ? `${mps.toFixed(2)} m/s` : `a ${dvSize(mps)} ${mps.toFixed(2)} m/s nudge`;
}

/* ---------- Time / TCA ---------- */
/** Simple: relative ("in 4 hours", "in 12 minutes").  Pro: absolute UTC. */
export function formatTime(iso: string, mode: Mode, now: Date = new Date()): string {
  if (mode === "pro") return `${iso.replace("T", " ").replace(/\.\d+Z?$/, "")} UTC`;
  return relativeFromNow(new Date(iso), now);       // "in 4 hours" / "3 hours ago"
}
```

| Metric | Simple (`formatPlain`) | Pro (`formatPro`) | Source datum |
|---|---|---|---|
| Pc | `very high (about 1 in 3,600)` | `2.78 × 10⁻⁴` | `RiskMetrics.pc` |
| Risk level | word + color (`RiskBadge`) **first** | same + raw `severity` in a `<Term>` | `RiskMetrics.severity` |
| Distance | `600 m` (opt. `≈ 6 football fields`) | `0.600 km` / `600.0 m` | `miss_distance_m` |
| Speed | `14.7 km/s` | `14.742 km/s` | `relative_velocity_km_s` |
| Delta-v | `a tiny 0.12 m/s nudge` | `0.12 m/s` | `ManeuverCandidate.delta_v_m_s` |
| Time / TCA | `in 4 hours` | `2026-06-14 14:32:08 UTC` | `tca_utc` |

Notes:

- These supersede today's mode-agnostic `formatPc`/`formatDistanceMeters`/`formatDeltaV` in
  `format.ts`; fold the old ones in (Pro ≈ old behavior). Keep `format.test.ts` green and extend it.
- `formatPcPro` renders a true `×10⁻ⁿ` using superscript glyphs; if you need JSX `<sup>`, expose a
  `FormatPc` component variant rather than embedding markup in a string.
- The risk **word/color** is never derived from Pc (use `toRiskLevel(severity)`); `pcWord` only adds
  the chance-magnitude qualifier (see §1.4).

---

## 8. Do / Don't for component authors

| ✅ DO | ❌ DON'T |
|---|---|
| Use tokens: `bg-surface`, `text-cyan`, `text-danger`, `font-display` | Write raw hex (`#38E8FF`) or magic px |
| Read `useMode()` and format via §7 for any number | Hardcode a representation that ignores Simple/Pro |
| Wrap every acronym in `<Term k="…">plain words</Term>` | Print bare `Pc` / `TCA` / `Δv` in Simple mode |
| Glow only the one primary action / active nav / current risk / live | Add `glow-*` to every card |
| Separate with whitespace + elevation; `border-hairline` rarely | Put a neon border on every box |
| One `<PageHeader>` (one `<h1>`) per screen | Stack competing headlines |
| Risk = `RiskBadge`/`RiskMeter` (word + color + number) | Show severity as scientific notation only |
| Plain, calm status copy ("Loading the latest orbit data…") | "Corridor sync" / "arming" / a bare spinner |
| Drive loading/error/empty from React Query into the §6 components | Re-roll per-screen `busy`/`error` strings |
| Forward refs, merge `className` last, label icon-only buttons | `onClick` on a bare `<div>`; unlabeled icons |
| Gate all motion on `useReducedMotion()` | Always-on decorative animation; >2 moving things |
| Self-hosted fonts via `font-display`/`font-sans`/`font-mono` | Runtime Google-Fonts fetches |

---

## 9. Build checklist & styleguide

- Build the kit **in isolation first** behind a dev-only `/__styleguide` route (doc 04 §7 step 2)
  that renders every component in **both** Simple and Pro (use `ModeProvider forceMode`), all states
  (default/hover/active/disabled/loading/error/empty), and both motion settings.
- Per component, verify: tokens-only (no hex), `mode` correctness, focus ring, ≥44px targets, AA
  contrast, reduced-motion path, and the §8 table.
- Keep `npm run build` ✅ and `npm test` ✅ green throughout; extend `format.test.ts` for §7.
- Acceptance: a non-technical reader can read any screen's default (Simple) view and understand it
  with zero acronyms exposed — flip to Pro and every figure becomes exact. That's the whole kit's job.
