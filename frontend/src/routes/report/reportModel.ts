/**
 * Pure helpers for the Mission Report route (`/report`).
 *
 * No React, no hooks — just string framing + the Markdown export packet. The export mirrors the
 * legacy mission store's `exportReport` byte-for-byte so the audit artifact stays identical:
 * title, headline, summary, every section, assumptions, and warnings (doc 06 §4.1).
 */

import type { ComputationMode, MissionReport } from "../../features";
import { dvSize, type Mode } from "../../lib/format";

/* ---------- Markdown export packet (the audit artifact) ---------- */

/** Assemble the report Markdown packet — identical in Simple and Pro (doc 06 §6). */
export function buildReportMarkdown(report: MissionReport): string {
  return [
    `# ${report.title}`,
    "",
    `## ${report.briefing.headline}`,
    "",
    report.briefing.summary,
    "",
    ...report.sections.flatMap((section) => [`## ${section.title}`, "", section.body, ""]),
    "## Assumptions",
    "",
    ...report.assumptions.map((assumption) => `- ${assumption}`),
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((warning) => `- ${warning}`) : ["- None."])
  ].join("\n");
}

/** Trigger a browser download of the report Markdown as `${report_id}.md`. */
export function downloadReportMarkdown(report: MissionReport): void {
  const blob = new Blob([buildReportMarkdown(report)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${report.report_id}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Copy the report Markdown packet to the clipboard (best-effort; resolves to success boolean). */
export async function copyReportMarkdown(report: MissionReport): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildReportMarkdown(report));
    return true;
  } catch {
    return false;
  }
}

/* ---------- Section fallbacks (when cached plan/apply are absent) ---------- */

/** First report section whose title contains any of the keywords (case-insensitive). */
export function findSectionBody(report: MissionReport, keywords: string[]): string | undefined {
  const match = report.sections.find((section) =>
    keywords.some((keyword) => section.title.toLowerCase().includes(keyword))
  );
  return match?.body;
}

/* ---------- Small mode-aware framings specific to the report ---------- */

/** Plain direction word for the nudge: "speed-up" / "slow-down" / humanized. */
export function directionWord(direction: string): string {
  const value = direction.toLowerCase();
  if (value.includes("retro")) return "slow-down";
  if (value.includes("pro")) return "speed-up";
  return direction.replaceAll("-", " ");
}

/** Exact direction for Pro: raw tokens, spaced ("along track prograde"). */
export function directionExact(direction: string): string {
  return direction.replaceAll("-", " ");
}

/** Simple delta-v phrasing without the trailing "nudge" word (so copy can place it itself). */
export function deltaVPhrase(mps: number, mode: Mode): string {
  return mode === "pro" ? `${mps.toFixed(2)} m/s` : `a ${dvSize(mps)} ${mps.toFixed(2)} m/s`;
}

/** Burn lead time in hours before the closest approach (always positive). */
export function burnLeadHours(seconds: number): number {
  return Math.abs(seconds) / 3600;
}

/** Simple: "about 2 hours before the closest approach". Pro: "TCA − 2.0 h". */
export function burnTiming(seconds: number, mode: Mode): string {
  const hours = burnLeadHours(seconds);
  if (mode === "pro") return `TCA − ${hours.toFixed(1)} h`;
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `about ${minutes} minute${minutes === 1 ? "" : "s"} before the closest approach`;
  }
  const rounded = Math.round(hours);
  return `about ${rounded} hour${rounded === 1 ? "" : "s"} before the closest approach`;
}

/** "14:32 UTC" extracted from an ISO timestamp (Simple-mode prose). */
export function utcHourMinute(iso: string): string {
  const match = iso.match(/T(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]} UTC` : iso;
}

/** Friendly label for a raw source-id key (Simple mode). */
export function sourceIdLabel(key: string): string {
  switch (key) {
    case "scenario_run_id":
      return "Scenario run";
    case "conjunction_id":
      return "Close approach";
    case "plan_id":
      return "Safe-move plan";
    case "candidate_id":
      return "Chosen nudge";
    default:
      return key.replaceAll("_", " ");
  }
}

/** How the close-approach geometry was computed (data lineage, doc 04/08 §7). */
export function computationModeLabel(mode?: ComputationMode): { label: string; note: string } {
  if (mode === "fixture-fallback") {
    return {
      label: "Demo geometry (fixture)",
      note: "Deterministic offline fixture geometry — not live propagation."
    };
  }
  if (mode === "sgp4") {
    return { label: "SGP4 propagation", note: "Standard analytic orbit propagation." };
  }
  return {
    label: "SGP4 (assumed)",
    note: "The backend does not yet report computation mode; assumed SGP4 propagation."
  };
}
