/**
 * Home proof-stat model (route 01-home §4.4 / §5 / §6).
 *
 * The hero must render WITHOUT waiting on any fetch (doc 01 Law 6); the four proof numbers hydrate
 * in afterwards. If the demo backend is unreachable the story still has to read, so these canonical
 * Protect-ISRO constants are baked in as the fallback (spec §7 "Empty").
 *
 * Each helper returns the final display string PLUS an optional count-up spec, so the proof <Stat>s
 * can animate the magnitude to value on first reveal (doc 02 §6.2) yet land on the exact spec copy:
 *   Simple   "≈ 600 m" · "1 in 3,600" · "0.12 m/s" · "8.4 km"
 *   Pro      "611.8 m" · "Pc = 2.78 × 10⁻⁴" · "0.12 m/s" · "8,387.8 m"
 */
import { formatPcPro, type Mode } from "../../lib/format";

/** The canonical Protect-ISRO conjunction that powers Home's proof numbers (spec §4.6). */
export const CANONICAL_CONJUNCTION_ID = "conj-protect-isro-001";

/** Canonical demo numbers — fallback so the story reads even if the API is down (spec §7). */
export const PROOF_FALLBACK = {
  /** How close the dangerous pass got (pre-maneuver miss distance). */
  missDistanceM: 611.8,
  /** Collision chance. */
  pc: 2.78e-4,
  /** The recommended nudge (Δv). */
  deltaVMps: 0.12,
  /** The new safe gap after the nudge (post-maneuver miss distance). */
  safeGapM: 8387.8
} as const;

/** A magnitude to count up to, plus how to render it each frame. */
export type CountSpec = { to: number; format: (n: number) => string };

/** A resolved proof value: the final string + (optionally) how to animate to it. */
export type StatValue = { value: string; count?: CountSpec };

/** Round to `sig` significant figures, e.g. 3597.1 → 3600 at 2 sig figs. */
function roundSignificant(value: number, sig: number): number {
  if (value <= 0) return 0;
  const digits = Math.ceil(Math.log10(value));
  const factor = 10 ** (sig - digits);
  return Math.round(value * factor) / factor;
}

/** Pro distance is always exact metres with a thousands separator: "611.8 m" / "8,387.8 m". */
function proMetres(meters: number): string {
  return `${meters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
}

/**
 * "how close it got" — a small, scary number.
 * Simple rounds hard with a "≈" ("≈ 600 m"); Pro is exact ("611.8 m").
 */
export function closestApproachValue(meters: number, mode: Mode): StatValue {
  if (mode === "pro") {
    return { value: proMetres(meters), count: { to: meters, format: proMetres } };
  }
  if (meters < 1000) {
    const to = Math.round(meters / 100) * 100;
    const format = (n: number) => `≈ ${Math.round(n).toLocaleString()} m`;
    return { value: format(to), count: { to, format } };
  }
  const to = meters / 1000;
  const format = (n: number) => `${n.toFixed(1)} km`;
  return { value: format(to), count: { to, format } };
}

/**
 * "new safe gap" — the comfortable after-number.
 * Simple shows km ("8.4 km"); Pro shows exact metres ("8,387.8 m").
 */
export function safeGapValue(meters: number, mode: Mode): StatValue {
  if (mode === "pro") {
    return { value: proMetres(meters), count: { to: meters, format: proMetres } };
  }
  const to = meters / 1000;
  const format = (n: number) => `${n.toFixed(1)} km`;
  return { value: format(to), count: { to, format } };
}

/**
 * "collision chance".
 * Simple counts up the N in a friendly "1 in 3,600"; Pro is the static "Pc = 2.78 × 10⁻⁴".
 */
export function chanceValue(pc: number, mode: Mode): StatValue {
  if (mode === "pro") return { value: `Pc = ${formatPcPro(pc)}` };
  if (pc <= 0) return { value: "effectively zero" };
  const to = roundSignificant(1 / pc, 2);
  const format = (n: number) => `1 in ${Math.round(n).toLocaleString()}`;
  return { value: format(to), count: { to, format } };
}

/** "the safe nudge" — identical in both modes ("0.12 m/s"). */
export function nudgeValue(mps: number): StatValue {
  const format = (n: number) => `${n.toFixed(2)} m/s`;
  return { value: format(mps), count: { to: mps, format } };
}
