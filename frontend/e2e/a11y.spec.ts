/**
 * Accessibility (doc 09 §2.7). Runs axe-core on each route and fails on serious /
 * critical violations. The WebGL <canvas> is excluded — it's an opaque graphics
 * surface with its own keyboard controls and aria-label on the container, not a
 * DOM tree axe can reason about.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/sky", "/threats", "/avoidance", "/report", "/learn", "/system"];

for (const path of ROUTES) {
  test(`no serious/critical a11y violations on ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.locator("main#main")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude("canvas")
      // color-contrast is disabled deliberately: the neon-noir theme uses muted
      // low-contrast text as an intentional, tracked design choice (redesign doc 02).
      // Every other serious/critical rule stays enforced.
      .disableRules(["color-contrast"])
      .analyze();

    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    const summary = blocking.map(
      (v) =>
        `${v.id} (${v.impact}) [${v.nodes
          .map((n) => n.target.join(" "))
          .slice(0, 3)
          .join(" | ")}] — ${v.help}`
    );
    expect(summary, `a11y violations on ${path}`).toEqual([]);
  });
}
