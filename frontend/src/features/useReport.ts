/**
 * Report hooks — create a mission report (mutation) and fetch one by id (query). Powers `/report`.
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../lib/api";
import { queryKeys } from "./queryKeys";
import type { CreateReportInput } from "./types";

/** Reusable query options for fetching a report. Disabled when `reportId` is empty (lazy). */
export function reportQueryOptions(reportId: string) {
  return queryOptions({
    queryKey: queryKeys.report(reportId),
    queryFn: () => api.getReport(reportId),
    enabled: Boolean(reportId)
  });
}

/**
 * Fetch a finished mission report by id.
 *
 * @param reportId the id returned by {@link useCreateReport}. Empty string keeps the query idle.
 * @returns the React Query result (`data` is `MissionReport`, plus `isLoading`/`isError`/`error`).
 */
export function useReport(reportId: string) {
  return useQuery(reportQueryOptions(reportId));
}

/**
 * Create a mission report from the run/conjunction/plan/candidate ids.
 *
 * Mutation: call `await mutateAsync({ scenarioRunId, conjunctionId, planId, candidateId })`.
 * On success it primes the report cache so a following `useReport(report_id)` resolves instantly.
 *
 * @returns the React Query mutation (`mutate`/`mutateAsync`, `data` is `ReportCreateResult`, `isPending`, `isError`, `error`).
 */
export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReportInput) => api.createReport(input),
    onSuccess: async ({ report_id }) => {
      await queryClient.prefetchQuery(reportQueryOptions(report_id));
    }
  });
}
