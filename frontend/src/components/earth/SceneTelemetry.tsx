/**
 * SceneTelemetry — publishes the live OrbitControls camera state onto the
 * `.earth-scene` container as `data-azimuth` / `data-polar` / `data-distance`
 * (radians + scene units). This is a TEST/observability hook only (doc 09 §2.5,
 * Appendix A): it lets E2E assert the *signed* drag direction and zoom limits
 * without coupling to styling. No visual effect, no behavior change.
 *
 * Values come straight from OrbitControls' own getters, so they match three.js
 * conventions exactly (drag right → azimuth decreases — the reversed-drag guard).
 */
import { useFrame } from "@react-three/fiber";
import type { MutableRefObject } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type SceneTelemetryProps = {
  containerRef: MutableRefObject<HTMLDivElement | null>;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
};

export function SceneTelemetry({ containerRef, controlsRef }: SceneTelemetryProps) {
  useFrame(() => {
    const el = containerRef.current;
    const controls = controlsRef.current;
    if (!el || !controls) return;
    el.dataset.azimuth = controls.getAzimuthalAngle().toFixed(4);
    el.dataset.polar = controls.getPolarAngle().toFixed(4);
    el.dataset.distance = controls.getDistance().toFixed(4);
  });
  return null;
}
