/**
 * Public entry point for the data layer.
 *
 * Wave-2 route agents should import hooks (and types) from `features` rather than reaching into
 * individual files or `lib/api` directly:
 *
 * ```ts
 * import { useThreats, useThreatDetail, usePlanManeuver, isApiError } from "../features";
 * ```
 */

// Types (re-exported backend shapes + the new/extended ones).
export * from "./types";

// Query key factory (for cross-hook cache coordination / prefetch).
export { queryKeys } from "./queryKeys";

// Typed client + error helpers (handy for routes that need `isApiError` in their error state).
export { api, ApiError, isApiError } from "../lib/api";
export type { Api } from "../lib/api";

// Demo.
export { useDemoStatus, demoStatusQueryOptions } from "./useDemoStatus";

// Scenarios.
export { useScenarios, scenariosQueryOptions } from "./useScenarios";
export { useScenarioRun, scenarioRunQueryOptions } from "./useScenarioRun";

// Threats (screening + detail).
export { useThreats, threatsQueryOptions } from "./useThreats";
export { useThreatDetail, threatDetailQueryOptions } from "./useThreatDetail";

// Catalog (Sky).
export { useCatalog, useRefreshLiveCatalog, useWatchlist, catalogQueryOptions, watchlistQueryOptions } from "./useCatalog";

// Maneuvers (Safe Move).
export { usePlanManeuver } from "./usePlanManeuver";
export { useApplyManeuver } from "./useApplyManeuver";

// Report.
export { useReport, useCreateReport, reportQueryOptions } from "./useReport";
