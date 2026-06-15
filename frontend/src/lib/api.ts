/**
 * Typed fetch client for the OrbitGuard backend.
 *
 * - Talks to `/api/*` (the Vite dev proxy forwards `/api` to the FastAPI service; unchanged).
 * - Every call returns parsed JSON on success, or throws a typed {@link ApiError} that mirrors the
 *   backend error envelope `{ error: { code, message, details } }` (doc 08 §3).
 * - React Query hooks in `features/` wrap these calls. Components/routes never call `fetch` directly.
 *
 * This is intentionally a *thin* layer: no caching, no retries (React Query owns those), no global
 * mutable state — so it is trivially unit-testable with a mocked `fetch`.
 */

import type {
  CatalogWorkbench,
  ConjunctionDetail,
  DemoReplay,
  DemoStatus,
  ManeuverApply,
  ManeuverPlan,
  MissionReport,
  ScenarioRun,
  WatchlistResponse
} from "../types";
import type {
  CatalogFullParams,
  CreateReportInput,
  ReportCreateResult,
  ScenarioListResponse,
  ScreenConjunctionsOptions,
  ScreeningResponse
} from "../features/types";
import { canonicalPath, staticKey } from "./staticApi";

const API_BASE = "/api";

/**
 * Static mode (Netlify): when `VITE_STATIC_API` is set at build time, every call resolves from
 * pre-baked JSON under `/api-static/<key>.json` (see `scripts/snapshot-api.mjs`) instead of a live
 * server. Dev/Docker builds leave it unset and proxy `/api` to FastAPI exactly as before.
 */
const STATIC_MODE = Boolean(import.meta.env.VITE_STATIC_API);
const STATIC_BASE = `${import.meta.env.BASE_URL ?? "/"}api-static`.replace(/\/{2,}/g, "/");

type IndexEntry = { key: string; method: string; path: string };
let staticIndex: Promise<IndexEntry[]> | null = null;

function loadStaticIndex(): Promise<IndexEntry[]> {
  if (!staticIndex) {
    staticIndex = fetch(`${STATIC_BASE}/index.json`)
      .then((res) => (res.ok ? (res.json() as Promise<IndexEntry[]>) : []))
      .catch(() => []);
  }
  return staticIndex;
}

/** Resolve a request from the baked snapshot tree (method+path+body keyed, with a path fallback). */
async function requestStatic<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const key = staticKey(method, path, init?.body ?? null);

  let res = await fetch(`${STATIC_BASE}/${key}.json`);
  if (!res.ok && method === "GET") {
    // GET-only fallback: tolerate query-string drift by matching method + pathname. We never do this
    // for POST — several POSTs share a path and differ only by body (e.g. /conjunctions/screen per
    // scenario), so a path match could return the wrong scenario's data.
    const pathname = canonicalPath(path).split("?")[0];
    const entry = (await loadStaticIndex()).find(
      (e) => e.method === "GET" && e.path.split("?")[0] === pathname
    );
    if (entry) res = await fetch(`${STATIC_BASE}/${entry.key}.json`);
  }

  if (!res.ok) {
    throw new ApiError({
      code: "static_missing",
      message: `No baked response for ${method} ${path} (key ${key}). Re-run scripts/snapshot-api.mjs.`,
      status: 404,
      details: null
    });
  }
  return (await res.json()) as T;
}

/** Shape of the backend error envelope returned for every 4xx/422/5xx (doc 08 §3). */
type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown> | null;
  };
};

/**
 * Typed error thrown by every client method.
 *
 * Mirrors the backend `{ error: { code, message, details } }` envelope and adds the HTTP `status`.
 * `status === 0` denotes a transport-level failure (offline / proxy down) where no response arrived.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown> | null;

  constructor(params: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown> | null;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.status = params.status;
    this.details = params.details ?? null;
    // Restore the prototype chain for reliable `instanceof` after transpilation to ES targets.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/** Narrow an unknown error (e.g. React Query's `error`) to a typed {@link ApiError}. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function toApiError(response: Response): Promise<ApiError> {
  let rawText = "";
  let envelope: ErrorEnvelope | null = null;
  try {
    rawText = await response.text();
    envelope = rawText ? (JSON.parse(rawText) as ErrorEnvelope) : null;
  } catch {
    envelope = null;
  }

  const error = envelope?.error;
  if (error?.code && error?.message) {
    return new ApiError({
      code: error.code,
      message: error.message,
      status: response.status,
      details: error.details ?? null
    });
  }

  // Non-enveloped failure (a bare proxy 502, an HTML 500 page, etc.). Keep a useful message but
  // a stable, generic code so the UI can still render the standard error state.
  return new ApiError({
    code: "http_error",
    message: rawText.trim() || `${response.status} ${response.statusText}`.trim(),
    status: response.status,
    details: null
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (STATIC_MODE) {
    return requestStatic<T>(path, init);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init
    });
  } catch {
    // Network/transport failure before any HTTP status (offline, DNS, proxy down, aborted).
    throw new ApiError({
      code: "network_error",
      message: "We couldn't reach the data service.",
      status: 0,
      details: null
    });
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

/**
 * The OrbitGuard API surface. Methods map 1:1 to backend routes; argument names are camelCase and
 * mapped to the backend's snake_case request bodies/params here.
 */
export const api = {
  /** `GET /api/demo/status` — live/offline readiness + per-check matrix. */
  demoStatus: () => request<DemoStatus>("/demo/status"),

  /** `POST /api/demo/replay/{flowId}` — re-run a deterministic demo flow. */
  demoReplay: (flowId = "protect-isro-round1") =>
    request<DemoReplay>(`/demo/replay/${encodeURIComponent(flowId)}`, { method: "POST" }),

  /** `GET /api/scenarios` — the available scenarios. */
  scenarios: () => request<ScenarioListResponse>("/scenarios"),

  /** `POST /api/scenarios/{id}/run` — deterministic scenario run (timeline beats, top conjunction). */
  runScenario: (scenarioId: string) =>
    request<ScenarioRun>(`/scenarios/${encodeURIComponent(scenarioId)}/run`, {
      method: "POST",
      body: JSON.stringify({ deterministic: true })
    }),

  /** `GET /api/catalogs/full` — object catalog workbench, optionally filtered. */
  catalogFull: (params: CatalogFullParams = {}) =>
    request<CatalogWorkbench>(`/catalogs/full${buildQuery(params)}`),

  /** `GET /api/watchlists/{id}` — named protected-object set. */
  watchlist: (watchlistId: string) =>
    request<WatchlistResponse>(`/watchlists/${encodeURIComponent(watchlistId)}`),

  /** `POST /api/catalogs/live/refresh` — pull a fresh live CelesTrak snapshot. */
  refreshLiveCatalog: (group = "active", limit = 120) =>
    request<CatalogWorkbench>("/catalogs/live/refresh", {
      method: "POST",
      body: JSON.stringify({ group, limit })
    }),

  /** `POST /api/conjunctions/screen` — ranked close-approach screening for a scenario. */
  screenConjunctions: (scenarioId: string, options: ScreenConjunctionsOptions = {}) =>
    request<ScreeningResponse>("/conjunctions/screen", {
      method: "POST",
      body: JSON.stringify({
        ...(options.catalogId && options.protectedObjectId ? {} : { scenario_id: scenarioId }),
        step_seconds: options.stepSeconds ?? 10,
        max_results: options.maxResults ?? 10,
        ...(options.coarseThresholdM !== undefined ? { coarse_threshold_m: options.coarseThresholdM } : {}),
        ...(options.protectedObjectId ? { protected_object_id: options.protectedObjectId } : {}),
        ...(options.catalogId ? { catalog_id: options.catalogId } : {}),
        ...(options.startTimeUtc ? { start_time_utc: options.startTimeUtc } : {}),
        ...(options.endTimeUtc ? { end_time_utc: options.endTimeUtc } : {})
      })
    }),

  /** `GET /api/conjunctions/{id}` — one close approach in full detail. */
  conjunctionDetail: (conjunctionId: string) =>
    request<ConjunctionDetail>(`/conjunctions/${encodeURIComponent(conjunctionId)}`),

  /** `POST /api/maneuvers/plan` — plan an avoidance maneuver for a conjunction. */
  planManeuver: (conjunctionId: string) =>
    request<ManeuverPlan>("/maneuvers/plan", {
      method: "POST",
      body: JSON.stringify({ conjunction_id: conjunctionId })
    }),

  /** `POST /api/maneuvers/apply` — apply a candidate and run secondary screening. */
  applyManeuver: (planId: string, candidateId: string) =>
    request<ManeuverApply>("/maneuvers/apply", {
      method: "POST",
      body: JSON.stringify({ plan_id: planId, candidate_id: candidateId })
    }),

  /** `POST /api/reports` — create a mission report; returns the new report id. */
  createReport: (input: CreateReportInput) =>
    request<ReportCreateResult>("/reports", {
      method: "POST",
      body: JSON.stringify({
        scenario_run_id: input.scenarioRunId,
        conjunction_id: input.conjunctionId,
        plan_id: input.planId,
        candidate_id: input.candidateId
      })
    }),

  /** `GET /api/reports/{id}` — fetch a finished mission report. */
  getReport: (reportId: string) => request<MissionReport>(`/reports/${encodeURIComponent(reportId)}`)
};

export type Api = typeof api;
