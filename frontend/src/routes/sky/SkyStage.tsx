/**
 * SkyStage — the focal element: a large interactive Earth with restrained overlays
 * (redesign/routes/02-sky.md §4.2, §8). The scene owns drag + zoom + camera-reset (bottom-right);
 * the route adds only a names toggle + clear-selection (top-left), a risk legend, a provenance chip,
 * and the empty-selection hint (bottom-left). Chrome stays out of the scene's own controls' corner.
 */
import { AlertTriangle, Tag, XCircle } from "lucide-react";

import {
  BAND_COLOR,
  DEBRIS_COLOR,
  EarthScene,
  type CameraFraming,
  type OrbitBand,
  type OrbitObject,
  type SkyCatalogEntry
} from "../../components/earth";
import { Button, cn, LiveChip, textStyles } from "../../components/ui";
import { RISK_DOT_CLASS } from "./sky-data";

const LEGEND: Array<{ risk: keyof typeof RISK_DOT_CLASS; label: string }> = [
  { risk: "safe", label: "Protected" },
  { risk: "watch", label: "Watching" },
  { risk: "warning", label: "Caution" },
  { risk: "danger", label: "Debris / risk" }
];

// The cloud is colored by orbit band (propagate.ts / colors.ts), so the field gets its own legend.
const BAND_LEGEND: Array<{ band: OrbitBand | "DEB"; label: string; color: string }> = [
  { band: "LEO", label: "LEO", color: BAND_COLOR.LEO },
  { band: "MEO", label: "MEO", color: BAND_COLOR.MEO },
  { band: "GEO", label: "GEO", color: BAND_COLOR.GEO },
  { band: "HEO", label: "HEO", color: BAND_COLOR.HEO },
  { band: "DEB", label: "Debris", color: DEBRIS_COLOR }
];

export interface SkyStageProps {
  scenarioId: string;
  objects: OrbitObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  framing: Partial<CameraFraming>;
  showThreatLine: boolean;
  showLabels: boolean;
  onToggleLabels: () => void;
  onClearSelection: () => void;
  isLive: boolean;
  shownCount: number;
  /** Catalog still loading → swap the hint for a plain loading sentence. */
  catalogLoading?: boolean;
  /** Catalog failed → calm inline retry (the globe geometry still renders). */
  catalogError?: boolean;
  onRetryCatalog?: () => void;
  /** Filters matched nothing → bare Earth + a centered message. */
  emptyFiltered?: boolean;
  onClearFilters?: () => void;
  /** The full SGP4 cloud (already filtered) to render as one instanced field. */
  field?: SkyCatalogEntry[];
  fieldDensity?: "lite" | "balanced" | "max";
  fieldShowAllMatches?: boolean;
  fieldPlaying?: boolean;
  fieldTimeScale?: number;
  fieldEpoch?: Date;
  /** Reports how many objects the field actually drew (after cap), for the count chip. */
  onFieldStats?: (shown: number, total: number) => void;
  /** Objects currently drawn in the cloud (post-cap), for the "N of M" chip. */
  fieldShown?: number;
  /** Total objects in the loaded catalog, for the "N of M" chip. */
  fieldTotal?: number;
  sourceNote?: string;
  asOfUtc?: string | null;
  className?: string;
}

export function SkyStage({
  scenarioId,
  objects,
  selectedId,
  onSelect,
  framing,
  showThreatLine,
  showLabels,
  onToggleLabels,
  onClearSelection,
  isLive,
  shownCount,
  catalogLoading = false,
  catalogError = false,
  onRetryCatalog,
  emptyFiltered = false,
  onClearFilters,
  field,
  fieldDensity,
  fieldShowAllMatches,
  fieldPlaying,
  fieldTimeScale,
  fieldEpoch,
  onFieldStats,
  fieldShown,
  fieldTotal,
  sourceNote,
  asOfUtc,
  className
}: SkyStageProps) {
  const hasField = Boolean(field && field.length > 0);
  const asOf = asOfUtc ? new Date(asOfUtc) : null;
  const asOfLabel = asOf && Number.isFinite(asOf.getTime()) ? asOf.toISOString().replace(".000Z", "Z") : null;
  const provenanceShown = fieldShown ?? shownCount;
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-deep", className)}>
      <EarthScene
        phase="alert"
        scenarioId={scenarioId}
        objects={objects}
        selectedObject={selectedId ?? undefined}
        framing={framing}
        showThreatLine={showThreatLine}
        interactive
        quality="auto"
        onSelect={onSelect}
        field={field}
        showField={hasField}
        fieldDensity={fieldDensity}
        fieldShowAllMatches={fieldShowAllMatches}
        fieldPlaying={fieldPlaying}
        fieldTimeScale={fieldTimeScale}
        fieldEpoch={fieldEpoch}
        onFieldStats={onFieldStats}
      />

      {/* Top-left: names toggle + clear selection (away from the scene's bottom-right controls). */}
      <div className="pointer-events-none absolute left-4 top-4 z-3 flex flex-col items-start gap-2">
        <div className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface/70 p-1 backdrop-blur-md">
          <button
            type="button"
            aria-pressed={showLabels}
            onClick={onToggleLabels}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70",
              showLabels ? "bg-surface-2 text-cyan" : "text-muted hover:text-strong"
            )}
          >
            <Tag aria-hidden="true" size={14} />
            Names
          </button>
          {selectedId ? (
            <button
              type="button"
              onClick={onClearSelection}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-muted transition hover:text-strong",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
              )}
            >
              <XCircle aria-hidden="true" size={14} />
              Clear
            </button>
          ) : null}
        </div>

        {/* Risk legend (color = risk) for the hero tracks. Hidden on the smallest screens. */}
        <div className="pointer-events-auto hidden flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-hairline bg-surface/70 px-3 py-2 backdrop-blur-md sm:flex">
          {LEGEND.map((entry) => (
            <span key={entry.risk} className={cn(textStyles.caption, "inline-flex items-center gap-1.5 text-muted")}>
              <span aria-hidden="true" className={cn("inline-block size-2 rounded-full", RISK_DOT_CLASS[entry.risk])} />
              {entry.label}
            </span>
          ))}
        </div>

        {/* Orbit-band legend for the cloud (color = altitude band). Only when the field is present. */}
        {hasField ? (
          <div
            data-testid="sky-band-legend"
            className="pointer-events-auto hidden flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-hairline bg-surface/70 px-3 py-2 backdrop-blur-md sm:flex"
          >
            {BAND_LEGEND.map((entry) => (
              <span key={entry.band} className={cn(textStyles.caption, "inline-flex items-center gap-1.5 text-muted")}>
                <span
                  aria-hidden="true"
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Top-right: honest "N of M shown" chip for the cloud (the field caps for performance). */}
      {hasField ? (
        <div className="pointer-events-none absolute right-4 top-4 z-3">
          <span
            data-testid="sky-count-chip"
            className={cn(
              textStyles.caption,
              "pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface/70 px-3 py-1 text-body backdrop-blur-md"
            )}
          >
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-cyan" />
            <span className="tabular-nums font-medium text-strong">{(fieldShown ?? 0).toLocaleString()}</span>
            <span className="text-muted">of {(fieldTotal ?? 0).toLocaleString()} in orbit</span>
          </span>
        </div>
      ) : null}

      {/* Centered message when filters hide everything (bare Earth behind it). */}
      {emptyFiltered ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-3 flex -translate-y-1/2 flex-col items-center gap-3 px-6 text-center">
          <p className={cn(textStyles.body, "pointer-events-auto max-w-[36ch] text-strong")}>
            No objects match that filter.
          </p>
          {onClearFilters ? (
            <Button variant="secondary" size="sm" className="pointer-events-auto" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Bottom-left: status/hint + provenance chip (scene controls live bottom-right). */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-2 flex max-w-[70%] flex-col items-start gap-2">
        {catalogError ? (
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-danger/40 bg-surface/80 px-3 py-2 backdrop-blur-md">
            <AlertTriangle aria-hidden="true" size={15} className="text-danger" />
            <span className={cn(textStyles.caption, "text-body")}>Couldn&rsquo;t load object details.</span>
            {onRetryCatalog ? (
              <button
                type="button"
                onClick={onRetryCatalog}
                className="rounded-sm text-[0.8125rem] font-medium text-cyan hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : (
          <>
            {catalogLoading ? (
              <p role="status" aria-live="polite" className={cn(textStyles.caption, "text-muted")}>
                Loading the latest orbit data…
              </p>
            ) : selectedId ? null : (
              <p className={cn(textStyles.caption, "text-muted")}>Click any glowing object to learn what it is.</p>
            )}
            <LiveChip
              live={isLive}
              label={`${
                isLive
                  ? "Live - current public TLEs from CelesTrak"
                  : "Offline demo data"
              } · ${provenanceShown.toLocaleString()} shown`}
            />
            {isLive && sourceNote ? (
              <p className={cn(textStyles.caption, "max-w-[44ch] text-faint")}>{sourceNote}</p>
            ) : null}
            {asOfLabel ? (
              <p data-testid="sky-as-of" className={cn(textStyles.caption, "text-faint")}>
                Propagated as of {asOfLabel} UTC
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
