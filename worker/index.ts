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
    return env.ASSETS.fetch(request);
  },
};
