import type { Transition, Variants } from "framer-motion";

/**
 * Shared Framer Motion constants (doc 02 §6). One source of timing/easing so every component
 * animates identically. Components gate motion on `useReducedMotion()`.
 */

/** Durations in seconds: fast (hover/taps), base (most transitions), slow (page/reveals). */
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4 } as const;

/** Calm "easeOutExpo"-ish cubic bezier (doc 02 §6.1). */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Springy feel for playful elements (the safe-move nudge). */
export const SPRING: Transition = { type: "spring", stiffness: 120, damping: 18 };

/** Page / reveal-on-scroll: fade + 8px rise (doc 02 §6.2). */
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } }
};

/** Live indicator: the ONLY always-on motion in UI (2s loop, doc 02 §6.2). */
export const livePulse: Variants = {
  pulse: { opacity: [1, 0.4, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } }
};
