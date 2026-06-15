import { ArrowRight, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Button, cn, Surface, textStyles, useMode } from "../../components/ui";
import type { CatalogObject, ComputationMode, ConjunctionSummary } from "../../features";
import { formatDistance } from "../../lib/format";

export interface ThreatsSummaryProps {
  /** Friendly protected-asset name (e.g. "CARTOSAT-2F"). */
  protectedName?: string;
  /** How many close approaches in this scenario need action (the ranked rows). */
  needsAction: number;
  /** Plain-language scenario description (from the scenario list). */
  scenarioDescription?: string;
  /** How the backend produced the ranked worklist. */
  computationMode?: ComputationMode;
  /** Warnings attached to the screening response. */
  warnings?: string[];
  /** Highest-ranked row, used to explain the ordering. */
  topThreat?: ConjunctionSummary;
  /** Named assets from the Protect ISRO watchlist. */
  watchlist?: CatalogObject[];
  watchlistLoading?: boolean;
  /** Destination for the single emphasized action — usually the #1 threat detail. */
  topThreatTo?: string;
  /** True when screening came back clean (no ranked rows). */
  allClear?: boolean;
  className?: string;
}

/** Strip the demo "Demo" suffix so the protected chip reads as a real asset name. */
function cleanName(name?: string): string {
  if (!name) return "the protected satellite";
  return name.replace(/\s*demo$/i, "").trim() || name;
}

/** A small label + value stack used for the at-a-glance counts. */
function Metric({ value, label, tone }: { value: string; label: string; tone: "danger" | "safe" }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("font-display text-[1.75rem] font-semibold leading-none", tone === "danger" ? "text-danger" : "text-safe")}>
        {value}
      </span>
      <span className={cn(textStyles.caption, "text-muted")}>{label}</span>
    </div>
  );
}

function modeLabel(mode: ComputationMode | undefined, isPro: boolean): string {
  if (mode === "fixture-fallback") return isPro ? "Fixture fallback" : "Offline fallback";
  if (mode === "sgp4") return isPro ? "SGP4 screening" : "Orbit-prediction screening";
  return "Screening run";
}

/**
 * The right rail for `/threats` (plan 04 §3): a calm "what did we screen" summary so the
 * page reads as a deliberate worklist rather than a single card in a void.
 *
 * Crucially, the protected asset wears the **cyan / safe** accent — it is the thing we're
 * keeping safe, not the danger (plan 04 §4). The risk colour is reserved for the encounter.
 */
export function ThreatsSummary({
  protectedName,
  needsAction,
  scenarioDescription,
  computationMode,
  warnings = [],
  topThreat,
  watchlist,
  watchlistLoading = false,
  topThreatTo,
  allClear = false,
  className
}: ThreatsSummaryProps) {
  const { isPro } = useMode();
  const name = cleanName(protectedName);

  return (
    <Surface elevation="surface" padding={6} radius="lg" className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-3">
        <p className={cn(textStyles.eyebrow, "inline-flex items-center gap-1.5 text-muted")}>
          <Radar aria-hidden="true" size={13} />
          Screening summary
        </p>
        <div className="flex flex-col gap-1.5">
          <span className={cn(textStyles.caption, "text-muted")}>Protecting</span>
          <Badge tone="cyan" size="md" icon={<ShieldCheck aria-hidden="true" size={13} />} className="self-start">
            {name}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-hairline pt-5">
        <Metric value={String(needsAction)} label={needsAction === 1 ? "needs action" : "need action"} tone="danger" />
        <Metric value={allClear ? "Clear" : "Ranked"} label={allClear ? "no rows returned" : "worst-first worklist"} tone="safe" />
      </div>

      <p className={cn(textStyles.body, "text-muted")}>
        {allClear
          ? `We screened ${name} against the scenario catalog. No close approach was returned for this run.`
          : `We screened ${name} against the scenario catalog. ${
              needsAction === 1 ? "One close approach needs" : `${needsAction} close approaches need`
            } a decision, ordered so the riskiest item is first.`}
      </p>

      <div className="flex flex-col gap-4 border-t border-hairline pt-5">
        {scenarioDescription ? (
          <div className="flex flex-col gap-1">
            <p className={cn(textStyles.eyebrow, "text-muted")}>Scenario context</p>
            <p className={cn(textStyles.caption, "text-faint")}>{scenarioDescription}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <p className={cn(textStyles.eyebrow, "text-muted")}>What was screened</p>
          <p className={cn(textStyles.caption, "text-faint")}>
            {name} versus the active scenario catalog · {modeLabel(computationMode, isPro)}
          </p>
        </div>

        {watchlistLoading || watchlist?.length ? (
          <div className="flex flex-col gap-2">
            <p className={cn(textStyles.eyebrow, "text-muted")}>What we're protecting</p>
            {watchlistLoading ? (
              <p className={cn(textStyles.caption, "text-faint")}>Loading protected assets...</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {watchlist?.map((object) => (
                  <li key={object.object_id} className="flex items-center justify-between gap-3">
                    <span className={cn(textStyles.caption, "text-body")}>{object.name}</span>
                    <span className={cn(textStyles.mono, "text-faint")}>{object.norad_id ?? object.object_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {!allClear && topThreat ? (
          <div className="flex flex-col gap-1">
            <p className={cn(textStyles.eyebrow, "text-muted")}>Why this is first</p>
            <p className={cn(textStyles.caption, "text-faint")}>
              It sits in the highest returned risk band and closes to {formatDistance(topThreat.risk.miss_distance_m, "simple")}.
            </p>
          </div>
        ) : null}

        {warnings[0] ? <p className={cn(textStyles.caption, "text-warning")}>{warnings[0]}</p> : null}
      </div>

      {!allClear && topThreatTo ? (
        <Button asChild variant="primary" size="md" className="w-full">
          <Link to={topThreatTo}>
            Open the top threat
            <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </Button>
      ) : null}

      {allClear ? (
        <p className={cn(textStyles.caption, "inline-flex items-center gap-1.5 text-safe")}>
          <Sparkles aria-hidden="true" size={14} />
          You're all clear here.
        </p>
      ) : null}
    </Surface>
  );
}
