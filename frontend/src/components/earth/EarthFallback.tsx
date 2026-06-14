/**
 * Static, offline-safe fallback for no-WebGL / low-power devices (doc 07 §10.2).
 * A pure-CSS globe built from the self-hosted Blue Marble texture plus a cyan rim
 * glow (doc 02 tokens) so the demo never shows a broken/black canvas.
 */
import type { EarthCanvasProps } from "./types";

const TEXTURE_URL = "/textures/earth-blue-marble-june-5400x2700.jpg";

export function EarthFallback(_props: EarthCanvasProps) {
  return (
    <div className="earth-scene relative grid h-full w-full place-items-center" aria-label="OrbitGuard Earth (static view)">
      <div className="relative aspect-square w-[min(70%,420px)]">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage: `url(${TEXTURE_URL})`,
            backgroundSize: "200% 100%",
            backgroundPosition: "35% center",
            boxShadow:
              "inset -34px -24px 70px rgba(0,0,0,0.78), inset 18px 12px 40px rgba(56,232,255,0.08), 0 0 70px rgba(56,232,255,0.22)"
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 0 1px rgba(56,232,255,0.35), 0 0 44px rgba(56,232,255,0.22)" }}
        />
      </div>
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-muted">
        3D view unavailable — showing a static globe.
      </p>
    </div>
  );
}
