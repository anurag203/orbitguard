import { ArrowLeft, ArrowRight, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { EarthScene } from "../../components/earth";
import {
  Button,
  Card,
  cn,
  EmptyState,
  ErrorState,
  InfoDot,
  KeyValue,
  LiveChip,
  RiskBadge,
  RiskMeter,
  ShowDetails,
  Skeleton,
  Stat,
  Term,
  textStyles,
  useMode
} from "../../components/ui";
import { isApiError, useThreatDetail, usePlanManeuver, type ConjunctionDetail } from "../../features";
import { formatDistance, formatPc, formatPcPro, formatSpeed, formatTime } from "../../lib/format";
import { EncounterPlot } from "./EncounterPlot";
import { isEducationScenario, scenarioIdForConjunction, speedText, tcaIso, threatSentence, whenText } from "./threats.lib";

/** Back link + provenance chip — shared across loading / error / success so the frame is stable. */
function TopBar({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/threats?scenario=${scenarioId}`}>
          <ArrowLeft aria-hidden="true" size={16} />
          Back to threats
        </Link>
      </Button>
      <LiveChip live={false} className="shrink-0" />
    </div>
  );
}

function DetailShell({ scenarioId, children }: { scenarioId: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[920px] px-5 py-8 sm:px-8 sm:py-12">
      <TopBar scenarioId={scenarioId} />
      {children}
    </div>
  );
}

/** A small honest list of assumptions / warnings (doc 01 §7, doc 04 §4.6). */
function NoteList({ title, items, tone }: { title: string; items: string[]; tone: "muted" | "warning" }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={cn(textStyles.label, tone === "warning" ? "text-warning" : "text-muted")}>{title}</p>
      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
        {items.map((item) => (
          <li key={item} className={cn(textStyles.caption, "text-muted")}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The full, resolved detail view (only mounted once data is present). */
function ThreatDetailView({ detail }: { detail: ConjunctionDetail }) {
  const { mode, isPro } = useMode();
  const planManeuver = usePlanManeuver();
  const prefetched = useRef(false);

  const id = detail.conjunction_id;
  const scenarioId = scenarioIdForConjunction(id);
  const education = isEducationScenario(scenarioId);
  const firstWarning = detail.pc_estimate.warnings?.[0];
  const cov = detail.pc_estimate.covariance;

  const prefetchPlan = () => {
    if (prefetched.current || education) return;
    prefetched.current = true;
    planManeuver.mutate(id, { onError: () => (prefetched.current = false) });
  };

  return (
    <DetailShell scenarioId={scenarioId}>
      {/* Focal element: the focused mini-globe of the encounter (doc 04 §4.2). */}
      <div className="relative mt-6 h-[44vh] min-h-[300px] overflow-hidden rounded-xl bg-deep shadow-[0_8px_40px_rgba(0,0,0,0.45)]">
        <EarthScene
          phase="alert"
          scenarioId={scenarioId}
          selectedObject="CARTOSAT-2F"
          showThreatLine
          interactive
          quality="auto"
        />
      </div>

      {/* The plain story — the canonical sentence (doc 04 §4.3). */}
      <div className="mt-7 flex flex-col gap-3">
        <RiskBadge severity={detail.risk.severity} size="md" className="self-start" />
        <h1 className={cn(textStyles.h1, "max-w-[42ch] text-strong")}>{threatSentence(detail, mode, { detail: true })}</h1>
      </div>

      {/* How risky is it? — one meter, word + "1 in N" (doc 04 §4.4). */}
      <div className="mt-8">
        <p className={cn(textStyles.label, "text-muted")}>How risky is it?</p>
        <div className="mt-3 max-w-md">
          <RiskMeter severity={detail.risk.severity} pc={detail.risk.pc} variant="bar" size="lg" />
        </div>
        {firstWarning ? <p className={cn(textStyles.caption, "mt-2 max-w-[60ch] text-warning")}>{firstWarning}</p> : null}
      </div>

      {/* Three calm stats — how close, when, closing speed (doc 04 §4.5). */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat
          label="How close"
          size="lg"
          countUp
          countTo={detail.risk.miss_distance_m}
          format={(n) => formatDistance(n, mode)}
          value={formatDistance(detail.risk.miss_distance_m, mode)}
          hint={<InfoDot term="miss-distance" />}
        />
        <Stat label="When" size="lg" value={whenText(detail, mode)} hint={<InfoDot term="tca" />} />
        <Stat
          label="Closing speed"
          size="lg"
          value={speedText(detail.risk.relative_velocity_km_s, mode)}
          hint={<InfoDot term="relative-velocity" />}
        />
      </div>

      {/* The math — collapsed in Simple, expanded in Pro (Law 4, doc 04 §4.6). */}
      <div className="mt-8">
        <ShowDetails label="Show details (the math)" defaultOpen={isPro}>
          <Card padding={6}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <KeyValue label={<Term k="pc" as="static">Collision probability</Term>} mono>
                {formatPcPro(detail.pc_estimate.pc)} ({formatPc(detail.pc_estimate.pc, "simple")})
              </KeyValue>
              <KeyValue label={<Term k="miss-distance" as="static">Closest approach</Term>} mono>
                {formatDistance(detail.risk.miss_distance_m, "pro")}
              </KeyValue>
              <KeyValue label={<Term k="tca" as="static">Closest approach (time)</Term>} mono>
                {formatTime(tcaIso(detail), "pro")}
              </KeyValue>
              <KeyValue label={<Term k="relative-velocity" as="static">Closing speed</Term>} mono>
                {formatSpeed(detail.risk.relative_velocity_km_s, "pro")}
              </KeyValue>
              <KeyValue label="Method" mono>
                {detail.pc_estimate.method}
              </KeyValue>
              <KeyValue label={<Term k="covariance" as="static">Margin of error (σ)</Term>} mono>
                σx {cov.sigma_x_m} m · σy {cov.sigma_y_m} m
              </KeyValue>
              <KeyValue label="Hard-body radius" mono>
                {cov.hard_body_radius_m} m
              </KeyValue>
              <KeyValue label="Uncertainty model" mono>
                {cov.model_id}
              </KeyValue>
              <KeyValue label="Covariance source" mono>
                {cov.source}
              </KeyValue>
              <KeyValue label="Conjunction ID" mono>
                {detail.conjunction_id}
              </KeyValue>
            </div>

            <div className="mt-6">
              <p className={cn(textStyles.label, "text-muted")}>Encounter geometry</p>
              <EncounterPlot points={detail.encounter_plane} className="mt-3" />
            </div>

            {detail.pc_estimate.warnings.length || detail.assumptions.length || detail.pc_estimate.assumptions.length ? (
              <div className="mt-6 flex flex-col gap-4">
                <NoteList title="Warnings" items={detail.pc_estimate.warnings} tone="warning" />
                <NoteList title="Assumptions" items={[...detail.assumptions, ...detail.pc_estimate.assumptions]} tone="muted" />
              </div>
            ) : null}
          </Card>
        </ShowDetails>
      </div>

      {education ? (
        <div className="mt-8 flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2.5">
          <GraduationCap aria-hidden="true" size={16} className="shrink-0 text-muted" />
          <p className={cn(textStyles.caption, "text-muted")}>
            This scenario is for learning — it shows the risk, not a live maneuver.
          </p>
        </div>
      ) : null}

      {/* The single accent: plan the safe move → /avoidance (doc 04 §4.7). Sticky on mobile. */}
      <div className="mt-6 max-sm:sticky max-sm:bottom-4 max-sm:z-10">
        <Button asChild variant="primary" size="lg" className="glow-cyan w-full sm:w-auto">
          <Link
            to={`/avoidance?conjunction=${encodeURIComponent(id)}`}
            state={{ conjunctionId: id }}
            onMouseEnter={prefetchPlan}
            onFocus={prefetchPlan}
          >
            Plan the safe move
            <ArrowRight aria-hidden="true" size={20} />
          </Link>
        </Button>
      </div>
    </DetailShell>
  );
}

/**
 * `/threats/:id` — one close approach, explained (doc 04). The focused globe + plain
 * story are the focal pair; everything technical hides behind "Show details"; one
 * glowing CTA hands the user to the fix.
 */
export function ThreatDetailRoute() {
  const { id = "" } = useParams();
  const scenarioId = scenarioIdForConjunction(id);
  const detail = useThreatDetail(id);

  if (detail.isLoading) {
    return (
      <DetailShell scenarioId={scenarioId}>
        <Skeleton className="mt-6 h-[44vh] min-h-[300px] w-full" radius="lg" />
        <Skeleton className="mt-7 h-7 w-3/4" />
        <Skeleton className="mt-3 h-5 w-2/3" />
        <Skeleton className="mt-8 h-16 w-full max-w-md" radius="lg" />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Skeleton height={64} radius="lg" />
          <Skeleton height={64} radius="lg" />
          <Skeleton height={64} radius="lg" />
        </div>
        <p role="status" aria-live="polite" className={cn(textStyles.body, "mt-6 text-muted")}>
          Loading this close approach…
        </p>
      </DetailShell>
    );
  }

  const notFound =
    detail.isError && isApiError(detail.error) && (detail.error.status === 404 || detail.error.code === "conjunction_not_found");

  if (notFound) {
    return (
      <DetailShell scenarioId={scenarioId}>
        <div className="mt-10">
          <EmptyState
            title="We couldn't find that close approach."
            description="It may have been cleared or the link is out of date."
            action={
              <Button asChild variant="primary" size="sm">
                <Link to="/threats">
                  <ArrowLeft aria-hidden="true" size={16} />
                  Back to threats
                </Link>
              </Button>
            }
          />
        </div>
      </DetailShell>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <DetailShell scenarioId={scenarioId}>
        <div className="mt-10">
          <ErrorState
            title="We couldn't load this close approach."
            message="Something went wrong fetching the encounter details."
            onRetry={() => void detail.refetch()}
            detail={isApiError(detail.error) ? `ApiError ${detail.error.status} ${detail.error.code}: ${detail.error.message}` : undefined}
          />
        </div>
      </DetailShell>
    );
  }

  return <ThreatDetailView detail={detail.data} />;
}

export default ThreatDetailRoute;
