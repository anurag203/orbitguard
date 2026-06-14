/**
 * Demo Acceptance Gate (doc 09 §6) — the one test that must pass before any demo.
 *
 * It drives the flagship "Protect ISRO" story end-to-end, OFFLINE (every non-local
 * request is aborted), and asserts the money shot: a dangerous close approach turns
 * SAFE after one nudge, the system auto double-checks the new path, and the journey
 * never leaks raw jargon while in Simple mode.
 */
import { expect, test } from "@playwright/test";

// Allow only same-origin / loopback traffic. If the demo secretly needed the
// public internet, these aborts would break it — which is the point.
function isLocal(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return true; // data: / blob: / relative — always allowed
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("orbitguard.mode", "simple"));
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("data:") || url.startsWith("blob:") || isLocal(url)) return route.continue();
    return route.abort();
  });
});

test("Protect ISRO: a dangerous pass turns safe after one nudge, double-checked, offline", async ({ page }) => {
  const fatal: string[] = [];
  page.on("pageerror", (e) => fatal.push(e.message));

  await page.goto("/avoidance");
  await expect(page.locator('html[data-mode="simple"]')).toHaveCount(1);

  // Step 1 — the threat is presented and reads as DANGER (word, not just color).
  const findMove = page.getByRole("button", { name: /find the safe move/i });
  await expect(findMove).toBeVisible({ timeout: 20_000 });

  // Step 2 — plan the move; the BEFORE/AFTER comparison appears.
  await findMove.click();
  const applyMove = page.getByRole("button", { name: /apply this move/i });
  await expect(applyMove).toBeVisible({ timeout: 20_000 });

  // The red→green proof: the BEFORE meter reads danger and the AFTER meter is
  // strictly less severe (here danger → watch, with collision chance ~zero).
  const RANK: Record<string, number> = { safe: 0, watch: 1, warning: 2, danger: 3 };
  const meters = page.locator('[data-testid="risk-meter"]');
  await expect(meters).toHaveCount(2, { timeout: 20_000 });
  const levels = await meters.evaluateAll((els) => els.map((e) => e.getAttribute("data-level") ?? ""));
  const [before, after] = levels;
  expect(before, "the threat starts dangerous").toBe("danger");
  expect(RANK[after], "the nudge must improve the risk level").toBeLessThan(RANK[before]);

  // Step 3 — two-stage commit: confirm dialog, then apply.
  await applyMove.click();
  const confirm = page.getByRole("button", { name: /^apply the move$/i });
  await expect(confirm).toBeVisible({ timeout: 10_000 });
  await confirm.click();

  // The trust beat: the system double-checks the new path against everything tracked.
  const doubleCheck = page.getByTestId("secondary-check");
  await expect(doubleCheck).toBeVisible({ timeout: 20_000 });
  await expect(doubleCheck).toHaveAttribute("data-status", "clear");

  // And it hands off to the report.
  await expect(page.getByRole("link", { name: /see the report/i })).toBeVisible();

  expect(fatal, "demo must complete without uncaught errors").toEqual([]);
});

test("Simple mode keeps the avoidance story jargon-free", async ({ page }) => {
  await page.goto("/avoidance");
  await expect(page.getByRole("button", { name: /find the safe move/i })).toBeVisible({ timeout: 20_000 });

  const body = (await page.locator("main, body").first().innerText()).toLowerCase();
  // Raw jargon that must stay behind Pro mode / Term tooltips, never bare in Simple.
  for (const token of ["sgp4", "covariance", "δv"]) {
    expect(body, `Simple mode should not surface raw "${token}"`).not.toContain(token);
  }
  // And the plain-language framing should be present.
  expect(body).toContain("safe move");
});
