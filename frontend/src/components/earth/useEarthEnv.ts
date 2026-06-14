/**
 * Capability + preference hooks for the Earth scene (doc 07 §10).
 * No three.js imports — cheap to evaluate before mounting the canvas.
 */
import { useEffect, useState } from "react";

import type { Quality, QualityTier } from "./types";

/** True if WebGL is available at all (else we render the static fallback). */
export function hasWebGL(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Honor `prefers-reduced-motion: reduce` (doc 02 §6.3, doc 07 §10.1). */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

type NavigatorWithCapabilities = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

/** Detect a low-power device (few cores / little memory / data-saver). */
function detectLowPower(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as NavigatorWithCapabilities;
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory <= 3) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 3) {
    return true;
  }
  return false;
}

/**
 * Resolve the requested {@link Quality} to a concrete {@link QualityTier}.
 * "auto" inspects device capabilities; explicit "high"/"low" pass through.
 */
export function useQualityTier(requested: Quality = "auto"): QualityTier {
  const [tier, setTier] = useState<QualityTier>(requested === "low" ? "low" : "high");

  useEffect(() => {
    if (requested === "high" || requested === "low") {
      setTier(requested);
      return;
    }
    setTier(detectLowPower() ? "low" : "high");
  }, [requested]);

  return tier;
}
