import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

// Repo root (one level up from /frontend) — backend webServer runs from here.
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const PORT = Number(process.env.E2E_PORT ?? 5173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

// Headless Chromium has no real GPU; SwiftShader gives us a software WebGL2
// context so the Three.js Earth actually renders (and the drag/zoom telemetry
// hooks produce real numbers) instead of falling back to the static globe.
const WEBGL_ARGS = [
  "--enable-unsafe-swiftshader",
  "--use-gl=angle",
  "--use-angle=swiftshader-webgl",
  "--ignore-gpu-blocklist"
];

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  // Heavy WebGL pages need headroom; CI gets a retry to absorb flake.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"]],
  outputDir: "./e2e/.artifacts",
  snapshotPathTemplate: "./e2e/__screenshots__/{testFilePath}/{arg}{ext}",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: { args: WEBGL_ARGS }
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }
    }
  ],

  // Boot the real backend (bundled-fixture/demo mode, no external network) and the
  // Vite dev server whose `/api` proxy points at it. reuseExistingServer keeps local
  // iteration fast when you already have the stack up.
  webServer: [
    {
      command: ".venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000",
      cwd: repoRoot,
      url: "http://127.0.0.1:8000/api/health",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe"
    },
    {
      command: `npm run dev -- --port ${PORT} --host 127.0.0.1`,
      cwd: fileURLToPath(new URL(".", import.meta.url)),
      url: BASE_URL,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "ignore",
      stderr: "pipe"
    }
  ]
});
