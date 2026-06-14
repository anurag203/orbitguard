/**
 * SceneControls — THE DRAG FIX (doc 07 §3).
 *
 * Replaces the legacy hand-rolled pointer math (which added `targetYaw += dx`
 * with the WRONG sign and then double-lerped, giving reversed + laggy drag) with
 * drei `<OrbitControls>`. OrbitControls orbits the CAMERA around a fixed target
 * using standard azimuth/polar conventions, so dragging the globe moves its
 * surface WITH the cursor ("grab the globe"). `enableDamping` provides a single,
 * frame-rate-independent smoothing pass (no double lerp). The reversed-sign and
 * double-lerp bugs are deleted because we no longer hand-roll the mapping at all.
 *
 * Also wires idle auto-rotate gating: it pauses the moment the user interacts and
 * resumes ~4s after they stop (doc 07 §9.3), and exposes `invalidate` for the
 * demand frameloop used under reduced motion.
 */
import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type SceneControlsProps = {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  interactingRef: MutableRefObject<boolean>;
  invalidateRef: MutableRefObject<(() => void) | null>;
  interactive: boolean;
  reducedMotion: boolean;
  autoRotate: boolean;
  idle: boolean;
  setIdle: (idle: boolean) => void;
  minDistance: number;
  maxDistance: number;
};

const IDLE_RESUME_MS = 4000;

export function SceneControls({
  controlsRef,
  interactingRef,
  invalidateRef,
  interactive,
  reducedMotion,
  autoRotate,
  idle,
  setIdle,
  minDistance,
  maxDistance
}: SceneControlsProps) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    invalidateRef.current = invalidate;
    return () => {
      invalidateRef.current = null;
    };
  }, [invalidate, invalidateRef]);

  // Idle auto-rotate gate: pause on interaction, resume after a quiet period.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return undefined;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onStart = () => {
      interactingRef.current = true;
      setIdle(false);
      if (timer) clearTimeout(timer);
    };
    const onEnd = () => {
      interactingRef.current = false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_RESUME_MS);
    };

    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);
    return () => {
      if (timer) clearTimeout(timer);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
    };
  }, [controlsRef, interactingRef, setIdle]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={interactive}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.7}
      enablePan={false}
      minDistance={minDistance}
      maxDistance={maxDistance}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI - 0.25}
      autoRotate={!reducedMotion && autoRotate && idle}
      autoRotateSpeed={0.35}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
    />
  );
}
