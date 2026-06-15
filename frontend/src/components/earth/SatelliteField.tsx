/**
 * SatelliteField — the signature "see EVERYTHING in orbit" cloud
 * (plan/03-sky-all-satellites.md §Rendering).
 *
 * Hundreds of real, SGP4-propagated objects drawn as a SINGLE THREE.InstancedMesh
 * (one draw call), colored by orbit band (debris → risk-red). Key scalability rules:
 *   - NO per-object React state, NO <Html> per instance — instance matrices are
 *     written imperatively in `useFrame`.
 *   - Constant on-screen size (per-instance scale by camera distance) so dots never
 *     vanish nor balloon.
 *   - Propagation is THROTTLED (recomputed a few times/sec) and linearly
 *     interpolated between samples → smooth 60fps with cheap per-frame work.
 *   - LOD cap from the quality tier (high≈600, low≈200; mobile harder via `cap`).
 *   - Under reduced-motion: a single static frame (no time advance).
 *   - Trails/labels ONLY for the selected object (the 4 hero tracks own their own).
 *   - Picking is screen-space nearest-instance (robust for tiny dots), guarded so it
 *     never fights an OrbitControls drag.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { BAND_COLOR, DEBRIS_COLOR } from "./colors";
import { makeHaloTexture } from "./haloTexture";
import { wasRecentlyClaimed } from "./pickClaim";
import { getSatrec, propagateToScene, sampleOrbitPath } from "./propagate";
import type { OrbitBand, QualityTier, SkyCatalogEntry } from "./types";

type SatelliteFieldProps = {
  /** Catalog entries to render (already filtered by the route). */
  catalog: SkyCatalogEntry[];
  quality: QualityTier;
  reducedMotion: boolean;
  /** Currently selected object id (matches a catalog id → draws its trail + label). */
  selectedId?: string | null;
  /** Click a point → select nearest instance. */
  onSelect?: (id: string) => void;
  /** Hard cap on instances (e.g. mobile); else derived from the tier. */
  cap?: number;
  /** Render density preset. */
  density?: "lite" | "balanced" | "max";
  /** Render all filtered matches when safely bounded instead of even-sampling. */
  showAllMatches?: boolean;
  /** Base epoch for propagation (defaults to "now"). */
  epoch?: Date;
  /** Sim seconds per wall-clock second (visual speed-up so orbits read as moving). */
  timeScale?: number;
  /** Pause/play propagation. */
  playing?: boolean;
  /** Reports the rendered count + renderable total (honest "N of M" chip). */
  onStats?: (shown: number, total: number) => void;
};

const DENSITY_CAPS = {
  lite: 800,
  balanced: 2000,
  max: 6000
} as const;
const SAMPLE_WALL_MS = 200; // re-propagate ~5×/sec; interpolate in between
const DEFAULT_TIME_SCALE = 120; // 1 real sec → 120 sim sec (LEO ≈ 46s/orbit on screen)

// Constant on-screen size: instance world-scale ≈ distance × BASE, clamped.
const SCALE_BASE = 0.0048;
const SCALE_MIN = 0.012;
const SCALE_MAX = 0.032;
const PARKED = 9000; // sentinel coord for objects that failed to propagate

const CLICK_THRESHOLD_PX = 44; // generous: a deliberate tap selects the nearest dot
const HOVER_THRESHOLD_PX = 22;
const CLICK_MOVE_TOL = 6; // > this = a drag, not a click (don't steal OrbitControls)
const HOVER_THROTTLE_MS = 60;

// Module-scoped scratch (avoid per-frame allocation).
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat = new THREE.Matrix4();
const _proj = new THREE.Vector3();
const _color = new THREE.Color();
const _fallbackPos = new THREE.Vector3();

/** HDR-boosted color so even the dimmer hues clear the bloom luminance threshold. */
function entryBand(entry: SkyCatalogEntry): OrbitBand {
  return entry.orbitClass === "LEO" || entry.orbitClass === "MEO" || entry.orbitClass === "GEO" || entry.orbitClass === "HEO"
    ? entry.orbitClass
    : "LEO";
}

function bandColor(entry: SkyCatalogEntry): THREE.Color {
  const hex = entry.kind === "debris" ? DEBRIS_COLOR : BAND_COLOR[entryBand(entry)];
  _color.set(hex);
  // Boost so reds/violets still bloom; cyan/amber already bright.
  _color.multiplyScalar(entry.kind === "debris" ? 1.7 : 1.35);
  return _color;
}

function fillEntryPositions(entries: SkyCatalogEntry[], date: Date, positions: Float32Array): number {
  let ok = 0;
  for (let i = 0; i < entries.length; i += 1) {
    const satrec = getSatrec(entries[i]);
    if (satrec && propagateToScene(satrec, date, _fallbackPos)) {
      positions[i * 3] = _fallbackPos.x;
      positions[i * 3 + 1] = _fallbackPos.y;
      positions[i * 3 + 2] = _fallbackPos.z;
      ok += 1;
    } else {
      positions[i * 3] = PARKED;
      positions[i * 3 + 1] = PARKED;
      positions[i * 3 + 2] = PARKED;
    }
  }
  return ok;
}

export function SatelliteField({
  catalog,
  quality,
  reducedMotion,
  selectedId,
  onSelect,
  cap,
  density,
  showAllMatches = false,
  epoch,
  timeScale = DEFAULT_TIME_SCALE,
  playing = true,
  onStats
}: SatelliteFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const markerRef = useRef<THREE.Group>(null);
  const tooltipRef = useRef<THREE.Group>(null);

  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const epochMs = useMemo(() => (epoch ? epoch.getTime() : Date.now()), [epoch]);

  // LOD cap → an EVEN sample of the catalog so any subset stays band-representative.
  const resolvedDensity = density ?? (quality === "low" ? "lite" : "balanced");
  const densityCap = DENSITY_CAPS[resolvedDensity];
  const resolvedCap = cap ?? (showAllMatches ? DENSITY_CAPS.max : densityCap);
  const visible = useMemo(() => {
    if (catalog.length <= resolvedCap) return catalog;
    const step = catalog.length / resolvedCap;
    const out: SkyCatalogEntry[] = [];
    for (let i = 0; i < resolvedCap; i += 1) out.push(catalog[Math.floor(i * step)]);
    return out;
  }, [catalog, resolvedCap]);

  const count = visible.length;
  const idIndex = useMemo(() => {
    const map = new Map<string, number>();
    visible.forEach((sat, i) => map.set(sat.id, i));
    return map;
  }, [visible]);

  // Double-buffered positions for throttled propagation + interpolation.
  const buffers = useMemo(
    () => ({
      prev: new Float32Array(count * 3),
      next: new Float32Array(count * 3),
      curr: new Float32Array(count * 3)
    }),
    [count]
  );
  const simBaseRef = useRef(0); // sim ms offset of `prev` from epoch
  const sampleWallRef = useRef(0);
  const simStepMs = SAMPLE_WALL_MS * timeScale;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hoverIndexRef = useRef<number | null>(null);
  const lastHoverRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const workerGenerationRef = useRef(0);
  const requestIdRef = useRef(0);
  const pendingWorkerTargetsRef = useRef(new Map<number, { generation: number; target: "prev" | "next" }>());
  const [workerAvailable, setWorkerAvailable] = useState(() => typeof Worker !== "undefined");

  const selectedIndex = selectedId != null ? idIndex.get(selectedId) ?? null : null;
  const selectedSat = selectedIndex != null ? visible[selectedIndex] : null;
  const selectedSatrec = useMemo(() => (selectedSat ? getSatrec(selectedSat) : null), [selectedSat]);

  // Selected object's orbit trail (one revolution sampled at the epoch). Never the whole cloud.
  const trailPoints = useMemo(() => {
    if (!selectedSatrec) return null;
    const pts = sampleOrbitPath(selectedSatrec, new Date(epochMs), 128);
    return pts.length > 2 ? pts : null;
  }, [selectedSatrec, epochMs]);
  const selectedColorHex = selectedSat
    ? selectedSat.kind === "debris"
      ? DEBRIS_COLOR
      : BAND_COLOR[entryBand(selectedSat)]
    : "#ffffff";

  // Write instance matrices from a position buffer, scaling each for constant on-screen size.
  const writeMatrices = (positions: Float32Array) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i += 1) {
      _pos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      if (_pos.x >= PARKED) {
        _scale.setScalar(0); // hide failed/decayed instances
      } else {
        const d = camera.position.distanceTo(_pos);
        const s = THREE.MathUtils.clamp(d * SCALE_BASE, SCALE_MIN, SCALE_MAX);
        _scale.setScalar(s);
      }
      _mat.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _mat);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  const requestWorkerPositions = (atMs: number, target: "prev" | "next") => {
    const worker = workerRef.current;
    if (!worker) return false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    pendingWorkerTargetsRef.current.set(requestId, { generation: workerGenerationRef.current, target });
    worker.postMessage({ type: "tick", requestId, epochMs: atMs });
    return true;
  };

  // (Re)initialize buffers, colors, worker state, and matrices whenever the visible set changes.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) {
      onStats?.(0, catalog.length);
      return;
    }
    const base = new Date(epochMs);
    buffers.prev.fill(PARKED);
    buffers.next.fill(PARKED);
    buffers.curr.fill(PARKED);
    simBaseRef.current = 0;
    sampleWallRef.current = performance.now();

    for (let i = 0; i < count; i += 1) {
      mesh.setColorAt(i, bandColor(visible[i]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    writeMatrices(buffers.curr);
    onStats?.(count, catalog.length);

    workerGenerationRef.current += 1;
    pendingWorkerTargetsRef.current.clear();

    if (workerAvailable) {
      try {
        workerRef.current?.terminate();
        const worker = new Worker(new URL("./propagate.worker.ts", import.meta.url), { type: "module" });
        workerRef.current = worker;
        const generation = workerGenerationRef.current;
        worker.onmessage = (event: MessageEvent<{ type: string; requestId?: number; buffer?: ArrayBuffer }>) => {
          if (generation !== workerGenerationRef.current) return;
          if (event.data.type !== "positions" || event.data.requestId == null || !event.data.buffer) return;
          const pending = pendingWorkerTargetsRef.current.get(event.data.requestId);
          if (!pending || pending.generation !== workerGenerationRef.current) return;
          pendingWorkerTargetsRef.current.delete(event.data.requestId);
          const positions = new Float32Array(event.data.buffer);
          const target = buffers[pending.target];
          if (positions.length === target.length) {
            target.set(positions);
            if (pending.target === "prev") {
              buffers.curr.set(buffers.prev);
              writeMatrices(buffers.curr);
            }
            invalidate();
          }
        };
        worker.onerror = () => {
          worker.terminate();
          if (workerRef.current === worker) workerRef.current = null;
          setWorkerAvailable(false);
        };
        worker.postMessage({ type: "init", entries: visible });
        requestWorkerPositions(base.getTime(), "prev");
        requestWorkerPositions(epochMs + simStepMs, "next");
      } catch {
        workerRef.current = null;
        setWorkerAvailable(false);
      }
    }

    if (!workerAvailable) {
      fillEntryPositions(visible, base, buffers.prev);
      fillEntryPositions(visible, new Date(epochMs + simStepMs), buffers.next);
      buffers.curr.set(buffers.prev);
      writeMatrices(buffers.curr);
    }

    invalidate();
    return () => {
      workerGenerationRef.current += 1;
      pendingWorkerTargetsRef.current.clear();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, buffers, epochMs, simStepMs, workerAvailable]);

  useEffect(() => {
    hoverIndexRef.current = hoverIndex;
  }, [hoverIndex]);

  // Refresh a frame when selection/hover changes (matters under the demand frameloop).
  useEffect(() => {
    invalidate();
  }, [selectedIndex, hoverIndex, invalidate]);

  // --- screen-space picking (robust for tiny dots; never fights an OrbitControls drag) ---
  useEffect(() => {
    const el = gl.domElement;
    let downX = 0;
    let downY = 0;
    let downAt = 0;

    const nearest = (clientX: number, clientY: number, thresholdPx: number): number | null => {
      const rect = el.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const positions = buffers.curr;
      let best = -1;
      let bestDist = thresholdPx * thresholdPx; // nearest within the pixel threshold wins
      for (let i = 0; i < count; i += 1) {
        const x = positions[i * 3];
        if (x >= PARKED) continue;
        _proj.set(x, positions[i * 3 + 1], positions[i * 3 + 2]).project(camera);
        if (_proj.z < -1 || _proj.z > 1) continue; // behind camera / clipped
        const sx = (_proj.x * 0.5 + 0.5) * w;
        const sy = (-_proj.y * 0.5 + 0.5) * h;
        const dx = sx - px;
        const dy = sy - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          best = i;
        }
      }
      return best >= 0 ? best : null;
    };

    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downAt = performance.now();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!onSelect) return;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > CLICK_MOVE_TOL || performance.now() - downAt > 700) return; // a drag, not a click
      const cx = e.clientX;
      const cy = e.clientY;
      // Defer to a microtask so a hero <Satellite> click (R3F raycast, fired in this
      // same event) can claim the pick first; the cloud yields to the mission story.
      queueMicrotask(() => {
        if (wasRecentlyClaimed()) return;
        const hit = nearest(cx, cy, CLICK_THRESHOLD_PX);
        if (hit != null) onSelect(visible[hit].id);
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons !== 0) return; // dragging → don't hover-pick
      const now = performance.now();
      if (now - lastHoverRef.current < HOVER_THROTTLE_MS) return;
      lastHoverRef.current = now;
      const hit = nearest(e.clientX, e.clientY, HOVER_THRESHOLD_PX);
      if (hit !== hoverIndexRef.current) {
        setHoverIndex(hit);
        document.body.style.cursor = hit != null && onSelect ? "pointer" : "";
      }
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("pointerup", onPointerUp, { passive: true });
    el.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointermove", onPointerMove);
      document.body.style.cursor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, count, visible, buffers, onSelect]);

  useFrame(() => {
    if (count === 0) return;

    if (!reducedMotion && playing) {
      const wallNow = performance.now();
      let f = (wallNow - sampleWallRef.current) / SAMPLE_WALL_MS;
      // Advance the sample window (loop in case several elapsed; resync after a long stall).
      let guard = 0;
      while (f >= 1 && guard < 4) {
        buffers.prev.set(buffers.next);
        simBaseRef.current += simStepMs;
        if (workerAvailable && workerRef.current) {
          requestWorkerPositions(epochMs + simBaseRef.current + simStepMs, "next");
        } else {
          fillEntryPositions(visible, new Date(epochMs + simBaseRef.current + simStepMs), buffers.next);
        }
        sampleWallRef.current += SAMPLE_WALL_MS;
        f -= 1;
        guard += 1;
      }
      if (f >= 1) {
        // Big stall (tab backgrounded): resync hard.
        if (workerAvailable && workerRef.current) {
          requestWorkerPositions(epochMs + simBaseRef.current, "prev");
          requestWorkerPositions(epochMs + simBaseRef.current + simStepMs, "next");
        } else {
          fillEntryPositions(visible, new Date(epochMs + simBaseRef.current), buffers.prev);
          fillEntryPositions(visible, new Date(epochMs + simBaseRef.current + simStepMs), buffers.next);
        }
        sampleWallRef.current = wallNow;
        f = 0;
      }
      const t = THREE.MathUtils.clamp(f, 0, 1);
      const { prev, next, curr } = buffers;
      for (let i = 0; i < curr.length; i += 1) {
        const a = prev[i];
        const b = next[i];
        // Don't interpolate to/from a parked sentinel — keep it parked.
        curr[i] = a >= PARKED || b >= PARKED ? Math.max(a, b) : a + (b - a) * t;
      }
    }

    writeMatrices(buffers.curr);

    // Position the selected marker + the shared hover tooltip at their live positions.
    if (markerRef.current) {
      if (selectedIndex != null) {
        const i = selectedIndex;
        markerRef.current.visible = buffers.curr[i * 3] < PARKED;
        markerRef.current.position.set(buffers.curr[i * 3], buffers.curr[i * 3 + 1], buffers.curr[i * 3 + 2]);
        const d = camera.position.distanceTo(markerRef.current.position);
        markerRef.current.scale.setScalar(THREE.MathUtils.clamp(d * 0.02, 0.05, 0.16));
      } else {
        markerRef.current.visible = false;
      }
    }
    if (tooltipRef.current) {
      if (hoverIndex != null && hoverIndex !== selectedIndex) {
        tooltipRef.current.visible = buffers.curr[hoverIndex * 3] < PARKED;
        tooltipRef.current.position.set(
          buffers.curr[hoverIndex * 3],
          buffers.curr[hoverIndex * 3 + 1],
          buffers.curr[hoverIndex * 3 + 2]
        );
      } else {
        tooltipRef.current.visible = false;
      }
    }
  });

  const halo = useMemo(() => makeHaloTexture(), []);
  const hoveredSat = hoverIndex != null ? visible[hoverIndex] : null;

  return (
    <group>
      {count > 0 && (
        <instancedMesh
          ref={meshRef}
          args={[undefined, undefined, count]}
          frustumCulled={false}
          // Tiny dots are picked in screen space (see effect above), so skip raycast cost here.
          raycast={() => null}
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}

      {/* Selected object: emphasized marker + orbit trail + label (never the whole cloud). */}
      {trailPoints && (
        <Line
          points={trailPoints}
          color={selectedColorHex}
          lineWidth={1.6}
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      )}
      <group ref={markerRef} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={selectedColorHex} toneMapped={false} />
        </mesh>
        <sprite scale={[3, 3, 1]}>
          <spriteMaterial
            map={halo}
            color={selectedColorHex}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            transparent
            opacity={0.85}
            toneMapped={false}
          />
        </sprite>
        {selectedSat && (
          <Html center distanceFactor={9} position={[0, 1.6, 0]} wrapperClass="earth-label-wrapper" zIndexRange={[24, 0]}>
            <span
              className="select-none whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md"
              style={{
                color: selectedColorHex,
                border: `1px solid ${selectedColorHex}66`,
                background: "rgba(8, 12, 20, 0.78)",
                boxShadow: `0 0 16px ${selectedColorHex}44`
              }}
            >
              {selectedSat.name}
            </span>
          </Html>
        )}
      </group>

      {/* ONE shared hover tooltip for the whole field. */}
      <group ref={tooltipRef} visible={false}>
        {hoveredSat && (
          <Html center distanceFactor={10} position={[0, 0, 0]} wrapperClass="earth-label-wrapper" zIndexRange={[22, 0]}>
            <span
              className="pointer-events-none select-none whitespace-nowrap rounded-md border border-hairline bg-[rgba(8,12,20,0.82)] px-2 py-0.5 text-[10.5px] font-medium text-strong backdrop-blur-md"
              style={{ transform: "translateY(-14px)" }}
            >
              {hoveredSat.name}
            </span>
          </Html>
        )}
      </group>
    </group>
  );
}
