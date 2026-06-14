import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const APP_URL = process.env.ORBITGUARD_APP_URL ?? "http://localhost:5173";
const CHROME_CANDIDATES = [
  process.env.ORBITGUARD_CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser"
].filter(Boolean);

const routes = [
  ["/", "Protect satellites before debris"],
  ["/mission", "Protect the satellite first"],
  ["/catalog", "Browse the orbit catalog"],
  ["/risk", "Understand which object comes closest"],
  ["/avoidance", "Clear the risk"],
  ["/reports", "Turn the maneuver decision"],
  ["/system", "A stable backend pipeline"],
  ["/learn", "OrbitGuard in plain English"]
];

function chromePath() {
  const candidate = CHROME_CANDIDATES.find((entry) => existsSync(entry));
  if (!candidate) {
    throw new Error("No Chrome/Chromium executable found. Set ORBITGUARD_CHROME_PATH to run E2E tests.");
  }
  return candidate;
}

function routeUrl(path) {
  return new URL(path, APP_URL).toString();
}

async function gotoRoute(page, path) {
  await page.goto(routeUrl(path), { waitUntil: "networkidle" });
}

async function assertNoOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) {
    throw new Error(`${label} has horizontal overflow: ${overflow}px`);
  }
}

async function cameraState(page) {
  return page.locator(".earth-scene").first().evaluate((node) => ({
    yaw: Number(node.dataset.cameraYaw ?? "0"),
    zoom: Number(node.dataset.cameraZoom ?? "0")
  }));
}

async function verifyEarth(page) {
  await page.waitForSelector(".earth-scene canvas", { timeout: 10_000 });
  await page.getByRole("button", { name: "Zoom in Earth" }).waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => document.querySelectorAll(".earth-scene canvas").length === 1, null, { timeout: 10_000 });
  const scene = page.locator(".earth-scene").first();
  const box = await scene.boundingBox();
  if (!box) throw new Error("Earth scene has no bounding box.");
  const viewport = page.viewportSize() ?? { height: 940, width: 1440 };
  const startX = Math.min(box.x + box.width * 0.74, viewport.width - 110);
  const startY = Math.min(box.y + box.height * 0.36, viewport.height - 230);
  const endX = Math.max(startX - 260, 80);
  const endY = Math.max(startY - 34, 90);

  const initial = await cameraState(page);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(
    (startYaw) => Math.abs(Number(document.querySelector(".earth-scene")?.dataset.cameraYaw ?? "0") - startYaw) > 0.06,
    initial.yaw,
    { timeout: 10_000 }
  );

  const afterDrag = await cameraState(page);
  await page.mouse.move(startX, startY);
  await page.mouse.wheel(0, -450);
  await page.waitForFunction(
    (startZoom) => Number(document.querySelector(".earth-scene")?.dataset.cameraZoom ?? "0") > startZoom + 0.05,
    afterDrag.zoom,
    { timeout: 10_000 }
  );
}

async function saveAndAssertReport(download) {
  const targetPath = `/tmp/orbitguard-e2e-${Date.now()}-${download.suggestedFilename()}`;
  await download.saveAs(targetPath);
  const report = readFileSync(targetPath, "utf8");
  if (!report.includes("OrbitGuard") || !report.includes("Assumptions")) {
    throw new Error("Exported Markdown report is missing expected briefing content.");
  }
}

async function verifyRoutes(page) {
  for (const [path, text] of routes) {
    await gotoRoute(page, path);
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
    await assertNoOverflow(page, path);
  }

  await gotoRoute(page, "/mission-control");
  await page.waitForURL(routeUrl("/mission"), { timeout: 10_000 });
  await gotoRoute(page, "/predictor");
  await page.waitForURL(routeUrl("/avoidance"), { timeout: 10_000 });
  await gotoRoute(page, "/closest-approach");
  await page.waitForURL(routeUrl("/risk"), { timeout: 10_000 });
  await gotoRoute(page, "/architecture");
  await page.waitForURL(routeUrl("/system"), { timeout: 10_000 });
}

async function verifyHomeFirstImpression(page) {
  await gotoRoute(page, "/");
  await page.getByText("Autonomous space-traffic control copilot", { exact: true }).waitFor({ timeout: 10_000 });
  await page.waitForFunction(
    () => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("readiness sync") || text.includes("demo ready");
    },
    null,
    { timeout: 10_000 }
  );
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const rawLabel of ["booting", "loading demo readiness", "catalog loading", "loading the selected scenario", "..."]) {
    if (bodyText.includes(rawLabel)) {
      throw new Error(`Home first impression leaked raw shell placeholder label: ${rawLabel}`);
    }
  }
  await assertNoOverflow(page, "home first impression");
}

async function verifyNavigationShell(page) {
  await gotoRoute(page, "/");
  await page.locator(".desktop-nav-shell").waitFor({ timeout: 10_000 });
  const primaryLinks = page.locator(".desktop-nav a");
  const primaryCount = await primaryLinks.count();
  if (primaryCount !== 5) {
    throw new Error(`Expected 5 primary command tabs, found ${primaryCount}.`);
  }

  const deckHeight = await page.locator(".top-nav").first().evaluate((node) => node.getBoundingClientRect().height);
  if (deckHeight > 86) {
    throw new Error(`Desktop command deck is too tall: ${deckHeight}px`);
  }

  await page.locator(".intel-menu-button").click();
  await page.getByRole("menuitem", { name: /Risk Board/i }).waitFor({ timeout: 10_000 });
  await page.getByRole("menuitem", { name: /Learn/i }).waitFor({ timeout: 10_000 });
  await assertNoOverflow(page, "desktop navigation shell");
  await page.getByRole("menuitem", { name: /Risk Board/i }).click();
  await page.waitForURL(routeUrl("/risk"), { timeout: 10_000 });
}

async function verifyGuidedDemo(page) {
  await gotoRoute(page, "/");
  await page.getByRole("button", { name: /Start guided demo/i }).click();
  await page.waitForURL(routeUrl("/mission"), { timeout: 10_000 });
  await page.getByText("Mission Director", { exact: true }).waitFor({ timeout: 10_000 });
  const sceneButtons = await page.locator(".demo-scene-track button").count();
  if (sceneButtons !== 5) {
    throw new Error(`Expected 5 guided demo scenes, found ${sceneButtons}.`);
  }
  await assertNoOverflow(page, "guided demo mission");
  await page.getByRole("button", { name: /Next guided demo cue/i }).click();
  await page.waitForURL(routeUrl("/catalog"), { timeout: 10_000 });
  await page.getByRole("button", { name: /Simulate scene/i }).click();
  await page.waitForURL(routeUrl("/avoidance"), { timeout: 10_000 });
  await page.getByRole("button", { name: /Close guided demo/i }).click();
  await page.locator(".demo-director").waitFor({ state: "hidden", timeout: 10_000 });
  await assertNoOverflow(page, "guided demo closed");
}

async function verifyMissionCockpit(page) {
  await gotoRoute(page, "/mission");
  await page.getByRole("complementary", { name: "Mission sync" }).waitFor({ timeout: 10_000 });
  const syncSteps = await page.locator(".mission-sync-pipeline span").count();
  if (syncSteps !== 4) {
    throw new Error(`Expected 4 Mission Sync pipeline steps, found ${syncSteps}.`);
  }
  await page.locator(".mission-cockpit").waitFor({ timeout: 10_000 });
  await page.getByText("Threat Focus", { exact: false }).waitFor({ timeout: 10_000 });
  await page.locator(".mission-action-briefing").waitFor({ timeout: 10_000 });
  await page.getByText("Burn scan armed", { exact: true }).waitFor({ timeout: 10_000 });
  const phaseSteps = await page.locator(".mission-phase-stack > div").count();
  if (phaseSteps !== 4) {
    throw new Error(`Expected 4 mission phase steps, found ${phaseSteps}.`);
  }
  const commandButtons = await page.locator(".mission-command-bar a, .mission-command-bar button").count();
  if (commandButtons !== 4) {
    throw new Error(`Expected 4 mission command actions, found ${commandButtons}.`);
  }
  await page.waitForFunction(() => document.querySelectorAll(".mission-stage-clean canvas").length === 1, null, { timeout: 10_000 });
  const bodyText = await page.locator("body").innerText();
  for (const rawLabel of ["Loading", "Awaiting burn scan", "Loading corridor"]) {
    if (bodyText.includes(rawLabel)) {
      throw new Error(`Mission cockpit leaked raw placeholder label: ${rawLabel}`);
    }
  }
  await assertNoOverflow(page, "mission cockpit");
}

async function verifyRiskBoard(page) {
  await gotoRoute(page, "/risk");
  await page.getByText("Tactical risk board", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Scenario comparison", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Severity lanes", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Selected lane playbook", { exact: true }).waitFor({ timeout: 10_000 });
  const scenarioCards = await page.locator(".risk-snapshots button").count();
  if (scenarioCards < 3) {
    throw new Error(`Expected at least 3 scenario cards on Risk Board, found ${scenarioCards}.`);
  }
  const severityLanes = await page.locator(".risk-severity-lanes button").count();
  if (severityLanes !== 3) {
    throw new Error(`Expected 3 severity lanes on Risk Board, found ${severityLanes}.`);
  }
  const playbookCards = await page.locator(".risk-playbook-grid article").count();
  if (playbookCards !== 3) {
    throw new Error(`Expected 3 playbook evidence cards on Risk Board, found ${playbookCards}.`);
  }
  await page.getByRole("button", { name: /Inspect Watch lane/i }).click();
  await page.getByText("Monitor and propagate.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Inspect Action lane/i }).click();
  await page.getByText("Plan a burn now.", { exact: true }).waitFor({ timeout: 10_000 });
  const rankingRows = await page.locator(".risk-ranking-board > article").count();
  if (rankingRows < 1) {
    throw new Error("Risk Board did not render ranked conjunction rows.");
  }
  await assertNoOverflow(page, "risk board");
  await page.locator(".risk-command-copy .primary-link").click();
  await page.waitForURL(routeUrl("/avoidance"), { timeout: 10_000 });
  await gotoRoute(page, "/risk");
  await page.getByRole("link", { name: /Inspect source objects/i }).click();
  await page.waitForURL(routeUrl("/catalog"), { timeout: 10_000 });
}

async function verifyAvoidancePreflight(page) {
  await gotoRoute(page, "/avoidance");
  await page.getByText("Simulation pre-flight", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Burn scan is ready to run.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Candidate scan armed", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByLabel("Burn sequence").waitFor({ timeout: 10_000 });
  const sequenceSteps = await page.locator(".burn-sequence-track button").count();
  if (sequenceSteps !== 5) {
    throw new Error(`Expected 5 burn sequence stages, found ${sequenceSteps}.`);
  }
  await page.getByRole("button", { name: /Inspect Screen secondary stage/i }).click();
  await page.getByText("This gate prevents a dodge", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Inspect Scan burns stage/i }).click();
  await page.getByText("Press Run burn scan.", { exact: true }).waitFor({ timeout: 10_000 });
  const placeholders = await page.locator(".candidate-placeholder").count();
  if (placeholders !== 3) {
    throw new Error(`Expected 3 staged candidate placeholders, found ${placeholders}.`);
  }
  const bodyText = await page.locator("body").innerText();
  for (const rawLabel of ["Loading", "Pending", "Waiting for scan", "Awaiting scan"]) {
    if (bodyText.includes(rawLabel)) {
      throw new Error(`Avoidance pre-flight leaked raw placeholder label: ${rawLabel}`);
    }
  }
  await assertNoOverflow(page, "avoidance pre-flight");
}

async function verifyReportsQueue(page) {
  await gotoRoute(page, "/reports");
  await page.getByText("Briefing build queued", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByLabel("Judge briefing storyboard").waitFor({ timeout: 10_000 });
  await page.getByLabel("Briefing review console").waitFor({ timeout: 10_000 });
  const storyChapters = await page.locator(".briefing-chapter-track button").count();
  if (storyChapters !== 4) {
    throw new Error(`Expected 4 briefing storyboard chapters, found ${storyChapters}.`);
  }
  await page.getByRole("tab", { name: /Safety proof/i }).click();
  await page.getByText("Secondary screening is armed after the recommendation is applied.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("tab", { name: /Submission/i }).click();
  await page.getByText("Markdown export unlocks after generation.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Briefing packet blueprint", { exact: true }).waitFor({ timeout: 10_000 });
  const reviewTabs = page.locator(".report-review-tabs button");
  const tabCount = await reviewTabs.count();
  if (tabCount !== 4) {
    throw new Error(`Expected 4 briefing review tabs, found ${tabCount}.`);
  }
  await page.getByRole("tab", { name: "Evidence" }).click();
  await page.getByText("Traceable source chain", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("tab", { name: "Assumptions" }).click();
  await page.getByText("Limitations and review notes", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("tab", { name: "Export" }).click();
  await page.getByText("Submission export status", { exact: true }).waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("planner queued"), null, { timeout: 10_000 });
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("safety gate armed"), null, { timeout: 10_000 });
  await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("briefing queue"), null, { timeout: 10_000 });
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const rawLabel of ["pending", "waiting for packet build", "not planned", "auto-build available"]) {
    if (bodyText.includes(rawLabel)) {
      throw new Error(`Reports queue leaked raw placeholder label: ${rawLabel}`);
    }
  }
  await assertNoOverflow(page, "reports queue");
}

async function verifyLearnRoute(page) {
  await gotoRoute(page, "/learn");
  await page.getByText("OrbitGuard in plain English", { exact: false }).first().waitFor({ timeout: 10_000 });
  await page.getByText("30-second mission model", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Training simulator", { exact: true }).waitFor({ timeout: 10_000 });
  const statCards = await page.locator(".learn-stat-strip .metric").count();
  if (statCards !== 4) {
    throw new Error(`Expected 4 Learn stat cards, found ${statCards}.`);
  }
  const flowCards = await page.locator(".learn-story article").count();
  if (flowCards !== 4) {
    throw new Error(`Expected 4 Learn training flow cards, found ${flowCards}.`);
  }
  await page.getByRole("button", { name: /Dodge training stage/i }).click();
  await page.getByText("Active lesson", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Dodge: Scan candidate burns", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Candidate matrix, delta-v, and before/after Pc", { exact: true }).waitFor({ timeout: 10_000 });
  const readinessChecks = await page.locator(".learn-check-list span").count();
  if (readinessChecks !== 4) {
    throw new Error(`Expected 4 Learn readiness checks, found ${readinessChecks}.`);
  }
  const glossaryCards = await page.locator(".glossary-clean article").count();
  if (glossaryCards < 8) {
    throw new Error(`Expected at least 8 Learn glossary cards, found ${glossaryCards}.`);
  }
  const pathCards = await page.locator(".learning-paths a").count();
  if (pathCards !== 5) {
    throw new Error(`Expected 5 Learn route cards, found ${pathCards}.`);
  }
  await assertNoOverflow(page, "learn route");
  await page.getByRole("link", { name: /Open Risk Board/i }).click();
  await page.waitForURL(routeUrl("/risk"), { timeout: 10_000 });
  await gotoRoute(page, "/learn");
  await page.getByRole("link", { name: /See technical pipeline/i }).click();
  await page.waitForURL(routeUrl("/system"), { timeout: 10_000 });
}

async function verifySystemRoute(page) {
  await gotoRoute(page, "/system");
  await page.getByText("Decision pipeline", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Verification posture", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Demo health", { exact: true }).waitFor({ timeout: 10_000 });
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const rawLabel of ["loading", "loading demo readiness checks", "booting", "..."]) {
    if (bodyText.includes(rawLabel)) {
      throw new Error(`System route leaked raw readiness placeholder label: ${rawLabel}`);
    }
  }
  await page.getByLabel("Pipeline stage inspector").waitFor({ timeout: 10_000 });
  await page.getByText("Selected module", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Mission cockpit shows the selected scenario and active protected asset.", { exact: true }).waitFor({ timeout: 10_000 });
  const pipelineSteps = await page.locator(".system-pipeline-panel .pipeline-clean button").count();
  if (pipelineSteps !== 6) {
    throw new Error(`Expected 6 system pipeline steps, found ${pipelineSteps}.`);
  }
  await page.getByRole("button", { name: /Inspect Plan maneuver pipeline stage/i }).click();
  await page.getByText("Predictor route shows target lock, burn scan, before/after risk, and candidate cards.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("POST /api/maneuvers/plan", { exact: true }).waitFor({ timeout: 10_000 });
  const engineCards = await page.locator(".engine-grid-clean article").count();
  if (engineCards !== 6) {
    throw new Error(`Expected 6 system engine cards, found ${engineCards}.`);
  }
  const validationLanes = await page.locator(".validation-lanes article").count();
  if (validationLanes !== 4) {
    throw new Error(`Expected 4 validation lanes, found ${validationLanes}.`);
  }
  await page.getByText("Architecture boundary", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Operator evidence", { exact: true }).waitFor({ timeout: 10_000 });
  await assertNoOverflow(page, "system route");
  await page.getByRole("link", { name: /Review maneuver logic/i }).click();
  await page.waitForURL(routeUrl("/avoidance"), { timeout: 10_000 });
}

async function verifyProtectIsroFlow(page) {
  await gotoRoute(page, "/");
  await verifyEarth(page);
  await page.getByRole("link", { name: /Start Protect ISRO/i }).click();
  await page.waitForURL(routeUrl("/mission"), { timeout: 10_000 });
  await page.getByText("A critical approach needs action.", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Plan avoidance/i }).click();
  await page.waitForURL(routeUrl("/mission"), { timeout: 10_000 });
  await page.getByText("Review the recommended burn.", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Recommended maneuver", { exact: false }).waitFor({ timeout: 10_000 });

  await gotoRoute(page, "/avoidance");
  await page.getByRole("button", { name: /Run burn scan/i }).click();
  await page.getByText("Recommended burn ready.", { exact: false }).waitFor({ timeout: 10_000 });
  await page.locator(".burn-sequence-track button.active").filter({ hasText: "Select burn" }).waitFor({ timeout: 10_000 });
  await page.getByText("burn selected", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Apply recommendation/i }).click();
  await page.getByText("Secondary screening is clear.", { exact: false }).waitFor({ timeout: 10_000 });
  await page.locator(".burn-sequence-track button.active").filter({ hasText: "Screen secondary" }).waitFor({ timeout: 10_000 });
  await page.locator(".burn-sequence-track button.active").filter({ hasText: "Secondary clear" }).waitFor({ timeout: 10_000 });

  await gotoRoute(page, "/reports");
  await page.getByText("Evidence chain", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Export control", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Generate briefing/i }).click();
  await page.getByText("Current briefing", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Ready for export", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Markdown unlocked", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByLabel("Judge briefing storyboard").waitFor({ timeout: 10_000 });
  await page.getByRole("tab", { name: /Decision/i }).click();
  await page.getByText("Recommended candidate: mnv-protect-isro-a", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("tab", { name: /Safety proof/i }).click();
  await page.getByText("Pc comparison:", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByRole("tab", { name: /Submission/i }).click();
  await page.getByText("Markdown export is ready for submission.", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Source IDs and assumptions", { exact: true }).waitFor({ timeout: 10_000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export Markdown/i }).click();
  await saveAndAssertReport(await downloadPromise);
}

async function verifyCatalog(page) {
  await gotoRoute(page, "/catalog");
  await page.getByLabel("Mission catalog lenses").waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Debris threats/i }).click();
  await page.getByText("Type: debris", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Conjunction threat object", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Protected ISRO/i }).click();
  await page.getByText("Owner: ISRO", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByText("Protected mission asset", { exact: true }).waitFor({ timeout: 10_000 });
  await page.getByText("Current lens", { exact: true }).waitFor({ timeout: 10_000 });
  await assertCatalogCopyIsPolished(page, "initial catalog");
  await page.getByPlaceholder("CARTOSAT, debris, ISRO...").fill("NO_SUCH_OBJECT_999");
  await page.getByText("No orbit records found", { exact: true }).waitFor({ timeout: 10_000 });
  await assertCatalogCopyIsPolished(page, "catalog empty lens");
  await page.locator(".catalog-empty-state button").click();
  await page.getByText("Fixture catalog / no filters", { exact: true }).waitFor({ timeout: 10_000 });
  await assertCatalogCopyIsPolished(page, "catalog reset");
  await page.getByPlaceholder("CARTOSAT, debris, ISRO...").fill("ISRO");
  await page.getByText("Search: ISRO", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /CARTOSAT-2F/i }).click();
  await page.getByText("Selected object", { exact: false }).waitFor({ timeout: 10_000 });
  await assertCatalogCopyIsPolished(page, "catalog selected object");
  await page.getByText("Raw TLE evidence").click();
  await page.getByText("1 43111U 18004A", { exact: false }).waitFor({ timeout: 10_000 });
}

async function assertCatalogCopyIsPolished(page, label) {
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  for (const rawLabel of ["loading", "loading source notes", "unknown", "n/a", "orbit n/a"]) {
    if (bodyText.includes(rawLabel)) {
      throw new Error(`${label} leaked raw catalog placeholder label: ${rawLabel}`);
    }
  }
  await assertNoOverflow(page, label);
}

async function verifyMobile(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const [path, text] of [routes[0], routes[1], routes[2]]) {
    await gotoRoute(page, path);
    await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 });
    await assertNoOverflow(page, `mobile ${path}`);
  }
  await page.getByRole("button", { name: /Open navigation/i }).click();
  await page.locator(".mobile-nav-head").getByText("Command routes", { exact: false }).waitFor({ timeout: 10_000 });
  await page.locator(".mobile-nav-divider").getByText("Intel", { exact: false }).waitFor({ timeout: 10_000 });
  await page.getByRole("link", { name: /Avoidance/i }).click();
  await page.waitForURL(routeUrl("/avoidance"), { timeout: 10_000 });
  await assertNoOverflow(page, "mobile navigation");
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ executablePath: chromePath(), headless: true });
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1440, height: 940 } });
  try {
    await verifyRoutes(page);
    await verifyHomeFirstImpression(page);
    await verifyNavigationShell(page);
    await verifyGuidedDemo(page);
    await verifyMissionCockpit(page);
    await verifyRiskBoard(page);
    await verifyAvoidancePreflight(page);
    await verifyReportsQueue(page);
    await verifyLearnRoute(page);
    await verifySystemRoute(page);
    await verifyProtectIsroFlow(page);
    await verifyCatalog(page);
    await verifyMobile(browser);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
