import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Button,
  cn,
  EmptyState,
  ErrorState,
  LiveChip,
  PageHeader,
  type ScenarioId,
  ScenarioTabs,
  Skeleton,
  textStyles
} from "../../components/ui";
import { isApiError, useScenarios, useThreats, type ConjunctionSummary } from "../../features";
import { DURATION, EASE } from "../../lib/motion";
import { ThreatRow } from "./ThreatRow";
import { isScenarioId, rankThreats, type ThreatScenarioId } from "./threats.lib";

const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } }
};

const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } }
};

/** Three calmly skeletonized rows for the first load (doc 03 §7). */
function ThreatsSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-start gap-4 rounded-lg bg-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.4)]">
          <Skeleton width={68} height={24} radius="full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton height={16} width="85%" />
            <Skeleton height={12} width="45%" />
          </div>
        </div>
      ))}
      <p className={cn(textStyles.body, "mt-1 text-muted")}>Checking for close approaches…</p>
    </div>
  );
}

export interface ThreatsRouteProps {
  /** Optional starting scenario; the URL `?scenario=` still wins when present. */
  scenarioId?: string;
}

/**
 * `/threats` — one calm, ranked list of close approaches in plain language (doc 03).
 * The list is the hero; scenario tabs swap which sky we're ranking; the worst row
 * is the single emphasized accent and doubles as the primary action.
 */
export function ThreatsRoute({ scenarioId: scenarioProp }: ThreatsRouteProps = {}) {
  const reduced = useReducedMotion();
  const scenarios = useScenarios();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlScenario = searchParams.get("scenario");
  const firstScenario = scenarios.data?.[0]?.scenario_id;

  const activeScenario: ThreatScenarioId = useMemo(() => {
    if (isScenarioId(urlScenario)) return urlScenario;
    if (isScenarioId(scenarioProp)) return scenarioProp;
    if (isScenarioId(firstScenario)) return firstScenario;
    return "protect-isro";
  }, [urlScenario, scenarioProp, firstScenario]);

  const setScenario = (next: ScenarioId) => {
    const params = new URLSearchParams(searchParams);
    params.set("scenario", next);
    setSearchParams(params);
  };

  const threats = useThreats(activeScenario, { maxResults: 8 });

  // Keep the last good list so switching scenarios dims-in-place instead of flashing (doc 03 §7).
  const previousRows = useRef<ConjunctionSummary[] | null>(null);
  useEffect(() => {
    if (threats.data) previousRows.current = threats.data.conjunctions;
  }, [threats.data]);

  const freshData = threats.data;
  const sourceRows = freshData?.conjunctions ?? previousRows.current ?? [];
  const rows = rankThreats(sourceRows);

  const showError = threats.isError && !freshData;
  const showInitialLoading = !freshData && threats.isLoading && rows.length === 0;
  const showStale = !freshData && threats.isLoading && rows.length > 0;
  const showEmpty = Boolean(freshData) && rows.length === 0;

  const otherScenario: ThreatScenarioId = activeScenario === "protect-isro" ? "2009-replay" : "protect-isro";

  return (
    <div className="mx-auto w-full max-w-[1000px] px-5 py-8 sm:px-8 sm:py-12">
      <div className="flex items-start justify-between gap-4">
        <PageHeader eyebrow="Threats" title="What's about to get dangerously close." />
        <LiveChip live={false} className="mt-1 shrink-0" />
      </div>

      <div className="mt-8 overflow-x-auto pb-1">
        <ScenarioTabs value={activeScenario} onValueChange={setScenario} scenarios={scenarios.data} />
      </div>

      {showStale ? (
        <p className={cn(textStyles.caption, "mt-3 inline-flex items-center gap-1.5 text-muted")}>
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
          Updating…
        </p>
      ) : null}

      <div className="mt-6">
        {showError ? (
          <ErrorState
            title="We couldn't load the threat list."
            message="The screening service didn't respond. Your scenario is still selectable above."
            onRetry={() => void threats.refetch()}
            detail={isApiError(threats.error) ? `ApiError ${threats.error.status} ${threats.error.code}: ${threats.error.message}` : undefined}
          />
        ) : showInitialLoading ? (
          <ThreatsSkeleton />
        ) : showEmpty ? (
          <EmptyState
            icon={<ShieldCheck size={28} />}
            title="Good news — no close approaches in this scenario right now."
            description="Nothing is on a worrying path here. Try another scenario to see a real close approach."
            action={
              <Button variant="ghost" size="sm" onClick={() => setScenario(otherScenario)}>
                Pick another scenario
              </Button>
            }
          />
        ) : (
          <motion.ul
            variants={reduced ? undefined : listContainer}
            initial={reduced ? false : "hidden"}
            animate={reduced ? false : "show"}
            aria-busy={showStale || undefined}
            className={cn("flex list-none flex-col gap-3", showStale && "pointer-events-none opacity-50")}
          >
            {rows.map((conjunction, index) => (
              <motion.li key={conjunction.conjunction_id} variants={reduced ? undefined : listItem}>
                <ThreatRow
                  conjunction={conjunction}
                  emphasis={index === 0}
                  to={`/threats/${encodeURIComponent(conjunction.conjunction_id)}`}
                />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  );
}

export default ThreatsRoute;
