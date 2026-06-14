/**
 * Conjunction marker — a pulsing TCA node at the midpoint of the protected asset
 * and the threat, plus a danger-red connector line between their live positions
 * (doc 07 §2.1, §5). Shown for threat-detail / avoidance framings.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { RISK_COLOR } from "./colors";
import { makeHaloTexture } from "./haloTexture";
import { orbitPosition } from "./orbit";
import type { OrbitObject } from "./types";

type ConjunctionMarkerProps = {
  protectedObject: OrbitObject;
  threatObject: OrbitObject;
  reducedMotion: boolean;
};

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export function ConjunctionMarker({ protectedObject, threatObject, reducedMotion }: ConjunctionMarkerProps) {
  const danger = RISK_COLOR.danger;
  const markerRef = useRef<THREE.Group>(null);
  const halo = useMemo(() => makeHaloTexture(), []);

  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(danger),
      transparent: true,
      opacity: 0.85,
      toneMapped: false
    });
    return new THREE.Line(geometry, material);
  }, [danger]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    orbitPosition(protectedObject.orbit, t, _a);
    orbitPosition(threatObject.orbit, t, _b);

    const position = line.geometry.getAttribute("position") as THREE.BufferAttribute;
    position.setXYZ(0, _a.x, _a.y, _a.z);
    position.setXYZ(1, _b.x, _b.y, _b.z);
    position.needsUpdate = true;

    if (markerRef.current) {
      markerRef.current.position.lerpVectors(_a, _b, 0.5);
      markerRef.current.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(t * 5.2) * 0.18);
    }
  });

  return (
    <>
      <primitive object={line} />
      <group ref={markerRef}>
        <mesh>
          <sphereGeometry args={[0.05, 24, 24]} />
          <meshBasicMaterial color={new THREE.Color(danger)} toneMapped={false} />
        </mesh>
        <sprite scale={[0.5, 0.5, 1]}>
          <spriteMaterial
            map={halo}
            color={new THREE.Color(danger)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </sprite>
      </group>
    </>
  );
}
