/**
 * propagate.ts — the SGP4 bridge for the "see everything in orbit" field
 * (plan/03-sky-all-satellites.md §Propagation).
 *
 * Wraps `satellite.js` (SGP4): TLE → ECI position at a `Date` → OrbitGuard scene
 * units, kept consistent with the existing Earth radius (1.5) and `orbit.ts` scale.
 * `satrec` objects are cached by id so re-filtering the catalog never re-parses.
 *
 * IMPORTANT (bundle budget): this module statically imports `satellite.js`, so it
 * must only ever be imported from `components/earth/**` (the lazy 3D chunk) — never
 * from route/eager code. Routes pass the plain {@link SkyCatalogEntry} data instead.
 *
 * Frame convention: SGP4 returns TEME ECI (km) with +Z = north pole. The scene's
 * "up" is +Y (the Earth spins about Y), so we map ECI (x, y, z) → scene (x, z, -y),
 * a proper −90° rotation about X. Radius is compressed (log) into a pleasant band so
 * GEO stays in frame while LEO still hugs the globe — orbits here are VISUAL, not GIS
 * (redesign/07 §1 non-goals).
 */
import * as THREE from "three";
import { propagate, twoline2satrec, type SatRec } from "satellite.js";

import type { OrbitBand, SkyCatalogEntry } from "./types";

/** Scene Earth radius (matches Earth.tsx + orbit.ts). */
export const EARTH_SCENE_RADIUS = 1.5;
const EARTH_RADIUS_KM = 6371;
const MU = 398600.4418; // km^3 / s^2

/**
 * Compress a geocentric radius (km) into scene units. Anchored so the surface maps
 * to the scene Earth radius and the LEO band lands ~1.9–2.5 (matching the legacy
 * DEMO_OBJECTS), while MEO/GEO stay distinct yet inside the camera's reach.
 *   alt 0 → 1.50 · 550 km → ~1.93 · 2000 km → ~2.55 · MEO ~4.3 · GEO ~4.8
 */
export function sceneRadiusFromGeocentricKm(rKm: number): number {
  const altKm = Math.max(0, rKm - EARTH_RADIUS_KM);
  return EARTH_SCENE_RADIUS + 0.9 * Math.log1p(altKm / 900);
}

/** Coarse orbit band from a parsed satrec (fallback when the catalog omits it). */
export function classifyBand(satrec: SatRec): OrbitBand {
  const nRadPerSec = satrec.no / 60; // satrec.no is rad/min
  if (!Number.isFinite(nRadPerSec) || nRadPerSec <= 0) return "LEO";
  const a = Math.cbrt(MU / (nRadPerSec * nRadPerSec)); // semi-major axis (km)
  const altKm = a - EARTH_RADIUS_KM;
  if (satrec.ecco > 0.25) return "HEO";
  if (altKm < 2000) return "LEO";
  if (altKm < 31000) return "MEO";
  if (altKm < 40000) return "GEO";
  return "HEO";
}

function normalizeBand(value: string | undefined, satrec: SatRec): OrbitBand {
  if (value === "LEO" || value === "MEO" || value === "GEO" || value === "HEO") return value;
  return classifyBand(satrec);
}

/** A catalog entry whose TLE has been parsed + validated and is ready to render/propagate. */
export type PreparedSat = {
  id: string;
  name: string;
  kind: "satellite" | "debris";
  band: OrbitBand;
  owner?: string;
  satrec: SatRec;
};

// satrec cache keyed by entry id (parsing a TLE is comparatively expensive; filtering must be cheap).
const satrecCache = new Map<string, SatRec | null>();

/** Parse (and cache) the satrec for a catalog entry; null if the TLE is unparseable. */
export function getSatrec(entry: SkyCatalogEntry): SatRec | null {
  const cached = satrecCache.get(entry.id);
  if (cached !== undefined) return cached;
  let satrec: SatRec | null = null;
  try {
    const parsed = twoline2satrec(entry.line1, entry.line2);
    satrec = parsed && !parsed.error ? parsed : null;
  } catch {
    satrec = null;
  }
  satrecCache.set(entry.id, satrec);
  return satrec;
}

/** Build the renderable set from raw catalog entries (drops anything that won't parse). */
export function prepareSats(entries: SkyCatalogEntry[]): PreparedSat[] {
  const out: PreparedSat[] = [];
  for (const entry of entries) {
    const satrec = getSatrec(entry);
    if (!satrec) continue;
    out.push({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      band: normalizeBand(typeof entry.orbitClass === "string" ? entry.orbitClass : undefined, satrec),
      owner: entry.owner,
      satrec
    });
  }
  return out;
}

const _eci = new THREE.Vector3();

/**
 * Propagate one satrec to `date` and write its scene-space position into `out`.
 * Returns false (and leaves `out` untouched) if SGP4 errors / the object decayed.
 */
export function propagateToScene(satrec: SatRec, date: Date, out: THREE.Vector3): boolean {
  let pv: ReturnType<typeof propagate> | null = null;
  try {
    pv = propagate(satrec, date);
  } catch {
    return false;
  }
  const p = pv?.position;
  if (!p || typeof p === "boolean") return false;
  const { x, y, z } = p as { x: number; y: number; z: number };
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return false;
  const rKm = Math.sqrt(x * x + y * y + z * z);
  if (!Number.isFinite(rKm) || rKm < EARTH_RADIUS_KM * 0.6 || rKm > 200000) return false;
  const scale = sceneRadiusFromGeocentricKm(rKm) / rKm;
  // ECI (x, y, z) → scene (x, z, -y): put ECI north (+Z) onto scene up (+Y).
  out.set(x * scale, z * scale, -y * scale);
  return true;
}

/**
 * Fill a packed Float32 position buffer (xyz per object) for `prepared` at `date`.
 * Objects that fail to propagate are parked far off-screen so a stale instance never
 * lingers at the origin. Returns the count that propagated cleanly.
 */
export function fillPositions(prepared: PreparedSat[], date: Date, positions: Float32Array): number {
  let ok = 0;
  for (let i = 0; i < prepared.length; i += 1) {
    if (propagateToScene(prepared[i].satrec, date, _eci)) {
      positions[i * 3] = _eci.x;
      positions[i * 3 + 1] = _eci.y;
      positions[i * 3 + 2] = _eci.z;
      ok += 1;
    } else {
      positions[i * 3] = 9999;
      positions[i * 3 + 1] = 9999;
      positions[i * 3 + 2] = 9999;
    }
  }
  return ok;
}

/**
 * Sample one orbital revolution into scene-space points for the SELECTED object's
 * trail (we never draw trails for the whole cloud — plan §Rendering). Period is
 * derived from the mean motion; ~`segments` points span exactly one revolution.
 */
export function sampleOrbitPath(satrec: SatRec, epoch: Date, segments = 128): THREE.Vector3[] {
  const nRadPerMin = satrec.no;
  const periodMs = nRadPerMin > 0 ? ((2 * Math.PI) / nRadPerMin) * 60_000 : 90 * 60_000;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const at = new Date(epoch.getTime() + (periodMs * i) / segments);
    const v = new THREE.Vector3();
    if (propagateToScene(satrec, at, v)) points.push(v);
  }
  return points;
}
