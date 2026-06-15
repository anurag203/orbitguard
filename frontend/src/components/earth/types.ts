/**
 * Public data model for the R3F Earth scene (redesign/07-earth-3d-scene.md §2.2).
 * Routes pass DATA, not three.js objects; the scene derives geometry from this.
 *
 * NOTE: this module is type-only at runtime (all exports are erased), so it can
 * be imported from the eager bundle without pulling three.js into it.
 */

export type MissionPhase = "alert" | "planned" | "applied" | "report";

export type Risk = "safe" | "watch" | "warning" | "danger";

export type OrbitObject = {
  /** Stable id (NORAD id or name). For the demo tracks this equals `name`. */
  id: string;
  /** Display name, e.g. "CARTOSAT-2F". */
  name: string;
  kind: "satellite" | "debris";
  /** Drives color + emphasis (doc 02 §2.4). */
  risk: Risk;
  orbit: {
    /** Scene units (Earth radius = 1.5; LEO band ~1.9–2.4). */
    radius: number;
    /** Radians — tilt of the orbital plane (rotation about X). */
    inclination: number;
    /** Radians — longitude of ascending node / yaw (rotation about Y). */
    raan: number;
    /** 0..1 starting position along the orbit. */
    phase: number;
    /** Visual angular speed. */
    speed: number;
  };
  /** Force the label on (selected/threat are always on). */
  showLabel?: boolean;
};

/**
 * Coarse orbit band for a catalog object (drives the cloud color + the orbit filter).
 * LEO ≈ <2000 km, MEO ≈ 2000–31000 km, GEO ≈ ~35786 km, HEO = highly elliptical.
 */
export type OrbitBand = "LEO" | "MEO" | "GEO" | "HEO";

/**
 * One baked catalog object for the instanced "see everything in orbit" field
 * (redesign plan/03-sky-all-satellites.md). Loaded from the committed static
 * `public/data/catalog-sky.json`; SGP4-propagated client-side by the scene.
 *
 * This type is erased at runtime (type-only), so the eager bundle / route code
 * can import it without pulling three.js or satellite.js into the main chunk.
 */
export type SkyCatalogEntry = {
  /** Stable id (NORAD catalog number when available). */
  id: string;
  /** NORAD catalog number, repeated separately so search/facts can stay explicit. */
  noradId?: string;
  /** Display name, e.g. "STARLINK-1234". */
  name: string;
  /** TLE line 1 (SGP4 input). */
  line1: string;
  /** TLE line 2 (SGP4 input). */
  line2: string;
  kind: "satellite" | "debris";
  /** Best-effort operator/owner label (absent → "Unlabelled"). */
  owner?: string;
  /** Friendly country/agency label from SATCAT OWNER, e.g. "India (ISRO)". */
  country?: string;
  /** Raw SATCAT OWNER code, e.g. "IND". */
  countryCode?: string;
  /** SATCAT object type normalized for display and filtering. */
  objectType?: "PAYLOAD" | "ROCKET BODY" | "DEBRIS" | "UNKNOWN";
  /** International designator from SATCAT, e.g. "1998-067A". */
  intlDesignator?: string;
  /** Launch date from SATCAT, ISO yyyy-mm-dd when known. */
  launchDate?: string;
  /** Radar cross-section size bucket. */
  rcs?: "SMALL" | "MEDIUM" | "LARGE" | null;
  /** Raw SATCAT radar cross-section value in square meters when provided. */
  rcsM2?: number | null;
  /** SATCAT period in minutes. */
  periodMinutes?: number | null;
  /** SATCAT inclination in degrees. */
  inclinationDeg?: number | null;
  /** SATCAT apogee/perigee in kilometers. */
  apogeeKm?: number | null;
  perigeeKm?: number | null;
  /** Named debris cloud id, e.g. "cosmos-2251-debris". */
  cloud?: string;
  /** Data provenance for facts panels. */
  source?: "offline" | "live";
  sourceUrl?: string;
  fetchedAtUtc?: string;
  tleEpochUtc?: string;
  /** Coarse orbit band; recomputed from the TLE if missing/invalid. */
  orbitClass?: OrbitBand | string;
};

/** Requested quality; resolves to a concrete tier (see {@link QualityTier}). */
export type Quality = "auto" | "high" | "low";

/** Resolved performance tier. */
export type QualityTier = "high" | "low";

export type CameraFraming = {
  /** Camera distance from target. */
  distance: number;
  target: [number, number, number];
  /** Initial polar angle (radians, from +Y). */
  polar?: number;
  /** Initial azimuth angle (radians). */
  azimuth?: number;
  fov?: number;
  /** Gentle idle drift (paused on user interaction). */
  autoRotate?: boolean;
  /** Zoom-in limit (overrides default 3.2). */
  minDistance?: number;
  /** Zoom-out limit (overrides default 9). */
  maxDistance?: number;
};

/**
 * The internal R3F canvas props (what {@link EarthCanvasProps} routes ultimately drive).
 * `EarthCanvas` is lazy-loaded; this type is safe to import eagerly.
 */
export type EarthCanvasProps = {
  /** What to render. */
  objects: OrbitObject[];
  /** Selected object id (emphasis + label + camera focus). */
  selected?: string;
  phase: MissionPhase;
  scenarioId: string;
  /** Default true; false = view-only hero (Home). */
  interactive?: boolean;
  /** Default true; false disables wheel/pinch/buttons/zoom keys while leaving drag rotation intact. */
  enableZoom?: boolean;
  /** Default "auto" (capability/route based). */
  quality?: Quality;
  /** Per-route framing override (else preset from scenario/phase). */
  framing?: Partial<CameraFraming>;
  /** Draw the danger connector (threat detail / avoidance). */
  showThreatLine?: boolean;
  /** Show object name labels (default true). Hero passes false for a clean backdrop. */
  showLabels?: boolean;
  /** Click an object → route updates ?object=<id> (doc 03 §7). */
  onSelect?: (id: string) => void;

  // --- "see everything in orbit" instanced field (plan/03-sky-all-satellites.md) ---
  /** Catalog of SGP4-propagated objects to render as the instanced cloud (already filtered). */
  field?: SkyCatalogEntry[];
  /** Render the instanced field beneath the hero tracks (default false). */
  showField?: boolean;
  /** Hard cap on rendered instances (e.g. a harder cap on mobile); else derived from the quality tier. */
  fieldCap?: number;
  /** Density preset for the instanced field. */
  fieldDensity?: "lite" | "balanced" | "max";
  /** Filter/search matches should render fully when safely bounded. */
  fieldShowAllMatches?: boolean;
  /** Pause/play the field propagation. */
  fieldPlaying?: boolean;
  /** Sim seconds per wall-clock second for the field. */
  fieldTimeScale?: number;
  /** Base epoch for field propagation. */
  fieldEpoch?: Date;
  /** Report how many instances are actually rendered vs. the catalog total (for the honest count chip). */
  onFieldStats?: (shown: number, total: number) => void;
};

/**
 * The drop-in public component props. Backwards-compatible with the legacy
 * `EarthScene` shape (`{ phase, scenarioId, selectedObject }`) PLUS optional
 * new props so Wave-2 routes (Home / Sky / Threat detail / Avoidance) can
 * configure framing, interactivity, quality, and selection callbacks.
 */
export type EarthSceneProps = {
  phase: MissionPhase;
  scenarioId: string;
  /** Legacy: selected object by name (maps to {@link EarthCanvasProps.selected}). */
  selectedObject?: string;

  // --- optional Wave-2 extensions ---
  objects?: OrbitObject[];
  interactive?: boolean;
  enableZoom?: boolean;
  quality?: Quality;
  framing?: Partial<CameraFraming>;
  showThreatLine?: boolean;
  showLabels?: boolean;
  onSelect?: (id: string) => void;

  // --- "see everything in orbit" instanced field (plan/03-sky-all-satellites.md) ---
  field?: SkyCatalogEntry[];
  showField?: boolean;
  fieldCap?: number;
  fieldDensity?: "lite" | "balanced" | "max";
  fieldShowAllMatches?: boolean;
  fieldPlaying?: boolean;
  fieldTimeScale?: number;
  fieldEpoch?: Date;
  onFieldStats?: (shown: number, total: number) => void;
};
