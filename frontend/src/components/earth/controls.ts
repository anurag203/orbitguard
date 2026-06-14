/**
 * Imperative helpers that drive the drei <OrbitControls> instance from the
 * keyboard handler and the on-screen zoom/reset buttons (doc 07 §3.1).
 *
 * These operate on the live three-stdlib OrbitControls so behaviour is
 * identical to mouse/touch input — no parallel custom camera state.
 */
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import type { CameraFraming } from "./types";

const MIN_POLAR = 0.25;
const MAX_POLAR = Math.PI - 0.25;
const DEFAULT_DISTANCE = 6;

/** Rotate by deltas in azimuth/polar (radians), clamped away from the poles. */
export function rotateBy(controls: OrbitControlsImpl, deltaAzimuth: number, deltaPolar: number): void {
  controls.setAzimuthalAngle(controls.getAzimuthalAngle() + deltaAzimuth);
  controls.setPolarAngle(THREE.MathUtils.clamp(controls.getPolarAngle() + deltaPolar, MIN_POLAR, MAX_POLAR));
  controls.update();
}

/** Dolly the camera in/out by a multiplicative factor, clamped to min/max distance. */
export function dolly(controls: OrbitControlsImpl, factor: number): void {
  const direction = controls.object.position.clone().sub(controls.target);
  const distance = THREE.MathUtils.clamp(
    direction.length() * factor,
    controls.minDistance,
    controls.maxDistance
  );
  controls.object.position.copy(controls.target).add(direction.setLength(distance));
  controls.update();
}

/** Snap the controls back to the route's framing (the reset button / R / 0). */
export function resetView(controls: OrbitControlsImpl, framing?: Partial<CameraFraming>): void {
  const target = framing?.target ?? [0, 0, 0];
  const distance = THREE.MathUtils.clamp(
    framing?.distance ?? DEFAULT_DISTANCE,
    controls.minDistance,
    controls.maxDistance
  );
  const polar = THREE.MathUtils.clamp(framing?.polar ?? Math.PI / 2 - 0.16, MIN_POLAR, MAX_POLAR);
  const azimuth = framing?.azimuth ?? 0.32;

  controls.target.set(target[0], target[1], target[2]);
  const spherical = new THREE.Spherical(distance, polar, azimuth);
  controls.object.position.setFromSpherical(spherical).add(controls.target);
  controls.update();
}
