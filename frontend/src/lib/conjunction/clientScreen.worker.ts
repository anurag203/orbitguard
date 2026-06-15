import { propagate, twoline2satrec, type SatRec } from "satellite.js";

type ScreenEntry = {
  id: string;
  name: string;
  line1: string;
  line2: string;
};

type ScreenMessage = {
  requestId: number;
  primary: ScreenEntry;
  candidates: ScreenEntry[];
  windowHours: number;
  stepMinutes: number;
  covarianceM: number;
};

type Vec = { x: number; y: number; z: number };

const MU = 398600.4418;
const EARTH_RADIUS_KM = 6371;
const MAX_CANDIDATES = 1200;

function meanMotion(line2: string): number {
  return Number(line2.slice(52, 63));
}

function altitudeKm(line2: string): number | null {
  const mm = meanMotion(line2);
  if (!Number.isFinite(mm) || mm <= 0) return null;
  const nRadPerSec = (mm * 2 * Math.PI) / 86400;
  return Math.cbrt(MU / (nRadPerSec * nRadPerSec)) - EARTH_RADIUS_KM;
}

function satrec(entry: ScreenEntry): SatRec | null {
  try {
    const parsed = twoline2satrec(entry.line1, entry.line2);
    return parsed && !parsed.error ? parsed : null;
  } catch {
    return null;
  }
}

function position(rec: SatRec, at: Date): Vec | null {
  try {
    const pv = propagate(rec, at);
    const p = pv?.position;
    if (!p || typeof p === "boolean") return null;
    const { x, y, z } = p as Vec;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    return { x, y, z };
  } catch {
    return null;
  }
}

function distanceKm(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function relativeVelocityKmS(a: SatRec, b: SatRec, epochMs: number): number {
  const before = epochMs - 30_000;
  const after = epochMs + 30_000;
  const a0 = position(a, new Date(before));
  const a1 = position(a, new Date(after));
  const b0 = position(b, new Date(before));
  const b1 = position(b, new Date(after));
  if (!a0 || !a1 || !b0 || !b1) return 0;
  const rv0 = { x: a1.x - a0.x, y: a1.y - a0.y, z: a1.z - a0.z };
  const rv1 = { x: b1.x - b0.x, y: b1.y - b0.y, z: b1.z - b0.z };
  return Math.hypot(rv0.x - rv1.x, rv0.y - rv1.y, rv0.z - rv1.z) / 60;
}

function pcEstimate(missDistanceM: number, covarianceM: number): number {
  const sigma = Math.max(50, covarianceM);
  const exponent = -(missDistanceM * missDistanceM) / (2 * sigma * sigma);
  return Math.min(1, Math.exp(exponent) * 1e-3);
}

self.onmessage = (event: MessageEvent<ScreenMessage>) => {
  const { requestId, primary, candidates, windowHours, stepMinutes, covarianceM } = event.data;
  const primaryRec = satrec(primary);
  if (!primaryRec) {
    self.postMessage({ requestId, approaches: [] });
    return;
  }

  const primaryAlt = altitudeKm(primary.line2);
  const filtered = candidates
    .filter((candidate) => candidate.id !== primary.id && candidate.line1 && candidate.line2)
    .filter((candidate) => {
      const alt = altitudeKm(candidate.line2);
      if (primaryAlt == null || alt == null) return true;
      return Math.abs(alt - primaryAlt) < 1800;
    })
    .slice(0, MAX_CANDIDATES);

  const startMs = Date.now();
  const endMs = startMs + windowHours * 3600_000;
  const stepMs = stepMinutes * 60_000;
  const approaches = [];

  for (const candidate of filtered) {
    const candidateRec = satrec(candidate);
    if (!candidateRec) continue;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestMs = startMs;
    for (let at = startMs; at <= endMs; at += stepMs) {
      const pa = position(primaryRec, new Date(at));
      const pb = position(candidateRec, new Date(at));
      if (!pa || !pb) continue;
      const d = distanceKm(pa, pb);
      if (d < bestDistance) {
        bestDistance = d;
        bestMs = at;
      }
    }
    if (!Number.isFinite(bestDistance)) continue;
    const missDistanceM = bestDistance * 1000;
    approaches.push({
      objectId: candidate.id,
      name: candidate.name,
      tcaUtc: new Date(bestMs).toISOString(),
      missDistanceM,
      relativeVelocityKmS: relativeVelocityKmS(primaryRec, candidateRec, bestMs),
      pc: pcEstimate(missDistanceM, covarianceM)
    });
  }

  approaches.sort((a, b) => a.missDistanceM - b.missDistanceM);
  self.postMessage({ requestId, approaches: approaches.slice(0, 5) });
};
