/**
 * 3D Earth scene — drag/zoom regression + graceful degradation (doc 09 §2.5).
 *
 * The flagship guard is the SIGNED drag direction. The original site had a
 * reversed-drag bug (dragging right spun the globe left). The rebuilt scene uses
 * stock OrbitControls where dragging RIGHT *decreases* the azimuthal angle
 * ("grab the globe" — the surface follows the cursor). We pin that sign so any
 * future re-introduction of inverted/custom rotation math fails loudly.
 */
import { expect, test } from "@playwright/test";

import { dragScene, sceneAzimuth, sceneDistance, waitForScene, wheelScene, zoomScene } from "./helpers";

const DRAG_PX = 240;
// Empirically a 240px drag moves azimuth ~0.68 rad; 0.2 is comfortably above
// damping noise (~0.01) yet well below the real signal.
const MIN_DELTA = 0.2;
const HERO_DISTANCE = 3.45;

test.describe("3D Earth — interaction", () => {
  test("home hero is close-framed, scrollable, and still draggable", async ({ page }) => {
    await page.goto("/");
    const scene = await waitForScene(page);

    await expect.poll(() => sceneDistance(scene), { timeout: 10_000 }).toBeLessThan(HERO_DISTANCE + 0.08);
    expect(await sceneDistance(scene)).toBeGreaterThan(HERO_DISTANCE - 0.08);
    await expect(page.getByRole("button", { name: /zoom in/i })).toHaveCount(0);
    await expect(page.getByText(/drag to rotate/i)).toBeVisible();

    const beforeDistance = await sceneDistance(scene);
    await page.evaluate(() => window.scrollTo(0, 0));
    await wheelScene(page, scene, 900);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY, "wheel over the hero should scroll the page").toBeGreaterThan(100);
    expect(Math.abs((await sceneDistance(scene)) - beforeDistance), "wheel must not zoom the hero").toBeLessThan(0.03);

    await page.evaluate(() => window.scrollTo(0, 0));
    const beforeAzimuth = await sceneAzimuth(scene);
    await dragScene(page, scene, DRAG_PX);
    const afterAzimuth = await sceneAzimuth(scene);
    expect(Math.abs(afterAzimuth - beforeAzimuth)).toBeGreaterThan(MIN_DELTA);
    expect(afterAzimuth - beforeAzimuth).toBeLessThan(0);
  });

  test("home hero uses pan-y touch while Sky keeps zoom touch control", async ({ page }) => {
    await page.goto("/");
    const homeScene = await waitForScene(page);
    await expect(homeScene).toHaveCSS("touch-action", "pan-y");
    await expect(homeScene.locator("canvas").first()).toHaveCSS("touch-action", "pan-y");

    await page.goto("/sky");
    const skyScene = await waitForScene(page);
    await expect(skyScene).toHaveCSS("touch-action", "none");
    await expect(skyScene.locator("canvas").first()).toHaveCSS("touch-action", "none");
  });

  test("renders a real WebGL scene with live telemetry", async ({ page }) => {
    await page.goto("/sky");
    const scene = await waitForScene(page);
    await expect(scene.locator("canvas")).toHaveCount(1);
    expect(Number.isFinite(await sceneAzimuth(scene))).toBe(true);
    expect(await sceneDistance(scene)).toBeGreaterThan(0);
  });

  test("dragging RIGHT decreases azimuth (the reversed-drag guard)", async ({ page }) => {
    await page.goto("/sky");
    const scene = await waitForScene(page);

    const before = await sceneAzimuth(scene);
    await dragScene(page, scene, DRAG_PX);
    const after = await sceneAzimuth(scene);

    const delta = after - before;
    expect(Math.abs(delta), "drag must actually rotate the globe").toBeGreaterThan(MIN_DELTA);
    expect(delta, "dragging right must DECREASE azimuth (grab-the-globe)").toBeLessThan(0);
  });

  test("dragging LEFT rotates the opposite way", async ({ page }) => {
    await page.goto("/sky");
    const scene = await waitForScene(page);

    const before = await sceneAzimuth(scene);
    await dragScene(page, scene, -DRAG_PX);
    const after = await sceneAzimuth(scene);

    const delta = after - before;
    expect(Math.abs(delta)).toBeGreaterThan(MIN_DELTA);
    expect(delta, "dragging left must INCREASE azimuth").toBeGreaterThan(0);
  });

  test("wheel zoom changes distance and stays within bounds", async ({ page }) => {
    await page.goto("/sky");
    const scene = await waitForScene(page);
    await expect(page.getByRole("button", { name: /zoom in/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /zoom out/i })).toBeVisible();

    const start = await sceneDistance(scene);
    await zoomScene(page, scene, -600); // zoom in
    const zoomedIn = await sceneDistance(scene);
    expect(zoomedIn, "zooming in moves the camera closer").toBeLessThan(start);

    // Hammer the zoom-in past the limit; distance must clamp, never invert/NaN.
    await zoomScene(page, scene, -6000);
    const clamped = await sceneDistance(scene);
    expect(clamped).toBeGreaterThan(0);
    expect(clamped).toBeLessThanOrEqual(zoomedIn + 0.001);
  });
});

test.describe("3D Earth — graceful degradation", () => {
  test.use({ reducedMotion: "reduce" });
  test("still renders and stays draggable under reduced motion", async ({ page }) => {
    await page.goto("/sky");
    const scene = await waitForScene(page);
    await expect(scene.locator("canvas")).toHaveCount(1);

    const before = await sceneAzimuth(scene);
    await dragScene(page, scene, DRAG_PX);
    const after = await sceneAzimuth(scene);
    // Auto-rotate is off under reduced motion, but the user can still orbit.
    expect(Math.abs(after - before)).toBeGreaterThan(MIN_DELTA);
    expect(after - before).toBeLessThan(0);
  });
});

test.describe("3D Earth — no WebGL", () => {
  test.beforeEach(async ({ page }) => {
    // Force WebGL context creation to fail so the app must use the static fallback.
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as {
        getContext: (id: string, ...rest: unknown[]) => unknown;
      };
      const original = proto.getContext;
      proto.getContext = function patched(id: string, ...rest: unknown[]) {
        if (id === "webgl" || id === "webgl2" || id === "experimental-webgl") return null;
        return (original as (this: HTMLCanvasElement, id: string, ...rest: unknown[]) => unknown).call(
          this,
          id,
          ...rest
        );
      };
    });
  });

  test("falls back to the static globe instead of crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/sky");
    const fallback = page.locator('[data-webgl="fallback"]').first();
    await expect(fallback).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-webgl="on"]')).toHaveCount(0);
    expect(errors, "fallback must not throw").toEqual([]);
  });
});
