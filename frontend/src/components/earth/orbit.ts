/**
 * Orbit geometry + framerate-independent damping helpers.
 * (doc 07 §4.1, §5, §9.2)
 */
import * as THREE from "three";

import type { OrbitObject } from "./types";

const _euler = new THREE.Euler();

/**
 * Visual angular speed factor. Matches the legacy scene's
 * `elapsed * speed * 0.028` so motion reads the same on day one.
 */
const SPEED = 0.028;

/**
 * Position of an object along its (tilted/yawed) circular orbit at time `t`.
 * The local ring lies in the XY plane and is rotated by (inclination, raan).
 */
export function orbitPosition(
  orbit: OrbitObject["orbit"],
  t: number,
  out: THREE.Vector3 = new THREE.Vector3()
): THREE.Vector3 {
  const progress = (orbit.phase + t * orbit.speed * SPEED) % 1;
  const angle = progress * Math.PI * 2;
  out.set(Math.cos(angle) * orbit.radius, Math.sin(angle) * orbit.radius, 0);
  out.applyEuler(_euler.set(orbit.inclination, orbit.raan, 0));
  return out;
}

/**
 * Points of the (un-rotated) orbit ring in the XY plane. The OrbitTrail applies
 * `rotation={[inclination, raan, 0]}` so the ring tilts/yaws to match the path.
 */
export function ringPoints(orbit: OrbitObject["orbit"], segments = 256): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    points.push([Math.cos(angle) * orbit.radius, Math.sin(angle) * orbit.radius, 0]);
  }
  return points;
}

/**
 * Per-vertex colors for an orbit ring: a risk-colored gradient that runs bright
 * near the seam and fades around the loop, reading as a trail of motion.
 */
export function fadeGradient(hex: string, segments = 256): [number, number, number][] {
  const color = new THREE.Color(hex);
  const colors: [number, number, number][] = [];
  for (let i = 0; i <= segments; i += 1) {
    const f = 0.22 + 0.78 * (0.5 + 0.5 * Math.cos((i / segments) * Math.PI * 2));
    colors.push([color.r * f, color.g * f, color.b * f]);
  }
  return colors;
}

/** Exponential (critically-damped-ish) smoothing toward a target over ~`smoothTime`s. */
export function damp(current: number, target: number, smoothTime: number, dt: number): number {
  const lambda = 1 / Math.max(1e-4, smoothTime);
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Vector3 variant of {@link damp} (mutates `current`). */
export function damp3(current: THREE.Vector3, target: THREE.Vector3, smoothTime: number, dt: number): void {
  current.x = damp(current.x, target.x, smoothTime, dt);
  current.y = damp(current.y, target.y, smoothTime, dt);
  current.z = damp(current.z, target.z, smoothTime, dt);
}
