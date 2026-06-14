/**
 * Shared, presentational-only helpers for the Threats routes (doc 03 + doc 04).
 *
 * Everything here is pure (no JSX, no fetching) so both `ThreatsRoute` and
 * `ThreatDetailRoute` can turn the raw API shapes into the plain-language copy
 * the spec calls for. Numbers always flow through `lib/format` so Simple/Pro
 * stays consistent with the rest of the product.
 */

import type { ConjunctionSummary } from "../../features";
import {
  formatDistance,
  formatTime,
  relativeFromNow,
  toRiskLevel,
  type Mode,
  type RiskLevel
} from "../../lib/format";

/** The three first-class scenarios, in the canonical hero-first order (doc 03 §4.2). */
export type ThreatScenarioId = "protect-isro" | "2009-replay" | "kessler-sandbox";
export const SCENARIO_IDS = ["protect-isro", "2009-replay", "kessler-sandbox"] as const;

/** Narrow an arbitrary string to a known scenario id (used for URL + prop parsing). */
export function isScenarioId(value: string | null | undefined): value is ThreatScenarioId {
  return value === "protect-isro" || value === "2009-replay" || value === "kessler-sandbox";
}

/** Education-only scenario — shows the risk, never a live maneuver (doc 04 §7). */
export function isEducationScenario(scenarioId: string): boolean {
  return scenarioId === "kessler-sandbox";
}

/**
 * Map a `conjunction_id` back to its scenario (doc 04 §4.8 — the detail route only
 * has the id, so we infer the scenario for framing + copy). Defaults to the hero.
 */
export function scenarioIdForConjunction(conjunctionId: string): ThreatScenarioId {
  if (conjunctionId.includes("2009-replay")) return "2009-replay";
  if (conjunctionId.includes("kessler")) return "kessler-sandbox";
  return "protect-isro";
}

/**
 * Friendly, judge-readable phrase for each deterministic demo object.
 *
 * The offline demo catalog is fixed, so a small map gives us the exact plain
 * sentences the spec asks for without an extra catalog fetch. Used both as a
 * subject ("CARTOSAT-2F", "A policy satellite") and as a plain secondary
 * descriptor ("a piece of debris", "a debris cloud", "Cosmos 2251").
 */
const OBJECT_PHRASE: Record<string, string> = {
  "isro-cartosat-2f": "CARTOSAT-2F",
  "isro-risat-2br1": "RISAT-2BR1",
  "debris-demo-001": "a piece of debris",
  "sentinel-comparison-demo": "the Sentinel comparison object",
  "iridium-33-demo": "Iridium 33",
  "cosmos-2251-demo": "Cosmos 2251",
  "cosmos-2251-debris-demo": "a piece of Cosmos 2251 debris",
  "kessler-policy-sat-demo": "a policy satellite",
  "kessler-breakup-source-demo": "the breakup source",
  "kessler-debris-cloud-demo": "a debris cloud"
};

/** Title-ish fallback for an unknown object id (strips the demo noise). */
function prettifyId(objectId: string): string {
  return objectId
    .replace(/[-_]+/g, " ")
    .replace(/\bdemo\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The human phrase for an object, falling back to debris/cloud heuristics then a prettified id. */
export function objectPhrase(objectId: string): string {
  const known = OBJECT_PHRASE[objectId];
  if (known) return known;
  const lower = objectId.toLowerCase();
  if (lower.includes("cloud")) return "a debris cloud";
  if (lower.includes("debris")) return "a piece of debris";
  return prettifyId(objectId) || objectId;
}

/** True when the phrase is a generic descriptor ("a piece of debris") rather than a proper name. */
export function isPlainDescriptor(objectId: string): boolean {
  const phrase = objectPhrase(objectId);
  return phrase.startsWith("a ") || phrase.startsWith("the ");
}

/** Capitalize the first letter so a lowercase phrase can open a sentence. */
export function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** "10 Feb 2026" — a calm absolute date for historical / education encounters. */
export function friendlyDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

/** Simple-mode relative phrase with the spec's softening ("in about 4 hours"). */
function softRelative(iso: string): string {
  const phrase = relativeFromNow(new Date(iso));
  return phrase.startsWith("in ") ? phrase.replace("in ", "in about ") : phrase;
}

/** Distance as "about 612 m" (Simple) / "611.8 m" (Pro). */
export function missText(meters: number, mode: Mode): string {
  return mode === "pro" ? formatDistance(meters, "pro") : `about ${formatDistance(meters, "simple")}`;
}

/** Closing-speed phrase. Simple: "slow (≈ 0.7 m/s)" / "fast (7.2 km/s)". Pro: exact km/s. */
export function speedText(kmps: number, mode: Mode): string {
  if (mode === "pro") return `${kmps.toFixed(3)} km/s`;
  if (kmps < 0.1) {
    const mps = Math.round(kmps * 1000 * 10) / 10;
    return `slow (≈ ${mps} m/s)`;
  }
  const word = kmps < 8 ? "fast" : "very fast";
  return `${word} (${kmps.toFixed(1)} km/s)`;
}

/** "When" value for the stat row: relative for the live alert, absolute date for replays. */
export function whenText(conjunction: ConjunctionSummary, mode: Mode): string {
  if (mode === "pro") return formatTime(conjunction.tca_utc, "pro");
  if (scenarioIdForConjunction(conjunction.conjunction_id) === "protect-isro") {
    return softRelative(conjunction.tca_utc);
  }
  return friendlyDate(conjunction.tca_utc);
}

const ADVERB: Record<RiskLevel, string> = {
  danger: "dangerously close to",
  warning: "close to",
  watch: "near",
  safe: "well clear of"
};

/**
 * The canonical plain sentence (doc 01 §1): who + from what + when + how close.
 * Shape adapts to the scenario's emotional framing — a live future alert, a
 * historical replay, or an education sandbox — and to Simple/Pro numbers.
 */
export function threatSentence(
  conjunction: ConjunctionSummary,
  mode: Mode,
  options?: { detail?: boolean }
): string {
  const scenario = scenarioIdForConjunction(conjunction.conjunction_id);
  const level = toRiskLevel(conjunction.risk.severity);
  const subject = capitalize(objectPhrase(conjunction.primary_object_id));
  const secondary = objectPhrase(conjunction.secondary_object_id);
  const miss = missText(conjunction.risk.miss_distance_m, mode);

  if (scenario === "2009-replay") {
    const tail = options?.detail
      ? " so you can see how avoidance would have worked"
      : "";
    return `${subject} and ${secondary} came within ${miss} of each other — the real 2009 collision, replayed${tail}.`;
  }

  if (scenario === "kessler-sandbox") {
    return `${subject} passes ${miss} from ${secondary} — close enough to watch as debris builds up, but not urgent.`;
  }

  const adverb = ADVERB[level];
  const when = mode === "pro" ? `on ${formatTime(conjunction.tca_utc, "pro")}` : softRelative(conjunction.tca_utc);

  if (options?.detail) {
    return `${subject} will pass ${adverb} ${secondary} ${when}. They'll be ${miss} apart.`;
  }
  return `${subject} will pass ${adverb} ${secondary} ${when} — ${miss} apart.`;
}

const LEVEL_RANK: Record<RiskLevel, number> = { danger: 0, warning: 1, watch: 2, safe: 3 };

/** Worst-first ordering: severity band first, then the smallest gap (doc 03 §4.3). */
export function rankThreats(list: ConjunctionSummary[]): ConjunctionSummary[] {
  return [...list].sort((left, right) => {
    const byLevel = LEVEL_RANK[toRiskLevel(left.risk.severity)] - LEVEL_RANK[toRiskLevel(right.risk.severity)];
    if (byLevel !== 0) return byLevel;
    return left.risk.miss_distance_m - right.risk.miss_distance_m;
  });
}
