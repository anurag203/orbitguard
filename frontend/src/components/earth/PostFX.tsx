/**
 * Postprocessing (doc 07 §7) — the single biggest "wow" lever. Bloom turns the
 * emissive satellites, halos, trails, and the atmosphere limb into glow under
 * ACESFilmic tone mapping (set on the <Canvas> gl). The threshold is tuned so
 * the Earth daymap doesn't bloom but the neon emissives (`toneMapped={false}`) do.
 *
 * Skipped entirely on the low quality tier for performance.
 */
import { Bloom, EffectComposer, SMAA, Vignette } from "@react-three/postprocessing";

import type { QualityTier } from "./types";

export function PostFX({ quality }: { quality: QualityTier }) {
  if (quality === "low") return null;

  // multisampling MUST be 0. A multisampled EffectComposer render target intermittently
  // resolves to a fully BLACK frame on Apple Silicon / ANGLE-Metal (~18% of frames →
  // the severe black strobing the user reported). Anti-aliasing instead comes from the
  // shader-based SMAA pass below, which works on the resolved image and uses no
  // multisampled FBO. (Verified on an M3 Pro: MSAA=4 → 17.6% black frames; MSAA=0 + SMAA
  // → 0%.)
  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <SMAA />
      <Bloom
        intensity={0.72}
        luminanceThreshold={0.62}
        luminanceSmoothing={0.85}
        mipmapBlur
        radius={0.5}
      />
      <Vignette offset={0.28} darkness={0.7} eskil={false} />
    </EffectComposer>
  );
}
