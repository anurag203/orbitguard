import { Check, Copy } from "lucide-react";
import { useState } from "react";

import type { ComputationMode, ConjunctionDetail, ManeuverCandidate, ManeuverPlan, MissionReport } from "../../features";
import {
  Badge,
  IconButton,
  KeyValue,
  Row,
  Stack,
  cn,
  textStyles
} from "../../components/ui";
import { formatDeltaV, formatDistance, formatPc, type Mode } from "../../lib/format";
import { plainifyJargon } from "../../lib/plainLanguage";
import { burnTiming, computationModeLabel, directionExact, sourceIdLabel } from "./reportModel";

export interface ReportDetailsProps {
  report: MissionReport;
  detail?: ConjunctionDetail;
  plan?: ManeuverPlan;
  computationMode?: ComputationMode;
  mode: Mode;
}

/** A quiet labelled block within the audit drawer. */
function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h4 className={cn(textStyles.eyebrow, "text-muted")}>{title}</h4>
      {children}
    </section>
  );
}

function BulletList({ items, plain = false }: { items: string[]; plain?: boolean }) {
  if (items.length === 0) {
    return <p className={cn(textStyles.body, "text-faint")}>None recorded.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 24)}`} className="flex gap-2">
          <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-faint" />
          <span className={cn(textStyles.body, "text-body")}>{plain ? plainifyJargon(item) : item}</span>
        </li>
      ))}
    </ul>
  );
}

/** One ranked candidate line (Pro): id + the numbers that decided it. */
function CandidateRow({ candidate, recommended, mode }: { candidate: ManeuverCandidate; recommended: boolean; mode: Mode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
      <Row gap={2} justify="between">
        <span className={cn(textStyles.mono, "text-strong")}>{candidate.candidate_id}</span>
        {recommended ? <Badge tone="cyan">Chosen</Badge> : <Badge tone="neutral">{candidate.status}</Badge>}
      </Row>
      <span className={cn(textStyles.body, "text-muted")}>
        {formatDeltaV(candidate.delta_v_m_s, mode)} · {directionExact(candidate.direction)} · {burnTiming(candidate.burn_t_minus_tca_s, "pro")} · score {candidate.score.toFixed(2)}
      </span>
      {candidate.rejection_reasons.length > 0 ? (
        <span className={cn(textStyles.caption, "text-faint")}>{candidate.rejection_reasons.join("; ")}</span>
      ) : null}
    </div>
  );
}

/**
 * The progressive-disclosure audit material (doc 06 §4.3). Collapsed by default behind "Show
 * details"; everything technical lives here so the document above stays calm.
 *
 * - Simple: data lineage (friendly source IDs), assumptions, warnings + limitations.
 * - Pro: adds copyable raw IDs, the method/covariance, the full candidate ranking, the computation
 *   mode, and the verbatim briefing text (matching the export packet).
 */
export function ReportDetails({ report, detail, plan, computationMode, mode }: ReportDetailsProps) {
  const isPro = mode === "pro";
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const sourceIds = Object.entries(report.source_ids);
  const limitations = [...report.warnings, ...report.briefing.limitations];
  const candidates = plan
    ? [plan.recommendation, ...plan.alternatives].filter((candidate): candidate is ManeuverCandidate => Boolean(candidate))
    : [];
  const covariance = detail?.pc_estimate.covariance;

  const copyId = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      /* clipboard unavailable — the value stays visible to copy by hand */
    }
  };

  return (
    <Stack gap={8} className="pt-2">
      <DetailBlock title="Data lineage · source IDs">
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {sourceIds.map(([key, value]) => (
            <div key={key} className="flex items-end justify-between gap-3">
              <KeyValue label={isPro ? key.replaceAll("_", " ") : sourceIdLabel(key)} mono>
                {value}
              </KeyValue>
              {isPro ? (
                <IconButton
                  label={`Copy ${sourceIdLabel(key)}`}
                  size="sm"
                  variant="ghost"
                  icon={copiedKey === key ? <Check size={16} className="text-safe" /> : <Copy size={16} />}
                  onClick={() => copyId(key, value)}
                />
              ) : null}
            </div>
          ))}
        </div>
      </DetailBlock>

      <DetailBlock title="Assumptions">
        <BulletList items={report.assumptions} plain={!isPro} />
      </DetailBlock>

      <DetailBlock title="Warnings & limitations">
        <BulletList items={limitations} plain={!isPro} />
      </DetailBlock>

      {isPro && detail ? (
        <DetailBlock title="Method & uncertainty">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <KeyValue label="Collision-chance method" mono>
              {detail.pc_estimate.method}
            </KeyValue>
            <KeyValue label="Before · collision chance" mono>
              {formatPc(detail.risk.pc, "pro")}
            </KeyValue>
            {covariance ? (
              <>
                <KeyValue label="Covariance model" mono>
                  {covariance.model_id}
                </KeyValue>
                <KeyValue label="Covariance source" mono>
                  {covariance.source}
                </KeyValue>
                <KeyValue label="σ in-track / cross-track" mono>
                  {formatDistance(covariance.sigma_x_m, "pro")} / {formatDistance(covariance.sigma_y_m, "pro")}
                </KeyValue>
                <KeyValue label="Hard-body radius" mono>
                  {formatDistance(covariance.hard_body_radius_m, "pro")}
                </KeyValue>
              </>
            ) : null}
          </div>
          {covariance && covariance.notes.length > 0 ? <BulletList items={covariance.notes} /> : null}
        </DetailBlock>
      ) : null}

      {isPro && candidates.length > 0 ? (
        <DetailBlock title={`Candidate ranking · ${plan?.candidate_count ?? candidates.length} scored`}>
          <Stack gap={3}>
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.candidate_id}
                candidate={candidate}
                recommended={candidate.candidate_id === plan?.recommendation?.candidate_id}
                mode={mode}
              />
            ))}
          </Stack>
        </DetailBlock>
      ) : null}

      {isPro ? (
        <DetailBlock title="Computation mode">
          <div className="flex flex-col gap-1" data-computation-mode={computationMode ?? "sgp4"}>
            <KeyValue label="How the geometry was computed" mono>
              {computationModeLabel(computationMode).label}
            </KeyValue>
            <p className={cn(textStyles.caption, "text-faint")}>{computationModeLabel(computationMode).note}</p>
          </div>
        </DetailBlock>
      ) : null}

      {isPro ? (
        <DetailBlock title="Full briefing text">
          <Stack gap={4}>
            {report.sections.map((section) => (
              <div key={section.title} className="flex flex-col gap-1">
                <h5 className={cn(textStyles.body, "font-semibold text-strong")}>{section.title}</h5>
                <p className={cn(textStyles.body, "text-muted")}>{section.body}</p>
              </div>
            ))}
          </Stack>
        </DetailBlock>
      ) : null}
    </Stack>
  );
}
