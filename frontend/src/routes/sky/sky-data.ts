/**
 * Sky route data model + pure helpers (redesign/routes/02-sky.md).
 *
 * The globe is driven by the foundation's `OrbitObject` tracks (geometry); the live catalog
 * (`useCatalog`) and screening (`useThreats`) merely ENRICH those tracks with real facts / TLE and a
 * "close approach" flag. Everything here is pure + token-only so it can be reasoned about in isolation
 * and reused by the panel, the list, and the toolbar.
 */
import type { CatalogObject, ConjunctionSummary } from "../../features";
import type { OrbitObject, Risk } from "../../components/earth";
import type { Mode } from "../../components/ui";

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
};

export const DEFAULT_FILTERS: SkyFilters = { q: "", type: "all", owner: "any", orbit: "any" };

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

const OWNER_COUNTRY: Record<string, string> = {
  ISRO: "India (ISRO)",
  NASA: "United States (NASA)",
  ESA: "Europe (ESA)",
  CNSA: "China (CNSA)"
};

/** Owners that are not real operators — never shown as an org, never offered as a filter. */
const ANONYMOUS_OWNERS = new Set(["scenario", "unknown", "unlabelled", ""]);

/** Raw owner string, or "Unlabelled" when missing (used for the facts row + filter equality). */
export function ownerLabel(obj: SkyObject): string {
  const owner = obj.catalog?.owner?.trim();
  return owner && owner.length > 0 ? owner : "Unlabelled";
}

/** True when this object has a real operator we can name. */
export function hasNamedOwner(obj: SkyObject): boolean {
  return !ANONYMOUS_OWNERS.has(ownerLabel(obj).toLowerCase());
}

/** Friendly owner with a country prefix where known (e.g. "India (ISRO)"). */
export function ownerDisplay(obj: SkyObject): string {
  const owner = ownerLabel(obj);
  return OWNER_COUNTRY[owner] ?? owner;
}

export function typeWord(obj: SkyObject): string {
  return obj.kind === "debris" ? "Debris" : "Satellite";
}

/** Type fact: plain word in Simple; raw catalog `object_type` in Pro when available. */
export function typeFact(obj: SkyObject, mode: Mode): string {
  if (mode === "pro") {
    const raw = obj.catalog?.object_type?.trim();
    return raw && raw.length > 0 ? raw : typeWord(obj);
  }
  return typeWord(obj);
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
  return [typeWord(obj), hasNamedOwner(obj) ? ownerDisplay(obj) : null, orbitValue(obj, mode)]
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
  return [lead, hasNamedOwner(obj) ? ownerDisplay(obj) : null, orbitValue(obj, mode)]
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
    if (filters.orbit === "low" && !isLowOrbit(obj)) return false;
    if (filters.orbit === "other" && isLowOrbit(obj)) return false;
    if (q) {
      const haystack = [obj.name, obj.base.name, ownerLabel(obj), obj.catalog?.object_type ?? "", obj.catalog?.norad_id ?? ""]
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
  return filters.q.trim() !== "" || filters.type !== "all" || filters.owner !== "any" || filters.orbit !== "any";
}

/* ---------- source provenance ---------- */

export function isLiveSource(mode: string | undefined): boolean {
  return Boolean(mode && mode.toLowerCase().includes("live"));
}

export function sourceChipLabel(mode: string | undefined, shown: number): string {
  const word = isLiveSource(mode) ? "Live data" : "Offline demo data";
  return `${word} · ${shown} shown`;
}
