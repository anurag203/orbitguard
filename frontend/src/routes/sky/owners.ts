import type { SkyCatalogEntry } from "../../components/earth";

export type CountryInfo = {
  code: string;
  name: string;
  flag: string;
};

const OWNER_CODES: Record<string, string> = {
  AB: "Saudi Arabia",
  ALG: "Algeria",
  ARG: "Argentina",
  AUS: "Australia",
  AZER: "Azerbaijan",
  BEL: "Belgium",
  BRAZ: "Brazil",
  CA: "Canada",
  CHBZ: "Brazil / China",
  CHLE: "Chile",
  CIS: "Russia",
  DEN: "Denmark",
  EGY: "Egypt",
  ESA: "Europe (ESA)",
  ESRO: "Europe (ESA)",
  EUME: "EUMETSAT",
  EUTE: "Eutelsat",
  FGER: "Germany",
  FR: "France",
  GER: "Germany",
  GLOB: "Globalstar",
  GREC: "Greece",
  IM: "Inmarsat",
  IND: "India (ISRO)",
  INDO: "Indonesia",
  IRAQ: "Iraq",
  IRAN: "Iran",
  ISRA: "Israel",
  ISRO: "India (ISRO)",
  ISS: "International Space Station",
  IT: "Italy",
  ITSO: "Intelsat",
  JPN: "Japan (JAXA)",
  KAZ: "Kazakhstan",
  LAOS: "Laos",
  LKA: "Sri Lanka",
  LUXE: "Luxembourg",
  MALA: "Malaysia",
  MEX: "Mexico",
  NETH: "Netherlands",
  NASA: "United States",
  NICO: "New ICO",
  NIG: "Nigeria",
  NKOR: "North Korea",
  NOR: "Norway",
  NZ: "New Zealand",
  PAKI: "Pakistan",
  PRC: "China (CNSA)",
  CNSA: "China (CNSA)",
  RASC: "RascomStar",
  ROC: "Taiwan",
  RP: "Philippines",
  SAFR: "South Africa",
  SAUD: "Saudi Arabia",
  SES: "SES",
  SING: "Singapore",
  SKOR: "South Korea",
  SPN: "Spain",
  SWED: "Sweden",
  SWTZ: "Switzerland",
  TBD: "Other / unlabelled",
  THAI: "Thailand",
  TURK: "Turkey",
  UAE: "United Arab Emirates",
  UK: "United Kingdom",
  UKR: "Ukraine",
  UNK: "Other / unlabelled",
  USBZ: "United States / Brazil",
  US: "United States",
  VENZ: "Venezuela",
  VTNM: "Vietnam"
};

const FLAG_CODES: Record<string, string> = {
  AUS: "AU",
  BEL: "BE",
  BRAZ: "BR",
  CA: "CA",
  CHLE: "CL",
  CIS: "RU",
  DEN: "DK",
  EGY: "EG",
  FR: "FR",
  GER: "DE",
  IND: "IN",
  INDO: "ID",
  IRAQ: "IQ",
  IRAN: "IR",
  ISRA: "IL",
  IT: "IT",
  JPN: "JP",
  KAZ: "KZ",
  MALA: "MY",
  MEX: "MX",
  NETH: "NL",
  NIG: "NG",
  NKOR: "KP",
  NOR: "NO",
  NZ: "NZ",
  PAKI: "PK",
  PRC: "CN",
  ROC: "TW",
  RP: "PH",
  SAFR: "ZA",
  SAUD: "SA",
  SING: "SG",
  SKOR: "KR",
  SPN: "ES",
  SWED: "SE",
  SWTZ: "CH",
  THAI: "TH",
  TURK: "TR",
  UAE: "AE",
  UK: "GB",
  UKR: "UA",
  US: "US",
  VENZ: "VE",
  VTNM: "VN"
};

const OPERATOR_PREFIXES: Array<[RegExp, string]> = [
  [/^STARLINK/, "SpaceX"],
  [/^ONEWEB/, "OneWeb"],
  [/^IRIDIUM/, "Iridium"],
  [/^GLOBALSTAR/, "Globalstar"],
  [/^O3B/, "SES"],
  [/^(GPS|NAVSTAR)/, "GPS"],
  [/^GLONASS/, "GLONASS"],
  [/^GALILEO/, "Galileo"],
  [/^BEIDOU/, "BeiDou"],
  [/^(CARTOSAT|RISAT|IRNSS|GSAT|OCEANSAT|RESOURCESAT|INSAT|EOS|ASTROSAT|NAVIC)/, "ISRO"],
  [/^(YAOGAN|GAOFEN|SHIYAN|TIANHUI|TIANGONG|CSS|FENGYUN)/, "China"],
  [/^(COSMOS|KOSMOS|GONETS|METEOR|RESURS)/, "Russia"],
  [/^SENTINEL/, "Copernicus"],
  [/^(NOAA|GOES)/, "NOAA"],
  [/^(TERRA|AQUA|LANDSAT|AURA|SUOMI|HST|HUBBLE)/, "NASA"],
  [/^(FLOCK|DOVE|SKYSAT|PLANET)/, "Planet"],
  [/^(SES|ASTRA|INTELSAT|EUTELSAT|TELSTAR)/, "Commercial GEO"]
];

export const DEBRIS_CLOUD_LABELS: Record<string, string> = {
  "cosmos-2251-debris": "Cosmos-2251",
  "iridium-33-debris": "Iridium-33",
  "fengyun-1c-debris": "Fengyun-1C",
  "cosmos-1408-debris": "Cosmos-1408"
};

export const LIVE_CATALOG_GROUPS = [
  "active",
  "geo",
  "gnss",
  "stations",
  "cosmos-2251-debris",
  "iridium-33-debris",
  "fengyun-1c-debris",
  "cosmos-1408-debris"
] as const;

function codeToFlag(countryCode: string | undefined): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const upper = countryCode.toUpperCase();
  const first = upper.codePointAt(0);
  const second = upper.codePointAt(1);
  if (!first || !second) return "";
  return String.fromCodePoint(0x1f1e6 + first - 65, 0x1f1e6 + second - 65);
}

export function countryFromOwnerCode(code?: string | null): CountryInfo {
  const normalized = (code ?? "").trim().toUpperCase();
  const name = OWNER_CODES[normalized] ?? (normalized ? normalized : "Other / unlabelled");
  const flag = codeToFlag(FLAG_CODES[normalized]);
  return { code: normalized || "UNK", name, flag };
}

export function operatorFromName(name: string): string | undefined {
  const upper = name.trim().toUpperCase();
  for (const [pattern, label] of OPERATOR_PREFIXES) {
    if (pattern.test(upper)) return label;
  }
  return undefined;
}

export function ownerDisplayFromEntry(entry: SkyCatalogEntry): string {
  return entry.owner?.trim() || entry.country || "Unlabelled";
}

export function countryDisplayFromEntry(entry: SkyCatalogEntry): string {
  return entry.country?.trim() || countryFromOwnerCode(entry.countryCode).name;
}

export function normalizeObjectType(raw?: string | null): SkyCatalogEntry["objectType"] {
  const value = (raw ?? "").trim().toUpperCase();
  if (value === "PAY" || value === "PAYLOAD") return "PAYLOAD";
  if (value === "R/B" || value === "RB" || value === "ROCKET BODY") return "ROCKET BODY";
  if (value === "DEB" || value === "DEBRIS") return "DEBRIS";
  return "UNKNOWN";
}

export function kindFromObjectType(type?: SkyCatalogEntry["objectType"]): SkyCatalogEntry["kind"] {
  return type === "DEBRIS" || type === "ROCKET BODY" ? "debris" : "satellite";
}

export function objectTypeLabel(type?: SkyCatalogEntry["objectType"] | string | null): string {
  const normalized = normalizeObjectType(type);
  if (normalized === "ROCKET BODY") return "Rocket body";
  if (normalized === "DEBRIS") return "Debris";
  if (normalized === "PAYLOAD") return "Payload";
  return "Unknown";
}

export function rcsBucket(value?: number | null): SkyCatalogEntry["rcs"] {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0.1) return "SMALL";
  if (value < 1) return "MEDIUM";
  return "LARGE";
}

export function rcsLabel(bucket?: SkyCatalogEntry["rcs"], raw?: number | null): string {
  if (bucket === "SMALL") return raw != null ? `Small (${raw.toFixed(3)} m2)` : "Small";
  if (bucket === "MEDIUM") return raw != null ? `Medium (${raw.toFixed(2)} m2)` : "Medium";
  if (bucket === "LARGE") return raw != null ? `Large (${raw.toFixed(1)} m2)` : "Large";
  return "Unknown";
}

export function cloudLabel(cloud?: string | null): string {
  if (!cloud) return "No cloud";
  return DEBRIS_CLOUD_LABELS[cloud] ?? cloud;
}
