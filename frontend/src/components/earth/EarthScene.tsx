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

import { framingFor, scenarioObjects } from "./scene.config";
import type { EarthSceneProps } from "./types";

const EarthCanvas = lazy(() => import("./EarthCanvas"));

export function EarthScene({
  phase,
  scenarioId,
  selectedObject,
  objects,
  interactive,
  quality,
  framing,
  showThreatLine,
  showLabels,
  onSelect,
  field,
  showField,
  fieldCap,
  onFieldStats
}: EarthSceneProps) {
  return (
    <Suspense fallback={<div className="earth-scene relative h-full w-full" aria-busy="true" />}>
      <EarthCanvas
        objects={objects ?? scenarioObjects(scenarioId)}
        selected={selectedObject}
        phase={phase}
        scenarioId={scenarioId}
        interactive={interactive ?? true}
        quality={quality ?? "auto"}
        framing={framing ?? framingFor(scenarioId, phase, selectedObject)}
        showThreatLine={showThreatLine ?? (phase === "alert" || phase === "planned")}
        showLabels={showLabels ?? true}
        onSelect={onSelect}
        field={field}
        showField={showField}
        fieldCap={fieldCap}
        onFieldStats={onFieldStats}
      />
    </Suspense>
  );
}

export default EarthScene;
