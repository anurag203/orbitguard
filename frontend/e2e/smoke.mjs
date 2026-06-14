// Standalone runtime smoke: loads every route in a real browser, captures console/page
// errors, and screenshots each. Run: node e2e/smoke.mjs  (dev server must be on :5173)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:5173";
const OUT = process.env.SMOKE_OUT ?? "/tmp/og-shots";
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ["home", "/"],
  ["sky", "/sky"],
  ["threats", "/threats"],
  ["threat-detail", "/threats/conj-protect-isro-001"],
  ["avoidance", "/avoidance"],
  ["report", "/report"],
  ["learn", "/learn"],
  ["system", "/system"],
  ["styleguide", "/styleguide"]
];

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--ignore-gpu-blocklist"]
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const results = [];
for (const [name, path] of ROUTES) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(e.message));
  let ok = true;
  try {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 20000 });
    // Give 3D scenes + animations time to settle.
    await page.waitForTimeout(path === "/" || path === "/sky" || path.startsWith("/threats/") || path === "/avoidance" ? 6500 : 1500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  } catch (err) {
    ok = false;
    pageErrors.push(`NAV: ${err.message}`);
  }
  await page.close();
  results.push({ name, path, ok, pageErrors, consoleErrors: consoleErrors.slice(0, 8) });
}

await browser.close();

let hard = 0;
for (const r of results) {
  const status = r.pageErrors.length === 0 && r.ok ? "PASS" : "FAIL";
  if (status === "FAIL") hard++;
  console.log(`\n[${status}] ${r.name}  (${r.path})`);
  if (r.pageErrors.length) console.log("  pageErrors:", JSON.stringify(r.pageErrors, null, 2));
  if (r.consoleErrors.length) console.log("  consoleErrors:", JSON.stringify(r.consoleErrors, null, 2));
}
console.log(`\n==== ${results.length - hard}/${results.length} routes with no uncaught errors ====`);
console.log(`screenshots in ${OUT}`);
process.exit(hard > 0 ? 1 : 0);
