/**
 * Sky "see EVERYTHING in orbit" field — the instanced SGP4 cloud (plan/03).
 *
 * Guards the signature feature end-to-end: hundreds of real objects render in one
 * instanced field, the honest "N of M" count chip + band legend show, a click
 * selects the nearest dot (syncing ?object=), a filter shrinks the cloud, and the
 * whole thing still renders a static frame under reduced motion. These pin the
 * behaviors most likely to silently regress (cap math, picking, filter wiring).
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

import { waitForScene } from "./helpers";

/** Read the rendered object count from the "N of M in orbit" chip (first number). */
async function fieldShown(page: Page): Promise<number> {
  const chip = page.getByTestId("sky-count-chip");
  const text = (await chip.textContent()) ?? "";
  const nums = text.match(/[\d,]+/g) ?? [];
  return Number((nums[0] ?? "0").replace(/,/g, ""));
}

async function openFilters(page: Page): Promise<void> {
  const filters = page.getByRole("button", { name: /filters/i });
  if ((await filters.getAttribute("aria-expanded")) !== "true") {
    await filters.click();
  }
}

/**
 * The dots are tiny and moving, so a blind single click is flaky. Sweep a few
 * rings of points around the globe centre until the field's screen-space pick
 * lands one (URL gains `?object=`). Mirrors a real user tapping near the cloud.
 */
async function scanSelect(page: Page, scene: Locator): Promise<boolean> {
  const canvas = scene.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("scene canvas has no bounding box");
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (const r of [130, 190, 250, 310, 360]) {
    for (let a = 0; a < 360; a += 30) {
      const x = cx + r * Math.cos((a * Math.PI) / 180);
      const y = cy + r * Math.sin((a * Math.PI) / 180);
      await page.mouse.click(x, y);
      await page.waitForTimeout(110); // pick → microtask → setSearchParams
      if (page.url().includes("object=")) return true;
    }
  }
  return false;
}

test.describe("Sky — the orbital field", () => {
  test("renders hundreds of objects with a count chip + band legend", async ({ page }) => {
    await page.goto("/sky");
    await waitForScene(page);

    const chip = page.getByTestId("sky-count-chip");
    await expect(chip).toBeVisible({ timeout: 20_000 });
    // The committed catalog is ~3,000 objects; the cloud must draw many of them.
    await expect.poll(() => fieldShown(page), { timeout: 20_000 }).toBeGreaterThan(50);

    // Honest denominator: "N of M in orbit".
    await expect(chip).toContainText(/of\s+[\d,]+\s+in orbit/i);

    // Orbit-band legend explains the colors.
    const legend = page.getByTestId("sky-band-legend");
    await expect(legend).toBeVisible();
    await expect(legend).toContainText("LEO");
    await expect(legend).toContainText("GEO");
  });

  test("clicking a point selects the nearest object and syncs ?object=", async ({ page }) => {
    await page.goto("/sky");
    const scene = await waitForScene(page);
    await expect.poll(() => fieldShown(page), { timeout: 20_000 }).toBeGreaterThan(50);

    const selected = await scanSelect(page, scene);
    expect(selected, "a click near the cloud should select an object").toBe(true);
    expect(page.url()).toContain("object=");
  });

  test("a filter reduces the cloud", async ({ page }) => {
    await page.goto("/sky");
    await waitForScene(page);
    await expect.poll(() => fieldShown(page), { timeout: 20_000 }).toBeGreaterThan(50);
    const before = await fieldShown(page);

    // Debris is a small slice of the catalog → the cloud must shrink noticeably.
    await openFilters(page);
    await page.getByLabel("Filter by type").selectOption("debris");
    await expect.poll(() => fieldShown(page), { timeout: 15_000 }).toBeLessThan(before);
  });

  test("country and debris-cloud filters render all matching objects", async ({ page }) => {
    await page.goto("/sky");
    await waitForScene(page);
    await expect.poll(() => fieldShown(page), { timeout: 20_000 }).toBeGreaterThan(50);

    await openFilters(page);
    await page.getByLabel("Filter by country").selectOption("India (ISRO)");
    const indiaCount = await fieldShown(page);
    expect(indiaCount, "offline bake should include a real ISRO fleet").toBeGreaterThan(20);

    await page.getByLabel("Filter by country").selectOption("any");
    await page.getByLabel("Filter by debris cloud").selectOption("cosmos-2251-debris");
    const cloudCount = await fieldShown(page);
    expect(cloudCount, "Cosmos-2251 debris cloud should be real, not a token sample").toBeGreaterThan(100);
  });

  test("notable quick-pick resolves ISS by catalog data", async ({ page }) => {
    await page.goto("/sky");
    await waitForScene(page);
    await expect.poll(() => fieldShown(page), { timeout: 20_000 }).toBeGreaterThan(50);

    await openFilters(page);
    await page.getByLabel("Pick a notable object").selectOption("iss");
    await expect(page).toHaveURL(/object=25544/);
  });
});

test.describe("Sky — reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("still renders a static field (no animation required)", async ({ page }) => {
    await page.goto("/sky");
    await waitForScene(page);
    const chip = page.getByTestId("sky-count-chip");
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => fieldShown(page), { timeout: 20_000 }).toBeGreaterThan(50);
  });
});
