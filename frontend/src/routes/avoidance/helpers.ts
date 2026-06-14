/**
 * Pure formatting helpers for the Safe Move (avoidance) route.
 *
 * These turn raw `ManeuverPlan` / `ManeuverCandidate` numbers into the plain-language and Pro
 * fragments the route's widgets render. No React, no hooks — just data → string/number so they
 * stay trivially testable and side-effect free (doc 05 §5).
 */

import type { ManeuverCandidate, RiskMetrics } from "../../features";
import { superscript } from "../../lib/format";

/** True when the burn is along the orbit track (where the `along-track` <Term> applies). */
export function isAlongTrack(direction: string): boolean {
  const d = direction.toLowerCase();
  return d.includes("along") || d.includes("prograde") || d.includes("retro");
}

/** A friendly, human phrase for a burn direction (Simple mode). */
export function directionPlain(direction: string): string {
  const d = direction.toLowerCase();
  if (d.includes("retro")) return "slow-down nudge";
  if (d.includes("prograde") || d.includes("along")) return "speed-up nudge";
  if (d.includes("radial") || d.includes("cross") || d.includes("normal")) return "sideways nudge";
  return "gentle nudge";
}

/** Simple: "about 2 hours before the closest approach". */
export function burnTimePlain(seconds: number): string {
  const abs = Math.abs(seconds);
  const hours = abs / 3600;
  if (hours >= 1.5) return `about ${Math.round(hours)} hours before the closest approach`;
  if (hours >= 0.75) return "about an hour before the closest approach";
  const minutes = Math.max(1, Math.round(abs / 60));
  return `about ${minutes} minutes before the closest approach`;
}

/** Pro: "TCA − 2.0 h" (positive `seconds` = before TCA). */
export function burnTimePro(seconds: number): string {
  const sign = seconds >= 0 ? "−" : "+";
  const absHours = Math.abs(seconds) / 3600;
  if (absHours >= 1) return `TCA ${sign} ${absHours.toFixed(1)} h`;
  return `TCA ${sign} ${Math.round(Math.abs(seconds) / 60)} min`;
}

/** Pro scientific fragment, e.g. 3.8e4 → "3.8×10⁴". Plain integers pass through small values. */
export function toSciPro(n: number): string {
  if (!Number.isFinite(n) || n === 0) return String(n);
  if (n >= 0.01 && n < 10_000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  const [mantissa, exp] = n.toExponential(1).split("e");
  return `${mantissa}×10${superscript(exp)}`;
}

/** Miss-distance the move buys: prefer the candidate's own number, else derive from before/after. */
export function distanceGained(
  recommendation: ManeuverCandidate | null,
  before: RiskMetrics,
  after: RiskMetrics
): number {
  if (recommendation && Number.isFinite(recommendation.miss_distance_gain_m)) {
    return recommendation.miss_distance_gain_m;
  }
  return Math.max(0, after.miss_distance_m - before.miss_distance_m);
}

/** Simple-mode collision-chance phrase that reads "effectively zero" once it's negligible. */
export function afterChancePlain(pc: number): string {
  if (pc <= 0) return "effectively zero";
  if (pc < 1e-6) return "effectively zero";
  const oneIn = Math.round(1 / pc).toLocaleString();
  if (pc >= 1e-4) return `still high (about 1 in ${oneIn})`;
  if (pc >= 1e-5) return `low (about 1 in ${oneIn})`;
  return `very low (about 1 in ${oneIn})`;
}
