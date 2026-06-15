/**
 * AvoidanceRoute — "The Safe Move" (`/avoidance`), the hero screen (doc 05-avoidance).
 *
 * One job: show the single safe move that clears the collision — and prove the new path is safe too.
 * The screen is the immersive Earth + one neon CTA. The decision flow is a slim <Steps> progression:
 *
 *   1. Confirm the threat            (useThreatDetail / pick from useThreats)
 *   2. "Find the safe move"          (usePlanManeuver → recommended burn + BEFORE/AFTER risk)
 *   3. "Apply this move"             (useApplyManeuver → secondary double-check → path to /report)
 *
 * Applying is a two-stage commit: a confirm <Dialog> shows the critical numbers before we run the
 * irreversible apply. The result animates in place (red→green RiskMeter, one plain sentence) and the
 * double-check reveals itself automatically. Simple/Pro come from useMode(); jargon is wrapped in
 * <Term>; loading/empty/error states are first-class. Protect ISRO is the deterministic default.
 */

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Inbox, Rocket, ShieldCheck } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { EarthScene, type MissionPhase } from "../../components/earth";
import {
  Button,
  Card,
  Dialog,
  ErrorState,
  GuidanceState,
  LiveChip,
  LoadingState,
  RouteIntro,
  ShowDetails,
  Stack,
  Steps,
  Term,
  cn,
  textStyles,
  useMode,
  type Step,
  type StepStatus
} from "../../components/ui";
import {
  isApiError,
  useApplyManeuver,
  usePlanManeuver,
  useScenarioRun,
  useScenarios,
  useThreatDetail,
  useThreats
} from "../../features";
import { demoIso } from "../../lib/demoClock";
import { formatDeltaV, formatDistance, formatTime } from "../../lib/format";
import { rise } from "../../lib/motion";

import { AvoidanceDetails } from "./AvoidanceDetails";
import { BeforeAfterRisk } from "./BeforeAfterRisk";
import { BurnResult } from "./BurnResult";
import { DoubleCheckPanel } from "./DoubleCheckPanel";
import { ThreatConfirm } from "./ThreatConfirm";
import { directionPlain } from "./helpers";

export interface AvoidanceRouteProps {
  /** Pin a scenario; otherwise the first scenario from `useScenarios()` (Protect ISRO). */
  scenarioId?: string;
  /** Pre-select a close approach (also read from router state / `?conjunction=`). */
  conjunctionId?: string;
}

/** Fallback that keeps the deterministic hero working before scenarios resolve (doc 05 §7). */
const DEFAULT_SCENARIO_ID = "protect-isro";

/** The decision journey — kept slim, not a burn-sequence board (doc 05 §1). */
const STEPS: Step[] = [
  { id: "threat", label: "Confirm threat" },
  { id: "plan", label: "Plan a safe move" },
  { id: "apply", label: "Apply" },
  { id: "report", label: "Report" }
];

type Stage = "idle" | "planning" | "planError" | "planned" | "applying" | "applyError" | "applied";

/** Reads a conjunction id handed over by Threat Detail via router state or a query param. */
function useRouteConjunctionId(): string | undefined {
  const location = useLocation();
  return useMemo(() => {
    const state = (location.state ?? null) as { conjunctionId?: string; threatId?: string } | null;
    if (state?.conjunctionId) return state.conjunctionId;
    if (state?.threatId) return state.threatId;
    const params = new URLSearchParams(location.search);
    return params.get("conjunction") ?? params.get("conjunctionId") ?? params.get("threat") ?? undefined;
  }, [location.state, location.search]);
}

export function AvoidanceRoute({ scenarioId: scenarioIdProp, conjunctionId: conjunctionIdProp }: AvoidanceRouteProps = {}) {
  const reduced = useReducedMotion();
  const { mode } = useMode();
  const routeConjunctionId = useRouteConjunctionId();

  // --- scenario + threat resolution ---------------------------------------------------------
  const scenariosQuery = useScenarios();
  const scenarioId = scenarioIdProp ?? scenariosQuery.data?.[0]?.scenario_id ?? DEFAULT_SCENARIO_ID;
  const scenarioTitle = scenariosQuery.data?.find((entry) => entry.scenario_id === scenarioId)?.title ?? "Protect ISRO";

  const scenarioRunQuery = useScenarioRun(scenarioId);
  const threatsQuery = useThreats(scenarioId);
  const threats = threatsQuery.data?.conjunctions ?? [];

  const [pickedConjunctionId, setPickedConjunctionId] = useState<string | null>(null);
  const resolvedConjunctionId =
    pickedConjunctionId ??
    conjunctionIdProp ??
    routeConjunctionId ??
    scenarioRunQuery.data?.top_conjunction_id ??
    "";

  const detailQuery = useThreatDetail(resolvedConjunctionId);
  const detail = detailQuery.data;
  const primaryName = scenarioRunQuery.data?.protected_object.name ?? detail?.primary_object_id ?? "the satellite";

  // --- mutations -----------------------------------------------------------------------------
  const plan = usePlanManeuver();
  const apply = useApplyManeuver();
  const planData = plan.data;
  const planRec = planData?.recommendation ?? null;
  const hasPlan = Boolean(planData && planRec);
  const planNoMove = Boolean(planData) && !planRec;
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --- derived stage -------------------------------------------------------------------------
  let stage: Stage = "idle";
  if (apply.data) stage = "applied";
  else if (apply.isPending) stage = "applying";
  else if (apply.isError) stage = "applyError";
  else if (hasPlan) stage = "planned";
  else if (plan.isPending) stage = "planning";
  else if (plan.isError) stage = "planError";

  const showResult = hasPlan || stage === "applying" || stage === "applyError" || stage === "applied";

  const earthPhase: MissionPhase = stage === "applied" ? "applied" : showResult ? "planned" : "alert";

  const stepCurrent = stage === "applied" ? 3 : showResult ? 2 : 1;
  const stepStatuses: Record<string, StepStatus> = {};
  if (stage === "planError") stepStatuses.plan = "error";
  if (stage === "applyError") stepStatuses.apply = "error";

  // --- handlers ------------------------------------------------------------------------------
  const planConjunctionId = detail?.conjunction_id || resolvedConjunctionId;

  const handleFind = () => {
    if (!planConjunctionId) return;
    plan.mutate(planConjunctionId);
  };

  const handleConfirmApply = () => {
    if (!planData || !planRec) return;
    setConfirmOpen(false);
    apply.mutate({ planId: planData.plan_id, candidateId: planRec.candidate_id });
  };

  const handleRetryApply = () => {
    if (!planData || !planRec) return;
    apply.mutate({ planId: planData.plan_id, candidateId: planRec.candidate_id });
  };

  // --- error copy (typed ApiError → plain message, doc 05 §7) --------------------------------
  const planErrorMessage = isApiError(plan.error) ? plan.error.message : "The data service didn't respond.";
  const applyErrorMessage = isApiError(apply.error) ? apply.error.message : "The double-check didn't finish.";
  const detailErrorMessage = isApiError(detailQuery.error)
    ? detailQuery.error.message
    : "The data service didn't respond.";
  const introTitle = detail
    ? `${primaryName} has a close approach ${formatTime(demoIso(detail.tca_utc), "simple")}.`
    : "Solve with a small safe move.";
  const introDescription = detail ? (
    <>
      Right now they pass about{" "}
      <span className="text-strong">
        {formatDistance(detail.risk.miss_distance_m, mode, { comparison: true })}
      </span>{" "}
      apart — a <Term k="conjunction">close approach</Term> worth dodging.
    </>
  ) : (
    "Find the smallest nudge that clears the risk, then double-check the new path."
  );

  // --- the content column body ---------------------------------------------------------------
  const scenarioResolving = !resolvedConjunctionId && (scenarioRunQuery.isLoading || scenariosQuery.isLoading);

  let content: ReactNode;
  if (scenarioResolving) {
    content = <LoadingState variant="panel" message="Lining up the scenario…" />;
  } else if (!resolvedConjunctionId) {
    content = (
      <GuidanceState
        icon={<Inbox size={28} />}
        title="Nothing to dodge right now."
        message="Pick a scenario or a threat to see the safe move in action."
        action={
          <Button asChild variant="primary">
            <Link to="/threats">
              Go to Threats
              <ArrowRight size={18} />
            </Link>
          </Button>
        }
      />
    );
  } else if (detailQuery.isLoading) {
    content = <LoadingState variant="panel" message="Loading the close approach…" />;
  } else if (detailQuery.isError || !detail) {
    content = (
      <ErrorState
        title="We couldn't load this close approach."
        message={detailErrorMessage}
        onRetry={() => void detailQuery.refetch()}
        detail={mode === "pro" ? String(detailQuery.error) : undefined}
      />
    );
  } else {
    content = (
      <>
        <div className="flex flex-col items-center gap-6 text-center">
          <Steps className="w-full max-w-md" steps={STEPS} current={stepCurrent} statuses={stepStatuses} />
        </div>

        {/* The action / result slot — the CTA morphs into the result in the same place. */}
        {showResult && planData ? (
          <motion.div
            variants={reduced ? undefined : rise}
            initial={reduced ? false : "hidden"}
            animate={reduced ? false : "show"}
            className="flex flex-col gap-8"
          >
            <Card padding={6}>
              <BeforeAfterRisk
                before={planData.before}
                after={apply.data?.after ?? planData.predicted_after}
                recommendation={planRec}
                animate
              />
            </Card>

            <div className="mx-auto max-w-[58ch] text-center">
              <BurnResult
                plan={planData}
                apply={apply.data}
                primaryName={primaryName}
                stage={stage === "applied" ? "applied" : "planned"}
              />
            </div>

            <DoubleCheckPanel
              apply={apply.data}
              pending={apply.isPending}
              primaryName={primaryName}
              scenarioId={scenarioId}
            />

            {stage === "applied" ? (
              <div className="flex flex-col items-center">
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Link
                    to="/report"
                    state={{
                      scenarioId,
                      conjunctionId: resolvedConjunctionId,
                      threatId: resolvedConjunctionId,
                      planId: planData.plan_id,
                      candidateId: planRec?.candidate_id
                    }}
                  >
                    See the report
                    <ArrowRight size={18} />
                  </Link>
                </Button>
              </div>
            ) : stage === "applyError" ? (
              <ErrorState
                title="The double-check didn't finish."
                message={applyErrorMessage}
                onRetry={handleRetryApply}
                detail={mode === "pro" ? String(apply.error) : undefined}
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  loading={stage === "applying"}
                  loadingText="Applying the nudge…"
                  iconLeft={stage === "applying" ? undefined : <ShieldCheck size={20} />}
                  onClick={() => setConfirmOpen(true)}
                >
                  Apply this move
                </Button>
                {stage === "applying" ? null : (
                  <p className={cn(textStyles.caption, "text-muted")}>
                    We'll <Term k="secondary-screening">double-check</Term> the new path before calling it safe.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center">
              <ShowDetails label="Show details">
                <AvoidanceDetails plan={planData} apply={apply.data} detail={detail} />
              </ShowDetails>
            </div>
          </motion.div>
        ) : (
          <Stack gap={6}>
            <ThreatConfirm
              detail={detail}
              primaryName={primaryName}
              threats={threats}
              selectedId={resolvedConjunctionId}
              onSelect={setPickedConjunctionId}
              locked={false}
            />

            {stage === "planError" ? (
              <ErrorState
                title="We couldn't work out a safe move just now."
                message={planErrorMessage}
                onRetry={handleFind}
                detail={mode === "pro" ? String(plan.error) : undefined}
              />
            ) : planNoMove ? (
              <GuidanceState
                title="No small safe move found."
                message="We couldn't find a gentle nudge that clears this one. Try a different threat."
              />
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  loading={stage === "planning"}
                  loadingText="Finding the smallest safe nudge…"
                  iconLeft={stage === "planning" ? undefined : <Rocket size={20} />}
                  onClick={handleFind}
                >
                  Find the safe move
                </Button>
                {stage === "planning" ? (
                  <p className={cn(textStyles.caption, "max-w-[46ch] text-center text-muted")}>
                    Comparing a few candidate moves and checking the result against nearby objects.
                  </p>
                ) : (
                  <LiveChip live={false} label={`Offline demo data · ${scenarioTitle}`} />
                )}
              </div>
            )}
          </Stack>
        )}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-6 sm:px-8">
      <RouteIntro
        step="avoidance"
        eyebrow="Step 3 · Solve"
        title={introTitle}
        description={introDescription}
        align="center"
        className="mx-auto max-w-[780px] pb-6"
      />

      {/* Earth stage — the persistent focal element (doc 05 §4.1). */}
      <div className="relative h-[38vh] min-h-[280px] w-full overflow-hidden rounded-xl sm:h-[46vh]">
        <EarthScene phase={earthPhase} scenarioId={scenarioId} selectedObject={primaryName} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-void to-transparent"
        />
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-[720px] flex-col gap-8">{content}</div>

      {/* Two-stage commit — confirm the irreversible apply with the critical numbers in view. */}
      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Apply this safe move?"
        description="Confirm the nudge, then we double-check the new path against everything else we track."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Not yet
            </Button>
            <Button variant="primary" iconLeft={<ShieldCheck size={18} />} onClick={handleConfirmApply}>
              Apply the move
            </Button>
          </>
        }
      >
        {planData && planRec ? (
          <Stack gap={2}>
            <p className="text-body">
              We'll nudge <span className="text-strong">{primaryName}</span> with{" "}
              <span className="text-strong">{formatDeltaV(planRec.delta_v_m_s, mode)}</span> ({directionPlain(planRec.direction)}).
            </p>
            <p className="text-muted">
              That opens the gap from{" "}
              <span className="text-strong">{formatDistance(planData.before.miss_distance_m, mode)}</span> to{" "}
              <span className="text-strong">{formatDistance(planData.predicted_after.miss_distance_m, mode)}</span> away.
            </p>
          </Stack>
        ) : null}
      </Dialog>
    </div>
  );
}

export default AvoidanceRoute;
