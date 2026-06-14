import { useDemoStatus, useScenarioRun, useScenarios, useThreatDetail } from "../../features";
import { ExploreChapters } from "./ExploreChapters";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { ProofStats } from "./ProofStats";
import { CANONICAL_CONJUNCTION_ID } from "./proof";
import { SiteFooter } from "./SiteFooter";

export interface HomeRouteProps {
  /** Override the active scenario; defaults to the first (hero) scenario from `useScenarios()`. */
  scenarioId?: string;
}

/**
 * Home (`/`) — the hook (route 01-home.md). One job: make a non-space person feel "space is
 * crowded and beautiful, and this thing watches it" in seconds, then pull them into the story.
 *
 * The hero (Earth + headline + the single glowing CTA) renders static-first and never waits on a
 * fetch (doc 01 Law 6). The proof numbers, protected-asset name, and live/offline chip hydrate in.
 */
export function HomeRoute({ scenarioId }: HomeRouteProps) {
  const scenariosQuery = useScenarios();
  const activeScenarioId = scenarioId ?? scenariosQuery.data?.[0]?.scenario_id ?? "protect-isro";

  // The scenario run anchors the protected asset name + its top close approach.
  const runQuery = useScenarioRun(activeScenarioId);
  const protectedName = runQuery.data?.protected_object.name ?? "CARTOSAT-2F";
  const conjunctionId = runQuery.data?.top_conjunction_id ?? CANONICAL_CONJUNCTION_ID;

  // Proof numbers + live/offline provenance.
  const detailQuery = useThreatDetail(conjunctionId);
  const demoQuery = useDemoStatus();
  const isLive = demoQuery.data ? !demoQuery.data.offline_mode : false;

  return (
    <div className="bg-void text-body">
      <Hero scenarioId={activeScenarioId} protectedName={protectedName} isLive={isLive} />

      <div className="mx-auto w-full max-w-[1200px] px-5 pb-8 sm:px-8">
        <HowItWorks />
        <ProofStats
          status={detailQuery.status}
          detail={detailQuery.data}
          error={detailQuery.error}
          onRetry={() => {
            void detailQuery.refetch();
          }}
          protectedName={protectedName}
          scenarioId={activeScenarioId}
          conjunctionId={conjunctionId}
        />
        <ExploreChapters />
        <SiteFooter />
      </div>
    </div>
  );
}

export default HomeRoute;
