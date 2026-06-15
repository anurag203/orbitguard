import { type ConjunctionDetail, isApiError } from "../../features";
import { cn } from "../../components/ui/cn";
import { ErrorState } from "../../components/ui/ErrorState";
import { Section } from "../../components/ui/Section";
import { Skeleton } from "../../components/ui/Skeleton";
import { Stat } from "../../components/ui/Stat";
import { textStyles } from "../../components/ui/styles";
import { Term } from "../../components/ui/Term";
import { useMode } from "../../components/ui/ModeProvider";
import type { RiskLevel } from "../../lib/format";
import type { TermKey } from "../../lib/terms";
import { chanceValue, closestApproachValue, nudgeValue, PROOF_FALLBACK, safeGapValue, type StatValue } from "./proof";

export interface ProofStatsProps {
  /** React Query status for the threat-detail fetch. */
  status: "pending" | "error" | "success";
  detail?: ConjunctionDetail;
  error: unknown;
  onRetry: () => void;
  /** Protected asset name (for the section lead). */
  protectedName: string;
  /** Source ids surfaced in Pro mode. */
  scenarioId: string;
  conjunctionId: string;
}

type StatTone = RiskLevel | "cyan";

/** One proof number. Plain labels stay strings; jargon ones render a <Term> (doc 01 Law 2). */
function ProofStat({
  spec,
  tone,
  label,
  term,
  termText,
  mono
}: {
  spec: StatValue;
  tone: StatTone;
  label?: string;
  term?: TermKey;
  termText?: string;
  /** Render the (static, non-counting) value in mono — Pro's "Pc = 2.78 × 10⁻⁴" (spec §6). */
  mono?: boolean;
}) {
  const countProps = spec.count ? { countUp: true, countTo: spec.count.to, format: spec.count.format } : {};
  const value = mono && !spec.count ? <span className="font-mono">{spec.value}</span> : spec.value;
  return (
    <Stat
      size="lg"
      tone={tone}
      value={value}
      label={label ?? ""}
      hint={term ? <Term k={term}>{termText}</Term> : undefined}
      {...countProps}
    />
  );
}

function ProofSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-10 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-3">
          <Skeleton height={40} width={128} />
          <Skeleton height={14} width={90} />
        </div>
      ))}
    </div>
  );
}

/**
 * The demo told as four honest numbers (spec §4.4). The hero never waits on this fetch (Law 6):
 * while pending we show skeleton bars; on error we keep the story readable with the canonical
 * fallback numbers plus a calm retry; Simple/Pro swap the figures live (spec §6).
 */
export function ProofStats({ status, detail, error, onRetry, protectedName, scenarioId, conjunctionId }: ProofStatsProps) {
  const { mode, isPro } = useMode();

  const sectionProps = {
    title: "The Protect ISRO demo, in four numbers",
    description: `A real close approach for ${protectedName} \u2014 how close it got, how risky it was, and the one small move that clears it.`
  };

  if (status === "pending") {
    return (
      <Section {...sectionProps}>
        <ProofSkeletons />
      </Section>
    );
  }

  const isError = status === "error";
  const missDistanceM = detail?.risk.miss_distance_m ?? PROOF_FALLBACK.missDistanceM;
  const pc = detail?.risk.pc ?? PROOF_FALLBACK.pc;

  const closest = closestApproachValue(missDistanceM, mode);
  const chance = chanceValue(pc, mode);
  const nudge = nudgeValue(PROOF_FALLBACK.deltaVMps);
  const gap = safeGapValue(PROOF_FALLBACK.safeGapM, mode);

  return (
    <Section {...sectionProps}>
      {isError ? (
        <ErrorState
          className="mb-8"
          title="Live numbers are taking a moment"
          message="Here's the demo in the meantime."
          retryLabel="Try again"
          onRetry={onRetry}
          detail={isApiError(error) ? `${error.code} \u00b7 HTTP ${error.status}` : undefined}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-x-10 md:grid-cols-4">
        <ProofStat spec={closest} tone="warning" label="how close it got" />
        <ProofStat spec={chance} tone="danger" term="pc" termText="collision chance" mono={isPro} />
        <ProofStat spec={nudge} tone="cyan" term="delta-v" termText="the safe nudge" />
        <ProofStat spec={gap} tone="safe" label="new safe gap" />
      </div>

      {isPro ? (
        <p className={cn(textStyles.mono, "mt-6 text-faint")}>
          {conjunctionId} &middot; demo-{scenarioId}
        </p>
      ) : null}
    </Section>
  );
}
