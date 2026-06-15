import type { Context } from "https://edge.netlify.com";

const UPSTREAM = "https://celestrak.org";
const USER_AGENT = "OrbitGuard/1.0 (hackathon; contact)";
const ALLOWED_PATHS = [/^\/NORAD\/elements\/gp\.php$/, /^\/satcat\/records\.php$/, /^\/pub\/satcat\.csv$/];

function cacheSeconds(pathname: string): number {
  return pathname.startsWith("/NORAD/elements/") ? 3600 : 86400;
}

function response(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default async function celestrak(request: Request, _context: Context): Promise<Response> {
  if (request.method !== "GET") return response("Only GET is allowed.", 405);

  const url = new URL(request.url);
  const pathname = url.pathname.replace(/^\/celestrak/, "") || "/";
  if (!ALLOWED_PATHS.some((rule) => rule.test(pathname))) {
    return response("CelesTrak path is not allowlisted.", 400);
  }

  const upstreamUrl = new URL(`${UPSTREAM}${pathname}`);
  upstreamUrl.search = url.search;

  const upstream = await fetch(upstreamUrl, {
    headers: {
      Accept: request.headers.get("Accept") ?? "*/*",
      "User-Agent": USER_AGENT
    },
    redirect: "error"
  });

  const headers = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  const ttl = cacheSeconds(pathname);
  headers.set("Cache-Control", `public, max-age=${ttl}`);
  headers.set("Netlify-CDN-Cache-Control", `public, max-age=${ttl}, durable`);
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}

export const config = { path: "/celestrak/*" };
