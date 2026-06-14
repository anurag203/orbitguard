import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
      "/api": apiProxyTarget
    }
  },
  preview: {
    port: 4173
  }
});
