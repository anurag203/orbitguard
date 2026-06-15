import type { OrbitBand, SkyCatalogEntry } from "../../components/earth";
import {
  DEBRIS_CLOUD_LABELS,
  LIVE_CATALOG_GROUPS,
  countryFromOwnerCode,
  kindFromObjectType,
  normalizeObjectType,
  operatorFromName,
  rcsBucket
} from "./owners";

export type SkyCatalogMeta = {
  source: "offline" | "live";
  sourceUrl: string;
  fetchedAtUtc: string;
  groups: string[];
  count: number;
  notes?: string;
};

export type SkyCatalogResult = {
  meta: SkyCatalogMeta;
  objects: SkyCatalogEntry[];
};

export type LiveCatalogOptions = {
  groups?: readonly string[];
  signal?: AbortSignal;
  /** Provides the baked offline catalog to backfill cache-guarded groups (keeps the field complete). */
  backfill?: (signal?: AbortSignal) => Promise<SkyCatalogResult>;
};

type TleTriplet = {
  name: string;
  line1: string;
  line2: string;
  group: string;
};

type SatcatRecord = {
  OBJECT_NAME?: string;
  OBJECT_ID?: string;
  NORAD_CAT_ID?: number | string;
  OBJECT_TYPE?: string;
  OWNER?: string;
  LAUNCH_DATE?: string;
  RCS?: number | string | null;
  PERIOD?: number | string | null;
  INCLINATION?: number | string | null;
  APOGEE?: number | string | null;
  PERIGEE?: number | string | null;
};

const LIVE_SOURCE_URL = "https://celestrak.org";
const MAX_LIVE_OBJECTS = 12_000;
export const MIN_HEALTHY_LIVE = 6_000;
const MU = 398600.4418;
const EARTH_RADIUS_KM = 6371;

class CacheGuardError extends Error {
  constructor(public readonly group: string) {
    super(`CelesTrak cache guard / non-TLE response for "${group}"`);
    this.name = "CacheGuardError";
  }
}

const GUARD_HINTS = [/use the cached data/i, /please wait/i, /max(imum)? number of requests/i, /invalid query/i];

function celestrakPath(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `/celestrak${path}?${search.toString()}`;
}

function looksLikeTle(text: string): boolean {
  return /\n?1 \d{5}/.test(text) && /\n2 \d{5}/.test(text);
}

async function fetchTleGuarded(url: string, group: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal, headers: { Accept: "text/plain" } });
  const text = res.ok ? await res.text() : "";
  if (!res.ok || GUARD_HINTS.some((re) => re.test(text)) || !looksLikeTle(text)) {
    throw new CacheGuardError(group);
  }
  return text;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`CelesTrak ${res.status} for ${url}`);
  return (await res.json()) as T;
}

export function parseTleText(text: string, group = "active"): TleTriplet[] {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+$/, ""));
  const out: TleTriplet[] = [];
  for (let i = 0; i + 2 < lines.length; i += 1) {
    const name = lines[i]?.trim();
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];
    if (!name || !line1 || !line2) continue;
    if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
      out.push({ name, line1, line2, group });
      i += 2;
    }
  }
  return out;
}

function noradFromLine1(line1: string): string {
  return line1.slice(2, 7).trim();
}

function meanMotionFromLine2(line2: string): number {
  return Number(line2.slice(52, 63));
}

function eccentricityFromLine2(line2: string): number {
  return Number(`0.${line2.slice(26, 33).trim()}`);
}

export function orbitClassFromTle(line2: string): OrbitBand {
  const meanMotion = meanMotionFromLine2(line2);
  const eccentricity = eccentricityFromLine2(line2);
  if (!Number.isFinite(meanMotion) || meanMotion <= 0) return "LEO";
  const nRadPerSec = (meanMotion * 2 * Math.PI) / 86400;
  const semiMajorAxisKm = Math.cbrt(MU / (nRadPerSec * nRadPerSec));
  const altitudeKm = semiMajorAxisKm - EARTH_RADIUS_KM;
  if (eccentricity > 0.25) return "HEO";
  if (altitudeKm < 2000) return "LEO";
  if (altitudeKm < 31000) return "MEO";
  if (altitudeKm < 40000) return "GEO";
  return "HEO";
}

export function tleEpochUtc(line1: string): string | undefined {
  const year = Number(line1.slice(18, 20));
  const day = Number(line1.slice(20, 32));
  if (!Number.isFinite(year) || !Number.isFinite(day)) return undefined;
  const fullYear = year >= 57 ? 1900 + year : 2000 + year;
  const start = Date.UTC(fullYear, 0, 1, 0, 0, 0, 0);
  return new Date(start + (day - 1) * 86400_000).toISOString();
}

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fallbackObjectType(name: string): SkyCatalogEntry["objectType"] {
  const upper = name.toUpperCase();
  if (/\bDEB\b|DEBRIS|FRAGMENT|COOLANT|WESTFORD NEEDLES/.test(upper)) return "DEBRIS";
  if (/R\/B|ROCKET BODY|\bAKM\b|\bPKM\b/.test(upper)) return "ROCKET BODY";
  return "PAYLOAD";
}

function cloudForGroup(group: string): string | undefined {
  return DEBRIS_CLOUD_LABELS[group] ? group : undefined;
}

async function fetchGroup(group: string, signal?: AbortSignal): Promise<{
  tles: TleTriplet[];
  satcat: Map<string, SatcatRecord>;
}> {
  const tleUrl = celestrakPath("/NORAD/elements/gp.php", { GROUP: group, FORMAT: "tle" });
  const satcatUrl = celestrakPath("/satcat/records.php", { GROUP: group, FORMAT: "json" });
  const [tleText, satcatRecords] = await Promise.all([
    fetchTleGuarded(tleUrl, group, signal),
    fetchJson<SatcatRecord[]>(satcatUrl, signal).catch(() => [] as SatcatRecord[])
  ]);
  const satcat = new Map<string, SatcatRecord>();
  for (const record of satcatRecords) {
    const norad = String(record.NORAD_CAT_ID ?? "").trim();
    if (norad) satcat.set(norad, record);
  }
  return { tles: parseTleText(tleText, group), satcat };
}

export async function fetchLiveCatalog(options: LiveCatalogOptions = {}): Promise<SkyCatalogResult> {
  const groups = [...(options.groups ?? LIVE_CATALOG_GROUPS)];
  const fetchedAtUtc = new Date().toISOString();
  const settled = await Promise.all(
    groups.map((group) =>
      fetchGroup(group, options.signal)
        .then((chunk) => ({ group, chunk }))
        .catch((error: unknown) => ({ group, error }))
    )
  );
  const chunks = settled.filter((item): item is { group: string; chunk: Awaited<ReturnType<typeof fetchGroup>> } => "chunk" in item);
  const skipped = settled.filter((item) => "error" in item).map((item) => item.group);
  const seen = new Set<string>();
  const objects: SkyCatalogEntry[] = [];

  for (const chunk of chunks) {
    for (const tle of chunk.chunk.tles) {
      const noradId = noradFromLine1(tle.line1);
      if (!noradId || seen.has(noradId)) continue;
      seen.add(noradId);

      const meta = chunk.chunk.satcat.get(noradId);
      const country = countryFromOwnerCode(meta?.OWNER);
      const objectType = normalizeObjectType(meta?.OBJECT_TYPE) ?? fallbackObjectType(tle.name);
      const resolvedType = objectType === "UNKNOWN" ? fallbackObjectType(tle.name) : objectType;
      const rcsM2 = numberOrNull(meta?.RCS);
      const owner = operatorFromName(tle.name) ?? country.name;
      const entry: SkyCatalogEntry = {
        id: noradId,
        noradId,
        name: meta?.OBJECT_NAME?.trim() || tle.name,
        line1: tle.line1,
        line2: tle.line2,
        kind: kindFromObjectType(resolvedType),
        owner,
        country: country.name,
        countryCode: country.code,
        objectType: resolvedType,
        intlDesignator: meta?.OBJECT_ID?.trim() || undefined,
        launchDate: meta?.LAUNCH_DATE?.trim() || undefined,
        rcs: rcsBucket(rcsM2),
        rcsM2,
        periodMinutes: numberOrNull(meta?.PERIOD),
        inclinationDeg: numberOrNull(meta?.INCLINATION),
        apogeeKm: numberOrNull(meta?.APOGEE),
        perigeeKm: numberOrNull(meta?.PERIGEE),
        cloud: cloudForGroup(tle.group),
        orbitClass: orbitClassFromTle(tle.line2),
        source: "live",
        sourceUrl: `${LIVE_SOURCE_URL}/NORAD/elements/gp.php?GROUP=${encodeURIComponent(tle.group)}&FORMAT=tle`,
        fetchedAtUtc,
        tleEpochUtc: tleEpochUtc(tle.line1)
      };
      objects.push(entry);
      if (objects.length >= MAX_LIVE_OBJECTS) break;
    }
    if (objects.length >= MAX_LIVE_OBJECTS) break;
  }

  let backfilled = 0;
  if (options.backfill && (skipped.length > 0 || objects.length < MIN_HEALTHY_LIVE)) {
    try {
      const offline = await options.backfill(options.signal);
      for (const entry of offline.objects) {
        const norad = entry.noradId ?? entry.id;
        if (!norad || seen.has(norad)) continue;
        seen.add(norad);
        objects.push({ ...entry, noradId: entry.noradId ?? entry.id, source: entry.source ?? "offline" });
        backfilled += 1;
        if (objects.length >= MAX_LIVE_OBJECTS) break;
      }
    } catch {
      /* offline backfill is best-effort; ignore */
    }
  }

  if (objects.length === 0) throw new Error("No live CelesTrak groups returned data.");

  return {
    meta: {
      source: "live",
      sourceUrl: LIVE_SOURCE_URL,
      fetchedAtUtc,
      groups,
      count: objects.length,
      notes: "Current public TLEs from CelesTrak; situational awareness only, no operational covariance."
        + (skipped.length ? ` CelesTrak rate-limited: ${skipped.join(", ")}.` : "")
        + (backfilled ? ` Backfilled ${backfilled.toLocaleString()} objects from the baked snapshot to stay complete.` : "")
    },
    objects
  };
}
