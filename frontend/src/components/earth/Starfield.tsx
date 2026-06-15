/**
 * Cinematic space background (doc 07 §6): a real deep `<Stars>` field plus a
 * subtle nebula. Replaces the legacy flat fill + washing fog + faint points.
 */
import { Stars } from "@react-three/drei";

import { Nebula } from "./Nebula";
import type { QualityTier } from "./types";

type StarfieldProps = {
  quality: QualityTier;
  reducedMotion: boolean;
};

export function Starfield({ quality, reducedMotion }: StarfieldProps) {
  return (
    <>
      {quality !== "low" && <Nebula />}
      <Stars
        radius={120}
        depth={60}
        count={quality === "low" ? 3200 : 8000}
        factor={quality === "low" ? 4 : 4.8}
        saturation={0}
        fade={quality === "low"}
        speed={reducedMotion ? 0 : 0.4}
      />
    </>
  );
}
