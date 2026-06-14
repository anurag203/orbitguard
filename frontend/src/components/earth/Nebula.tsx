/**
 * Nebula — a large inverted sphere with a soft cyan→violet→void gradient behind
 * the stars (doc 07 §6). Very low intensity so it reads as faint deep-space
 * color, never a poster. Kept below the bloom threshold so it does not glow.
 */
import { useMemo } from "react";
import * as THREE from "three";

import { NEON, SPACE } from "./colors";

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vDir = normalize(worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uVoid;
  uniform vec3 uCyan;
  uniform vec3 uViolet;
  uniform float uIntensity;
  varying vec3 vDir;
  void main() {
    float t = vDir.y * 0.5 + 0.5;                 // -Y..+Y -> 0..1
    float band = smoothstep(0.15, 0.85, t);
    vec3 col = mix(uViolet, uCyan, band);
    // fade the tint toward the void at the top/bottom so it stays subtle
    float tint = (1.0 - abs(vDir.y)) * uIntensity;
    gl_FragColor = vec4(mix(uVoid, col, tint), 1.0);
  }
`;

export function Nebula() {
  const config = useMemo(
    () =>
      ({
        uniforms: {
          uVoid: { value: new THREE.Color(SPACE.void) },
          uCyan: { value: new THREE.Color(NEON.cyan) },
          uViolet: { value: new THREE.Color(NEON.violet) },
          uIntensity: { value: 0.12 }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false
      }) satisfies THREE.ShaderMaterialParameters,
    []
  );

  return (
    <mesh renderOrder={-10} scale={90}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial attach="material" args={[config]} />
    </mesh>
  );
}
