/**
 * Shared E2E helpers (doc 09 §2.5, Appendix A). Centralizes the scene telemetry
 * reads and the drag/zoom gestures so every spec drives the Earth identically.
 *
 * Gesture note: drei OrbitControls only rotates when it receives a sequence of
 * discrete `pointermove`s. A single Playwright `mouse.move(..., { steps })` does
 * NOT reliably deliver them headless, so we emit several explicit moves.
 */
import { expect, type Locator, type Page } from "@playwright/test";

/** The interactive WebGL scene container with live OrbitControls telemetry. */
export async function waitForScene(page: Page): Promise<Locator> {
  const scene = page.locator('[data-webgl="on"]').first();
  await expect(scene).toBeVisible({ timeout: 25_000 });
  // Telemetry (data-azimuth) only populates once the canvas has rendered a frame.
  await expect.poll(async () => await scene.getAttribute("data-azimuth"), { timeout: 15_000 }).not.toBeNull();
  return scene;
}

export async function sceneAzimuth(scene: Locator): Promise<number> {
  return Number(await scene.getAttribute("data-azimuth"));
}

export async function sceneDistance(scene: Locator): Promise<number> {
  return Number(await scene.getAttribute("data-distance"));
}

/** Drag across the scene by (dx, dy) screen pixels via discrete pointer moves. */
export async function dragScene(page: Page, scene: Locator, dx: number, dy = 0): Promise<void> {
  const canvas = scene.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("scene canvas has no bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps);
  }
  await page.mouse.up();
  await page.waitForTimeout(350); // let damping settle so the read is final
}

/** Wheel-zoom over the scene center. Negative deltaY = zoom in (closer). */
export async function zoomScene(page: Page, scene: Locator, deltaY: number): Promise<void> {
  const canvas = scene.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("scene canvas has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(350);
}
