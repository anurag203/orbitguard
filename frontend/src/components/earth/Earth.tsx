/**
 * Earth — the textured day-map sphere with a slow idle spin, hosting the
 * atmosphere as a sibling (so the rim glow doesn't spin with the surface).
 * The Blue Marble texture is self-hosted and loaded via drei `useTexture`,
 * keeping the scene offline-safe (doc 07 §0, §8).
 */
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { Atmosphere } from "./Atmosphere";

const EARTH_RADIUS = 1.5;
const TEXTURE_URL = "/textures/earth-blue-marble-june-5400x2700.jpg";
// Oceanic base color shown before the map loads (or if the asset is unavailable) so the
// scene NEVER blanks — a missing texture degrades to a believable blue globe (doc 07 §8).
const OCEAN_FALLBACK = new THREE.Color("#16324d");
const EMISSIVE = new THREE.Color("#04121F");

/**
 * Load the Blue Marble map without Suspense so a 404 / offline asset can't tear down the whole
 * Canvas subtree (the previous `useTexture` threw inside Suspense and blanked Earth + stars).
 */
function useEarthTexture(maxAnisotropy: number): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let active = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      TEXTURE_URL,
      (tex) => {
        if (!active) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAnisotropy;
        setTexture(tex);
      },
      undefined,
      () => {
        // Asset missing/unreachable: keep the colored fallback; the globe still renders.
      }
    );
    return () => {
      active = false;
    };
  }, [maxAnisotropy]);
  return texture;
}

export function Earth({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());
  const invalidate = useThree((state) => state.invalidate);
  const texture = useEarthTexture(maxAnisotropy);

  // Apply the map imperatively once it loads. Swapping `map` null→texture changes the
  // material's shader program, so `needsUpdate` must be set or the daymap never samples
  // (the sphere would stay a flat lit color). `invalidate()` redraws on the demand loop.
  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.map = texture;
    material.color.set(texture ? "#ffffff" : OCEAN_FALLBACK);
    material.needsUpdate = true;
    invalidate();
  }, [texture, invalidate]);

  useFrame((_, delta) => {
    if (reducedMotion || !meshRef.current) return;
    meshRef.current.rotation.y += delta * 0.02;
  });

  return (
    <group>
      <mesh ref={meshRef} rotation={[-0.06, -2.35, 0]}>
        <sphereGeometry args={[EARTH_RADIUS, 128, 128]} />
        <meshStandardMaterial
          ref={materialRef}
          color={OCEAN_FALLBACK}
          metalness={0.04}
          roughness={0.88}
          emissive={EMISSIVE}
          emissiveIntensity={0.05}
        />
      </mesh>
      <Atmosphere />
    </group>
  );
}
