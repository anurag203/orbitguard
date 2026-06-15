/**
 * Joins the three Sky data sources into one list the screen reasons about:
 *   - the 3D scene's `OrbitObject` tracks (geometry, always present — the globe never blanks),
 *   - the live/offline catalog (`useCatalog`) → real facts, owner, NORAD id, TLE,
 *   - the scenario screening (`useThreats`) → which objects are in a close approach.
 *
 * The query results are returned alongside so the route can render loading/empty/error states and
 * wire retries (doc 02-sky §7). Filtering stays in the route (client-side over this list) so the
 * globe and list always show the SAME objects.
 */
import { useMemo } from "react";

import { scenarioObjects } from "../../components/earth";
import type { SkyCatalogEntry } from "../../components/earth";
import { useCatalog, useThreats } from "../../features";
import { catalogEntryToSkyObject, matchCatalog, matchCatalogEntry, matchConjunction, type SkyObject } from "./sky-data";

export type SkySource = "fixture" | "live";

export function useSkyObjects(scenarioId: string, source: SkySource, skyEntries: SkyCatalogEntry[] = []) {
  const catalog = useCatalog({ source: "fixture", limit: 120 });
  const threats = useThreats(scenarioId);

  // The scene's tracks are the geometry source of truth (a fresh, mutable copy per scenario).
  const tracks = useMemo(() => scenarioObjects(scenarioId), [scenarioId]);

  const objects = useMemo<SkyObject[]>(() => {
    const catalogObjects = catalog.data?.objects ?? [];
    const conjunctions = threats.data?.conjunctions ?? [];
    return tracks.map((base) => {
      const matched = matchCatalog(base, catalogObjects);
      const liveEntry = source === "live" ? matchCatalogEntry(base, skyEntries) : undefined;
      const enrichedCatalog = liveEntry ? catalogEntryToSkyObject(liveEntry).catalog : matched;
      const conjunction = matchConjunction(matched, conjunctions);
      return {
        id: base.id,
        name: enrichedCatalog?.name ?? base.name,
        kind: base.kind,
        risk: base.risk,
        base,
        catalog: enrichedCatalog,
        conjunction
      } satisfies SkyObject;
    });
  }, [tracks, catalog.data, threats.data, source, skyEntries]);

  return { objects, catalog, threats };
}
