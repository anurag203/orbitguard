/**
 * EarthScene — the drop-in public component (doc 07 §11.1).
 *
 * Prop shape is backwards-compatible with the legacy `EarthScene`
 * (`{ phase, scenarioId, selectedObject }`) plus optional Wave-2 extensions
 * (objects / interactive / quality / framing / showThreatLine / onSelect).
 *
 * The heavy R3F canvas is `React.lazy`-imported here, so it CODE-SPLITS into its
 * own chunk: this module + scene.config + colors + types stay light (no three),
 * and the 3D bundle only loads when a route actually renders the scene.
 */
import { Suspense, lazy } from "react";

import { EarthFallback } from "./EarthFallback";
import { framingFor, scenarioObjects } from "./scene.config";
import type { EarthSceneProps } from "./types";

const EarthCanvas = lazy(() => import("./EarthCanvas"));

export function EarthScene({
  phase,
  scenarioId,
  selectedObject,
  objects,
  interactive,
  enableZoom,
  quality,
  framing,
  showThreatLine,
  showLabels,
  onSelect,
  field,
  showField,
  fieldCap,
  fieldDensity,
  fieldShowAllMatches,
  fieldPlaying,
  fieldTimeScale,
  fieldEpoch,
  onFieldStats
}: EarthSceneProps) {
  const resolvedObjects = objects ?? scenarioObjects(scenarioId);
  const resolvedFraming = framing ?? framingFor(scenarioId, phase, selectedObject);
  const resolvedShowThreatLine = showThreatLine ?? (phase === "alert" || phase === "planned");
  const resolvedShowLabels = showLabels ?? true;

  return (
    <Suspense
      fallback={
        <EarthFallback
          objects={resolvedObjects}
          selected={selectedObject}
          phase={phase}
          scenarioId={scenarioId}
          framing={resolvedFraming}
          showThreatLine={resolvedShowThreatLine}
          showLabels={resolvedShowLabels}
        />
      }
    >
      <EarthCanvas
        objects={resolvedObjects}
        selected={selectedObject}
        phase={phase}
        scenarioId={scenarioId}
        interactive={interactive ?? true}
        enableZoom={enableZoom ?? true}
        quality={quality ?? "auto"}
        framing={resolvedFraming}
        showThreatLine={resolvedShowThreatLine}
        showLabels={resolvedShowLabels}
        onSelect={onSelect}
        field={field}
        showField={showField}
        fieldCap={fieldCap}
        fieldDensity={fieldDensity}
        fieldShowAllMatches={fieldShowAllMatches}
        fieldPlaying={fieldPlaying}
        fieldTimeScale={fieldTimeScale}
        fieldEpoch={fieldEpoch}
        onFieldStats={onFieldStats}
      />
    </Suspense>
  );
}

export default EarthScene;
