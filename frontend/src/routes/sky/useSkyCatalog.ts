/**
 * useSkyCatalog — loads either the committed offline catalog or the opt-in live
 * CelesTrak/SATCAT catalog for the instanced "see everything in orbit" field.
 *
 * Offline remains deterministic and cached forever. Live is same-origin via the
 * Netlify/Vite `/celestrak` proxy and is cached by React Query for CelesTrak
 * politeness.
 */
import { useQuery } from "@tanstack/react-query";

import type { SkyCatalogEntry } from "../../components/earth";
import { fetchLiveCatalog, type SkyCatalogResult } from "./liveCatalog";
import { type SkySource } from "./useSkyObjects";

type SkyCatalogFile = {
  meta?: { source?: string; count?: number; generated_at_utc?: string };
  objects: SkyCatalogEntry[];
};

// Resolve Vite's BASE_URL without depending on `vite/client` ambient types being
// wired into the typecheck config (kept self-contained to this owned file).
const BASE_URL = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
const CATALOG_URL = `${BASE_URL}data/catalog-sky.json`;

async function fetchOfflineSkyCatalog(signal?: AbortSignal): Promise<SkyCatalogResult> {
  const res = await fetch(CATALOG_URL, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`sky-catalog ${res.status}`);
  const data = (await res.json()) as SkyCatalogEntry[] | SkyCatalogFile;
  const objects = Array.isArray(data) ? data : data.objects;
  const meta = Array.isArray(data) ? undefined : data.meta;
  const fetchedAtUtc = meta?.generated_at_utc ?? new Date(0).toISOString();
  const filtered = (objects ?? []).filter((o) => o && o.line1 && o.line2);
  return {
    meta: {
      source: "offline",
      sourceUrl: CATALOG_URL,
      fetchedAtUtc,
      groups: ["offline-bake"],
      count: filtered.length,
      notes: "Deterministic baked catalog for repeatable demos."
    },
    objects: filtered.map((entry) => ({
      ...entry,
      noradId: entry.noradId ?? entry.id,
      source: entry.source ?? "offline",
      sourceUrl: entry.sourceUrl ?? CATALOG_URL,
      fetchedAtUtc: entry.fetchedAtUtc ?? fetchedAtUtc
    }))
  };
}

export function useSkyCatalog(source: SkySource) {
  return useQuery({
    queryKey: ["sky-catalog", source],
    queryFn: ({ signal }) =>
      source === "live" ? fetchLiveCatalog({ signal, backfill: fetchOfflineSkyCatalog }) : fetchOfflineSkyCatalog(signal),
    staleTime: source === "live" ? 60 * 60 * 1000 : Infinity,
    gcTime: source === "live" ? 24 * 60 * 60 * 1000 : Infinity,
    retry: source === "live" ? 2 : 1
  });
}
