/**
 * Atmosphere — a view-space Fresnel rim + sun-aware scattering halo, in two
 * additive layers (doc 07 §8). Replaces the legacy fixed-direction `vec3(0,0,1)`
 * rim so the glow tracks the camera and the lit limb scatters brightest.
 *
 *  - Outer halo: BackSide, the bright limb the bloom pass catches.
 *  - Inner glow: FrontSide, a soft blue haze near the day/night terminator.
 */
import { useMemo } from "react";
import * as THREE from "three";

import { NEON, SPACE } from "./colors";
import { SUN_POSITION } from "./scene.config";

const EARTH_RADIUS = 1.5;

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform vec3 uSun;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    float rim = pow(1.0 - max(dot(vViewDir, vWorldNormal), 0.0), uPower);
    float sun = clamp(dot(vWorldNormal, normalize(uSun)) * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uColor2, uColor, rim);
    float alpha = rim * uIntensity * mix(0.3, 1.0, sun);
    gl_FragColor = vec4(col, alpha);
  }
`;

function useAtmosphereMaterial(side: THREE.Side, power: number, intensity: number) {
  return useMemo(() => {
    return {
      uniforms: {
        uColor: { value: new THREE.Color(NEON.cyan) },
        uColor2: { value: new THREE.Color(SPACE.deepBlue) },
        uSun: { value: new THREE.Vector3(...SUN_POSITION).normalize() },
        uPower: { value: power },
        uIntensity: { value: intensity }
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side,
      depthWrite: false
    } satisfies THREE.ShaderMaterialParameters;
  }, [side, power, intensity]);
}

export function Atmosphere() {
  const outer = useAtmosphereMaterial(THREE.BackSide, 2.6, 0.95);
  const inner = useAtmosphereMaterial(THREE.FrontSide, 2.0, 0.35);

  return (
    <group>
      <mesh scale={EARTH_RADIUS * 1.07}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial attach="material" args={[outer]} />
      </mesh>
      <mesh scale={EARTH_RADIUS * 1.012}>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial attach="material" args={[inner]} />
      </mesh>
    </group>
  );
}
