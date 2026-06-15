/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Default to 127.0.0.1 (not "localhost") so the dev proxy doesn't fail on macOS where
// "localhost" can resolve to IPv6 ::1 first while the API binds IPv4. Override via env in Docker.
const apiProxyTarget = process.env.ORBITGUARD_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    chunkSizeWarningLimit: 900
  },
  server: {
    port: 5173,
    proxy: {
      "/api": apiProxyTarget,
      "/celestrak": {
        target: "https://celestrak.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/celestrak/, ""),
        headers: {
          "User-Agent": "OrbitGuard/1.0 (hackathon; contact)"
        }
      }
    }
  },
  preview: {
    port: 4173
  },
  test: {
    // jsdom gives component/hook tests a real DOM (focus, events, dataset). The
    // legacy renderToStaticMarkup tests are a subset and still pass here.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // Scope to source ONLY — Playwright specs live in e2e/*.spec.ts and must not
    // be picked up by Vitest (they use @playwright/test, a different runner).
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"]
  }
});
