/**
 * SkyToolbar — the one thin filter + view row (redesign/routes/02-sky.md §4.1).
 *
 * Replaces the old catalog "lens grid" + 4-input toolbar + chip console with a single hairline bar:
 * search · type · owner · orbit · source on the left, Globe|List on the right. `bg-surface/60` +
 * backdrop-blur, one hairline beneath, no glow — the 3D stays the star. Source (Offline ↔ Live) is a
 * quiet dropdown, not a loud toggle.
 */
import { ChevronDown, Globe, List, Search } from "lucide-react";

import { cn, focusRing, Tabs } from "../../components/ui";
import type { SkyFilters, ViewMode } from "./sky-data";
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
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  source: SkySource;
  onSourceChange: (source: SkySource) => void;
  /** Live snapshot is being fetched → the source control shows a busy/disabled state. */
  sourcePending?: boolean;
}

export function SkyToolbar({
  filters,
  onFiltersChange,
  owners,
  view,
  onViewChange,
  source,
  onSourceChange,
  sourcePending = false
}: SkyToolbarProps) {
  const patch = (next: Partial<SkyFilters>) => onFiltersChange({ ...filters, ...next });

  const ownerOptionList = [{ value: "any", label: "All owners" }, ...owners.map((owner) => ({ value: owner, label: owner }))];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-surface/60 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="relative w-full sm:w-auto sm:min-w-[220px] sm:flex-1 sm:max-w-sm">
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
        label="Filter by orbit"
        value={filters.orbit}
        onChange={(value) => patch({ orbit: value as SkyFilters["orbit"] })}
        options={ORBIT_OPTIONS}
      />
      <FilterSelect
        label="Data source"
        value={source}
        onChange={(value) => onSourceChange(value as SkySource)}
        options={SOURCE_OPTIONS}
        disabled={sourcePending}
      />

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
  );
}
