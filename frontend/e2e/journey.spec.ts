/**
 * Route journey (doc 09 §2.6) — every route loads with meaningful content and no
 * uncaught errors, legacy links still redirect, and Simple/Pro persists across
 * navigation. The broad "nothing is on fire" net.
 */
import { expect, test, type Page } from "@playwright/test";

const ROUTES = ["/", "/sky", "/threats", "/avoidance", "/report", "/learn", "/system"];

// Console noise we don't want failing the suite (dev warnings, devtools nudge).
const BENIGN = [/React DevTools/i, /Download the React/i, /three-mesh-bvh/i, /\[vite\]/i, /Lit is in dev mode/i];

function attachErrorCollectors(page: Page) {
  const fatal: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => fatal.push(e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (!BENIGN.some((re) => re.test(text))) consoleErrors.push(text);
  });
  return { fatal, consoleErrors };
}

for (const path of ROUTES) {
  test(`route ${path} loads cleanly`, async ({ page }) => {
    const { fatal, consoleErrors } = attachErrorCollectors(page);
    await page.goto(path, { waitUntil: "networkidle" });

    // The shell <main> is always present and must carry real content.
    const main = page.locator("main#main");
    await expect(main).toBeVisible();
    await expect.poll(async () => (await main.innerText()).trim().length, { timeout: 15_000 }).toBeGreaterThan(30);

    // Every route presents either a page heading or (on the immersive Sky) the scene.
    const anchors = (await page.getByRole("heading", { level: 1 }).count()) + (await page.locator("[data-webgl]").count());
    expect(anchors, `${path} has no h1 and no scene`).toBeGreaterThan(0);

    expect(fatal, `${path} threw`).toEqual([]);
    expect(consoleErrors, `${path} logged console errors`).toEqual([]);
  });
}

test("legacy URLs redirect to the new routes", async ({ page }) => {
  const redirects: Array<[string, RegExp]> = [
    ["/mission", /\/sky$/],
    ["/catalog", /\/sky$/],
    ["/risk", /\/threats$/],
    ["/reports", /\/report$/],
    ["/architecture", /\/system$/]
  ];
  for (const [from, to] of redirects) {
    await page.goto(from);
    await expect(page).toHaveURL(to);
  }
  // Unknown paths fall back home.
  await page.goto("/this-does-not-exist");
  await expect(page).toHaveURL(/\/$/);
});

test("Simple ↔ Pro toggle flips and persists across navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "simple");

  const toggle = page.getByRole("switch").first();
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "pro");

  await page.goto("/threats");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "pro");
});

test("core routes show the workflow progress and route intro", async ({ page }) => {
  await page.goto("/threats");

  await expect(page.getByRole("navigation", { name: /workflow progress/i })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /spot the danger/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /step 2 of 4: spot the danger/i })).toHaveAttribute("aria-current", "step");
});

test("Threats switches through Protect ISRO, 2009, and Kessler scenarios", async ({ page }) => {
  await page.goto("/threats");

  const scenarios = [
    { tab: /2009/i, id: "2009-replay", evidence: /Iridium 33|2009/i },
    { tab: /kessler/i, id: "kessler-sandbox", evidence: /policy satellite|Kessler/i },
    { tab: /protect isro/i, id: "protect-isro", evidence: /CARTOSAT-2F|Protect ISRO/i }
  ];

  for (const scenario of scenarios) {
    await page.getByRole("tab", { name: scenario.tab }).click();
    await expect(page).toHaveURL(new RegExp(`scenario=${scenario.id}`));
    await expect(page.locator("main#main")).toContainText(scenario.evidence, { timeout: 20_000 });
  }
});
