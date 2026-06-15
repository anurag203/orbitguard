/**
 * SkyRoute (`/sky`) — the immersive 3D situational view (redesign/routes/02-sky.md).
 *
 * The ONE job: explore what's in orbit and understand any single object in plain language. One focal
 * element (the cinematic Earth), one selection action (click an object → a calm panel explains it),
 * with a List view of the SAME objects for accessibility / scanning. Merges the old Mission cockpit
 * and Catalog browser. Simple by default, Pro on demand. Loading/empty/error states throughout.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, SatelliteDish, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { framingFor, type CameraFraming, type OrbitObject } from "../../components/earth";
import { Button, cn, ErrorState, GuidanceState, RouteIntro, Sheet, Skeleton, Surface, textStyles, useMode } from "../../components/ui";
import { isApiError, useScenarios } from "../../features";
import { DURATION, EASE } from "../../lib/motion";
import { ObjectList } from "./ObjectList";
import { ObjectPanel } from "./ObjectPanel";
import { SkyStage } from "./SkyStage";
import { SkyToolbar } from "./SkyToolbar";
import {
  applyFilters,
  catalogEntryToSkyObject,
  catalogCloudOptions,
  catalogCountryOptions,
  catalogOwnerOptions,
  DEFAULT_FILTERS,
  filterCatalog,
  filtersActive,
  ownerOptions,
  type SkyFilters,
  type ViewMode
} from "./sky-data";
import { useSkyCatalog } from "./useSkyCatalog";
import { useSkyObjects, type SkySource } from "./useSkyObjects";

export interface SkyRouteProps {
  /** Override the active scenario; defaults to the first (hero) scenario from `useScenarios()`. */
  scenarioId?: string;
}

/** Client media query (lazy-initialized so the first paint already knows the breakpoint). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}

const PANEL_WIDTH = "w-full max-w-[384px]";

type FieldDensity = "lite" | "balanced" | "max";
type FieldSpeed = 1 | 60 | 120;

const NOTABLE_PATTERNS: Record<string, RegExp[]> = {
  iss: [/^ISS \(ZARYA\)$/i, /\bISS\b/i],
  css: [/^CSS \(TIANHE\)$/i, /^TIANGONG/i, /^TIANHE/i],
  hubble: [/^HST$/i, /HUBBLE/i],
  cartosat: [/CARTOSAT[- ]?2F/i],
  risat: [/RISAT[- ]?2BR1/i],
  navic: [/IRNSS|NAVIC/i]
};

export function SkyRoute({ scenarioId }: SkyRouteProps) {
  const { isPro } = useMode();
  const scenariosQuery = useScenarios();
  const activeScenarioId = scenarioId ?? scenariosQuery.data?.[0]?.scenario_id ?? "protect-isro";

  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const reduced = useReducedMotion();

  const [filters, setFilters] = useState<SkyFilters>(DEFAULT_FILTERS);
  const [source, setSource] = useState<SkySource>("fixture");
  const [showLabels, setShowLabels] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const [fieldShown, setFieldShown] = useState(0);
  const [density, setDensity] = useState<FieldDensity | null>(null);
  const [fieldSpeed, setFieldSpeed] = useState<FieldSpeed>(120);
  const [fieldPlaying, setFieldPlaying] = useState(true);

  // The full "see everything in orbit" cloud (offline bake or live CelesTrak, SGP4-propagated client-side).
  const skyCatalog = useSkyCatalog(source);
  const catalogEntries = useMemo(() => skyCatalog.data?.objects ?? [], [skyCatalog.data]);
  const { objects, catalog } = useSkyObjects(activeScenarioId, source, catalogEntries);

  useEffect(() => {
    if (source === "live" && skyCatalog.isError) {
      setLiveError(true);
      setSource("fixture");
    }
  }, [source, skyCatalog.isError]);

  // View + selection live in the URL so deep links cold-boot into a selected object (doc 03 §7).
  const view: ViewMode = (searchParams.get("view") as ViewMode) || (isDesktop ? "globe" : "list");
  const objectId = searchParams.get("object");

  const filtered = useMemo(() => applyFilters(objects, filters), [objects, filters]);
  // The same filters drive the instanced cloud (plan §Interaction).
  const filteredField = useMemo(() => filterCatalog(catalogEntries, filters), [catalogEntries, filters]);
  const owners = useMemo(() => {
    const merged = new Set<string>([...ownerOptions(objects), ...catalogOwnerOptions(catalogEntries)]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [objects, catalogEntries]);
  const countryOptions = useMemo(() => catalogCountryOptions(catalogEntries).slice(0, 24), [catalogEntries]);
  const cloudOptions = useMemo(() => catalogCloudOptions(catalogEntries), [catalogEntries]);

  // Selection resolves to a hero track first, else a cloud object adapted into the same panel shape.
  const selected = useMemo(() => {
    if (!objectId) return null;
    const track = objects.find((object) => object.id === objectId);
    if (track) return track;
    const entry = catalogEntries.find((candidate) => candidate.id === objectId);
    return entry ? catalogEntryToSkyObject(entry) : null;
  }, [objects, catalogEntries, objectId]);
  const selectedId = selected?.id ?? null;
  const protectedName = useMemo(
    () => objects.find((object) => object.risk === "safe" && object.kind === "satellite")?.name ?? "CARTOSAT-2F",
    [objects]
  );

  // Feed the scene the FILTERED tracks (globe + list show the same set); names follow the toggle.
  const sceneObjects = useMemo<OrbitObject[]>(
    () => filtered.map((object) => ({ ...object.base, showLabel: showLabels || object.base.showLabel })),
    [filtered, showLabels]
  );
  const framing = useMemo<Partial<CameraFraming>>(
    () => ({ ...framingFor(activeScenarioId, "alert", selectedId ?? undefined), autoRotate: !selectedId && !reduced }),
    [activeScenarioId, selectedId, reduced]
  );

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const selectObject = useCallback((id: string) => updateParams((params) => params.set("object", id)), [updateParams]);
  const clearSelection = useCallback(() => updateParams((params) => params.delete("object")), [updateParams]);
  const setView = useCallback((next: ViewMode) => updateParams((params) => params.set("view", next)), [updateParams]);

  const onSourceChange = useCallback(
    (next: SkySource) => {
      setLiveError(false);
      setSource(next);
    },
    []
  );

  const onNotablePick = useCallback(
    (key: string) => {
      const patterns = NOTABLE_PATTERNS[key] ?? [];
      const match = catalogEntries.find((entry) => patterns.some((pattern) => pattern.test(entry.name)));
      if (match) {
        updateParams((params) => {
          params.set("object", match.id);
          params.set("view", "globe");
        });
      }
    },
    [catalogEntries, updateParams]
  );

  const onIsroView = useCallback(
    () =>
      setFilters({
        ...DEFAULT_FILTERS,
        country: "India (ISRO)"
      }),
    []
  );

  const isLive = source === "live" && !skyCatalog.isError;
  const catalogLoading = catalog.isLoading || skyCatalog.isLoading;
  const catalogError = catalog.isError || (source === "fixture" && skyCatalog.isError);
  const fetchedAt = skyCatalog.data?.meta.fetchedAtUtc ?? catalog.data?.fetched_at_utc ?? null;
  const factsLoading = catalogLoading && !selected?.catalog;
  const showThreatLine = Boolean(selected?.conjunction);
  const emptyFiltered = filtered.length === 0;
  const active = filtersActive(filters);
  const effectiveDensity: FieldDensity = density ?? (isDesktop ? "balanced" : "lite");
  const fieldEpoch = useMemo(() => (fetchedAt ? new Date(fetchedAt) : undefined), [fetchedAt]);
  const onFieldStats = useCallback((shown: number) => setFieldShown(shown), []);

  const errorDetail = isApiError(catalog.error)
    ? `ApiError ${catalog.error.status} ${catalog.error.code}: ${catalog.error.message}`
    : undefined;

  const listBody = catalogLoading ? (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} height={64} radius="lg" />
      ))}
      <p className={cn(textStyles.body, "pt-1 text-muted")}>Loading the latest orbit data…</p>
    </div>
  ) : catalogError ? (
    <ErrorState
      title="We couldn't load the orbit catalog."
      message="Something went wrong fetching the list of tracked objects."
      onRetry={() => void catalog.refetch()}
      detail={errorDetail}
    />
  ) : emptyFiltered ? (
    <GuidanceState
      icon={<SatelliteDish size={28} />}
      title="No objects match that filter."
      message="Nothing in orbit matches your search and filters right now."
      action={
        active ? (
          <Button variant="secondary" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
            Clear filters
          </Button>
        ) : undefined
      }
    />
  ) : (
    <ObjectList objects={filtered} selectedId={selectedId} onSelect={selectObject} />
  );

  return (
    <section className="flex min-h-[calc(100svh_-_4.75rem)] flex-col bg-void text-body">
      <RouteIntro
        headless
        step="sky"
        description="See what is in orbit. Drag to rotate, then click any glowing object to learn what it is."
      />
      <SkyToolbar
        filters={filters}
        onFiltersChange={setFilters}
        owners={owners}
        countries={countryOptions}
        clouds={cloudOptions}
        view={view}
        onViewChange={setView}
        source={source}
        onSourceChange={onSourceChange}
        sourcePending={source === "live" && skyCatalog.isFetching}
        density={effectiveDensity}
        onDensityChange={(next) => setDensity(next)}
        speed={fieldSpeed}
        onSpeedChange={setFieldSpeed}
        playing={fieldPlaying}
        onPlayingChange={setFieldPlaying}
        onNotablePick={onNotablePick}
        onIsroView={onIsroView}
        advancedDefaultOpen={isPro}
      />

      {/* Live-refresh failure → calm inline notice; the globe never blanks (doc 02-sky §7). */}
      <AnimatePresence>
        {liveError ? (
          <motion.div
            initial={reduced ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="overflow-hidden border-b border-warning/30 bg-surface/80"
          >
            <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
              <AlertTriangle aria-hidden="true" size={15} className="shrink-0 text-warning" />
              <p className={cn(textStyles.caption, "flex-1 text-body")}>
                Live source unavailable — showing offline demo data.
              </p>
              <button
                type="button"
                onClick={() => setLiveError(false)}
                aria-label="Dismiss"
                className="rounded-sm text-muted hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="relative min-h-0 flex-1">
        {view === "globe" ? (
          <SkyStage
            scenarioId={activeScenarioId}
            objects={sceneObjects}
            selectedId={selectedId}
            onSelect={selectObject}
            framing={framing}
            showThreatLine={showThreatLine}
            showLabels={showLabels}
            onToggleLabels={() => setShowLabels((value) => !value)}
            onClearSelection={clearSelection}
            isLive={isLive}
            shownCount={filtered.length}
            catalogLoading={catalogLoading}
            catalogError={catalogError}
            onRetryCatalog={() => void catalog.refetch()}
            emptyFiltered={emptyFiltered && filteredField.length === 0}
            onClearFilters={() => setFilters(DEFAULT_FILTERS)}
            field={filteredField}
            fieldDensity={effectiveDensity}
            fieldShowAllMatches={active}
            fieldPlaying={fieldPlaying}
            fieldTimeScale={fieldSpeed}
            fieldEpoch={fieldEpoch}
            onFieldStats={onFieldStats}
            fieldShown={fieldShown}
            fieldTotal={filteredField.length}
            sourceNote={skyCatalog.data?.meta.notes}
            asOfUtc={fetchedAt}
          />
        ) : (
          <div className="flex h-full min-h-0">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">{listBody}</div>
            {isDesktop && selected ? (
              <aside className="hidden w-[384px] shrink-0 overflow-y-auto border-l border-hairline bg-surface/40 p-5 lg:block">
                <ObjectPanel
                  object={selected}
                  protectedName={protectedName}
                  fetchedAt={fetchedAt}
                  factsLoading={factsLoading}
                  screeningCatalog={catalogEntries}
                  liveScreening={isLive}
                  onClose={clearSelection}
                />
              </aside>
            ) : null}
          </div>
        )}

        {/* Desktop globe: the panel floats in from the right over the scene (doc 02-sky §8). */}
        <AnimatePresence>
          {view === "globe" && isDesktop && selected ? (
            <motion.div
              key="globe-panel"
              initial={reduced ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
              transition={{ duration: DURATION.slow, ease: EASE }}
              className={cn("absolute inset-y-4 right-4 z-[4]", PANEL_WIDTH)}
            >
              <Surface glass radius="xl" padding={6} className="h-full overflow-y-auto">
                <ObjectPanel
                  object={selected}
                  protectedName={protectedName}
                  fetchedAt={fetchedAt}
                  factsLoading={factsLoading}
                  screeningCatalog={catalogEntries}
                  liveScreening={isLive}
                  onClose={clearSelection}
                />
              </Surface>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Mobile (both views): the panel is a bottom sheet. */}
      <Sheet
        open={!isDesktop && Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) clearSelection();
        }}
        side="bottom"
        title={selected?.name ?? "Object"}
      >
        {selected ? (
          <ObjectPanel
            object={selected}
            protectedName={protectedName}
            fetchedAt={fetchedAt}
            factsLoading={factsLoading}
            screeningCatalog={catalogEntries}
            liveScreening={isLive}
            embedded
          />
        ) : null}
      </Sheet>
    </section>
  );
}

export default SkyRoute;
