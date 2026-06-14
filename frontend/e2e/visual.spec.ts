/**
 * Visual / layout integrity (doc 09 §2.8). The original site "flushed all content
 * onto the page"; the redesign must never overflow horizontally or hide content
 * off-screen. We assert NO horizontal scroll at both desktop and mobile widths —
 * a deterministic, machine-independent check (no brittle pixel snapshots).
 */
import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/sky", "/threats", "/avoidance", "/report", "/learn", "/system"];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 }
];

async function horizontalOverflowPx(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

for (const vp of VIEWPORTS) {
  for (const path of ROUTES) {
    test(`${path} has no horizontal overflow @ ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.locator("main#main")).toBeVisible();
      // Let any 3D / async content settle so late layout shifts are caught.
      await page.waitForTimeout(800);

      const overflow = await horizontalOverflowPx(page);
      // ≤1px tolerates sub-pixel rounding; anything more is a real layout break.
      expect(overflow, `${path} overflows horizontally by ${overflow}px @ ${vp.name}`).toBeLessThanOrEqual(1);
    });
  }
}
