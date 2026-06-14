// Polish verification screenshots for the /threats + /report redesign and the demo-clock fix.
// Read-only against the running dev server (http://127.0.0.1:5173). Not a *.spec.ts so the
// Playwright runner ignores it.
//
//   Run:  node e2e/_polish-shots.mjs
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:5173";
const OUT = "/Users/anuagar2/Documents/FAR AWAY/frontend/e2e/.artifacts/polish";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--ignore-gpu-blocklist"]
});

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 900 }],
  ["mobile", { width: 390, height: 844 }]
];

const report = {};

async function shoot(name, vpName, vp, path, { fullPage = true, settle = 1200, before } = {}) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(settle);
  if (before) await before(page);
  const file = `${OUT}/${name}-${vpName}.png`;
  await page.screenshot({ path: file, fullPage });
  await ctx.close();
  return { file, page: null };
}

// Capture text proof from /threats (desktop) + the detail headline.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/threats`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const threatsText = (await page.locator("main#main").innerText()).replace(/\s+/g, " ").trim();
  report.threatsHasAgo = /\bago\b/i.test(threatsText);
  report.threatsTimeSnippet = (threatsText.match(/in about [^.\u2014]+/i) || threatsText.match(/will pass[^.\u2014]+/i) || ["(none)"])[0];

  await page.goto(`${BASE}/threats/conj-protect-isro-001`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const h1 = (await page.locator("h1").first().innerText()).replace(/\s+/g, " ").trim();
  report.detailHeadline = h1;
  report.detailHasAgo = /\bago\b/i.test(h1);
  await ctx.close();
}

for (const [vpName, vp] of VIEWPORTS) {
  await shoot("threats", vpName, vp, "/threats", { settle: 1200 });
  await shoot("report-empty", vpName, vp, "/report", { settle: 1000 });
}

// Generate the briefing and screenshot the produced document (desktop).
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/report`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /generate briefing/i }).click();
  await page.waitForTimeout(4000);
  // Scroll through so reveal-on-scroll sections are all painted.
  await page.evaluate(async () => {
    for (let y = 0; y <= document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(600);
  const docText = (await page.locator("main#main").innerText()).replace(/\s+/g, " ").trim();
  report.reportHasZeroUtc = /00:00 UTC/.test(docText);
  report.reportTimeSnippet = (docText.match(/\b\d{2}:\d{2} UTC/) || docText.match(/Closest approach[^.]+/) || ["(none)"])[0];
  await page.screenshot({ path: `${OUT}/report-generated-desktop.png`, fullPage: true });
  await ctx.close();
}

// Above-the-fold (viewport, not fullPage) checks for the Section reveal hardening on owned
// content routes — confirms first-viewport content paints without a scroll.
for (const path of ["/learn", "/system", "/"]) {
  const name = path === "/" ? "home" : path.slice(1);
  await shoot(`atf-${name}`, "desktop", { width: 1440, height: 900 }, path, { fullPage: false, settle: 1200 });
}

await browser.close();
writeFileSync(`${OUT}/_report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("shots →", OUT);
