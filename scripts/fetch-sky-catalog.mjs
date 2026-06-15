/**
 * fetch-sky-catalog.mjs — dev-time generator for the baked Sky catalog.
 *
 * Produces `frontend/public/data/catalog-sky.json`: a few thousand orbiting objects
 * with real (or deterministic-synthetic) TLEs, normalized to
 *   { id, name, line1, line2, kind, owner?, orbitClass? }
 *
 * Strategy (offline-safe, deterministic, static-friendly):
 *   1. Try multiple CelesTrak GP groups plus SATCAT metadata (real tracked objects = best story).
 *   2. If CelesTrak rate-limits a large group, keep all successful real groups and top up only the
 *      remaining visual density with a deterministic synthetic set.
 *   3. Validate EVERY entry with satellite.js (parse + propagate → finite ECI),
 *      dropping any that fail, so the committed JSON only contains propagatable
 *      TLEs. Interleave by orbit band so any prefix slice stays representative.
 *
 * Run (from repo root):  node scripts/fetch-sky-catalog.mjs
 * The OUTPUT json is committed for Offline mode; Live mode fetches CelesTrak in the browser
 * through the same-origin `/celestrak` proxy.
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const FRONTEND = join(REPO_ROOT, "frontend");
const OUT_PATH = join(FRONTEND, "public", "data", "catalog-sky.json");
const SATCAT_MIN_PATH = join(FRONTEND, "public", "data", "satcat-min.json");

// Resolve satellite.js out of the frontend's node_modules (this script lives at repo root).
const require = createRequire(join(FRONTEND, "package.json"));
const satellite = require("satellite.js");

const TARGET_COUNT = 3000;
const CLOUD_RESERVE_COUNT = 900;
const FETCH_LIMIT = 8000; // parse up to this many per large group before validation/sampling
const CELESTRAK_BASE = "https://celestrak.org";
const CELESTRAK_GROUPS = [
  { group: "active" },
  { group: "geo" },
  { group: "gnss" },
  { group: "stations" },
  { group: "cosmos-2251-debris", cloud: "cosmos-2251-debris" },
  { group: "iridium-33-debris", cloud: "iridium-33-debris" },
  { group: "fengyun-1c-debris", cloud: "fengyun-1c-debris" },
  { group: "cosmos-1408-debris", cloud: "cosmos-1408-debris" }
];
const CELESTRAK_NAME_QUERIES = [
  "CARTOSAT",
  "RISAT",
  "IRNSS",
  "GSAT",
  "OCEANSAT",
  "RESOURCESAT",
  "INSAT",
  "EOS",
  "ASTROSAT",
  "YAOGAN",
  "GAOFEN",
  "BEIDOU",
  "TIANHUI",
  "SHIYAN"
];
const MU = 398600.4418; // km^3 / s^2
const EARTH_RADIUS_KM = 6371;

/* -------------------------------------------------------------------------- */
/* Orbit classification + owner heuristics                                    */
/* -------------------------------------------------------------------------- */

/** Mean motion (rev/day) + eccentricity → coarse orbit band. */
function classifyOrbit(meanMotionRevPerDay, ecc) {
  if (!Number.isFinite(meanMotionRevPerDay) || meanMotionRevPerDay <= 0) return "LEO";
  const nRadPerSec = (meanMotionRevPerDay * 2 * Math.PI) / 86400;
  const a = Math.cbrt(MU / (nRadPerSec * nRadPerSec)); // semi-major axis (km)
  const altKm = a - EARTH_RADIUS_KM;
  if (ecc > 0.25) return "HEO";
  if (altKm < 2000) return "LEO";
  if (altKm < 31000) return "MEO";
  if (altKm < 40000) return "GEO";
  return "HEO";
}

const OWNER_PREFIXES = [
  [/^STARLINK/, "SpaceX"],
  [/^ONEWEB/, "OneWeb"],
  [/^(COSMOS|KOSMOS)/, "Russia"],
  [/^(GPS|NAVSTAR)/, "United States"],
  [/^GLONASS/, "Russia"],
  [/^GALILEO/, "ESA"],
  [/^BEIDOU/, "China"],
  [/^IRIDIUM/, "Iridium"],
  [/^GLOBALSTAR/, "Globalstar"],
  [/^O3B/, "SES"],
  [/^(CARTOSAT|RISAT|IRNSS|GSAT|OCEANSAT|RESOURCESAT|INSAT|EOS)/, "ISRO"],
  [/^SENTINEL/, "ESA"],
  [/^(NOAA|GOES)/, "NOAA"],
  [/^(TERRA|AQUA|LANDSAT|AURA|SUOMI)/, "NASA"],
  [/^(FLOCK|DOVE|SKYSAT|PLANET)/, "Planet"],
  [/^(YAOGAN|GAOFEN|SHIYAN|TIANHUI)/, "China"],
  [/^(GONETS|METEOR|RESURS)/, "Russia"],
  [/^(SES|ASTRA|INTELSAT|EUTELSAT|TELSTAR)/, "Commercial GEO"]
];

function ownerFor(name) {
  const upper = name.toUpperCase();
  for (const [re, owner] of OWNER_PREFIXES) {
    if (re.test(upper)) return owner;
  }
  return undefined;
}

const COUNTRY_CODES = {
  CIS: "Russia",
  CNSA: "China (CNSA)",
  ESA: "Europe (ESA)",
  FR: "France",
  GER: "Germany",
  IND: "India (ISRO)",
  ISRO: "India (ISRO)",
  ISS: "International Space Station",
  IT: "Italy",
  JPN: "Japan (JAXA)",
  NASA: "United States",
  PRC: "China (CNSA)",
  SKOR: "South Korea",
  UK: "United Kingdom",
  US: "United States"
};

function countryFor(code) {
  const normalized = String(code ?? "").trim().toUpperCase();
  return {
    code: normalized || "UNK",
    name: COUNTRY_CODES[normalized] ?? (normalized ? normalized : "Other / unlabelled")
  };
}

function normalizeObjectType(raw) {
  const value = String(raw ?? "").trim().toUpperCase();
  if (value === "PAY" || value === "PAYLOAD") return "PAYLOAD";
  if (value === "R/B" || value === "RB" || value === "ROCKET BODY") return "ROCKET BODY";
  if (value === "DEB" || value === "DEBRIS") return "DEBRIS";
  return "UNKNOWN";
}

function kindFromObjectType(type, name) {
  if (type === "DEBRIS" || type === "ROCKET BODY") return "debris";
  if (type === "PAYLOAD") return "satellite";
  return kindFor(name);
}

function rcsBucket(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0.1) return "SMALL";
  if (parsed < 1) return "MEDIUM";
  return "LARGE";
}

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function tleEpochUtc(line1) {
  const year = Number(line1.slice(18, 20));
  const day = Number(line1.slice(20, 32));
  if (!Number.isFinite(year) || !Number.isFinite(day)) return undefined;
  const fullYear = year >= 57 ? 1900 + year : 2000 + year;
  return new Date(Date.UTC(fullYear, 0, 1) + (day - 1) * 86400_000).toISOString();
}

/** Classify object kind from its catalog name (CelesTrak active mixes payloads + R/Bs + debris). */
function kindFor(name) {
  const upper = name.toUpperCase();
  if (/\bDEB\b|DEBRIS|FRAGMENT|COOLANT|WESTFORD NEEDLES/.test(upper)) return "debris";
  if (/R\/B|ROCKET BODY|\bAKM\b|\bPKM\b/.test(upper)) return "debris"; // rocket bodies read as "junk" too
  return "satellite";
}

/* -------------------------------------------------------------------------- */
/* TLE parsing (CelesTrak) + validation                                       */
/* -------------------------------------------------------------------------- */

function parseTleText(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ""));
  const out = [];
  for (let i = 0; i + 2 < lines.length + 1; i += 1) {
    const name = lines[i]?.trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (!name || !l1 || !l2) continue;
    if (l1.startsWith("1 ") && l2.startsWith("2 ")) {
      out.push({ name, line1: l1, line2: l2 });
      i += 2;
    }
  }
  return out;
}

/** Mean motion (rev/day) read from line2 columns 53-63. */
function meanMotionFromLine2(line2) {
  return Number(line2.slice(52, 63));
}
function eccFromLine2(line2) {
  return Number(`0.${line2.slice(26, 33).trim()}`);
}
function noradFromLine1(line1) {
  return line1.slice(2, 7).trim();
}

/** Parse + propagate with satellite.js; returns true only if it yields a finite ECI position. */
function isPropagatable(line1, line2) {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    if (!satrec || satrec.error) return false;
    const pv = satellite.propagate(satrec, new Date());
    const p = pv && pv.position;
    if (!p || typeof p === "boolean") return false;
    const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    return Number.isFinite(r) && r > EARTH_RADIUS_KM * 0.6 && r < 200000;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Deterministic synthetic generator (offline fallback)                       */
/* -------------------------------------------------------------------------- */

/** mulberry32 — tiny deterministic PRNG so the synthetic catalog is reproducible. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** TLE checksum: sum of digits (minus sign counts as 1) modulo 10. */
function tleChecksum(line68) {
  let sum = 0;
  for (const ch of line68) {
    if (ch >= "0" && ch <= "9") sum += Number(ch);
    else if (ch === "-") sum += 1;
  }
  return sum % 10;
}

function pad(value, len) {
  return String(value).padStart(len, " ");
}

/** Build a column-correct TLE pair from orbital elements (degrees, rev/day). */
function makeTle({ satnum, epochYear, epochDay, inclDeg, raanDeg, ecc, argpDeg, maDeg, meanMotion }) {
  const yy = String(epochYear % 100).padStart(2, "0");
  const intl = `${yy}${String((satnum % 999) + 1).padStart(3, "0")}A  `; // 8 chars
  const epoch = `${String(Math.floor(epochDay)).padStart(3, "0")}.${epochDay
    .toFixed(8)
    .split(".")[1]}`; // 12 chars: DDD.DDDDDDDD

  let l1 =
    "1 " +
    String(satnum).padStart(5, "0") +
    "U " +
    intl +
    " " +
    yy +
    epoch +
    " " +
    " .00000000" + // ndot/2 (10)
    " " +
    " 00000-0" + // nddot/6 (8)
    " " +
    " 00000-0" + // bstar (8)
    " " +
    "0" + // ephemeris type
    " " +
    pad(999, 4); // element set number
  l1 += String(tleChecksum(l1));

  const eccDigits = String(Math.round(ecc * 1e7)).padStart(7, "0").slice(0, 7);
  let l2 =
    "2 " +
    String(satnum).padStart(5, "0") +
    " " +
    inclDeg.toFixed(4).padStart(8, " ") +
    " " +
    raanDeg.toFixed(4).padStart(8, " ") +
    " " +
    eccDigits +
    " " +
    argpDeg.toFixed(4).padStart(8, " ") +
    " " +
    maDeg.toFixed(4).padStart(8, " ") +
    " " +
    meanMotion.toFixed(8).padStart(11, " ") +
    pad(1, 5); // rev number at epoch
  l2 += String(tleChecksum(l2));

  return { line1: l1, line2: l2 };
}

/** rev/day from a circular-ish semi-major axis (km). */
function meanMotionFromAltitude(altKm) {
  const a = EARTH_RADIUS_KM + altKm;
  const T = 2 * Math.PI * Math.sqrt((a * a * a) / MU); // seconds
  return 86400 / T;
}

const SYNTHETIC_NAMES = [
  "STARLINK",
  "ONEWEB",
  "IRIDIUM",
  "COSMOS",
  "GLOBALSTAR",
  "FLOCK",
  "YAOGAN",
  "GONETS",
  "ORBCOMM",
  "GPS BIIF",
  "GALILEO",
  "BEIDOU",
  "O3B",
  "SES",
  "INTELSAT",
  "METEOR",
  "NOAA",
  "SENTINEL",
  "CARTOSAT",
  "RISAT"
];

function buildSynthetic() {
  const rand = mulberry32(0x0b17ec7); // fixed seed → deterministic catalog
  const objects = [];
  const epochYear = 2025;
  const epochDay = 1.0;

  const bands = [
    { name: "LEO", weight: 0.6, altMin: 340, altMax: 1500, eccMin: 0.0003, eccMax: 0.003 },
    { name: "MEO", weight: 0.15, altMin: 19000, altMax: 23500, eccMin: 0.0005, eccMax: 0.01 },
    { name: "GEO", weight: 0.15, altMin: 35400, altMax: 36100, eccMin: 0.0001, eccMax: 0.0008 },
    { name: "HEO", weight: 0.1, altMin: 600, altMax: 39000, eccMin: 0.55, eccMax: 0.72 }
  ];

  // Representative LEO inclination families (sun-sync, Starlink shells, ISS-like, polar, equatorial).
  const leoInclinations = [97.6, 53.0, 53.2, 51.6, 70.0, 87.4, 98.2, 0.5, 63.4, 28.5];

  for (let i = 0; i < TARGET_COUNT + 40; i += 1) {
    const roll = rand();
    let acc = 0;
    let band = bands[0];
    for (const b of bands) {
      acc += b.weight;
      if (roll <= acc) {
        band = b;
        break;
      }
    }

    let inclDeg;
    let altKm;
    let ecc = band.eccMin + rand() * (band.eccMax - band.eccMin);
    let meanMotion;

    if (band.name === "LEO") {
      inclDeg = leoInclinations[Math.floor(rand() * leoInclinations.length)] + (rand() - 0.5) * 0.6;
      altKm = band.altMin + rand() * (band.altMax - band.altMin);
      meanMotion = meanMotionFromAltitude(altKm);
    } else if (band.name === "MEO") {
      inclDeg = 55 + (rand() - 0.5) * 10;
      altKm = band.altMin + rand() * (band.altMax - band.altMin);
      meanMotion = meanMotionFromAltitude(altKm);
    } else if (band.name === "GEO") {
      inclDeg = rand() * 3; // near-equatorial
      altKm = band.altMin + rand() * (band.altMax - band.altMin);
      meanMotion = meanMotionFromAltitude(altKm);
    } else {
      // Molniya-like HEO: derive mean motion from semi-major axis of an eccentric orbit.
      inclDeg = 63.4 + (rand() - 0.5) * 4;
      const perigeeAlt = 500 + rand() * 1200;
      const apogeeAlt = 38000 + rand() * 2000;
      const a = EARTH_RADIUS_KM + (perigeeAlt + apogeeAlt) / 2;
      ecc = (apogeeAlt - perigeeAlt) / (2 * a + (perigeeAlt + apogeeAlt));
      const T = 2 * Math.PI * Math.sqrt((a * a * a) / MU);
      meanMotion = 86400 / T;
    }

    const raanDeg = rand() * 360;
    const argpDeg = rand() * 360;
    const maDeg = rand() * 360;
    const satnum = 70000 + i;

    const tle = makeTle({
      satnum,
      epochYear,
      epochDay,
      inclDeg: Math.abs(inclDeg),
      raanDeg,
      ecc,
      argpDeg,
      maDeg,
      meanMotion
    });

    const family = SYNTHETIC_NAMES[Math.floor(rand() * SYNTHETIC_NAMES.length)];
    const isDebris = rand() < 0.12;
    const name = isDebris ? `${family} DEB ${1000 + i}` : `${family}-${1000 + i}`;

    objects.push({
      id: String(satnum),
      name,
      line1: tle.line1,
      line2: tle.line2,
      kind: isDebris ? "debris" : "satellite",
      owner: ownerFor(name),
      orbitClass: band.name === "HEO" ? "HEO" : classifyOrbit(meanMotion, ecc)
    });
  }

  return objects;
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

function gpUrl(group) {
  return `${CELESTRAK_BASE}/NORAD/elements/gp.php?GROUP=${encodeURIComponent(group)}&FORMAT=tle`;
}

function satcatUrl(group) {
  return `${CELESTRAK_BASE}/satcat/records.php?GROUP=${encodeURIComponent(group)}&FORMAT=json`;
}

function nameGpUrl(name) {
  return `${CELESTRAK_BASE}/NORAD/elements/gp.php?NAME=${encodeURIComponent(name)}&FORMAT=tle`;
}

async function fetchJson(url, signal) {
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "OrbitGuard/1.0 (catalog-bake)", Accept: "application/json" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url, signal) {
  const res = await fetch(url, {
    signal,
    headers: { "User-Agent": "OrbitGuard/1.0 (catalog-bake)", Accept: "text/plain" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchCelestrak() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const entries = [];
    const allSatcat = new Map();
    const addSatcat = (records) => {
      for (const record of records) {
        const norad = String(record.NORAD_CAT_ID ?? "").trim();
        if (norad) allSatcat.set(norad, record);
      }
    };
    try {
      const activeSatcat = await fetchJson(satcatUrl("active"), controller.signal);
      addSatcat(activeSatcat);
      console.log(`  active SATCAT: ${allSatcat.size} records cached for joins`);
    } catch (error) {
      console.warn(`  active SATCAT: skipped (${error.message})`);
    }

    const buildEntry = (t, meta, sourceUrl, cloud) => {
      const id = noradFromLine1(t.line1) || t.name;
      const ecc = eccFromLine2(t.line2);
      const mm = meanMotionFromLine2(t.line2);
      const country = countryFor(meta?.OWNER);
      const objectType = normalizeObjectType(meta?.OBJECT_TYPE);
      const resolvedType =
        objectType === "UNKNOWN" ? normalizeObjectType(kindFor(t.name) === "debris" ? "DEB" : "PAY") : objectType;
      const rcsM2 = numberOrNull(meta?.RCS);
      return {
        id,
        noradId: id,
        name: String(meta?.OBJECT_NAME ?? t.name).trim(),
        line1: t.line1,
        line2: t.line2,
        kind: kindFromObjectType(resolvedType, t.name),
        owner: ownerFor(t.name) ?? country.name,
        country: country.name,
        countryCode: country.code,
        objectType: resolvedType,
        intlDesignator: meta?.OBJECT_ID ? String(meta.OBJECT_ID).trim() : undefined,
        launchDate: meta?.LAUNCH_DATE ? String(meta.LAUNCH_DATE).trim() : undefined,
        rcs: rcsBucket(rcsM2),
        rcsM2,
        periodMinutes: numberOrNull(meta?.PERIOD),
        inclinationDeg: numberOrNull(meta?.INCLINATION),
        apogeeKm: numberOrNull(meta?.APOGEE),
        perigeeKm: numberOrNull(meta?.PERIGEE),
        cloud,
        orbitClass: classifyOrbit(mm, ecc),
        source: "offline",
        sourceUrl,
        tleEpochUtc: tleEpochUtc(t.line1)
      };
    };

    for (const groupDef of CELESTRAK_GROUPS) {
      try {
        const [text, satcatRecords] = await Promise.all([
          fetchText(gpUrl(groupDef.group), controller.signal),
          fetchJson(satcatUrl(groupDef.group), controller.signal).catch(() => [])
        ]);
        const satcat = new Map();
        for (const record of satcatRecords) {
          const norad = String(record.NORAD_CAT_ID ?? "").trim();
          if (norad) satcat.set(norad, record);
        }
        addSatcat(satcatRecords);
        const parsed = parseTleText(text).slice(0, groupDef.group === "active" ? FETCH_LIMIT : Number.POSITIVE_INFINITY);
        if (parsed.length < 1) continue;
        entries.push(
          ...parsed.map((t) => {
            const id = noradFromLine1(t.line1) || t.name;
            return buildEntry(t, satcat.get(id) ?? allSatcat.get(id), gpUrl(groupDef.group), groupDef.cloud);
          })
        );
        console.log(`  ${groupDef.group}: ${parsed.length} TLEs, ${satcat.size} SATCAT records`);
      } catch (error) {
        console.warn(`  ${groupDef.group}: skipped (${error.message})`);
      }
    }
    for (const name of CELESTRAK_NAME_QUERIES) {
      try {
        const text = await fetchText(nameGpUrl(name), controller.signal);
        const parsed = parseTleText(text);
        const joined = parsed
          .map((t) => {
            const id = noradFromLine1(t.line1) || t.name;
            const meta = allSatcat.get(id);
            return meta ? buildEntry(t, meta, nameGpUrl(name), undefined) : null;
          })
          .filter(Boolean)
          .filter((entry) => entry.countryCode === "IND" || entry.countryCode === "PRC");
        entries.push(...joined);
        console.log(`  NAME=${name}: ${joined.length}/${parsed.length} India/China TLEs`);
      } catch (error) {
        console.warn(`  NAME=${name}: skipped (${error.message})`);
      }
    }
    if (entries.length < 50) throw new Error(`only ${entries.length} TLEs parsed`);
    return entries;
  } finally {
    clearTimeout(timer);
  }
}

/** Interleave entries by band so any prefix slice has a representative band mix. */
function interleaveByBand(entries) {
  const buckets = { LEO: [], MEO: [], GEO: [], HEO: [] };
  for (const e of entries) (buckets[e.orbitClass] ?? buckets.LEO).push(e);
  const order = ["LEO", "MEO", "GEO", "HEO"];
  const out = [];
  let added = true;
  while (added) {
    added = false;
    for (const band of order) {
      const next = buckets[band].shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

async function main() {
  let source = "celestrak-gp-satcat";
  let entries;
  try {
    console.log(`→ fetching ${CELESTRAK_GROUPS.length} CelesTrak GP/SATCAT groups`);
    entries = await fetchCelestrak();
    console.log(`  fetched ${entries.length} TLEs from CelesTrak`);
  } catch (err) {
    console.warn(`  CelesTrak unreachable (${err.message}); using deterministic synthetic set.`);
    source = "synthetic-deterministic";
    entries = buildSynthetic();
  }

  // Validate every entry actually propagates; drop the rest.
  const valid = entries.filter((e) => isPropagatable(e.line1, e.line2));
  console.log(`  ${valid.length}/${entries.length} entries propagate cleanly`);

  // If real data validated too few (unexpected), top up with the synthetic set.
  let pool = valid;
  if (pool.length < TARGET_COUNT && source !== "synthetic-deterministic") {
    const synth = buildSynthetic().filter((e) => isPropagatable(e.line1, e.line2));
    pool = pool.concat(synth);
    source = `${source}+synthetic`;
  }

  // De-dupe by id, interleave by band, cap at TARGET_COUNT.
  const seen = new Set();
  const deduped = [];
  for (const e of pool) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    deduped.push(e);
  }
  const cloudEntries = interleaveByBand(deduped.filter((entry) => entry.cloud)).slice(0, CLOUD_RESERVE_COUNT);
  const cloudIds = new Set(cloudEntries.map((entry) => entry.id));
  const nonCloudEntries = interleaveByBand(deduped.filter((entry) => !entry.cloud && !cloudIds.has(entry.id))).slice(
    0,
    TARGET_COUNT - cloudEntries.length
  );
  let selectedEntries = [...cloudEntries, ...nonCloudEntries];
  if (selectedEntries.length < TARGET_COUNT) {
    const selectedIds = new Set(selectedEntries.map((entry) => entry.id));
    const synth = buildSynthetic()
      .filter((entry) => isPropagatable(entry.line1, entry.line2))
      .filter((entry) => !selectedIds.has(entry.id))
      .slice(0, TARGET_COUNT - selectedEntries.length);
    selectedEntries = selectedEntries.concat(synth);
    source = `${source}+synthetic-topup`;
  }
  const objects = interleaveByBand(selectedEntries).slice(0, TARGET_COUNT).map((e) => {
    const normalized = {
      id: e.id,
      noradId: e.noradId ?? e.id,
      name: e.name,
      line1: e.line1,
      line2: e.line2,
      kind: e.kind
    };
    if (e.owner) normalized.owner = e.owner;
    if (e.country) normalized.country = e.country;
    if (e.countryCode) normalized.countryCode = e.countryCode;
    if (e.objectType) normalized.objectType = e.objectType;
    if (e.intlDesignator) normalized.intlDesignator = e.intlDesignator;
    if (e.launchDate) normalized.launchDate = e.launchDate;
    if (e.rcs) normalized.rcs = e.rcs;
    if (e.rcsM2 != null) normalized.rcsM2 = e.rcsM2;
    if (e.periodMinutes != null) normalized.periodMinutes = e.periodMinutes;
    if (e.inclinationDeg != null) normalized.inclinationDeg = e.inclinationDeg;
    if (e.apogeeKm != null) normalized.apogeeKm = e.apogeeKm;
    if (e.perigeeKm != null) normalized.perigeeKm = e.perigeeKm;
    if (e.cloud) normalized.cloud = e.cloud;
    if (e.source) normalized.source = e.source;
    if (e.sourceUrl) normalized.sourceUrl = e.sourceUrl;
    if (e.tleEpochUtc) normalized.tleEpochUtc = e.tleEpochUtc;
    if (e.orbitClass) normalized.orbitClass = e.orbitClass;
    return normalized;
  });

  const counts = objects.reduce((acc, o) => {
    acc[o.orbitClass ?? "?"] = (acc[o.orbitClass ?? "?"] ?? 0) + 1;
    return acc;
  }, {});
  const kinds = objects.reduce((acc, o) => {
    acc[o.kind] = (acc[o.kind] ?? 0) + 1;
    return acc;
  }, {});

  const payload = {
    meta: {
      generated_at_utc: new Date().toISOString(),
      source,
      source_url: CELESTRAK_GROUPS.map((entry) => gpUrl(entry.group)).join(","),
      groups: CELESTRAK_GROUPS.map((entry) => entry.group),
      count: objects.length,
      bands: counts,
      kinds
    },
    objects
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 0)}\n`, "utf8");
  const satcatMin = Object.fromEntries(
    objects.map((object) => [
      object.noradId ?? object.id,
      {
        country: object.country,
        countryCode: object.countryCode,
        owner: object.owner,
        objectType: object.objectType,
        launchDate: object.launchDate,
        rcs: object.rcs,
        rcsM2: object.rcsM2,
        periodMinutes: object.periodMinutes,
        inclinationDeg: object.inclinationDeg,
        apogeeKm: object.apogeeKm,
        perigeeKm: object.perigeeKm
      }
    ])
  );
  writeFileSync(SATCAT_MIN_PATH, `${JSON.stringify(satcatMin, null, 0)}\n`, "utf8");
  console.log(`✓ wrote ${objects.length} objects → ${OUT_PATH}`);
  console.log(`✓ wrote ${objects.length} SATCAT summaries → ${SATCAT_MIN_PATH}`);
  console.log(`  source=${source} bands=${JSON.stringify(counts)} kinds=${JSON.stringify(kinds)}`);
}

main().catch((err) => {
  console.error("✗ generator failed:", err);
  process.exit(1);
});
