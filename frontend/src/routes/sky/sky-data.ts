/**
 * Sky route data model + pure helpers (redesign/routes/02-sky.md).
 *
 * The globe is driven by the foundation's `OrbitObject` tracks (geometry); the live catalog
 * (`useCatalog`) and screening (`useThreats`) merely ENRICH those tracks with real facts / TLE and a
 * "close approach" flag. Everything here is pure + token-only so it can be reasoned about in isolation
 * and reused by the panel, the list, and the toolbar.
 */
import type { CatalogObject, ConjunctionSummary } from "../../features";
import type { OrbitObject, Risk, SkyCatalogEntry } from "../../components/earth";
import type { Mode } from "../../components/ui";
import {
  cloudLabel,
  countryDisplayFromEntry,
  countryFromOwnerCode,
  objectTypeLabel,
  ownerDisplayFromEntry
} from "./owners";

/** One "thing in orbit" the Sky screen reasons about: a base track + optional enrichment. */
export type SkyObject = {
  /** Stable selection key — the foundation `OrbitObject.id` (drives globe ↔ list ↔ URL). */
  id: string;
  /** Best display name: the catalog record's name when matched, else the track name. */
  name: string;
  kind: "satellite" | "debris";
  /** Risk that drives the globe color + legend (from the track). */
  risk: Risk;
  /** Geometry-bearing track the 3D scene renders. */
  base: OrbitObject;
  /** Matched catalog record (facts / TLE / lineage). Absent when the catalog has no match. */
  catalog?: CatalogObject;
  /** Set when this object is party to a screened close approach (drives RiskBadge + CTA). */
  conjunction?: ConjunctionSummary;
};

export type ViewMode = "globe" | "list";

export type SkyFilters = {
  q: string;
  type: "all" | "satellite" | "debris";
  owner: string; // "any" or an exact owner label
  orbit: "any" | "low" | "other";
  country: string; // "any" or an exact country/agency label
  cloud: string; // "any" or a named debris cloud id
};

export const DEFAULT_FILTERS: SkyFilters = {
  q: "",
  type: "all",
  owner: "any",
  orbit: "any",
  country: "any",
  cloud: "any"
};

export type CountedOption = { value: string; label: string; count: number };

/* ---------- risk → token utility classes (tokens only, no raw hex) ---------- */

export const RISK_TEXT_CLASS: Record<Risk, string> = {
  safe: "text-safe",
  watch: "text-watch",
  warning: "text-warning",
  danger: "text-danger"
};

export const RISK_DOT_CLASS: Record<Risk, string> = {
  safe: "bg-safe",
  watch: "bg-watch",
  warning: "bg-warning",
  danger: "bg-danger"
};

/* ---------- matching (track ↔ catalog ↔ conjunction) ---------- */

/** Collapse a name/id to a comparable token, e.g. "CARTOSAT-2F" → "cartosat2f". */
export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Demo track id → catalog `object_id` for the committed Protect-ISRO fixture. The track names and
 * catalog names diverge for the debris/sentinel objects, so an explicit table is the deterministic
 * link; live data falls through to name/id normalization below.
 */
const CATALOG_ALIASES: Record<string, string> = {
  "CARTOSAT-2F": "isro-cartosat-2f",
  "DEBRIS-001": "debris-demo-001",
  "RISAT-2BR1": "isro-risat-2br1",
  SENTINEL: "sentinel-comparison-demo"
};

/** Find the catalog record for a track: alias first (fixture), then normalized name / id (live). */
export function matchCatalog(base: OrbitObject, objects: CatalogObject[]): CatalogObject | undefined {
  const byId = objects.find((object) => object.object_id === base.id);
  if (byId) return byId;

  const aliasId = CATALOG_ALIASES[base.id];
  if (aliasId) {
    const byAlias = objects.find((object) => object.object_id === aliasId);
    if (byAlias) return byAlias;
  }
  const key = normalizeKey(base.name);
  return (
    objects.find((object) => normalizeKey(object.name) === key) ??
    objects.find((object) => normalizeKey(object.object_id) === key)
  );
}

/** Find a live/offline Sky catalog entry for a scenario track by id/name. */
export function matchCatalogEntry(base: OrbitObject, entries: SkyCatalogEntry[]): SkyCatalogEntry | undefined {
  const byId = entries.find((entry) => entry.id === base.id || entry.noradId === base.id);
  if (byId) return byId;

  const aliasId = CATALOG_ALIASES[base.id];
  if (aliasId) {
    const byAlias = entries.find((entry) => entry.id === aliasId || entry.noradId === aliasId);
    if (byAlias) return byAlias;
  }
  const key = normalizeKey(base.name);
  return entries.find((entry) => normalizeKey(entry.name) === key || normalizeKey(entry.id) === key);
}

/** Find a screened close approach this object is party to (by matched catalog id). */
export function matchConjunction(
  catalog: CatalogObject | undefined,
  conjunctions: ConjunctionSummary[]
): ConjunctionSummary | undefined {
  if (!catalog) return undefined;
  return conjunctions.find(
    (conjunction) =>
      conjunction.primary_object_id === catalog.object_id || conjunction.secondary_object_id === catalog.object_id
  );
}

/* ---------- owner / type / orbit framing ---------- */

/** Owners that are not real operators — never shown as an org, never offered as a filter. */
const ANONYMOUS_OWNERS = new Set(["scenario", "unknown", "unlabelled", ""]);

/** Raw owner string, or "Unlabelled" when missing (used for the facts row + filter equality). */
export function ownerLabel(obj: SkyObject): string {
  const owner = obj.catalog?.owner?.trim();
  return owner && owner.length > 0 ? owner : "Unlabelled";
}

export function countryLabel(obj: SkyObject): string {
  const country = obj.catalog?.country?.trim();
  if (country) return country;
  const code = obj.catalog?.country_code?.trim();
  if (code) return countryFromOwnerCode(code).name;
  const owner = ownerLabel(obj);
  if (owner === "ISRO") return "India (ISRO)";
  if (owner === "CNSA") return "China (CNSA)";
  if (owner === "ESA") return "Europe (ESA)";
  if (owner === "NASA") return "United States";
  return "Other / unlabelled";
}

/** True when this object has a real operator we can name. */
export function hasNamedOwner(obj: SkyObject): boolean {
  return !ANONYMOUS_OWNERS.has(ownerLabel(obj).toLowerCase());
}

/** Friendly owner with a country prefix where known (e.g. "India (ISRO)"). */
export function ownerDisplay(obj: SkyObject): string {
  return ownerLabel(obj);
}

export function typeWord(obj: SkyObject): string {
  return obj.kind === "debris" ? "Debris" : "Satellite";
}

/** Type fact: plain word in Simple; raw catalog `object_type` in Pro when available. */
export function typeFact(obj: SkyObject, mode: Mode): string {
  const raw = obj.catalog?.object_type?.trim();
  const display = raw && raw.length > 0 ? objectTypeLabel(raw) : typeWord(obj);
  return mode === "pro" && raw ? `${display} (${raw})` : display;
}

export function isLowOrbit(obj: SkyObject): boolean {
  const cls = obj.catalog?.orbit_class?.toLowerCase() ?? "";
  if (!cls) return true; // demo tracks live in LEO by default
  return cls.includes("leo") || cls.includes("low");
}

/** Orbit value: "Low orbit" in Simple; "LEO" in Pro. */
export function orbitValue(obj: SkyObject, mode: Mode): string {
  const low = isLowOrbit(obj);
  if (mode === "pro") return low ? "LEO" : obj.catalog?.orbit_class?.trim() || "Other orbit";
  return low ? "Low orbit" : "Other orbit";
}

/** "Satellite · India (ISRO) · Low orbit" — the panel's one-line subtitle. */
export function subLine(obj: SkyObject, mode: Mode): string {
  return [typeWord(obj), countryLabel(obj), hasNamedOwner(obj) ? ownerDisplay(obj) : null, orbitValue(obj, mode)]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/** Lead descriptor for list rows, e.g. "Earth-watching satellite". Falls back to the plain type. */
const DESCRIPTOR_LEAD: Record<string, string> = {
  "CARTOSAT-2F": "Earth-watching satellite",
  "RISAT-2BR1": "Radar-imaging satellite",
  "DEBRIS-001": "Tracked debris"
};

/** Richer one-liner for list rows, e.g. "Earth-watching satellite · India (ISRO) · Low orbit". */
export function descriptor(obj: SkyObject, mode: Mode): string {
  const lead = DESCRIPTOR_LEAD[obj.id] ?? typeWord(obj);
  return [lead, countryLabel(obj), hasNamedOwner(obj) ? ownerDisplay(obj) : null, orbitValue(obj, mode)]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/** One plain human sentence describing the object (redesign/routes/02-sky.md §5). */
export function plainDescription(obj: SkyObject, protectedName: string): string {
  if (obj.id === "CARTOSAT-2F") {
    return "An Earth-watching satellite run by India's space agency, in a low orbit a few hundred kilometres up.";
  }
  if (obj.kind === "debris" || obj.risk === "danger") {
    return obj.conjunction
      ? `A tracked piece of debris in a low orbit — the object that comes dangerously close to ${protectedName} in this scenario.`
      : "A tracked piece of debris in a low orbit.";
  }
  if (obj.conjunction) {
    return `A tracked satellite in a low orbit, currently in a close approach with ${protectedName}.`;
  }
  return "A tracked satellite in a low orbit. No close approaches right now.";
}

/* ---------- right-side tag + forward action ---------- */

export function objectTag(obj: SkyObject): { label: string; risk: Risk } {
  if (obj.kind === "debris" || obj.risk === "danger") return { label: "Debris", risk: "danger" };
  if (obj.risk === "safe") return { label: "Protected", risk: "safe" };
  if (obj.risk === "watch") return { label: "Watchlist", risk: "watch" };
  return { label: "Satellite", risk: obj.risk };
}

export type Cta = { label: string; to: string };

/** The panel's single forward action → /threats (or /threats/:id when in a close approach). */
export function ctaFor(obj: SkyObject): Cta {
  if (obj.conjunction) {
    const to = `/threats/${obj.conjunction.conjunction_id}`;
    if (obj.kind === "debris" || obj.risk === "danger") return { label: "See the close approach", to };
    return { label: "Is it in danger?", to };
  }
  return { label: "Is it in danger?", to: "/threats" };
}

/* ---------- filtering ---------- */

export function applyFilters(objects: SkyObject[], filters: SkyFilters): SkyObject[] {
  const q = filters.q.trim().toLowerCase();
  return objects.filter((obj) => {
    if (filters.type !== "all" && obj.kind !== filters.type) return false;
    if (filters.owner !== "any" && ownerLabel(obj) !== filters.owner) return false;
    if (filters.country !== "any" && countryLabel(obj) !== filters.country) return false;
    if (filters.cloud !== "any" && obj.catalog?.cloud !== filters.cloud) return false;
    if (filters.orbit === "low" && !isLowOrbit(obj)) return false;
    if (filters.orbit === "other" && isLowOrbit(obj)) return false;
    if (q) {
      const haystack = [
        obj.name,
        obj.base.name,
        ownerLabel(obj),
        countryLabel(obj),
        obj.catalog?.object_type ?? "",
        obj.catalog?.norad_id ?? "",
        obj.catalog?.cloud ? cloudLabel(obj.catalog.cloud) : ""
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct, named owners present in the data (for the Owner filter dropdown). */
export function ownerOptions(objects: SkyObject[]): string[] {
  const set = new Set<string>();
  for (const obj of objects) {
    if (hasNamedOwner(obj)) set.add(ownerLabel(obj));
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function filtersActive(filters: SkyFilters): boolean {
  return (
    filters.q.trim() !== "" ||
    filters.type !== "all" ||
    filters.owner !== "any" ||
    filters.orbit !== "any" ||
    filters.country !== "any" ||
    filters.cloud !== "any"
  );
}

/* ---------- the "see everything in orbit" cloud (instanced field) ---------- */

/** Owner label for a raw catalog entry (mirrors {@link ownerLabel} for SkyObject). */
export function entryOwnerLabel(entry: SkyCatalogEntry): string {
  const owner = ownerDisplayFromEntry(entry).trim();
  return owner && owner.length > 0 ? owner : "Unlabelled";
}

export function entryCountryLabel(entry: SkyCatalogEntry): string {
  return countryDisplayFromEntry(entry);
}

function entryIsLow(entry: SkyCatalogEntry): boolean {
  const cls = typeof entry.orbitClass === "string" ? entry.orbitClass.toUpperCase() : "LEO";
  return cls === "LEO";
}

/**
 * Apply the SAME client-side filters used for the hero tracks/list to the full
 * SGP4 cloud, so the globe and the controls always agree (plan §Interaction).
 */
export function filterCatalog(entries: SkyCatalogEntry[], filters: SkyFilters): SkyCatalogEntry[] {
  const q = filters.q.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filters.type !== "all" && entry.kind !== filters.type) return false;
    if (filters.owner !== "any" && entryOwnerLabel(entry) !== filters.owner) return false;
    if (filters.country !== "any" && entryCountryLabel(entry) !== filters.country) return false;
    if (filters.cloud !== "any" && entry.cloud !== filters.cloud) return false;
    if (filters.orbit === "low" && !entryIsLow(entry)) return false;
    if (filters.orbit === "other" && entryIsLow(entry)) return false;
    if (q) {
      const haystack = [
        entry.name,
        entry.id,
        entry.noradId ?? "",
        entry.owner ?? "",
        entry.country ?? "",
        entry.countryCode ?? "",
        entry.objectType ?? "",
        entry.cloud ? cloudLabel(entry.cloud) : "",
        typeof entry.orbitClass === "string" ? entry.orbitClass : ""
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Distinct, named owners present in the cloud (for the Owner filter dropdown). */
export function catalogOwnerOptions(entries: SkyCatalogEntry[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    const owner = entry.owner?.trim();
    if (owner) set.add(owner);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function catalogCountryOptions(entries: SkyCatalogEntry[]): CountedOption[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const country = entryCountryLabel(entry);
    if (!country || country === "Other / unlabelled") continue;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, label: value, count })).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

export function catalogCloudOptions(entries: SkyCatalogEntry[]): CountedOption[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.cloud) continue;
    counts.set(entry.cloud, (counts.get(entry.cloud) ?? 0) + 1);
  }
  return Array.from(counts, ([value, count]) => ({ value, label: cloudLabel(value), count })).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

/**
 * Adapt a cloud entry into a {@link SkyObject} so clicking a dot opens the SAME
 * panel as a hero track. The `base` orbit is nominal (the field renders from the
 * TLE, not this), and the panel reads facts from the synthesized `catalog`.
 */
export function catalogEntryToSkyObject(entry: SkyCatalogEntry): SkyObject {
  const risk: Risk = entry.kind === "debris" ? "danger" : "watch";
  const orbitClass = typeof entry.orbitClass === "string" ? entry.orbitClass : "LEO";
  const base: OrbitObject = {
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    risk,
    orbit: { radius: 2.1, inclination: 0.9, raan: 0, phase: 0, speed: 0.2 }
  };
  const catalog: CatalogObject = {
    object_id: entry.id,
    name: entry.name,
    norad_id: entry.noradId ?? entry.id,
    owner: entry.owner ?? null,
    country: entry.country ?? null,
    country_code: entry.countryCode ?? null,
    object_type: entry.objectType ?? (entry.kind === "debris" ? "DEBRIS" : "PAYLOAD"),
    orbit_class: orbitClass,
    intl_designator: entry.intlDesignator ?? null,
    launch_date: entry.launchDate ?? null,
    rcs: entry.rcs ?? null,
    rcs_m2: entry.rcsM2 ?? null,
    period_minutes: entry.periodMinutes ?? null,
    inclination_deg: entry.inclinationDeg ?? null,
    apogee_km: entry.apogeeKm ?? null,
    perigee_km: entry.perigeeKm ?? null,
    cloud: entry.cloud ?? null,
    source_catalog: entry.source === "live" ? "CelesTrak GP + SATCAT (live)" : "CelesTrak GP + SATCAT (baked)",
    source_url: entry.sourceUrl ?? null,
    fetched_at_utc: entry.fetchedAtUtc ?? null,
    tle_epoch_utc: entry.tleEpochUtc ?? null,
    tags: [entry.countryCode, entry.cloud].filter((tag): tag is string => Boolean(tag)),
    tle: { line1: entry.line1, line2: entry.line2 }
  };
  return { id: entry.id, name: entry.name, kind: entry.kind, risk, base, catalog };
}
