import { motion, useReducedMotion } from "framer-motion";
import { Check, CircleSlash } from "lucide-react";
import type { ReactNode } from "react";

import type {
  ComputationMode,
  ConjunctionDetail,
  ManeuverApply,
  ManeuverPlan,
  MissionReport
} from "../../features";
import {
  Badge,
  InfoDot,
  RiskBadge,
  ShowDetails,
  Surface,
  Term,
  cn,
  textStyles
} from "../../components/ui";
import { DURATION, EASE, rise } from "../../lib/motion";
import { formatDistance, formatPc, formatSpeed, formatTime, type Mode, type RiskLevel } from "../../lib/format";
import { ReportDetails } from "./ReportDetails";
import {
  burnTiming,
  deltaVPhrase,
  directionExact,
  directionWord,
  findSectionBody,
  utcHourMinute
} from "./reportModel";

/**
 * Print stylesheet: when the judge prints/saves-as-PDF, hide all app chrome and render ONLY the
 * document sheet as ink-on-paper (doc 06 §4.2). Injected as a `<style>` so the route stays
 * self-contained (no global CSS edits). Risk words keep meaning but become legible on white.
 */
const PRINT_CSS = `
@media print {
  @page { margin: 16mm; }
  html, body { background: #ffffff !important; }
  body * { visibility: hidden !important; }
  .og-report-sheet, .og-report-sheet * { visibility: visible !important; }
  .og-report-sheet {
    position: absolute !important;
    left: 0; top: 0;
    width: 100%;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    border-radius: 0 !important;
  }
  .og-report-sheet .text-strong { color: #05070e !important; }
  .og-report-sheet .text-body { color: #1b2433 !important; }
  .og-report-sheet .text-muted { color: #3b4458 !important; }
  .og-report-sheet .text-faint { color: #5a6577 !important; }
  .og-report-sheet .text-cyan { color: #0b6b7c !important; }
  .og-report-sheet .text-danger { color: #b00020 !important; }
  .og-report-sheet .text-safe { color: #0a7c5a !important; }
  .og-report-sheet .text-warning { color: #8a5a00 !important; }
  .og-report-sheet .text-watch { color: #0a5a7c !important; }
}
`;

const prose = cn(textStyles.bodyLg, "max-w-[68ch] text-body");

export interface ReportDocumentProps {
  report: MissionReport;
  mode: Mode;
  detail?: ConjunctionDetail;
  plan?: ManeuverPlan;
  apply?: ManeuverApply;
  computationMode?: ComputationMode;
  /** Friendly protected-object name (e.g. "CARTOSAT-2F"). */
  protectedName: string;
  scenarioTitle: string;
  /** Protect ISRO is the deterministic hero; other scenarios get an honest "reflects ISRO" note. */
  isHeroScenario: boolean;
}

/** One titled section of the briefing; fades/rises once on scroll (doc 06 §8). */
function DocSection({ heading, children }: { heading: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      {...(reduced
        ? {}
        : { variants: rise, initial: "hidden" as const, whileInView: "show" as const, viewport: { once: true, amount: 0.3 } })}
      className="flex flex-col gap-3"
    >
      <h3 className={cn(textStyles.h3, "text-strong")}>{heading}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </motion.section>
  );
}

/** "Risk level: <badge>" — the word + color answer (doc 01 §5). */
function RiskLine({ label, severity, level }: { label: string; severity?: string; level?: RiskLevel }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn(textStyles.caption, "text-muted")}>{label}</span>
      <RiskBadge severity={severity} level={level} size="md" />
    </div>
  );
}

/**
 * The focal element (doc 06 §4.2): the whole briefing rendered as one calm, printable sheet —
 * headline, an at-a-glance strip, and the three plain sections (What happened / What we did / The
 * proof). Simple humanizes the numbers; Pro shows the exact audit values. No tabs, no stepper.
 */
export function ReportDocument({
  report,
  mode,
  detail,
  plan,
  apply,
  computationMode,
  protectedName,
  scenarioTitle,
  isHeroScenario
}: ReportDocumentProps) {
  const reduced = useReducedMotion();
  const isPro = mode === "pro";
  const before = detail?.risk;
  const after = apply?.after ?? plan?.predicted_after;
  const rec = plan?.recommendation;

  const reductionFactor = rec && Number.isFinite(rec.pc_reduction_factor) && rec.pc_reduction_factor > 1
    ? ` Collision chance cut about ${Math.round(rec.pc_reduction_factor).toLocaleString()}×.`
    : "";

  const screened = apply?.screened_object_count;
  const screeningSummary = apply?.secondary_summary ?? findSectionBody(report, ["secondary"]) ?? "";
  const screeningText = (
    isPro
      ? `Secondary screen: ${apply?.secondary_status ?? "clear"}${screened != null ? ` (${screened} objects)` : ""}. ${screeningSummary}`
      : `${screened != null ? `${screened} objects screened. ` : ""}${screeningSummary}`
  ).trim();
  const proofFallback = findSectionBody(report, ["risk reduction", "screening", "secondary"]);

  return (
    <div className="flex flex-col gap-6">
      <style>{PRINT_CSS}</style>

      <motion.article
        {...(reduced
          ? {}
          : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: DURATION.slow, ease: EASE } })}
      >
        <Surface elevation="surface" padding={8} radius="xl" className="og-report-sheet flex flex-col gap-8">
          <header className="flex flex-col gap-6">
            <h2 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.01em] text-strong sm:text-[2.125rem]">
              {report.briefing.headline}
            </h2>

            {report.briefing.key_points.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className={cn(textStyles.eyebrow, "text-cyan")}>At a glance</p>
                <ul className="flex flex-col gap-2.5">
                  {report.briefing.key_points.map((point, index) => (
                    <li key={`${index}-${point.slice(0, 24)}`} className="flex gap-2.5">
                      <Check aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cyan" />
                      <span className={cn(textStyles.body, "text-body")}>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </header>

          <div className="flex flex-col gap-8">
            <DocSection heading="What happened">
              {detail && before ? (
                isPro ? (
                  <p className={prose}>
                    {protectedName} had a <Term k="conjunction">close approach</Term> with{" "}
                    <span className="text-strong">{detail.secondary_object_id}</span>. Closest approach{" "}
                    {formatTime(detail.tca_utc, "pro")}. Miss {formatDistance(before.miss_distance_m, "pro")}, collision chance{" "}
                    {formatPc(before.pc, "pro")}, closing speed {formatSpeed(before.relative_velocity_km_s, "pro")}.
                  </p>
                ) : (
                  <p className={prose}>
                    At {utcHourMinute(detail.tca_utc)}, {protectedName} and a tracked piece of debris ({detail.secondary_object_id}){" "}
                    were set to pass{" "}
                    <span className="text-strong">{formatDistance(before.miss_distance_m, mode, { comparison: true })}</span> apart —
                    very close in orbital terms. The <Term k="pc">collision chance</Term> was{" "}
                    <span className="text-strong">{formatPc(before.pc, mode)}</span>.
                  </p>
                )
              ) : (
                <p className={prose}>A high-risk close approach was detected for {protectedName}, and OrbitGuard acted on it.</p>
              )}
              <RiskLine label="Risk level" severity={before?.severity} level={before ? undefined : "danger"} />
            </DocSection>

            <DocSection heading="What we did">
              {rec ? (
                isPro ? (
                  <p className={prose}>
                    Recommended candidate <span className="text-strong">{rec.candidate_id}</span>: Δv{" "}
                    {deltaVPhrase(rec.delta_v_m_s, "pro")} <Term k="along-track">{directionExact(rec.direction)}</Term> burn at{" "}
                    {burnTiming(rec.burn_t_minus_tca_s, "pro")}. Score {rec.score.toFixed(2)}.{reductionFactor}
                  </p>
                ) : (
                  <p className={prose}>
                    OrbitGuard recommended the smallest move that clears the risk: {deltaVPhrase(rec.delta_v_m_s, mode)}{" "}
                    {directionWord(rec.direction)} <Term k="delta-v">nudge</Term>, applied {burnTiming(rec.burn_t_minus_tca_s, mode)}.
                  </p>
                )
              ) : (
                <p className={prose}>{findSectionBody(report, ["decision", "recommend"]) ?? report.briefing.headline}</p>
              )}
            </DocSection>

            <DocSection heading="The proof">
              {after ? (
                isPro ? (
                  <p className={prose}>
                    Post-maneuver miss {formatDistance(after.miss_distance_m, "pro")}, collision chance {formatPc(after.pc, "pro")}.
                  </p>
                ) : (
                  <p className={prose}>
                    After the <Term k="delta-v">nudge</Term>, the two objects pass{" "}
                    <span className="text-strong">{formatDistance(after.miss_distance_m, mode, { comparison: true })}</span> apart and
                    the <Term k="pc">collision chance</Term> is <span className="text-strong">{formatPc(after.pc, mode)}</span>.
                  </p>
                )
              ) : proofFallback ? (
                <p className={prose}>{proofFallback}</p>
              ) : null}
              <RiskLine label="Risk level" severity={after?.severity} level={after ? undefined : "safe"} />
              <p className={prose}>
                We <Term k="secondary-screening">double-checked</Term> the new path against everything else we track.
                {screeningText ? ` ${screeningText}` : ""}
              </p>
            </DocSection>
          </div>
        </Surface>
      </motion.article>

      <footer data-report-hide className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" icon={<CircleSlash aria-hidden="true" size={12} />}>
            Offline demo data · {scenarioTitle}
          </Badge>
          {!isHeroScenario ? (
            <div className="flex items-center gap-1">
              <Badge tone="warning">Reflects the Protect ISRO demo</Badge>
              <InfoDot content="This briefing currently reflects the Protect ISRO demo scenario; per-scenario reports land in the next backend update." />
            </div>
          ) : null}
        </div>

        <div className="border-t border-hairline pt-4">
          <ShowDetails label="Show details">
            <ReportDetails report={report} detail={detail} plan={plan} computationMode={computationMode} mode={mode} />
          </ShowDetails>
        </div>
      </footer>
    </div>
  );
}
