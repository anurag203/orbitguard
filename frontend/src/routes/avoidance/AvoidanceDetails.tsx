/**
 * AvoidanceDetails — the body of "Show details" (doc 05 §6).
 *
 * Simple mode: a plain "why this move" sentence + assumptions in plain English + a margin-of-error
 * one-liner. Pro mode: the full evidence — candidate grid (recommendation + alternatives), the
 * covariance/uncertainty model, raw IDs, and every assumption/warning. All from real data.
 */

import { Badge, Card, KeyValue, Stack, Term, cn, textStyles, useMode } from "../../components/ui";
import type { ConjunctionDetail, ManeuverApply, ManeuverCandidate, ManeuverPlan } from "../../features";
import { formatDeltaV, formatDistance, formatPc } from "../../lib/format";
import { plainifyJargon } from "../../lib/plainLanguage";
import { burnTimePro } from "./helpers";

export interface AvoidanceDetailsProps {
  plan: ManeuverPlan;
  apply?: ManeuverApply;
  detail?: ConjunctionDetail;
}

function Bullets({ title, items, plain = false }: { title: string; items: string[]; plain?: boolean }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn(textStyles.eyebrow, "text-muted")}>{title}</span>
      <ul className="flex flex-col gap-1">
        {items.map((item, index) => (
          <li key={index} className={cn(textStyles.body, "text-muted")}>
            • {plain ? plainifyJargon(item) : item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CandidateCard({ candidate, recommended }: { candidate: ManeuverCandidate; recommended: boolean }) {
  const accepted = candidate.status?.toLowerCase() === "accepted" || recommended;
  return (
    <Card padding={4} elevation={recommended ? "surface-2" : "surface"} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className={cn(textStyles.body, "text-strong")}>{candidate.direction}</span>
        {recommended ? (
          <Badge tone="cyan">Recommended</Badge>
        ) : (
          <Badge tone={accepted ? "safe" : "neutral"}>{candidate.status}</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <KeyValue label="Δv">{formatDeltaV(candidate.delta_v_m_s, "pro")}</KeyValue>
        <KeyValue label="Score" mono>
          {candidate.score.toFixed(2)}
        </KeyValue>
        <KeyValue label="Predicted Pc">{formatPc(candidate.predicted_risk.pc, "pro")}</KeyValue>
        <KeyValue label="Reduction" mono>
          ×{candidate.pc_reduction_factor.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </KeyValue>
        <KeyValue label="Miss gain">{formatDistance(candidate.miss_distance_gain_m, "pro")}</KeyValue>
        <KeyValue label="Burn time" mono>
          {burnTimePro(candidate.burn_t_minus_tca_s)}
        </KeyValue>
      </div>
      {candidate.reason ? <p className={cn(textStyles.caption, "text-muted")}>{candidate.reason}</p> : null}
      {candidate.rejection_reasons.length ? (
        <p className={cn(textStyles.caption, "text-warning")}>{candidate.rejection_reasons.join(" · ")}</p>
      ) : null}
    </Card>
  );
}

export function AvoidanceDetails({ plan, apply, detail }: AvoidanceDetailsProps) {
  const { isPro } = useMode();
  const recommendation = plan.recommendation;
  const covariance = detail?.pc_estimate?.covariance;

  if (!isPro) {
    return (
      <Stack gap={6}>
        <div className="flex flex-col gap-1.5">
          <span className={cn(textStyles.eyebrow, "text-muted")}>Why this move</span>
          <p className={cn(textStyles.body, "max-w-[68ch] text-body")}>
            We compared a few small nudges and picked the gentlest one that opens a safe gap without wasting fuel.
          </p>
        </div>
        <p className={cn(textStyles.body, "text-muted")}>
          <Term k="covariance">Margin of error</Term>: positions are estimates, so we keep a comfortable safety buffer
          and re-check the new path before calling it safe.
        </p>
        <Bullets title="Good to know" items={plan.assumptions.slice(0, 4)} plain />
        <Bullets title="Heads-up" items={plan.warnings} plain />
      </Stack>
    );
  }

  const candidates = [recommendation, ...plan.alternatives].filter(
    (candidate): candidate is ManeuverCandidate => Boolean(candidate)
  );

  return (
    <Stack gap={6}>
      <div className="flex flex-col gap-2">
        <span className={cn(textStyles.eyebrow, "text-muted")}>
          Candidate moves ({plan.candidate_count || candidates.length})
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.candidate_id}
              candidate={candidate}
              recommended={recommendation?.candidate_id === candidate.candidate_id}
            />
          ))}
        </div>
      </div>

      {covariance ? (
        <div className="flex flex-col gap-2">
          <span className={cn(textStyles.eyebrow, "text-muted")}>
            <Term k="covariance" as="static">
              Covariance
            </Term>{" "}
            / uncertainty
          </span>
          <Card padding={4}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              <KeyValue label="Model" mono>
                {covariance.model_id}
              </KeyValue>
              <KeyValue label="σx" mono>
                {covariance.sigma_x_m} m
              </KeyValue>
              <KeyValue label="σy" mono>
                {covariance.sigma_y_m} m
              </KeyValue>
              <KeyValue label="Hard-body radius" mono>
                {covariance.hard_body_radius_m} m
              </KeyValue>
              <KeyValue label="Source">{covariance.source}</KeyValue>
            </div>
            {covariance.notes.length ? (
              <p className={cn(textStyles.caption, "mt-3 text-muted")}>{covariance.notes.join(" · ")}</p>
            ) : null}
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className={cn(textStyles.eyebrow, "text-muted")}>Source IDs</span>
        <Card padding={4}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <KeyValue label="Plan" mono>
              {plan.plan_id}
            </KeyValue>
            <KeyValue label="Conjunction" mono>
              {plan.conjunction_id}
            </KeyValue>
            <KeyValue label="Candidate" mono>
              {recommendation?.candidate_id ?? "—"}
            </KeyValue>
          </div>
        </Card>
      </div>

      <Bullets title="Assumptions" items={plan.assumptions} />
      <Bullets title="Warnings" items={plan.warnings} />
      {apply?.secondary?.assumptions?.length ? (
        <Bullets title="Double-check assumptions" items={apply.secondary.assumptions} />
      ) : null}
    </Stack>
  );
}
