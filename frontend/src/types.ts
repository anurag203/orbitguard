export type RiskMetrics = {
  pc: number;
  miss_distance_m: number;
  relative_velocity_km_s: number;
  severity: string;
};

export type DemoStatus = {
  status: string;
  offline_mode: boolean;
  default_flow_id: string;
  summary: string;
  missing_required_count: number;
  checks: Array<{
    name: string;
    status: string;
    required: boolean;
    category: string;
    detail: string;
  }>;
};

export type DemoReplay = {
  flow_id: string;
  status: string;
  summary: string;
  checks: Array<{
    name: string;
    status: string;
    expected: string;
    actual: string;
    detail: string;
  }>;
};

export type ScenarioSummary = {
  scenario_id: string;
  title: string;
  mode: string;
  status: string;
  description: string;
  hero: boolean;
};

export type ScenarioRun = {
  scenario_id: string;
  run_id: string;
  mode: string;
  status: string;
  catalog_id: string;
  protected_object: {
    object_id: string;
    name: string;
    owner?: string;
    object_type: string;
    orbit_class?: string;
    tags: string[];
  };
  top_conjunction_id: string;
  labels: string[];
  events: Array<{
    timestamp_offset_s: number;
    title: string;
    description: string;
    focus?: string;
    camera_hint?: string;
  }>;
  demo_beats: string[];
  summary: string;
};

export type CatalogObject = {
  object_id: string;
  name: string;
  norad_id?: string | null;
  owner?: string | null;
  country?: string | null;
  country_code?: string | null;
  object_type: string;
  orbit_class?: string | null;
  intl_designator?: string | null;
  launch_date?: string | null;
  rcs?: string | null;
  rcs_m2?: number | null;
  period_minutes?: number | null;
  inclination_deg?: number | null;
  apogee_km?: number | null;
  perigee_km?: number | null;
  cloud?: string | null;
  source_catalog?: string | null;
  source_url?: string | null;
  fetched_at_utc?: string | null;
  tle_epoch_utc?: string | null;
  tags: string[];
  tle?: {
    line1: string;
    line2: string;
  } | null;
};

export type CatalogWorkbench = {
  mode: string;
  source: string;
  source_url?: string | null;
  fetched_at_utc?: string | null;
  catalog: {
    catalog_id: string;
    name: string;
    source: string;
    source_url?: string | null;
    fetched_at_utc?: string | null;
    object_count: number;
    snapshot: boolean;
    notes: string;
  };
  objects: CatalogObject[];
  total_count: number;
  returned_count: number;
  filters: Record<string, string | number | null>;
  warnings: string[];
};

export type WatchlistResponse = {
  watchlist_id: string;
  objects: CatalogObject[];
};

export type ConjunctionSummary = {
  conjunction_id: string;
  primary_object_id: string;
  secondary_object_id: string;
  tca_utc: string;
  risk: RiskMetrics;
  status: string;
};

export type ConjunctionDetail = ConjunctionSummary & {
  relative_position_m: number[];
  relative_velocity_vector_km_s: number[];
  encounter_plane: Array<{ x_m: number; y_m: number; label: string }>;
  pc_estimate: {
    pc: number;
    method: string;
    encounter_x_m: number;
    encounter_y_m: number;
    covariance: {
      model_id: string;
      sigma_x_m: number;
      sigma_y_m: number;
      hard_body_radius_m: number;
      source: string;
      notes: string[];
    };
    assumptions: string[];
    warnings: string[];
  };
  assumptions: string[];
};

export type ManeuverCandidate = {
  candidate_id: string;
  burn_t_minus_tca_s: number;
  direction: string;
  delta_v_m_s: number;
  score: number;
  status: string;
  reason: string;
  predicted_risk: RiskMetrics;
  miss_distance_gain_m: number;
  pc_reduction_factor: number;
  rejection_reasons: string[];
  assumptions: string[];
};

export type ManeuverPlan = {
  plan_id: string;
  conjunction_id: string;
  status: string;
  recommendation: ManeuverCandidate | null;
  alternatives: ManeuverCandidate[];
  before: RiskMetrics;
  predicted_after: RiskMetrics;
  requires_secondary_screening: boolean;
  explanation: string;
  candidate_count: number;
  assumptions: string[];
  warnings: string[];
};

export type ManeuverApply = {
  plan_id: string;
  candidate_id: string;
  before: RiskMetrics;
  after: RiskMetrics;
  secondary_status: string;
  secondary_summary: string;
  screened_object_count: number;
  secondary: {
    status: string;
    summary: string;
    screened_object_count: number;
    concerns: unknown[];
    assumptions: string[];
    warnings: string[];
  };
};

export type MissionReport = {
  report_id: string;
  title: string;
  briefing: {
    headline: string;
    summary: string;
    key_points: string[];
    limitations: string[];
  };
  source_ids: {
    scenario_run_id: string;
    conjunction_id: string;
    plan_id: string;
    candidate_id: string;
  };
  sections: Array<{ title: string; body: string }>;
  assumptions: string[];
  warnings: string[];
};
