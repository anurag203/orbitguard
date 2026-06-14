import { ArrowRight, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge, Button, cn, Surface, textStyles } from "../../components/ui";

export interface ThreatsSummaryProps {
  /** Friendly protected-asset name (e.g. "CARTOSAT-2F"). */
  protectedName?: string;
  /** How many close approaches in this scenario need action (the ranked rows). */
  needsAction: number;
  /** Plain-language scenario description (from the scenario list). */
  scenarioDescription?: string;
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
  topThreatTo,
  allClear = false,
  className
}: ThreatsSummaryProps) {
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
        <Metric value="Clear" label="all other tracked objects" tone="safe" />
      </div>

      <p className={cn(textStyles.body, "text-muted")}>
        {allClear
          ? `We re-screened ${name} against everything else we track. Nothing is on a worrying path right now.`
          : `We checked ${name} against every other tracked object. ${
              needsAction === 1 ? "One close approach needs" : `${needsAction} close approaches need`
            } a decision — the rest of the catalog is clear.`}
      </p>

      {scenarioDescription ? (
        <p className={cn(textStyles.caption, "border-t border-hairline pt-5 text-faint")}>{scenarioDescription}</p>
      ) : null}

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
