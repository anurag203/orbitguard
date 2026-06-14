/**
 * CameraRig — per-route/phase framing with damped transitions (doc 07 §9).
 *
 * Owns the OrbitControls `target` (pan is disabled, so the rig is the sole owner)
 * and animates camera distance toward the route/phase preset, then HANDS CONTROL
 * BACK to the user: the distance animation only runs on a framing change and is
 * cancelled while the user is interacting, so it never fights manual zoom.
 * Replaces the legacy imperative `cameraPose()` switch + per-frame
 * `camera.position.lerp` double-lerp.
 */
import { useEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { damp, damp3 } from "./orbit";
import type { CameraFraming } from "./types";

type CameraRigProps = {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  interactingRef: MutableRefObject<boolean>;
  framing: Partial<CameraFraming>;
  reducedMotion: boolean;
};

const HALF_PI = Math.PI / 2;
const SMOOTH_TIME = 0.4; // doc 02 §6.1 "slow" (~400ms)
const _dir = new THREE.Vector3();

export function CameraRig({ controlsRef, interactingRef, framing, reducedMotion }: CameraRigProps) {
  const invalidate = useThree((state) => state.invalidate);

  const tx = framing.target?.[0] ?? 0;
  const ty = framing.target?.[1] ?? 0;
  const tz = framing.target?.[2] ?? 0;
  const desiredTarget = useMemo(() => new THREE.Vector3(tx, ty, tz), [tx, ty, tz]);
  const distance = framing.distance ?? 6;
  const polar = framing.polar ?? HALF_PI - 0.16;
  const azimuth = framing.azimuth ?? 0.32;

  const firstRef = useRef(true);
  const distanceAnimRef = useRef(true);

  // React to framing changes: snap (reduced motion) or animate distance.
  useEffect(() => {
    const controls = controlsRef.current;
    if (firstRef.current) {
      invalidate();
      return;
    }
    if (reducedMotion && controls) {
      controls.target.copy(desiredTarget);
      _dir.copy(controls.object.position).sub(controls.target).setLength(distance);
      controls.object.position.copy(controls.target).add(_dir);
      controls.update();
    } else {
      distanceAnimRef.current = true;
    }
    invalidate();
  }, [controlsRef, desiredTarget, distance, reducedMotion, invalidate]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // First frame: place the camera at the framing's angle + distance.
    if (firstRef.current) {
      const spherical = new THREE.Spherical(distance, polar, azimuth);
      controls.target.copy(desiredTarget);
      state.camera.position.setFromSpherical(spherical).add(desiredTarget);
      controls.update();
      firstRef.current = false;
      distanceAnimRef.current = false;
      return;
    }

    // Under reduced motion we don't run continuous camera motion (snaps happen
    // in the effect above); the user can still freely rotate/zoom.
    if (reducedMotion) return;

    damp3(controls.target, desiredTarget, SMOOTH_TIME, delta);

    if (distanceAnimRef.current && !interactingRef.current) {
      _dir.copy(state.camera.position).sub(controls.target);
      const next = damp(_dir.length(), distance, SMOOTH_TIME, delta);
      _dir.setLength(next);
      state.camera.position.copy(controls.target).add(_dir);
      if (Math.abs(next - distance) < 0.01) distanceAnimRef.current = false;
    }
  });

  return null;
}
