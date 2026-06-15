/**
 * SkyToolbar — the one thin filter + view row (redesign/routes/02-sky.md §4.1).
 *
 * Replaces the old catalog "lens grid" + 4-input toolbar + chip console with a single hairline bar:
 * search · type · owner · orbit · source on the left, Globe|List on the right. `bg-surface/60` +
 * backdrop-blur, one hairline beneath, no glow — the 3D stays the star. Source (Offline ↔ Live) is a
 * quiet dropdown, not a loud toggle.
 */
import { ChevronDown, Globe, List, Pause, Play, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { cn, Disclosure, focusRing, Tabs } from "../../components/ui";
import type { CountedOption, SkyFilters, ViewMode } from "./sky-data";
import type { SkySource } from "./useSkyObjects";

const TYPE_OPTIONS: Array<{ value: SkyFilters["type"]; label: string }> = [
  { value: "all", label: "All objects" },
  { value: "satellite", label: "Satellites" },
  { value: "debris", label: "Debris" }
];

const ORBIT_OPTIONS: Array<{ value: SkyFilters["orbit"]; label: string }> = [
  { value: "any", label: "Any orbit" },
  { value: "low", label: "Low orbit" },
  { value: "other", label: "Other" }
];

const SOURCE_OPTIONS: Array<{ value: SkySource; label: string }> = [
  { value: "fixture", label: "Offline demo" },
  { value: "live", label: "Live data" }
];

const DENSITY_OPTIONS: Array<{ value: "lite" | "balanced" | "max"; label: string }> = [
  { value: "lite", label: "Lite 800" },
  { value: "balanced", label: "Balanced 2,000" },
  { value: "max", label: "Max 6,000" }
];

const SPEED_OPTIONS: Array<{ value: 1 | 60 | 120; label: string }> = [
  { value: 1, label: "Real-time 1x" },
  { value: 60, label: "60x" },
  { value: 120, label: "120x" }
];

const NOTABLE_OPTIONS = [
  { value: "", label: "Notable" },
  { value: "iss", label: "ISS" },
  { value: "css", label: "China Station" },
  { value: "hubble", label: "Hubble" },
  { value: "cartosat", label: "CARTOSAT-2F" },
  { value: "risat", label: "RISAT-2BR1" },
  { value: "navic", label: "NavIC" }
];

const FIELD_CLASS = cn(
  "h-9 appearance-none rounded-md border border-hairline bg-surface-2 pl-3 pr-8 text-[13px] font-medium text-body",
  "transition-colors hover:text-strong",
  focusRing
);

/** A quiet, token-styled native select (keyboard-accessible by default). */
function FilterSelect({
  label,
  value,
  onChange,
  options,
  disabled
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(FIELD_CLASS, disabled && "cursor-not-allowed opacity-50")}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export interface SkyToolbarProps {
  filters: SkyFilters;
  onFiltersChange: (filters: SkyFilters) => void;
  /** Distinct named owners for the Owner dropdown. */
  owners: string[];
  /** Country/agency counts from SATCAT metadata. */
  countries: CountedOption[];
  /** Named debris-cloud counts. */
  clouds: CountedOption[];
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  source: SkySource;
  onSourceChange: (source: SkySource) => void;
  /** Live snapshot is being fetched → the source control shows a busy/disabled state. */
  sourcePending?: boolean;
  density: "lite" | "balanced" | "max";
  onDensityChange: (density: "lite" | "balanced" | "max") => void;
  speed: 1 | 60 | 120;
  onSpeedChange: (speed: 1 | 60 | 120) => void;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onNotablePick: (key: string) => void;
  onIsroView: () => void;
  /** Advanced filters stay open by default in Pro, collapsed in Simple. */
  advancedDefaultOpen?: boolean;
}

export function SkyToolbar({
  filters,
  onFiltersChange,
  owners,
  countries,
  clouds,
  view,
  onViewChange,
  source,
  onSourceChange,
  sourcePending = false,
  density,
  onDensityChange,
  speed,
  onSpeedChange,
  playing,
  onPlayingChange,
  onNotablePick,
  onIsroView,
  advancedDefaultOpen = false
}: SkyToolbarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(advancedDefaultOpen);
  const patch = (next: Partial<SkyFilters>) => onFiltersChange({ ...filters, ...next });

  useEffect(() => {
    setAdvancedOpen(advancedDefaultOpen);
  }, [advancedDefaultOpen]);

  const ownerOptionList = [{ value: "any", label: "All owners" }, ...owners.map((owner) => ({ value: owner, label: owner }))];
  const countryOptionList = [
    { value: "any", label: "All countries" },
    ...countries.map((country) => ({ value: country.value, label: `${country.label} - ${country.count.toLocaleString()}` }))
  ];
  const cloudOptionList = [
    { value: "any", label: "All debris clouds" },
    ...clouds.map((cloud) => ({ value: cloud.value, label: `${cloud.label} - ${cloud.count.toLocaleString()}` }))
  ];

  return (
    <div className="border-b border-hairline bg-surface/60 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:max-w-sm sm:flex-1">
          <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={filters.q}
            onChange={(event) => patch({ q: event.target.value })}
            placeholder="Find an object…"
            aria-label="Find an object by name"
            className={cn(
              "h-9 w-full rounded-md border border-hairline bg-deep pl-9 pr-3 text-[14px] text-strong placeholder:text-faint",
              focusRing
            )}
          />
        </div>

        <div className="ml-auto">
          <Tabs
            variant="segmented"
            value={view}
            onValueChange={(next) => onViewChange(next as ViewMode)}
            items={[
              { value: "globe", label: "Globe", icon: <Globe aria-hidden="true" size={15} /> },
              { value: "list", label: "List", icon: <List aria-hidden="true" size={15} /> }
            ]}
          />
        </div>
      </div>

      <Disclosure label="Filters" open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Filter by type"
            value={filters.type}
            onChange={(value) => patch({ type: value as SkyFilters["type"] })}
            options={TYPE_OPTIONS}
          />
          <FilterSelect
            label="Filter by owner"
            value={filters.owner}
            onChange={(value) => patch({ owner: value })}
            options={ownerOptionList}
          />
          <FilterSelect
            label="Filter by country"
            value={filters.country}
            onChange={(value) => patch({ country: value })}
            options={countryOptionList}
          />
          <FilterSelect
            label="Filter by orbit"
            value={filters.orbit}
            onChange={(value) => patch({ orbit: value as SkyFilters["orbit"] })}
            options={ORBIT_OPTIONS}
          />
          <FilterSelect
            label="Filter by debris cloud"
            value={filters.cloud}
            onChange={(value) => patch({ cloud: value })}
            options={cloudOptionList}
            disabled={clouds.length === 0}
          />
          <FilterSelect
            label="Data source"
            value={source}
            onChange={(value) => onSourceChange(value as SkySource)}
            options={SOURCE_OPTIONS}
            disabled={sourcePending}
          />
          <FilterSelect
            label="Render density"
            value={density}
            onChange={(value) => onDensityChange(value as "lite" | "balanced" | "max")}
            options={DENSITY_OPTIONS}
          />
          <FilterSelect
            label="Propagation speed"
            value={String(speed)}
            onChange={(value) => onSpeedChange(Number(value) as 1 | 60 | 120)}
            options={SPEED_OPTIONS.map((option) => ({ value: String(option.value), label: option.label }))}
          />
          <button
            type="button"
            aria-pressed={playing}
            aria-label={playing ? "Pause propagation" : "Play propagation"}
            title={playing ? "Pause propagation" : "Play propagation"}
            onClick={() => onPlayingChange(!playing)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-md border border-hairline bg-surface-2 text-muted transition hover:text-strong",
              focusRing
            )}
          >
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          </button>
          <FilterSelect
            label="Pick a notable object"
            value=""
            onChange={(value) => {
              if (value) onNotablePick(value);
            }}
            options={NOTABLE_OPTIONS}
          />
          <button
            type="button"
            onClick={onIsroView}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border border-hairline bg-surface-2 px-3 text-[13px] font-medium text-body transition hover:text-strong",
              focusRing
            )}
          >
            <ShieldCheck size={14} aria-hidden="true" />
            ISRO assets
          </button>
        </div>
      </Disclosure>
    </div>
  );
}
