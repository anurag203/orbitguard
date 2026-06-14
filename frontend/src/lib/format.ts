/**
 * Number framing + risk model for OrbitGuard (doc 05 §1.4 + §7, doc 03 §6).
 *
 * Rule of thumb: risk **word + color first** (via RiskBadge/RiskMeter), the figure second.
 * Simple humanizes, Pro is exact. Components stay dumb — they call these mode-aware helpers.
 */

/** Global Simple|Pro mode. Canonical definition lives here (doc 05 §1.4). */
export type Mode = "simple" | "pro";

export type RiskLevel = "safe" | "watch" | "warning" | "danger";

/** Backend `RiskMetrics.severity` strings → canonical RiskLevel (doc 02 §2.4). */
export function toRiskLevel(severity: string): RiskLevel {
  switch (severity?.toLowerCase()) {
    case "nominal":
      return "safe";
    case "safe":
      return "safe";
    case "watch":
      return "watch";
    case "warning":
      return "warning";
    case "critical":
      return "danger";
    case "danger":
      return "danger";
    default:
      return "watch"; // unknown → neutral-cautious, never throws
  }
}

/** Friendly word per level. The word + color come BEFORE any number (doc 01 §5). */
export const RISK_WORD: Record<RiskLevel, string> = {
  safe: "Safe",
  watch: "Watch",
  warning: "Warning",
  danger: "Danger"
};

/** Solid text-color utility per level. */
export const RISK_TEXT: Record<RiskLevel, string> = {
  safe: "text-safe",
  watch: "text-watch",
  warning: "text-warning",
  danger: "text-danger"
};

/** Tinted (~15%) background fill per level — pair with RISK_TEXT for badges/meters. */
export const RISK_FILL: Record<RiskLevel, string> = {
  safe: "bg-safe/15",
  watch: "bg-watch/15",
  warning: "bg-warning/15",
  danger: "bg-danger/15"
};

/** Solid background per level (dots, Steps "done" fill). */
export const RISK_SOLID: Record<RiskLevel, string> = {
  safe: "bg-safe",
  watch: "bg-watch",
  warning: "bg-warning",
  danger: "bg-danger"
};

/** SVG stroke color per level (RiskMeter arc). */
export const RISK_STROKE: Record<RiskLevel, string> = {
  safe: "stroke-safe",
  watch: "stroke-watch",
  warning: "stroke-warning",
  danger: "stroke-danger"
};

/** Discrete 0..1 fill used when a RiskMeter has no explicit `value` (doc 05 §3 RiskMeter). */
export const RISK_VALUE: Record<RiskLevel, number> = {
  safe: 0.25,
  watch: 0.5,
  warning: 0.75,
  danger: 1
};

/* ---------- Pc: the flagship transformation (doc 03 §6) ---------- */

export function pcOneInN(pc: number): number {
  return pc > 0 ? Math.round(1 / pc) : Infinity;
}

export type PcWord = "very high" | "high" | "low" | "negligible";

/** Tunable chance-magnitude qualifier. NOT used to pick risk color (that's `toRiskLevel`). */
export function pcWord(pc: number): PcWord {
  if (pc >= 1e-4) return "very high"; // 2.8e-4 → "very high" (matches doc 01 §4)
  if (pc >= 1e-5) return "high";
  if (pc >= 1e-7) return "low";
  return "negligible";
}

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "+": "",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹"
};

/** Maps an exponent string like "-4" → "⁻⁴". */
export function superscript(exp: string): string {
  return exp
    .split("")
    .map((ch) => SUPERSCRIPT[ch] ?? ch)
    .join("");
}

/** Pro: "2.78 × 10⁻⁴" with a real ×10 superscript. */
export function formatPcPro(pc: number): string {
  if (pc === 0) return "0";
  const [mantissa, exp] = pc.toExponential(2).split("e");
  return `${mantissa} × 10${superscript(exp)}`;
}

/** Simple: "very high (about 1 in 3,600)".  Pro: "2.78 × 10⁻⁴". */
export function formatPc(pc: number, mode: Mode): string {
  if (mode === "pro") return formatPcPro(pc);
  if (pc <= 0) return "effectively zero";
  const oneIn = pcOneInN(pc);
  // A post-maneuver Pc can be vanishingly small; "1 in 25,170,346,594,862,728,000,…" overflows the
  // line and reads as broken. Past a billion-to-one the exact figure stops meaning anything to a human.
  if (oneIn > 1_000_000_000) return `${pcWord(pc)} (less than 1 in a billion)`;
  return `${pcWord(pc)} (about 1 in ${oneIn.toLocaleString()})`;
}

/* ---------- Distance (miss distance, separations) ---------- */

/** A loose, friendly comparison for small distances (doc 03 §6). ~100 m per football field. */
export function distanceComparison(meters: number): string {
  if (meters <= 0) return "";
  if (meters < 3000) {
    const fields = Math.max(1, Math.round(meters / 100));
    return `(≈ ${fields} football field${fields === 1 ? "" : "s"})`;
  }
  return "";
}

/** Simple: rounded human ("600 m", "8.4 km") + optional comparison.  Pro: precise. */
export function formatDistance(meters: number, mode: Mode, opts?: { comparison?: boolean }): string {
  if (mode === "pro") {
    return meters >= 1000 ? `${(meters / 1000).toFixed(3)} km` : `${meters.toFixed(1)} m`;
  }
  const base = meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  const comparison = opts?.comparison ? distanceComparison(meters) : "";
  return comparison ? `${base} ${comparison}` : base;
}

/* ---------- Speed (relative / closing velocity) ---------- */

/** Both modes use km/s (already intuitive); Pro adds precision. */
export function formatSpeed(kmps: number, mode: Mode): string {
  return mode === "pro" ? `${kmps.toFixed(3)} km/s` : `${kmps.toFixed(1)} km/s`;
}

/* ---------- Delta-v (the nudge) ---------- */

export type DvSize = "tiny" | "small" | "moderate" | "large";

export function dvSize(mps: number): DvSize {
  if (mps < 0.2) return "tiny";
  if (mps < 1) return "small";
  if (mps < 5) return "moderate";
  return "large";
}

/** Simple: "a tiny 0.12 m/s nudge".  Pro: "0.12 m/s". */
export function formatDeltaV(mps: number, mode: Mode): string {
  return mode === "pro" ? `${mps.toFixed(2)} m/s` : `a ${dvSize(mps)} ${mps.toFixed(2)} m/s nudge`;
}

/* ---------- Time / TCA ---------- */

/** "in 4 hours" / "3 hours ago" / "in 12 minutes". */
export function relativeFromNow(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const future = diffMs >= 0;
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return future ? "in moments" : "just now";
  if (minutes < 60) {
    const plural = minutes === 1 ? "" : "s";
    return future ? `in ${minutes} minute${plural}` : `${minutes} minute${plural} ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    const plural = hours === 1 ? "" : "s";
    return future ? `in ${hours} hour${plural}` : `${hours} hour${plural} ago`;
  }
  const days = Math.round(hours / 24);
  const plural = days === 1 ? "" : "s";
  return future ? `in ${days} day${plural}` : `${days} day${plural} ago`;
}

/** Simple: relative ("in 4 hours").  Pro: absolute UTC ("2026-06-14 14:32:08 UTC"). */
export function formatTime(iso: string, mode: Mode, now: Date = new Date()): string {
  if (mode === "pro") {
    const clean = iso
      .replace("T", " ")
      .replace(/\.\d+/, "")
      .replace(/Z$/, "")
      .trim();
    return `${clean} UTC`;
  }
  return relativeFromNow(new Date(iso), now);
}
