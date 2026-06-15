import type { CatalogObject } from "../../types";

const MU = 398600.4418;
const EARTH_RADIUS_KM = 6371;

function numberFromLine(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function tleEpochUtc(line1?: string | null): string | null {
  if (!line1 || line1.length < 32) return null;
  const year = Number(line1.slice(18, 20));
  const day = Number(line1.slice(20, 32));
  if (!Number.isFinite(year) || !Number.isFinite(day)) return null;
  const fullYear = year >= 57 ? 1900 + year : 2000 + year;
  return new Date(Date.UTC(fullYear, 0, 1) + (day - 1) * 86400_000).toISOString();
}

export function deriveOrbitFacts(catalog?: CatalogObject | null): {
  periodMinutes: number | null;
  inclinationDeg: number | null;
  altitudeKm: number | null;
  velocityKmS: number | null;
  eccentricity: number | null;
  tleEpochUtc: string | null;
} {
  const tle = catalog?.tle;
  const line2 = tle?.line2;
  const meanMotion = line2 ? numberFromLine(line2.slice(52, 63)) : null;
  const inclinationDeg = catalog?.inclination_deg ?? (line2 ? numberFromLine(line2.slice(8, 16)) : null);
  const eccentricity = line2 ? numberFromLine(`0.${line2.slice(26, 33).trim()}`) : null;
  const periodMinutes = catalog?.period_minutes ?? (meanMotion && meanMotion > 0 ? 1440 / meanMotion : null);

  let altitudeKm: number | null = null;
  if (catalog?.apogee_km != null && catalog?.perigee_km != null) {
    altitudeKm = (catalog.apogee_km + catalog.perigee_km) / 2;
  } else if (meanMotion && meanMotion > 0) {
    const nRadPerSec = (meanMotion * 2 * Math.PI) / 86400;
    const semiMajorAxisKm = Math.cbrt(MU / (nRadPerSec * nRadPerSec));
    altitudeKm = semiMajorAxisKm - EARTH_RADIUS_KM;
  }

  const semiMajorAxisKm = altitudeKm != null ? altitudeKm + EARTH_RADIUS_KM : null;
  const velocityKmS = semiMajorAxisKm && semiMajorAxisKm > 0 ? Math.sqrt(MU / semiMajorAxisKm) : null;

  return {
    periodMinutes,
    inclinationDeg,
    altitudeKm,
    velocityKmS,
    eccentricity,
    tleEpochUtc: catalog?.tle_epoch_utc ?? tleEpochUtc(tle?.line1)
  };
}

export function fmtNumber(value: number | null | undefined, digits = 1, suffix = ""): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })}${suffix}`;
}
