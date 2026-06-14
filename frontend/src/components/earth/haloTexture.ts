/**
 * A soft radial-gradient sprite texture, generated once and cached. Tinted per
 * risk color by the sprite material; bloom smears it into a glowing point so a
 * satellite reads as a real object rather than a 2px dot (doc 07 §4.2).
 */
import * as THREE from "three";

let cached: THREE.Texture | null = null;

export function makeHaloTexture(): THREE.Texture {
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    cached = new THREE.Texture();
    return cached;
  }

  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.2, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.35)");
  gradient.addColorStop(0.75, "rgba(255,255,255,0.08)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  cached = texture;
  return cached;
}
