/**
 * On-screen zoom / reset overlay (doc 07 §3.1). A Tailwind "glass" panel
 * (doc 02 §5) wired to the live OrbitControls ref — the same instance the mouse,
 * touch, and keyboard drive — so every input path stays consistent. Lowercase
 * labels and ≥44px hit targets per doc 02 §3.2 / §9.
 */
import type { MutableRefObject } from "react";
import { Move3D, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { dolly, resetView } from "./controls";
import type { CameraFraming } from "./types";

type SceneControlsOverlayProps = {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  invalidateRef: MutableRefObject<(() => void) | null>;
  framing: Partial<CameraFraming>;
  showZoomControls?: boolean;
};

const BUTTON_CLASS =
  "grid h-11 w-11 place-items-center rounded-md border border-hairline text-muted transition-colors " +
  "hover:border-cyan/40 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan";

export function SceneControlsOverlay({
  controlsRef,
  invalidateRef,
  framing,
  showZoomControls = true
}: SceneControlsOverlayProps) {
  const run = (action: (controls: OrbitControlsImpl) => void) => () => {
    const controls = controlsRef.current;
    if (!controls) return;
    action(controls);
    invalidateRef.current?.();
  };

  return (
    <div
      aria-label="3D Earth controls"
      style={{ bottom: "calc(1rem + var(--og-tour-offset, 0px))" }}
      className="pointer-events-auto absolute right-4 z-[2] flex items-center gap-3 rounded-lg border border-hairline bg-surface/70 px-3 py-2 backdrop-blur-md transition-[bottom] duration-200"
    >
      <span className="hidden items-center gap-1.5 text-[12px] text-muted sm:inline-flex">
        <Move3D size={14} aria-hidden="true" />
        drag to rotate
      </span>
      <div className="flex items-center gap-2">
        {showZoomControls ? (
          <>
            <button
              type="button"
              className={BUTTON_CLASS}
              aria-label="zoom in"
              title="zoom in"
              onClick={run((c) => dolly(c, 0.85))}
            >
              <ZoomIn size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={BUTTON_CLASS}
              aria-label="zoom out"
              title="zoom out"
              onClick={run((c) => dolly(c, 1.18))}
            >
              <ZoomOut size={16} aria-hidden="true" />
            </button>
          </>
        ) : null}
        <button
          type="button"
          className={BUTTON_CLASS}
          aria-label="reset view"
          title="reset view"
          onClick={run((c) => resetView(c, framing))}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
