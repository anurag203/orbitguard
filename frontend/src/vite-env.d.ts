/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Set at build time for the fully-static (Netlify) deploy. When present, `lib/api.ts` resolves
   * every call from pre-baked JSON under `/api-static/**` instead of hitting a live `/api` server.
   */
  readonly VITE_STATIC_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
