// Bundle-size budget gate (doc 09 §2.9). Fails the build if the production
// bundle regresses past agreed gzipped budgets. Run after `npm run build`:
//   node scripts/check-bundle-size.mjs
//
// Rationale: the Three.js Earth is intentionally a large, LAZY chunk (it must not
// be in the initial download). We budget the initial entry tightly, the heavy 3D
// chunk loosely, and cap the total so nothing balloons unnoticed.
import { gzipSync } from "node:zlib";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ASSETS_DIR = fileURLToPath(new URL("../dist/assets", import.meta.url));
const KB = 1024;

// Gzipped budgets in KB.
// Set ~30–40% above current measured sizes: a real regression gate with
// breathing room. Current (gz): initial 111, earth 241, total 452, css 12.
const BUDGETS = {
  initialJs: 150, // the eager entry chunk (index-*.js) — first paint cost
  largestChunk: 320, // the lazy three/earth chunk lives here; keep it bounded
  totalJs: 650, // everything JS, gzipped
  totalCss: 35 // all CSS, gzipped
};

function gzKb(path) {
  return gzipSync(readFileSync(path)).length / KB;
}

let files;
try {
  files = readdirSync(ASSETS_DIR).filter((f) => statSync(`${ASSETS_DIR}/${f}`).isFile());
} catch {
  console.error(`✗ No build output at ${ASSETS_DIR}. Run \`npm run build\` first.`);
  process.exit(1);
}

const js = files.filter((f) => f.endsWith(".js")).map((f) => ({ f, kb: gzKb(`${ASSETS_DIR}/${f}`) }));
const css = files.filter((f) => f.endsWith(".css")).map((f) => ({ f, kb: gzKb(`${ASSETS_DIR}/${f}`) }));

const totalJs = js.reduce((s, x) => s + x.kb, 0);
const totalCss = css.reduce((s, x) => s + x.kb, 0);
const largest = js.reduce((m, x) => (x.kb > m.kb ? x : m), { f: "—", kb: 0 });
const entry = js.find((x) => /^index-.*\.js$/.test(x.f)) ?? { f: "(no index-*.js)", kb: 0 };

const measured = {
  initialJs: entry.kb,
  largestChunk: largest.kb,
  totalJs,
  totalCss
};

console.log("\nBundle (gzipped):");
[...js, ...css]
  .sort((a, b) => b.kb - a.kb)
  .slice(0, 12)
  .forEach((x) => console.log(`  ${x.kb.toFixed(1).padStart(7)} KB  ${x.f}`));

console.log("\nBudgets (gzipped KB):");
let failed = false;
for (const [key, budget] of Object.entries(BUDGETS)) {
  const value = measured[key];
  const ok = value <= budget;
  if (!ok) failed = true;
  console.log(`  ${ok ? "✓" : "✗"} ${key.padEnd(13)} ${value.toFixed(1).padStart(7)} / ${budget} KB`);
}

if (failed) {
  console.error("\n✗ Bundle budget exceeded. Trim deps or split chunks (keep the 3D scene lazy).\n");
  process.exit(1);
}
console.log("\n✓ Bundle within budget.\n");
