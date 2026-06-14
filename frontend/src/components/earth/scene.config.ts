/**
 * Scene configuration: demo tracks, scenario→objects map, camera framing presets.
 * (redesign/07-earth-3d-scene.md §9, §11.1)
 *
 * Pure data only — NO three.js imports — so the eager bundle (the lazy adapter)
 * can read it without pulling three into the main chunk. Vectors are plain
 * tuples; components construct THREE.Vector3 from them on the 3D side.
 */
import type { CameraFraming, MissionPhase, OrbitObject } from "./types";

/**
 * Default demo tracks — seeded from the legacy scene's hardcoded TRACKS so the
 * scene renders identically on day one (doc 07 §11.1):
 *   CARTOSAT-2F → safe, DEBRIS-001 → danger, RISAT-2BR1 → watch, SENTINEL → warning.
 */
export const DEMO_OBJECTS: OrbitObject[] = [
  {
    id: "CARTOSAT-2F",
    name: "CARTOSAT-2F",
    kind: "satellite",
    risk: "safe",
    orbit: { radius: 2.18, inclination: 1.1, raan: -0.32, phase: 0.18, speed: 0.22 },
    showLabel: true
  },
  {
    id: "DEBRIS-001",
    name: "DEBRIS-001",
    kind: "debris",
    risk: "danger",
    orbit: { radius: 2.04, inclination: 1.04, raan: -0.18, phase: 0.62, speed: 0.24 },
    showLabel: true
  },
  {
    id: "RISAT-2BR1",
    name: "RISAT-2BR1",
    kind: "satellite",
    risk: "watch",
    orbit: { radius: 1.9, inclination: 0.54, raan: -0.58, phase: 0.82, speed: 0.18 }
  },
  {
    id: "SENTINEL",
    name: "SENTINEL",
    kind: "satellite",
    risk: "warning",
    orbit: { radius: 2.38, inclination: -0.42, raan: 0.28, phase: 0.44, speed: 0.16 }
  }
];

/**
 * Map a scenarioId to the objects to render. For now every scenario uses the
 * demo tracks; later this reads from the API/catalog (doc 04 §5) without route
 * changes. Returns a fresh array so callers can safely mutate/extend.
 */
export function scenarioObjects(_scenarioId: string): OrbitObject[] {
  return DEMO_OBJECTS.map((object) => ({ ...object, orbit: { ...object.orbit } }));
}

/** The protected asset and the threat object, by id (drives the conjunction line). */
export const PROTECTED_ID = "CARTOSAT-2F";
export const THREAT_ID = "DEBRIS-001";

/** Shared sun direction (lights + atmosphere agree). Plain tuple; normalized on the 3D side. */
export const SUN_POSITION: [number, number, number] = [4.8, 2.6, 3.8];

const HALF_PI = Math.PI / 2;

/** Base framing — a calm, slightly-above-equator hero view. */
const BASE: CameraFraming = {
  distance: 6,
  target: [0, 0, 0],
  polar: HALF_PI - 0.16,
  azimuth: 0.32,
  fov: 33,
  autoRotate: false,
  minDistance: 3.2,
  maxDistance: 9
};

/**
 * Per route/phase framing (doc 07 §9.1). Reproduces the INTENT of the legacy
 * scenario/phase camera poses, but as data with smooth transitions.
 */
export function framingFor(
  scenarioId: string,
  phase: MissionPhase,
  _selected?: string
): Partial<CameraFraming> {
  let framing: CameraFraming = { ...BASE, target: [...BASE.target] as [number, number, number] };

  // Scenario bias (mirrors legacy cameraPose()).
  if (scenarioId === "2009-replay") {
    framing = { ...framing, distance: 5.2, azimuth: -0.42, polar: HALF_PI - 0.22 };
  } else if (scenarioId === "kessler-sandbox") {
    framing = { ...framing, distance: 5.4, azimuth: 0.5, polar: HALF_PI - 0.2 };
  } else if (scenarioId === "protect-isro") {
    // Home/Protect-ISRO hero: wide, gently auto-rotating.
    framing = { ...framing, distance: phase === "alert" ? 6.8 : 6, autoRotate: phase === "alert" };
  }

  // Phase bias (mirrors legacy planned/applied/report poses).
  if (phase === "planned") {
    framing = { ...framing, distance: Math.max(framing.minDistance ?? 3.2, framing.distance - 0.4), autoRotate: false };
  } else if (phase === "applied" || phase === "report") {
    framing = { ...framing, distance: 6, azimuth: 0.18, autoRotate: false };
  }

  return framing;
}
