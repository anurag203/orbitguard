/**
 * useSkyCatalog — loads the committed, offline-safe Sky catalog
 * (`public/data/catalog-sky.json`: ~500 SGP4-propagatable objects) for the
 * instanced "see everything in orbit" field (plan/03-sky-all-satellites.md).
 *
 * This is a STATIC asset (baked at dev time, committed), so the runtime never
 * touches CelesTrak — it stays fully static-site friendly. Cached indefinitely.
 */
import { useQuery } from "@tanstack/react-query";

import type { SkyCatalogEntry } from "../../components/earth";

type SkyCatalogFile = {
  meta?: { source?: string; count?: number; generated_at_utc?: string };
  objects: SkyCatalogEntry[];
};

// Resolve Vite's BASE_URL without depending on `vite/client` ambient types being
// wired into the typecheck config (kept self-contained to this owned file).
const BASE_URL = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
const CATALOG_URL = `${BASE_URL}data/catalog-sky.json`;

async function fetchSkyCatalog(signal?: AbortSignal): Promise<SkyCatalogEntry[]> {
  const res = await fetch(CATALOG_URL, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`sky-catalog ${res.status}`);
  const data = (await res.json()) as SkyCatalogEntry[] | SkyCatalogFile;
  const objects = Array.isArray(data) ? data : data.objects;
  return (objects ?? []).filter((o) => o && o.line1 && o.line2);
}

export function useSkyCatalog() {
  return useQuery({
    queryKey: ["sky-catalog"],
    queryFn: ({ signal }) => fetchSkyCatalog(signal),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1
  });
}
