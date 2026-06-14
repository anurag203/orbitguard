#!/usr/bin/env node
/**
 * Bake the deterministic OrbitGuard API into static JSON for the fully-static (Netlify) deploy.
 *
 * Hits a running backend (default http://127.0.0.1:8000/api), snapshots every response the UI needs
 * for the canonical demo journeys, and writes them to `frontend/public/api-static/<key>.json` plus an
 * `index.json` manifest. The key MUST match `frontend/src/lib/staticApi.ts` (kept identical below).
 *
 * Usage:
 *   node scripts/snapshot-api.mjs                 # uses http://127.0.0.1:8000/api
 *   BACKEND=http://127.0.0.1:8000/api node scripts/snapshot-api.mjs
 *
 * The backend must be running (e.g. `uvicorn app.main:app --app-dir backend --port 8000`).
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(REPO_ROOT, "frontend/public/api-static");
const BACKEND = (process.env.BACKEND ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");

/* ---- key logic — keep IDENTICAL to frontend/src/lib/staticApi.ts ---- */
function canonicalPath(path) {
  const q = path.indexOf("?");
  if (q === -1) return path;
  const base = path.slice(0, q);
  const params = new URLSearchParams(path.slice(q + 1));
  const sorted = [...params.entries()].sort((a, b) =>
    a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1
  );
  const qs = sorted.map(([k, v]) => `${k}=${v}`).join("&");
  return qs ? `${base}?${qs}` : base;
}
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",")}}`;
}
function fnv1a(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `0000000${h.toString(16)}`.slice(-8);
}
function staticKey(method, path, body) {
  const verb = (method || "GET").toUpperCase();
  let bodyStr = "";
  if (body != null && body !== "") {
    try {
      bodyStr = stableStringify(typeof body === "string" ? JSON.parse(body) : body);
    } catch {
      bodyStr = String(body);
    }
  }
  const raw = `${verb} ${canonicalPath(path)}${bodyStr ? ` ${bodyStr}` : ""}`;
  return fnv1a(raw);
}
/* --------------------------------------------------------------------- */

const index = [];
let failures = 0;

/** Fetch `path` from the backend, save the response by static key, return parsed JSON (or null). */
async function record(method, path, body) {
  const bodyStr = body === undefined ? undefined : JSON.stringify(body);
  const key = staticKey(method, path, bodyStr);
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : bodyStr
    });
    const text = await res.text();
    if (!res.ok) {
      console.warn(`  ✗ ${method} ${path} → ${res.status}`);
      failures += 1;
      return null;
    }
    await writeFile(resolve(OUT_DIR, `${key}.json`), text);
    index.push({ key, method, path: canonicalPath(path) });
    const short = path.length > 48 ? `${path.slice(0, 47)}…` : path;
    console.log(`  ✓ ${method.padEnd(4)} ${short.padEnd(50)} ${key}.json`);
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.warn(`  ✗ ${method} ${path} → ${err.message}`);
    failures += 1;
    return null;
  }
}

async function main() {
  console.log(`Baking API from ${BACKEND} → ${OUT_DIR}`);
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  // Global GETs
  await record("GET", "/demo/status");
  await record("GET", "/demo/expected-flow");
  await record("GET", "/scenarios");
  for (const limit of [80, 120, 200, 500]) {
    await record("GET", `/catalogs/full?source=fixture&limit=${limit}`);
  }
  await record("GET", "/catalogs/full");

  // Per-scenario journey: run → screen → detail → plan → apply → report
  for (const sid of ["protect-isro", "2009-replay", "kessler-sandbox"]) {
    const run = await record("POST", `/scenarios/${sid}/run`, { deterministic: true });
    await record("POST", "/conjunctions/screen", { scenario_id: sid, step_seconds: 10, max_results: 10 });
    const cid = run?.top_conjunction_id;
    if (!cid) continue;
    await record("GET", `/conjunctions/${cid}`);
    const plan = await record("POST", "/maneuvers/plan", { conjunction_id: cid });
    const planId = plan?.plan_id;
    const candId = plan?.recommendation?.candidate_id;
    if (!planId || !candId) continue;
    await record("POST", "/maneuvers/apply", { plan_id: planId, candidate_id: candId });
    const report = await record("POST", "/reports", {
      scenario_run_id: run.run_id,
      conjunction_id: cid,
      plan_id: planId,
      candidate_id: candId
    });
    if (report?.report_id) await record("GET", `/reports/${report.report_id}`);
  }

  // Demo replay + offline-fallback live refresh
  await record("POST", "/demo/replay/protect-isro-round1");
  await record("POST", "/catalogs/live/refresh", { group: "active", limit: 120 });

  await writeFile(resolve(OUT_DIR, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  console.log(`\nBaked ${index.length} responses (${failures} skipped) → frontend/public/api-static/`);
  if (index.length === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
