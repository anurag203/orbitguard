/**
 * Shared class-name presets so typography + focus rings stay consistent (doc 02 §3, §9).
 * These are token-only utility strings (no raw hex). Sizes use the doc 02 §3.1 scale.
 * Colors are applied separately by each component so tone (risk/cyan/neutral) stays flexible.
 */

/** Type scale (doc 02 §3.1). Font + size + weight + tracking only — no color. */
export const textStyles = {
  display:
    "font-display text-[2.5rem] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[3.25rem] lg:text-[4.5rem]",
  h1: "font-display text-[2rem] font-semibold leading-tight tracking-[-0.01em]",
  h2: "font-display text-[1.5rem] font-semibold leading-tight",
  h3: "font-display text-[1.125rem] font-semibold leading-snug",
  bodyLg: "text-[1.0625rem] leading-[1.6]",
  body: "text-[0.9375rem] leading-[1.6]",
  label: "text-[0.8125rem] font-medium tracking-[0.01em]",
  caption: "text-[0.75rem] font-medium leading-snug",
  /** Tiny uppercase eyebrow (the ONLY uppercase, doc 02 §3.2). */
  eyebrow: "text-[0.75rem] font-medium uppercase tracking-[0.08em]",
  mono: "font-mono text-[0.875rem]"
} as const;

/** Visible cyan focus ring for every interactive element (doc 05 §1.5 / doc 02 §9). */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void";
