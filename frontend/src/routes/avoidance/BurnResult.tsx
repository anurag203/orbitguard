/**
 * BurnResult — the one human sentence (doc 05 §4.5).
 *
 * Simple mode: a single plain-language line built entirely from the live plan/apply numbers.
 * Pro mode: the precise burn line (Δv, direction, burn time, exact Pc, reduction, miss, score).
 * Nothing is hardcoded — every value comes from `ManeuverPlan` / `ManeuverApply`.
 */

import { Term, cn, textStyles, useMode } from "../../components/ui";
import type { ManeuverApply, ManeuverPlan } from "../../features";
import { dvSize, formatDistance, formatPcPro } from "../../lib/format";
import { afterChancePlain, burnTimePro, isAlongTrack, toSciPro } from "./helpers";

export interface BurnResultProps {
  plan: ManeuverPlan;
  apply?: ManeuverApply;
  primaryName: string;
  /** "planned" softens the lead word to a recommendation; "applied" confirms it's done. */
  stage: "planned" | "applied";
}

export function BurnResult({ plan, apply, primaryName, stage }: BurnResultProps) {
  const { isPro } = useMode();
  const recommendation = plan.recommendation;
  if (!recommendation) return null;

  const before = plan.before;
  const after = apply?.after ?? plan.predicted_after;
  const dv = recommendation.delta_v_m_s;

  if (isPro) {
    const direction = recommendation.direction;
    return (
      <p className={cn(textStyles.body, "text-body")}>
        Recommended burn: <span className="text-strong">Δv {dv.toFixed(3)} m/s</span>,{" "}
        {isAlongTrack(direction) ? <Term k="along-track">{direction}</Term> : direction}, at{" "}
        <span className="text-strong">{burnTimePro(recommendation.burn_t_minus_tca_s)}</span>.{" "}
        <Term k="pc" as="static">
          Pc
        </Term>{" "}
        {formatPcPro(before.pc)} → {formatPcPro(after.pc)} (reduction ×{toSciPro(recommendation.pc_reduction_factor)}).{" "}
        Miss {Math.round(before.miss_distance_m).toLocaleString()} m → {Math.round(after.miss_distance_m).toLocaleString()} m.
        Score {recommendation.score.toFixed(2)}.
      </p>
    );
  }

  const size = dvSize(dv);
  const lead = stage === "applied" ? "Done." : "Here's the move.";

  return (
    <p className={cn(textStyles.bodyLg, "text-body")}>
      <span className="font-medium text-strong">{lead}</span> A {size}{" "}
      <Term k="delta-v">{dv.toFixed(2)} m/s nudge</Term> moves {primaryName} from{" "}
      <span className="text-strong">{formatDistance(before.miss_distance_m, "simple")}</span> to{" "}
      <span className="text-strong">{formatDistance(after.miss_distance_m, "simple")}</span> away — the{" "}
      <Term k="pc">collision chance</Term> is now {afterChancePlain(after.pc)}.
    </p>
  );
}
