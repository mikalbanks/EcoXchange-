# @ecoxchange/demo

Deploy shim for **demo.ecoxchange.net**. This package contains no application
code — it owns the Cloudflare Worker and custom domain, and builds
`../ecoxchange-dashboard` for deployment.

**See [DEPLOY-SHIM.md](./DEPLOY-SHIM.md) before changing `wrangler.jsonc` or
this package's build.** The `demo.ecoxchange.net` route is live and
load-bearing, not a leftover claim.

## Contents

| Path | Purpose |
|---|---|
| `wrangler.jsonc` | Worker `ecoxchange-demo`, custom domain `demo.ecoxchange.net`, static assets from `dist/` |
| `worker/index.ts` | Static asset serving with cache and security headers; SPA fallback via the assets binding |
| `scripts/build-from-dashboard.mjs` | Builds `../ecoxchange-dashboard --mode demo-site` and stages its `dist/` here |

## Scripts

```bash
npm run build       # build the dashboard and stage its dist/ here
npm run check       # typecheck worker/
npm run deploy:dry  # build + wrangler deploy --dry-run
npm run deploy      # build + wrangler deploy
```

## Data

The deployed site is the dashboard's `demo-site` build profile: a baked,
deterministic demo dataset with demo compliance banners and no Supabase
dependency. Data configuration lives in `../ecoxchange-dashboard`, not here.

## Deployment

Cloudflare's Workers Build runs `npm run build` in this directory on every push
to `main` and deploys the result. Manual deploys use `npm run deploy`.
