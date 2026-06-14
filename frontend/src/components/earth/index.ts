/**
 * Public entry for the R3F Earth scene (doc 07).
 *
 * Routes import the drop-in `EarthScene` (back-compat prop shape). Only types
 * and the lightweight adapter are exported here — the heavy `EarthCanvas` is
 * lazy-loaded by the adapter so importing this barrel does NOT pull three.js
 * into the caller's chunk.
 */
export { EarthScene } from "./EarthScene";

export type {
  CameraFraming,
  EarthCanvasProps,
  EarthSceneProps,
  MissionPhase,
  OrbitObject,
  Quality,
  QualityTier,
  Risk
} from "./types";

export { DEMO_OBJECTS, framingFor, scenarioObjects } from "./scene.config";
export { RISK_COLOR } from "./colors";
