/**
 * Public data model for the R3F Earth scene (redesign/07-earth-3d-scene.md §2.2).
 * Routes pass DATA, not three.js objects; the scene derives geometry from this.
 *
 * NOTE: this module is type-only at runtime (all exports are erased), so it can
 * be imported from the eager bundle without pulling three.js into it.
 */
import type { MissionPhase } from "../../state/missionStore";

export type { MissionPhase };

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
  /** Default "auto" (capability/route based). */
  quality?: Quality;
  /** Per-route framing override (else preset from scenario/phase). */
  framing?: Partial<CameraFraming>;
  /** Draw the danger connector (threat detail / avoidance). */
  showThreatLine?: boolean;
  /** Click an object → route updates ?object=<id> (doc 03 §7). */
  onSelect?: (id: string) => void;
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
  quality?: Quality;
  framing?: Partial<CameraFraming>;
  showThreatLine?: boolean;
  onSelect?: (id: string) => void;
};
