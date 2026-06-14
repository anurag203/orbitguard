/**
 * EarthCanvas — the public R3F entry (doc 07 §2.3). The only heavy module: it
 * statically imports three / fiber / drei / postprocessing, so it lands in its
 * own lazy chunk (loaded via the EarthScene adapter's `React.lazy`).
 *
 * Wires: ACESFilmic tone mapping + capped pixel ratio, a cinematic starfield,
 * the textured Earth + atmosphere, declarative satellites/trails/conjunction
 * marker, the OrbitControls drag fix, per-route camera framing, bloom, the DOM
 * zoom/reset overlay, keyboard control, and reduced-motion / no-WebGL fallbacks.
 */
import { Suspense, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { CameraRig } from "./CameraRig";
import { ConjunctionMarker } from "./ConjunctionMarker";
import { Earth } from "./Earth";
import { EarthFallback } from "./EarthFallback";
import { OrbitTrail } from "./OrbitTrail";
import { PostFX } from "./PostFX";
import { Satellite } from "./Satellite";
import { SceneControls } from "./SceneControls";
import { SceneControlsOverlay } from "./SceneControlsOverlay";
import { SceneLights } from "./SceneLights";
import { Starfield } from "./Starfield";
import { RISK_COLOR, SPACE } from "./colors";
import { dolly, resetView, rotateBy } from "./controls";
import { PROTECTED_ID, THREAT_ID, framingFor } from "./scene.config";
import { hasWebGL, usePrefersReducedMotion, useQualityTier } from "./useEarthEnv";
import type { CameraFraming, EarthCanvasProps, MissionPhase, OrbitObject } from "./types";

const DEFAULT_MIN_DISTANCE = 3.2;
const DEFAULT_MAX_DISTANCE = 9;
const DEFAULT_FOV = 33;
const MANEUVER_RADIUS_OFFSET = 0.16;

type SceneContentProps = {
  objects: OrbitObject[];
  selected?: string;
  phase: MissionPhase;
  reducedMotion: boolean;
  showThreatLine?: boolean;
  onSelect?: (id: string) => void;
};

/**
 * Declarative composition of objects → trails + satellites, plus the optional
 * "after" maneuver path and the conjunction marker (replaces the legacy
 * imperative `TRACKS.map(...)` loop).
 */
function SceneContent({ objects, selected, phase, reducedMotion, showThreatLine, onSelect }: SceneContentProps) {
  const protectedObject =
    objects.find((object) => object.id === PROTECTED_ID) ?? objects.find((object) => object.risk === "safe");
  const threatObject =
    objects.find((object) => object.id === THREAT_ID) ?? objects.find((object) => object.risk === "danger");
  const showManeuver = phase !== "alert" && Boolean(protectedObject);

  return (
    <>
      {objects.map((object) => (
        <group key={object.id}>
          <OrbitTrail orbit={object.orbit} risk={object.risk} emphasized={object.id === selected} />
          <Satellite
            object={object}
            selected={object.id === selected}
            reducedMotion={reducedMotion}
            onSelect={onSelect}
          />
        </group>
      ))}

      {showManeuver && protectedObject && (
        <OrbitTrail
          orbit={{ ...protectedObject.orbit, radius: protectedObject.orbit.radius + MANEUVER_RADIUS_OFFSET }}
          risk="warning"
          color={RISK_COLOR.warning}
        />
      )}

      {showThreatLine && protectedObject && threatObject && protectedObject.id !== threatObject.id && (
        <ConjunctionMarker protectedObject={protectedObject} threatObject={threatObject} reducedMotion={reducedMotion} />
      )}
    </>
  );
}

function EarthCanvas(props: EarthCanvasProps) {
  const {
    objects,
    selected,
    phase,
    scenarioId,
    interactive = true,
    quality = "auto",
    framing,
    showThreatLine,
    onSelect
  } = props;

  const reducedMotion = usePrefersReducedMotion();
  const tier = useQualityTier(quality);
  const webgl = useMemo(() => hasWebGL(), []);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const invalidateRef = useRef<(() => void) | null>(null);
  const interactingRef = useRef(false);
  const [idle, setIdle] = useState(true);

  const resolvedFraming: Partial<CameraFraming> = useMemo(
    () => ({ ...framingFor(scenarioId, phase, selected), ...(framing ?? {}) }),
    [scenarioId, phase, selected, framing]
  );

  if (!webgl) return <EarthFallback {...props} />;

  const minDistance = resolvedFraming.minDistance ?? DEFAULT_MIN_DISTANCE;
  const maxDistance = resolvedFraming.maxDistance ?? DEFAULT_MAX_DISTANCE;
  const fov = resolvedFraming.fov ?? DEFAULT_FOV;
  const dpr: number | [number, number] = tier === "low" ? 1 : [1, 2];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const controls = controlsRef.current;
    if (!controls || !interactive) return;
    switch (event.key) {
      case "ArrowLeft":
        rotateBy(controls, -0.18, 0);
        break;
      case "ArrowRight":
        rotateBy(controls, 0.18, 0);
        break;
      case "ArrowUp":
        rotateBy(controls, 0, -0.14);
        break;
      case "ArrowDown":
        rotateBy(controls, 0, 0.14);
        break;
      case "+":
      case "=":
        dolly(controls, 0.88);
        break;
      case "-":
      case "_":
        dolly(controls, 1.12);
        break;
      case "0":
      case "r":
      case "R":
        resetView(controls, resolvedFraming);
        break;
      default:
        return;
    }
    event.preventDefault();
    invalidateRef.current?.();
  };

  return (
    <div
      className="earth-scene relative h-full w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
      style={{ touchAction: "none" }}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={onKeyDown}
      role="application"
      aria-label="OrbitGuard interactive 3D Earth"
    >
      <Canvas
        dpr={dpr}
        gl={{
          antialias: tier !== "low",
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05
        }}
        camera={{ fov, position: [0, 0.4, 6], near: 0.1, far: 200 }}
        frameloop={reducedMotion ? "demand" : "always"}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <color attach="background" args={[SPACE.void]} />
        <SceneLights />
        <Suspense fallback={null}>
          <Starfield quality={tier} reducedMotion={reducedMotion} />
          <Earth reducedMotion={reducedMotion} />
          <SceneContent
            objects={objects}
            selected={selected}
            phase={phase}
            reducedMotion={reducedMotion}
            showThreatLine={showThreatLine}
            onSelect={onSelect}
          />
        </Suspense>
        <CameraRig
          controlsRef={controlsRef}
          interactingRef={interactingRef}
          framing={resolvedFraming}
          reducedMotion={reducedMotion}
        />
        <SceneControls
          controlsRef={controlsRef}
          interactingRef={interactingRef}
          invalidateRef={invalidateRef}
          interactive={interactive}
          reducedMotion={reducedMotion}
          autoRotate={resolvedFraming.autoRotate ?? false}
          idle={idle}
          setIdle={setIdle}
          minDistance={minDistance}
          maxDistance={maxDistance}
        />
        <PostFX quality={tier} />
      </Canvas>

      {interactive && (
        <SceneControlsOverlay controlsRef={controlsRef} invalidateRef={invalidateRef} framing={resolvedFraming} />
      )}
    </div>
  );
}

export default EarthCanvas;
export { EarthCanvas };
