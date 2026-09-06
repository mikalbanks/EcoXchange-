/**
 * EcoXchange investor dashboard — Cloudflare Worker entry.
 *
 * Serves the static demo SPA and proxies /api/* to the same Express origin used
 * by the primary site. This keeps the Bankability & Sponsor Equity demo on the
 * real calculation service rather than a canned browser-side model.
 */

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  API_ORIGIN: string;
}

const HASHED_PATH = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|svg|png|webp|avif)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__deployment") {
      const manifestUrl = new URL("/deployment.json", url);
      const manifestResponse = await env.ASSETS.fetch(new Request(manifestUrl.toString()));
      const manifestHeaders = new Headers(manifestResponse.headers);
      manifestHeaders.set("cache-control", "no-cache, no-store, must-revalidate");
      manifestHeaders.set("content-type", "application/json; charset=utf-8");
      manifestHeaders.set("x-ecoxchange-deployment-proof", "cloudflare-workers-builds");
      return new Response(manifestResponse.body, {
        status: manifestResponse.status,
        statusText: manifestResponse.statusText,
        headers: manifestHeaders,
      });
    }

    if (url.pathname.startsWith("/api/")) {
      if (!env.API_ORIGIN || env.API_ORIGIN.includes("REPLACE-ME")) {
        return new Response("API_ORIGIN is not configured for the demo worker.", { status: 500 });
      }
      const upstream = new URL(env.API_ORIGIN);
      upstream.pathname = url.pathname;
      upstream.search = url.search;
      return fetch(upstream.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "manual",
      });
    }

    const response = await env.ASSETS.fetch(request);
    if (!response.ok) return response;

    const isHashed = HASHED_PATH.test(url.pathname);
    const headers = new Headers(response.headers);
    if (isHashed) {
      headers.set("cache-control", "public, max-age=31536000, immutable");
    } else {
      headers.set("cache-control", "public, max-age=300, must-revalidate");
    }
    headers.set("x-content-type-options", "nosniff");
    headers.set("referrer-policy", "strict-origin-when-cross-origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
