/**
 * Engineer-authored architecture config for `/system` (doc 08-system §4.2, §4.3, §4.5).
 *
 * This describes the SHAPE of the system — the pipeline stages, the engines, and the validation
 * lanes — not live data. It mirrors the refactored backend (backend doc 08): catalog → propagation
 * → conjunction screening → collision probability → maneuver planner → secondary screening →
 * reporting, with an explicit `computation_mode` (sgp4 vs fixture-fallback) and a derived,
 * data-driven id convention. Live readiness comes from `useDemoStatus`; a representative
 * `pc_estimate` (see `PcModel`) grounds the Pc model in real numbers.
 */

import {
  Activity,
  Database,
  FileCheck2,
  GitBranch,
  type LucideIcon,
  Radar,
  Rocket,
  ShieldCheck,
  Sigma
} from "lucide-react";

/** One stage of the end-to-end decision pipeline (the focal diagram). */
export interface PipelineStage {
  id: string;
  /** 1-based position, rendered as `01`…`06`. */
  step: number;
  /** Plain title shown on the node (Law 2: plain words first). */
  title: string;
  icon: LucideIcon;
  /** Tiny under-node caption — the stage's output in two words. */
  tag: string;
  /** Real endpoint(s) / module. Shown inline in Pro, in the detail panel always. */
  interface: string;
  /** Plain one-sentence description (Simple). */
  does: string;
  /** Technical detail appended in Pro. */
  doesPro: string;
  /** What's visible in the product that proves this stage ran. */
  evidence: string;
  /** What proves it works. */
  tests: string;
  /** Canonical redesign route where the result is visible. */
  proofRoute: string;
  proofLabel: string;
  /**
   * Honest disclosure of the current Protect-ISRO hardcoding (doc 08-system §7, backend doc 08 §6).
   * Framing it as tracked work increases credibility rather than hiding it.
   */
  note?: string;
}

export const PIPELINE: PipelineStage[] = [
  {
    id: "load",
    step: 1,
    title: "Load scenario",
    icon: GitBranch,
    tag: "run id",
    interface: "POST /api/scenarios/{id}/run",
    does: "Loads a saved situation — Protect ISRO, the 2009 replay, or the Kessler sandbox — with a fixed run id so the demo replays the same way every time.",
    doesPro:
      "Returns a deterministic ScenarioRun: the protected object, the expected top conjunction id, timeline beats, and replay-safe timestamps.",
    evidence: "The active scenario and protected object — visible on Threats.",
    tests: "Scenario-replay unit tests plus the guided-demo route-launch E2E.",
    proofRoute: "/threats",
    proofLabel: "Threats"
  },
  {
    id: "catalog",
    step: 2,
    title: "Read catalog",
    icon: Database,
    tag: "TLEs",
    interface: "GET /api/catalogs/full  ·  POST /api/catalogs/live/refresh",
    does: "Reads the object catalog from offline fixtures first, and can refresh live from CelesTrak without risking the demo.",
    doesPro:
      "Fixture-first CatalogWorkbench carrying source lineage; a live refresh that times out falls back to the committed snapshot (one shared cache after the DI refactor).",
    evidence: "Object rows, filters, source mode, and raw TLEs — visible on Sky.",
    tests: "Catalog filter/reset, source-fallback, and TLE-disclosure E2E.",
    proofRoute: "/sky",
    proofLabel: "Sky"
  },
  {
    id: "propagate",
    step: 3,
    title: "Propagate orbits",
    icon: Activity,
    tag: "state vectors",
    interface: "SGP4 propagation module",
    does: "Predicts where each object will be across the demo window.",
    doesPro:
      "SGP4 propagation to state vectors over a bounded time grid; a malformed TLE is caught narrowly and degrades to an explicit invalid-tle result instead of throwing.",
    evidence: "The animated orbits and the encounter window — visible on Sky.",
    tests: "Deterministic propagation unit tests plus nonblank-scene visual QA.",
    proofRoute: "/sky",
    proofLabel: "Sky"
  },
  {
    id: "screen",
    step: 4,
    title: "Screen conjunctions",
    icon: Radar,
    tag: "miss · Pc",
    interface: "POST /api/conjunctions/screen  →  GET /api/conjunctions/{id}",
    does: "Finds the close approaches and ranks them by how near the objects get and how risky that is.",
    doesPro:
      "Ranks conjunctions by miss distance, Pc, and severity, and reports computation_mode (sgp4 vs fixture-fallback) so demo geometry is never passed off as live propagation.",
    evidence: "The ranked threat list with closest-approach time, miss distance, and Pc — visible on Threats.",
    tests: "Closest-approach scenario tests plus ranking and no-overflow E2E.",
    proofRoute: "/threats",
    proofLabel: "Threats"
  },
  {
    id: "plan",
    step: 5,
    title: "Plan maneuver",
    icon: Rocket,
    tag: "Δv search",
    interface: "POST /api/maneuvers/plan  →  POST /api/maneuvers/apply",
    does: "Searches a small family of candidate nudges, scores risk against fuel, and returns a recommendation plus alternatives — then screens the burn you apply.",
    doesPro:
      "A candidate-ranking planner returns a recommended Δv with before/after Pc; apply validates the chosen candidate against the plan's actual recommendation and re-runs secondary screening.",
    evidence: "The candidate matrix, the recommended Δv, and the before/after risk — visible on Safe Move.",
    tests: "Candidate-ranking unit tests plus the apply / secondary-screening E2E.",
    proofRoute: "/avoidance",
    proofLabel: "Safe Move",
    note: "Today the apply endpoint returns the Protect ISRO recommendation deterministically; generalising apply across every scenario is tracked in backend doc 08."
  },
  {
    id: "brief",
    step: 6,
    title: "Brief decision",
    icon: FileCheck2,
    tag: "audit trail",
    interface: "POST /api/reports  →  GET /api/reports/{id}",
    does: "Packages the decision — what we found, the move we recommend, and the assumptions — into an exportable briefing.",
    doesPro:
      "Assembles a MissionReport with source ids, key points, assumptions, and warnings; the id and title are derived from the scenario manifest, and it exports as Markdown.",
    evidence: "The summary, evidence, assumptions, and export control — visible on Report.",
    tests: "Report generation, source-id grounding, and Markdown-export E2E.",
    proofRoute: "/report",
    proofLabel: "Report",
    note: "The report id and title are scenario-derived, but the report endpoint is still pinned to Protect ISRO; per-scenario generalisation is tracked in backend doc 08."
  }
];

/** One engine row in the input → output → validation table (doc 08-system §4.3). */
export interface EngineRow {
  title: string;
  icon: LucideIcon;
  input: string;
  output: string;
  validation: string;
  /** Module / service name revealed in Pro. */
  module: string;
}

export const ENGINES: EngineRow[] = [
  {
    title: "Catalog Data Service",
    icon: Database,
    input: "TLE fixture or live refresh",
    output: "Inspectable catalog objects",
    validation: "Fixture fallback + source lineage",
    module: "catalog_service"
  },
  {
    title: "Propagation Engine (SGP4)",
    icon: Activity,
    input: "TLE + scenario time window",
    output: "State vectors and orbit traces",
    validation: "Deterministic propagation tests",
    module: "propagation_engine"
  },
  {
    title: "Conjunction Screening",
    icon: Radar,
    input: "Primary / secondary states",
    output: "Ranked conjunctions",
    validation: "Closest-approach tests",
    module: "conjunction_engine"
  },
  {
    title: "Collision Probability",
    icon: Sigma,
    input: "Encounter-plane covariance",
    output: "Pc + severity class",
    validation: "Scientific sanity checks",
    module: "collision_probability_engine"
  },
  {
    title: "Maneuver Planner",
    icon: Rocket,
    input: "Conjunction + Δv limits",
    output: "Recommended Δv candidate",
    validation: "Candidate-ranking tests",
    module: "maneuver_planner_engine"
  },
  {
    title: "Secondary Screening",
    icon: ShieldCheck,
    input: "Selected burn",
    output: "Secondary-clear decision",
    validation: "Post-burn fixtures",
    module: "secondary_risk_engine"
  }
];

/** One validation lane (doc 08-system §4.5). */
export interface ValidationLane {
  title: string;
  covers: string;
}

export const VALIDATION: ValidationLane[] = [
  { title: "Unit", covers: "Backend engines and frontend formatters are covered by deterministic tests." },
  { title: "Scenario replay", covers: "Protect ISRO, the 2009 replay, and Kessler exercise the same pipeline." },
  { title: "Browser E2E", covers: "Playwright walks navigation, planning, report export, and responsive layouts." },
  { title: "Visual QA", covers: "Screenshots verify the judge-facing routes are organised and overflow-free." }
];

/**
 * The single forward action for engineers (doc 08-system §1). Points at the FastAPI OpenAPI docs;
 * opens in a new tab so it never interrupts the demo. Swap for the repo URL if preferred.
 */
export const API_CONTRACT_URL = "/docs";

/**
 * A representative conjunction whose `pc_estimate` grounds the Pc-model section in real covariance
 * numbers (doc 08-system §4.4). The hero Protect ISRO top conjunction, via `useThreatDetail`.
 */
export const PC_REFERENCE_CONJUNCTION_ID = "conj-protect-isro-001";
