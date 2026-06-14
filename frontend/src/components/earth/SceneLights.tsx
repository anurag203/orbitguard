/**
 * Scene lighting — key / rim / ambient, tuned for ACESFilmic tone mapping +
 * bloom (doc 07 §7). The key light shares its direction with the atmosphere's
 * sun uniform via SUN_POSITION so shading, the lit limb, and ocean sheen agree.
 *
 * We rely on bloom + emissive for the satellites' glow, NOT a light per object.
 */
import { NEON } from "./colors";
import { SUN_POSITION } from "./scene.config";

export function SceneLights() {
  return (
    <>
      <ambientLight color="#DFF9FF" intensity={0.32} />
      {/* key (sun) — direction matches the atmosphere uSun uniform. Kept moderate so the
          daymap shows continents/oceans instead of blowing out to white under bloom. */}
      <directionalLight color="#FFFFFF" intensity={1.7} position={SUN_POSITION} />
      {/* cool cyan rim for separation from the void */}
      <directionalLight color={NEON.cyan} intensity={0.5} position={[-4.5, 0.8, 1.8]} />
    </>
  );
}
