/**
 * BeforeAfterRisk — the signature red→green comparison (doc 05 §4.4).
 *
 * Two RiskMeters side-by-side (stacked on mobile): the DANGER "before" and the SAFE "after",
 * whose fill morphs down from the before level so the SAFE badge pulses (the money shot). The
 * new miss-distance counts up from the old one, with the nudge + distance-gained beneath.
 */

import { ArrowDown, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { CountUp, RiskMeter, Term, cn, textStyles, useMode } from "../../components/ui";
import type { ManeuverCandidate, RiskMetrics } from "../../features";
import { formatDeltaV, formatDistance, RISK_VALUE, toRiskLevel } from "../../lib/format";
import { distanceGained } from "./helpers";

export interface BeforeAfterRiskProps {
  before: RiskMetrics;
  after: RiskMetrics;
  recommendation: ManeuverCandidate | null;
  /** Morph + pulse the "after" meter on first reveal. */
  animate?: boolean;
}

function MeterColumn({ label, metrics }: { label: string; metrics: RiskMetrics }) {
  const { mode } = useMode();
  return (
    <div className="flex flex-col items-center gap-2">
      <span className={cn(textStyles.eyebrow, "text-muted")}>{label}</span>
      <RiskMeter severity={metrics.severity} pc={metrics.pc} size="lg" />
      <span className={cn(textStyles.caption, "text-center text-muted")}>
        {formatDistance(metrics.miss_distance_m, mode, { comparison: true })} apart
      </span>
    </div>
  );
}

function FooterStat({ label, value, tone }: { label: ReactNode; value: string; tone: "safe" | "cyan" }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className={cn("font-display text-[1.375rem] font-semibold leading-none", tone === "safe" ? "text-safe" : "text-cyan")}>
        {value}
      </span>
      <span className={cn(textStyles.caption, "mt-1.5 text-muted")}>{label}</span>
    </div>
  );
}

export function BeforeAfterRisk({ before, after, recommendation, animate = true }: BeforeAfterRiskProps) {
  const { mode } = useMode();
  const gained = distanceGained(recommendation, before, after);
  const dv = recommendation?.delta_v_m_s ?? 0;
  const beforeFill = RISK_VALUE[toRiskLevel(before.severity)];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
        <MeterColumn label="Before" metrics={before} />

        <ArrowRight aria-hidden="true" className="hidden shrink-0 text-faint sm:block" size={28} />
        <ArrowDown aria-hidden="true" className="shrink-0 text-faint sm:hidden" size={24} />

        <div className="flex flex-col items-center gap-2">
          <span className={cn(textStyles.eyebrow, "text-safe")}>After</span>
          <RiskMeter
            severity={after.severity}
            pc={after.pc}
            size="lg"
            animateFrom={animate ? beforeFill : undefined}
          />
          <span className="font-display text-[2rem] font-semibold leading-none text-safe">
            <CountUp from={before.miss_distance_m} to={after.miss_distance_m} format={(n) => formatDistance(n, mode)} />
          </span>
          <span className={cn(textStyles.caption, "text-center text-muted")}>
            <Term k="miss-distance">how close</Term> they now pass
          </span>
        </div>
      </div>

      <div className="mx-auto flex flex-wrap items-start justify-center gap-x-12 gap-y-4">
        <FooterStat label="Distance gained" value={`+${formatDistance(gained, mode)}`} tone="safe" />
        <FooterStat label={<><Term k="delta-v">nudge</Term> needed</>} value={formatDeltaV(dv, mode)} tone="cyan" />
      </div>
    </div>
  );
}
