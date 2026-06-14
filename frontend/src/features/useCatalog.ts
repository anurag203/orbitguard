/**
 * Catalog hooks — the objects-in-orbit workbench (Sky globe + list) and a live refresh mutation.
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";
import type { CatalogFullParams } from "./types";

/** Reusable query options. Pass filters to refine the workbench. */
export function catalogQueryOptions(params: CatalogFullParams = {}) {
  return queryOptions({
    queryKey: queryKeys.catalog(params),
    queryFn: () => api.catalogFull(params)
  });
}

/**
 * The object catalog, optionally filtered.
 *
 * @param params source/query/owner/type/orbit/group/limit filters (all optional).
 * @returns the React Query result (`data` is `CatalogWorkbench`, plus `isLoading`/`isError`/`error`).
 */
export function useCatalog(params: CatalogFullParams = {}) {
  return useQuery(catalogQueryOptions(params));
}

/**
 * Pull a fresh live CelesTrak snapshot.
 *
 * Mutation. On success it invalidates every cached catalog query so views refetch the new snapshot.
 *
 * @returns the React Query mutation (`mutate`/`mutateAsync`, `data`, `isPending`, `isError`, `error`).
 */
export function useRefreshLiveCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { group?: string; limit?: number }) =>
      api.refreshLiveCatalog(input?.group ?? "active", input?.limit ?? 120),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.catalogRoot() });
    }
  });
}
