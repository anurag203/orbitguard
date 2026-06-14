/**
 * Postprocessing (doc 07 §7) — the single biggest "wow" lever. Bloom turns the
 * emissive satellites, halos, trails, and the atmosphere limb into glow under
 * ACESFilmic tone mapping (set on the <Canvas> gl). The threshold is tuned so
 * the Earth daymap doesn't bloom but the neon emissives (`toneMapped={false}`) do.
 *
 * Skipped entirely on the low quality tier for performance.
 */
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";

import type { QualityTier } from "./types";

export function PostFX({ quality }: { quality: QualityTier }) {
  if (quality === "low") return null;

  return (
    <EffectComposer enableNormalPass={false} multisampling={quality === "high" ? 4 : 0}>
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
