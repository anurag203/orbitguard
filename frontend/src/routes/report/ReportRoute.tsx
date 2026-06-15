import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Download, Printer } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

import {
  ApiError,
  isApiError,
  queryKeys,
  useCreateReport,
  usePlanManeuver,
  useReport,
  useScenarioRun,
  useScenarios,
  useThreatDetail,
  type ComputationMode,
  type ManeuverApply,
  type ManeuverPlan,
  type ScreeningResponse
} from "../../features";
import {
  Button,
  ErrorState,
  IconButton,
  Row,
  RouteIntro,
  Skeleton,
  Stack,
  Surface,
  cn,
  textStyles,
  useMode
} from "../../components/ui";
import { demoIso } from "../../lib/demoClock";
import { ReportDocument } from "./ReportDocument";
import { ReportEmptyState } from "./ReportEmptyState";
import { copyReportMarkdown, downloadReportMarkdown, utcHourMinute } from "./reportModel";

export interface ReportRouteProps {
  /** Optional scenario to anchor the briefing; defaults to the first (hero) scenario. */
  scenarioId?: string;
  /** Optional already-built report to render (seeded by the `/avoidance` apply flow). */
  reportId?: string;
}

const FLASH_MS = 1500;
const SAMPLE_REPORT_ID = "report-protect-isro-001";
const SAMPLE_REPORT_TO = `/report?scenario=protect-isro&report=${SAMPLE_REPORT_ID}`;

function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong while preparing the report.";
}

function rawError(error: unknown): string | undefined {
  if (isApiError(error)) return `ApiError ${error.status} ${error.code}: ${error.message}`;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return undefined;
}

/** A document-shaped skeleton + one plain sentence (doc 06 §7). No spinner as sole feedback. */
function DocumentSkeleton({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite">
      <Surface elevation="surface" padding={8} radius="xl" className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Skeleton height={30} width="85%" />
          <Skeleton height={30} width="55%" />
        </div>
        <div className="flex flex-col gap-2.5">
          <Skeleton height={16} width="92%" />
          <Skeleton height={16} width="86%" />
          <Skeleton height={16} width="78%" />
        </div>
        <div className="flex flex-col gap-7">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex flex-col gap-2.5">
              <Skeleton height={20} width={150} />
              <Skeleton height={16} width="95%" />
              <Skeleton height={16} width="68%" />
            </div>
          ))}
        </div>
      </Surface>
      <p className={cn(textStyles.body, "text-muted")}>{message}</p>
    </div>
  );
}

/**
 * `/report` — the Mission Report (the "Prove" chapter, doc 06).
 *
 * One focal document + one primary action (Export). The briefing is normally already built by the
 * `/avoidance` apply flow and passed in via `reportId`; if there's none yet, a single "Generate
 * briefing" action builds the deterministic chain. Simple humanizes the prose; Pro reveals the full
 * numeric audit trail behind "Show details".
 */
export function ReportRoute({ scenarioId, reportId }: ReportRouteProps) {
  const { mode } = useMode();
  const isPro = mode === "pro";
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [createdReportId, setCreatedReportId] = useState<string | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<unknown>(null);
  const [exported, setExported] = useState(false);
  const [copied, setCopied] = useState(false);
  const flashTimers = useRef<number[]>([]);

  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const scenariosQuery = useScenarios();
  const queryScenarioId = searchParams.get("scenario") ?? undefined;
  const activeScenarioId = scenarioId ?? queryScenarioId ?? scenariosQuery.data?.[0]?.scenario_id ?? "protect-isro";
  const scenarioRunQuery = useScenarioRun(activeScenarioId);

  const queryReportId = searchParams.get("report") ?? undefined;
  const effectiveReportId = reportId ?? queryReportId ?? createdReportId ?? "";
  const reportQuery = useReport(effectiveReportId);
  const report = reportQuery.data;

  const conjunctionId = report?.source_ids.conjunction_id ?? scenarioRunQuery.data?.top_conjunction_id ?? "";
  const detailQuery = useThreatDetail(conjunctionId);
  const detail = detailQuery.data;

  // Best-effort enrichment from the cache the `/avoidance` flow seeded (doc 06 §4.2). Absent on a
  // cold deep-link — the document falls back to the report's own section text in that case.
  const plan = report
    ? queryClient.getQueryData<ManeuverPlan>(queryKeys.planById(report.source_ids.plan_id))
    : undefined;
  const apply = report
    ? queryClient.getQueryData<ManeuverApply>(queryKeys.apply(report.source_ids.plan_id, report.source_ids.candidate_id))
    : undefined;
  const computationMode: ComputationMode | undefined = queryClient.getQueryData<ScreeningResponse>(
    queryKeys.threats(activeScenarioId)
  )?.computation_mode;

  const planMutation = usePlanManeuver();
  const createMutation = useCreateReport();

  const scenarioTitle =
    scenariosQuery.data?.find((scenario) => scenario.scenario_id === activeScenarioId)?.title ?? "Protect ISRO";
  const protectedName = scenarioRunQuery.data?.protected_object.name ?? detail?.primary_object_id ?? "the protected satellite";
  const isHeroScenario = activeScenarioId === "protect-isro";

  const subtitle = [
    scenarioTitle,
    detail ? `${protectedName} vs ${detail.secondary_object_id}` : null,
    detail ? utcHourMinute(demoIso(detail.tca_utc)) : null
  ]
    .filter(Boolean)
    .join(" · ");

  const flash = (setter: (value: boolean) => void) => {
    setter(true);
    const id = window.setTimeout(() => setter(false), FLASH_MS);
    flashTimers.current.push(id);
  };

  const handleExport = () => {
    if (!report) return;
    downloadReportMarkdown(report);
    flash(setExported);
  };

  const handleCopy = async () => {
    if (!report) return;
    const ok = await copyReportMarkdown(report);
    if (ok) flash(setCopied);
  };

  const handlePrint = () => window.print();

  const handleBuild = async () => {
    setIsBuilding(true);
    setBuildError(null);
    try {
      let run = scenarioRunQuery.data;
      if (!run) {
        run = (await scenarioRunQuery.refetch()).data;
      }
      if (!run) {
        throw new ApiError({ code: "no_scenario_run", message: "We couldn't load the scenario to report on.", status: 0 });
      }
      const targetConjunctionId = run.top_conjunction_id;
      const builtPlan = await planMutation.mutateAsync(targetConjunctionId);
      if (!builtPlan.recommendation) {
        throw new ApiError({ code: "no_recommendation", message: "There was no safe move to write up.", status: 0 });
      }
      const created = await createMutation.mutateAsync({
        scenarioRunId: run.run_id,
        conjunctionId: targetConjunctionId,
        planId: builtPlan.plan_id,
        candidateId: builtPlan.recommendation.candidate_id
      });
      setCreatedReportId(created.report_id);
    } catch (error) {
      setBuildError(error);
    } finally {
      setIsBuilding(false);
    }
  };

  const actions = report ? (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <Button
        variant="primary"
        className="w-full sm:w-auto"
        onClick={handleExport}
        iconLeft={exported ? <Check size={20} /> : <Download size={20} />}
      >
        {exported ? "Exported" : "Export (Markdown)"}
      </Button>
      <Row gap={2} className="justify-center sm:justify-start">
        <IconButton label="Print or save as PDF" variant="surface" icon={<Printer size={20} />} onClick={handlePrint} />
        <IconButton
          label={copied ? "Briefing copied" : "Copy briefing text"}
          variant="surface"
          icon={copied ? <Check size={20} className="text-safe" /> : <Copy size={20} />}
          onClick={handleCopy}
        />
      </Row>
    </div>
  ) : undefined;

  let body: ReactNode;
  if (effectiveReportId && report) {
    body = (
      <ReportDocument
        report={report}
        mode={mode}
        detail={detail}
        plan={plan}
        apply={apply}
        computationMode={computationMode}
        protectedName={protectedName}
        scenarioTitle={scenarioTitle}
        isHeroScenario={isHeroScenario}
      />
    );
  } else if (effectiveReportId && reportQuery.isError) {
    body = (
      <ErrorState
        title="We couldn't load the report"
        message={errorMessage(reportQuery.error)}
        onRetry={() => void reportQuery.refetch()}
        detail={isPro ? rawError(reportQuery.error) : undefined}
      />
    );
  } else if (effectiveReportId && reportQuery.isLoading) {
    body = <DocumentSkeleton message="Putting together the mission report…" />;
  } else if (isBuilding) {
    body = <DocumentSkeleton message="Putting together the mission report…" />;
  } else if (buildError) {
    body = (
      <ErrorState
        title="We couldn't build the report just now"
        message={errorMessage(buildError)}
        retryLabel="Try again"
        onRetry={() => void handleBuild()}
        detail={isPro ? rawError(buildError) : undefined}
      />
    );
  } else {
    body = (
      <ReportEmptyState
        protectedName={protectedName}
        scenarioTitle={scenarioTitle}
        onGenerate={() => void handleBuild()}
        sampleReportTo={SAMPLE_REPORT_TO}
      />
    );
  }

  return (
    <div className="og-report mx-auto w-full max-w-[820px] px-5 py-10 sm:px-8 sm:py-14">
      <RouteIntro
        step="report"
        eyebrow="Step 4 · Prove"
        title="Prove it worked."
        description={subtitle || "Generate the mission report, then export the decision and proof."}
        action={actions}
      />
      <Stack gap={4} className="mt-8 sm:mt-10">
        {body}
      </Stack>
    </div>
  );
}

export default ReportRoute;
