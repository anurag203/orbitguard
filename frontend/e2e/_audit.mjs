// UI/UX RECON audit: visits every route at desktop + mobile, full-page screenshots,
// per-route console/page errors, a dedicated Guided Tour probe, and a Sky object-count
// probe. Read-only against the running dev server — touches no app source.
//
//   Run:  node e2e/_audit.mjs   (dev server must be on http://127.0.0.1:5173)
//
// Output:
//   <repo>/plan/audit/screens/<route>-<viewport>.png   full-page screenshots
//   <repo>/plan/audit/screens/tour-step-N.png          guided-tour steps
//   <repo>/plan/audit/results.json                     machine-readable findings
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:5173";
const OUT_DIR = "/Users/anuagar2/Documents/FAR AWAY/plan/audit";
const SHOTS = `${OUT_DIR}/screens`;
mkdirSync(SHOTS, { recursive: true });

/** [filename-stem, path, is3D] — 3D routes get extra settle time before the shot. */
const ROUTES = [
  ["home", "/", true],
  ["sky", "/sky", true],
  ["threats", "/threats", false],
  ["threat-detail", "/threats/conj-protect-isro-001", true],
  ["avoidance", "/avoidance", true],
  ["report", "/report", false],
  ["learn", "/learn", false],
  ["system", "/system", false]
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }]
];

const SETTLE_3D = 2600; // "let the 3D scene settle (~2.5s)"
const SETTLE_FLAT = 1200;

const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader-webgl",
    "--ignore-gpu-blocklist",
    "--enable-webgl"
  ]
});

const findings = { base: BASE, generatedAt: new Date().toISOString(), routes: [], tour: null, sky: null };

function attachErrorCollectors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  return { consoleErrors, pageErrors };
}

// ---------- 1. Per-route screenshots + error capture (both viewports) ----------
for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  for (const [name, path, is3D] of ROUTES) {
    const page = await ctx.newPage();
    const { consoleErrors, pageErrors } = attachErrorCollectors(page);
    let ok = true;
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 25000 });
    } catch (err) {
      ok = false;
      pageErrors.push(`NAV: ${err.message}`);
    }
    await page.waitForTimeout(is3D ? SETTLE_3D : SETTLE_FLAT);
    const file = `${SHOTS}/${name}-${vpName}.png`;
    try {
      await page.screenshot({ path: file, fullPage: true });
    } catch (err) {
      // fullPage can fail on tall 3D layouts; fall back to a viewport shot.
      pageErrors.push(`SHOT(fullPage): ${err.message}`);
      await page.screenshot({ path: file, fullPage: false });
    }
    findings.routes.push({
      viewport: vpName,
      name,
      path,
      ok,
      file,
      consoleErrors: consoleErrors.slice(0, 12),
      pageErrors
    });
    console.log(`shot ${name}-${vpName}  (console:${consoleErrors.length} page:${pageErrors.length})`);
    await page.close();
  }
  await ctx.close();
}

// ---------- 2. Sky object-count probe ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  attachErrorCollectors(page);
  await page.goto(`${BASE}/sky`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(SETTLE_3D);
  // The globe overlay prints "... · N shown" (shownCount === rendered tracks).
  const chipText = await page.evaluate(() => document.body.innerText.match(/·\s*(\d+)\s*shown/i)?.[0] ?? null);
  const shownMatch = chipText ? chipText.match(/(\d+)/) : null;
  const shown = shownMatch ? Number(shownMatch[1]) : null;
  const canvasCount = await page.locator("canvas").count();
  // Cross-check via the list view: count selectable object rows.
  await page.goto(`${BASE}/sky?view=list`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1500);
  const listRows = await page
    .locator("button[aria-pressed], li button, [role='listitem'] button, button")
    .evaluateAll((els) =>
      els.filter((el) => /CARTOSAT|DEBRIS|RISAT|SENTINEL|satellite|debris|orbit/i.test(el.textContent ?? "")).length
    );
  findings.sky = { chipText, shown, canvasCount, listRowsHeuristic: listRows };
  console.log(`sky probe: ${JSON.stringify(findings.sky)}`);
  await page.close();
  await ctx.close();
}

// ---------- 3. Guided Tour probe (desktop, starts on "/") ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const { consoleErrors, pageErrors } = attachErrorCollectors(page);
  const tour = { steps: [], notes: [], consoleErrors, pageErrors };

  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(1500);

  const tourBtn = page.getByRole("button", { name: "Tour", exact: true });
  const tourBtnCount = await tourBtn.count();
  tour.tourButtonFound = tourBtnCount > 0;
  tour.notes.push(`Tour button matches: ${tourBtnCount}`);

  if (tourBtnCount > 0) {
    await tourBtn.first().click().catch((e) => tour.notes.push(`click error: ${e.message}`));
    await page.waitForTimeout(900);

    const dialog = page.getByRole("dialog", { name: "Guided tour" });
    const dialogVisible = await dialog.isVisible().catch(() => false);
    tour.dialogAppears = dialogVisible;
    tour.urlAfterClick = page.url();
    await page.screenshot({ path: `${SHOTS}/tour-step-1.png`, fullPage: false });

    if (dialogVisible) {
      // Read the visible step card title + counter, then advance via "Next" until "Finish".
      for (let i = 1; i <= 8; i++) {
        const title = await dialog.locator("h2").first().innerText().catch(() => "");
        const counter = await dialog
          .locator("text=/\\d+\\s*\\/\\s*\\d+/")
          .first()
          .innerText()
          .catch(() => "");
        tour.steps.push({ index: i, url: page.url(), title, counter });
        await page.screenshot({ path: `${SHOTS}/tour-step-${i}.png`, fullPage: false });

        const next = dialog.getByRole("button", { name: "Next" });
        const finish = dialog.getByRole("button", { name: "Finish" });
        if ((await finish.count()) > 0) {
          tour.notes.push(`Finish reached at step ${i}`);
          break;
        }
        if ((await next.count()) === 0) {
          tour.notes.push(`No Next button at step ${i}`);
          break;
        }
        await next.click().catch((e) => tour.notes.push(`next click error: ${e.message}`));
        await page.waitForTimeout(900);
      }
    } else {
      tour.notes.push("Dialog 'Guided tour' did NOT become visible after clicking Tour.");
    }
  }
  findings.tour = tour;
  console.log(`tour probe: buttonFound=${tour.tourButtonFound} dialogAppears=${tour.dialogAppears} steps=${tour.steps.length}`);
  await page.close();
  await ctx.close();
}

await browser.close();
writeFileSync(`${OUT_DIR}/results.json`, JSON.stringify(findings, null, 2));

// ---------- console summary ----------
console.log("\n==== ROUTE ERRORS ====");
for (const r of findings.routes) {
  if (r.pageErrors.length || r.consoleErrors.length) {
    console.log(`\n[${r.name}-${r.viewport}] ${r.path}`);
    if (r.pageErrors.length) console.log("  pageErrors:", JSON.stringify(r.pageErrors));
    if (r.consoleErrors.length) console.log("  consoleErrors:", JSON.stringify(r.consoleErrors));
  }
}
console.log("\n==== SKY ====", JSON.stringify(findings.sky));
console.log("==== TOUR ====", JSON.stringify({ button: findings.tour?.tourButtonFound, dialog: findings.tour?.dialogAppears, steps: findings.tour?.steps }, null, 2));
console.log(`\nresults: ${OUT_DIR}/results.json`);
console.log(`screens: ${SHOTS}`);
