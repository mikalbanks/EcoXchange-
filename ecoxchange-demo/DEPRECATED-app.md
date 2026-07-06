# This package is now a deploy shim — the app in src/ is retired

`demo.ecoxchange.net` is owned by this package's Cloudflare Worker
(`ecoxchange-demo`, see `wrangler.jsonc`), and its Workers Build runs
`npm run build` here on every push. As of July 2026 that build **no longer
compiles the legacy demo app in `src/`** — it builds the real product,
`../ecoxchange-dashboard` (all Fable-5 sprint specs: verification engine
v2.0.0 UI, mobile, compliance, explorer, UI overhaul, USDC distribution
simulation, verification report PDF, LOI builder, differentiation features),
and stages its `dist/` here for deployment. See
`scripts/build-from-dashboard.mjs`.

Why a shim instead of moving the domain: the `custom_domain` route and the
CI build binding live on this worker; repointing the build is a pure
repo-side change, while moving the domain requires Cloudflare dashboard
changes. `worker/index.ts` (static serving + cache headers) is unchanged and
serves the dashboard dist as-is.

- The legacy app remains runnable via `npm run build:legacy` / `npm run dev`.
- Full removal of `src/` is a follow-up once the new demo domain is confirmed
  stable in production.
