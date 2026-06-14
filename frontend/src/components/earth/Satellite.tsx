/**
 * Satellite — one orbiting object that reads as a real, glowing thing at any
 * zoom (doc 07 §4):
 *   - constant on-screen size (scaled by camera distance) so it never becomes a
 *     2–3px dot nor balloons up close,
 *   - neon emissive body (`toneMapped={false}`) the bloom pass turns into a glow,
 *   - an additive halo sprite (soft radial gradient) for the "pop",
 *   - a crisp drei `<Html>` glass label for selected/threat/hovered objects,
 *   - click to select; selected/threat get a gentle pulse (off under reduced motion).
 */
import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import { MATERIAL, RISK_COLOR } from "./colors";
import { makeHaloTexture } from "./haloTexture";
import { orbitPosition } from "./orbit";
import type { OrbitObject } from "./types";

type SatelliteProps = {
  object: OrbitObject;
  selected: boolean;
  reducedMotion: boolean;
  onSelect?: (id: string) => void;
};

const _pos = new THREE.Vector3();

export function Satellite({ object, selected, reducedMotion, onSelect }: SatelliteProps) {
  const positionRef = useRef<THREE.Group>(null);
  const scaleRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial>(null);

  const [hovered, setHovered] = useState(false);

  const color = RISK_COLOR[object.risk];
  const halo = useMemo(() => makeHaloTexture(), []);
  const emphasize = selected || object.risk === "danger";
  const baseEmissive = emphasize ? 3.0 : 2.2;
  const interactive = Boolean(onSelect);
  const showLabel = Boolean(object.showLabel) || selected || hovered;

  useFrame((state, delta) => {
    const group = positionRef.current;
    const scaleGroup = scaleRef.current;
    if (!group || !scaleGroup) return;

    const t = state.clock.elapsedTime;
    orbitPosition(object.orbit, t, _pos);
    group.position.copy(_pos);

    // Constant on-screen size (doc 07 §4.1).
    const distance = state.camera.position.distanceTo(_pos);
    const base = selected ? 0.05 : 0.034;
    let scale = THREE.MathUtils.clamp(distance * base, 0.06, 0.42);

    if (!reducedMotion && emphasize) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.0);
      scale *= 1 + pulse * 0.08;
      if (bodyMaterialRef.current) {
        bodyMaterialRef.current.emissiveIntensity = baseEmissive * (0.85 + pulse * 0.4);
      }
    }
    scaleGroup.scale.setScalar(scale);

    if (object.kind === "debris" && modelRef.current && !reducedMotion) {
      modelRef.current.rotation.z += delta * 1.1;
      modelRef.current.rotation.x += delta * 0.4;
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    onSelect?.(object.id);
  };

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    event.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handleOut = () => {
    if (!interactive) return;
    setHovered(false);
    document.body.style.cursor = "";
  };

  return (
    <group ref={positionRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut}>
      <group ref={scaleRef}>
        <group ref={modelRef}>
          {object.kind === "debris" ? (
            <>
              <mesh>
                <icosahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial
                  ref={bodyMaterialRef}
                  color={MATERIAL.debrisCore}
                  emissive={new THREE.Color(color)}
                  emissiveIntensity={baseEmissive}
                  roughness={0.5}
                  metalness={0.2}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[0.22, 0, 0]} rotation={[0, 0, 1.2]}>
                <coneGeometry args={[0.1, 0.3, 5]} />
                <meshStandardMaterial color="#F2B7B9" emissive={new THREE.Color("#4C1118")} emissiveIntensity={0.5} />
              </mesh>
            </>
          ) : (
            <>
              <mesh>
                <boxGeometry args={[0.34, 0.2, 0.2]} />
                <meshStandardMaterial
                  ref={bodyMaterialRef}
                  color={MATERIAL.bodyTint}
                  emissive={new THREE.Color(color)}
                  emissiveIntensity={baseEmissive}
                  metalness={0.6}
                  roughness={0.3}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[-0.32, 0, 0]}>
                <boxGeometry args={[0.26, 0.02, 0.16]} />
                <meshStandardMaterial
                  color={MATERIAL.panel}
                  emissive={new THREE.Color(MATERIAL.panelEmissive)}
                  emissiveIntensity={0.6}
                  metalness={0.35}
                  roughness={0.24}
                />
              </mesh>
              <mesh position={[0.32, 0, 0]}>
                <boxGeometry args={[0.26, 0.02, 0.16]} />
                <meshStandardMaterial
                  color={MATERIAL.panel}
                  emissive={new THREE.Color(MATERIAL.panelEmissive)}
                  emissiveIntensity={0.6}
                  metalness={0.35}
                  roughness={0.24}
                />
              </mesh>
            </>
          )}
        </group>

        <sprite scale={[2.4, 2.4, 1]}>
          <spriteMaterial
            map={halo}
            color={new THREE.Color(color)}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.7}
            toneMapped={false}
          />
        </sprite>
      </group>

      {showLabel && (
        <Html
          position={[0, 0.18, 0]}
          center
          distanceFactor={8}
          occlude="blending"
          wrapperClass="earth-label-wrapper"
          zIndexRange={[20, 0]}
        >
          <span
            className="select-none whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md"
            style={{
              color,
              border: `1px solid ${color}55`,
              background: "rgba(8, 12, 20, 0.7)",
              boxShadow: `0 0 16px ${color}33`
            }}
          >
            {object.name}
          </span>
        </Html>
      )}
    </group>
  );
}
