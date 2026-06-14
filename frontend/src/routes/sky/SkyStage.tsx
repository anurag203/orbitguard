/**
 * SkyStage — the focal element: a large interactive Earth with restrained overlays
 * (redesign/routes/02-sky.md §4.2, §8). The scene owns drag + zoom + camera-reset (bottom-right);
 * the route adds only a names toggle + clear-selection (top-left), a risk legend, a provenance chip,
 * and the empty-selection hint (bottom-left). Chrome stays out of the scene's own controls' corner.
 */
import { AlertTriangle, Tag, XCircle } from "lucide-react";

import { EarthScene, type CameraFraming, type OrbitObject } from "../../components/earth";
import { Button, cn, LiveChip, textStyles } from "../../components/ui";
import { RISK_DOT_CLASS } from "./sky-data";

const LEGEND: Array<{ risk: keyof typeof RISK_DOT_CLASS; label: string }> = [
  { risk: "safe", label: "Protected" },
  { risk: "watch", label: "Watching" },
  { risk: "warning", label: "Caution" },
  { risk: "danger", label: "Debris / risk" }
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
  className
}: SkyStageProps) {
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

        {/* Risk legend (color = risk). Hidden on the smallest screens to keep the globe clean. */}
        <div className="pointer-events-auto hidden flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-hairline bg-surface/70 px-3 py-2 backdrop-blur-md sm:flex">
          {LEGEND.map((entry) => (
            <span key={entry.risk} className={cn(textStyles.caption, "inline-flex items-center gap-1.5 text-muted")}>
              <span aria-hidden="true" className={cn("inline-block size-2 rounded-full", RISK_DOT_CLASS[entry.risk])} />
              {entry.label}
            </span>
          ))}
        </div>
      </div>

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
              <p className={cn(textStyles.caption, "text-muted")}>Tap any glowing object to learn what it is.</p>
            )}
            <LiveChip live={isLive} label={`${isLive ? "Live data" : "Offline demo data"} · ${shownCount} shown`} />
          </>
        )}
      </div>
    </div>
  );
}
