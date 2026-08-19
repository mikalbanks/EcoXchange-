/**
 * Cloudflare Worker entry — serves the built SPA from dist/public and
 * transparently proxies /api/* to the Express API on Render.
 *
 * Keeping the API same-origin from the browser's perspective avoids
 * cross-origin cookie + CORS gymnastics. The Express session config
 * (server/routes.ts) and the 16 client-side fetch("/api/...") sites
 * work unchanged.
 */

export interface Env {
  ASSETS: Fetcher;
  API_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__deployment") {
      const manifestUrl = new URL("/deployment.json", url);
      const response = await env.ASSETS.fetch(new Request(manifestUrl.toString()));
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", NEVER_CACHE);
      headers.set("Content-Type", "application/json; charset=utf-8");
      headers.set("X-EcoXchange-Deployment-Proof", "cloudflare-workers-builds");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    if (url.pathname.startsWith("/api/")) {
      if (!env.API_ORIGIN || env.API_ORIGIN.includes("REPLACE-ME")) {
        return new Response(
          "API_ORIGIN is not configured. Set it in wrangler.jsonc vars or via `wrangler secret put API_ORIGIN`.",
          { status: 500 },
        );
      }

      const upstream = new URL(env.API_ORIGIN);
      upstream.pathname = url.pathname;
      upstream.search = url.search;

      // Preserve method, headers, cookies, and body. The Render origin handles
      // session validation; we don't strip or rewrite auth.
      return fetch(upstream.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "manual",
      });
    }

    // Static asset or SPA fallback (assets.not_found_handling handles routing).
    const assetResponse = await env.ASSETS.fetch(request);
    return withCacheHeaders(assetResponse, url.pathname);
  },
};

const HASHED_ASSET_RE = /\.(js|css|woff2?|png|svg|ico|jpg|jpeg|webp|avif)$/i;
const NEVER_CACHE = "no-cache, no-store, must-revalidate";
const FOREVER_CACHE = "public, max-age=31536000, immutable";

function withCacheHeaders(response: Response, pathname: string): Response {
  const headers = new Headers(response.headers);

  const isHtmlOrShell =
    pathname === "/" ||
    pathname.endsWith(".html") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/registerSW.js";

  if (isHtmlOrShell) {
    headers.set("Cache-Control", NEVER_CACHE);
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
  } else if (pathname.startsWith("/assets/") || HASHED_ASSET_RE.test(pathname)) {
    headers.set("Cache-Control", FOREVER_CACHE);
  } else {
    // Unknown path (CF Workers will SPA-fallback to index.html via not_found_handling).
    // Treat the response as the shell and disable caching.
    headers.set("Cache-Control", NEVER_CACHE);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
