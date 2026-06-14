/**
 * Static-mode request keying for the fully-static (Netlify) deploy.
 *
 * When `VITE_STATIC_API` is set, `lib/api.ts` resolves every call from pre-baked JSON under
 * `/api-static/<key>.json` instead of hitting a live `/api` server. The key is a deterministic
 * hash of `method + canonical-path + canonical-body`, so a GET (with query) or a POST (with body)
 * always maps to the same file regardless of param/key ORDER.
 *
 * IMPORTANT: `scripts/snapshot-api.mjs` re-implements `canonicalPath`, `stableStringify`, `fnv1a`,
 * and `staticKey` with IDENTICAL logic. If you change one, change both — a Vitest test
 * (`staticApi.test.ts`) pins a few known keys to catch drift.
 */

/** Sort query params so `?a=1&b=2` and `?b=2&a=1` hash identically. */
export function canonicalPath(path: string): string {
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

/** JSON.stringify with recursively sorted object keys (stable across key order). */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** 32-bit FNV-1a hash → 8-hex chars. Plenty for the ~30-entry baked demo surface. */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `0000000${h.toString(16)}`.slice(-8);
}

/** Stable key for a request: `METHOD canonical-path [canonical-body]` → fnv1a hex. */
export function staticKey(method: string, path: string, body?: BodyInit | null): string {
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
