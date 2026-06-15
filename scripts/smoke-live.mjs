// Post-deploy smoke test against a LIVE OrbitGuard URL. Read-only.
// Usage: SMOKE_URL=https://orbitguard-faraway.netlify.app npm run smoke:live
import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { chromium } = require("playwright");

const BASE = (process.env.SMOKE_URL ?? "https://orbitguard-faraway.netlify.app").replace(/\/$/, "");
const ROUTES = ["/", "/sky", "/threats", "/avoidance", "/report", "/learn", "/system"];
const BENIGN = [/React DevTools/i, /Download the React/i, /three-mesh-bvh/i, /\[vite\]/i, /Lit is in dev mode/i];
const fails = [];

const ok = (label) => console.log(`  ✓ ${label}`);
const bad = (label, detail) => {
  fails.push(`${label}${detail ? ` - ${detail}` : ""}`);
  console.log(`  ✗ ${label}${detail ? ` - ${detail}` : ""}`);
};

console.log(`Live smoke: ${BASE}`);

console.log("\nEdge /celestrak proxy:");
try {
  const res = await fetch(`${BASE}/celestrak/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle`);
  const text = await res.text();
  res.ok && /\n?1 25544/.test(text)
    ? ok("returns ISS TLE")
    : bad("edge proxy did not return ISS TLE", `status ${res.status}`);
} catch (error) {
  bad("edge proxy fetch threw", String(error));
}

const browser = await chromium.launch();

try {
  for (const path of ROUTES) {
    console.log(`\nRoute ${path}:`);
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (error) => errs.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && !BENIGN.some((re) => re.test(message.text()))) {
        errs.push(`console: ${message.text()}`);
      }
    });

    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30_000 });
      const text = (await page.locator("main#main").innerText().catch(() => "")).trim();
      text.length > 30 ? ok("has content") : bad(`${path} has no meaningful content`);
      errs.length === 0 ? ok("no errors") : bad(`${path} logged errors`, errs.join(" | "));
    } catch (error) {
      bad(`${path} failed to load`, String(error));
    } finally {
      await page.close();
    }
  }

  console.log("\nSky live catalog:");
  const sky = await browser.newPage();
  try {
    await sky.goto(`${BASE}/sky`, { waitUntil: "networkidle", timeout: 30_000 });
    const filters = sky.getByRole("button", { name: /filters/i });
    if ((await filters.count()) > 0) await filters.first().click();

    const source = sky.getByLabel(/data source/i);
    await source.selectOption("live");
    const selectedSource = await source.inputValue();
    selectedSource === "live" ? ok("selected Live data source") : bad("Live data source was not selected", selectedSource);

    await sky.getByText(/Live - current public TLEs from CelesTrak/i).waitFor({ timeout: 30_000 });
    const chip = sky.getByTestId("sky-count-chip");
    await chip.waitFor({ timeout: 30_000 });
    const n = Number(((await chip.textContent()) ?? "").match(/[\d,]+/)?.[0]?.replace(/,/g, "") ?? "0");
    n > 1000 ? ok(`live field rendered ${n} objects`) : bad("live field too small", `${n} objects`);
  } catch (error) {
    bad("live Sky check failed", String(error));
  } finally {
    await sky.close();
  }
} finally {
  await browser.close();
}

console.log(`\n${fails.length ? `❌ ${fails.length} check(s) failed` : "✅ all live smoke checks passed"} (${BASE})`);
process.exit(fails.length ? 1 : 0);
