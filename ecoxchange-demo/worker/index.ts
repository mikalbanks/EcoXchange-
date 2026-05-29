/**
 * EcoXchange public investor demo — Cloudflare Worker entry.
 *
 * Pure static asset serving. The SPA fallback is handled by the assets
 * binding (not_found_handling: "single-page-application"). We add immutable
 * cache headers to hashed Vite assets and no-cache to the HTML shell.
 */

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const HASHED_PATH = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?|svg|png|webp|avif)$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
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
