/**
 * 3D material color literals for the OrbitGuard Earth scene.
 *
 * three.js needs raw color values (it cannot read CSS variables), so these
 * named constants are the single source of truth for the scene and mirror the
 * "Neon Noir" tokens in redesign/02-design-language.md §2.3–2.4. UI/DOM code
 * must keep using the Tailwind/CSS tokens — never re-hardcode these elsewhere.
 */
import type { OrbitBand, Risk } from "./types";

/** Risk → color (doc 02 §2.4). "Risk color is sacred": same level, same color everywhere. */
export const RISK_COLOR: Record<Risk, string> = {
  safe: "#34F5C5", // protected / nominal (mint-green)
  watch: "#6EE7FF", // watch (cool cyan)
  warning: "#FFC24B", // warning (amber)
  danger: "#FF5470" // the threat (red-pink)
};

/**
 * Orbit band → color for the instanced "see everything" cloud
 * (plan/03-sky-all-satellites.md). Distinct, legible hues so LEO/MEO/GEO/HEO
 * shells read apart at a glance; debris overrides to the danger color.
 */
export const BAND_COLOR: Record<OrbitBand, string> = {
  LEO: "#6EE7FF", // cool cyan — the dense low shell
  MEO: "#A571FF", // violet — GNSS mid band
  GEO: "#FFC24B", // amber — the geostationary ring
  HEO: "#FF5CD0" // magenta — highly elliptical
};

/** Debris/junk in the cloud always reads as risk-red, regardless of band. */
export const DEBRIS_COLOR = RISK_COLOR.danger;

/** Neon brand accents (doc 02 §2.3). */
export const NEON = {
  cyan: "#38E8FF",
  cyanDim: "#1FA9C4",
  violet: "#A571FF",
  magenta: "#FF5CD0"
} as const;

/** Deep-space surfaces (doc 02 §2.1). */
export const SPACE = {
  void: "#05070E", // --bg-void (canvas background)
  deepBlue: "#0A2A52" // atmosphere inner grade toward the limb
} as const;

/** Material accents used by the procedural satellite/debris bodies. */
export const MATERIAL = {
  bodyTint: "#DFFFFF",
  panel: "#4ECBFF",
  panelEmissive: "#123C5A",
  debrisCore: "#FF8C91"
} as const;
