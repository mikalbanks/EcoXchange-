# This package is a deploy shim — do not decommission it

**Read this before "cleaning up" the `demo.ecoxchange.net` route in
`wrangler.jsonc`, or before disabling this package's build.** Both are
load-bearing. Removing either takes the live demo site offline.

## What this package is

`demo.ecoxchange.net` is served by the Cloudflare Worker named
`ecoxchange-demo`, which is defined by this package's `wrangler.jsonc`. The
Worker's Cloudflare-managed build runs `npm run build` in this directory on
every push to `main`.

That build does **not** compile an app in this package — this package has no
app. `npm run build` runs `scripts/build-from-dashboard.mjs`, which builds
`../ecoxchange-dashboard` in `--mode demo-site` and stages the resulting
`dist/` here. `worker/index.ts` then serves that `dist/` as static assets with
cache headers.

```
push to main
  -> Cloudflare Workers Build (ecoxchange-demo)
  -> npm run build  (here)
  -> builds ../ecoxchange-dashboard --mode demo-site
  -> stages dashboard dist/ -> ecoxchange-demo/dist/
  -> wrangler deploys worker/index.ts + dist/ to demo.ecoxchange.net
```

## Why the domain claim is intentional

The `custom_domain` route and the Workers Build binding both live on the
`ecoxchange-demo` Worker. Pointing that build at `ecoxchange-dashboard` is a
pure repo-side change; moving the domain to a different Worker requires
Cloudflare dashboard changes. So the shim stays, and this file exists so the
route in `wrangler.jsonc` does not read as a stale claim left by a retired app.

If you want the domain to live on a Worker named after the dashboard, that is a
Cloudflare dashboard migration, not a `wrangler.jsonc` edit. Do it
deliberately, with the deploy verified afterward — not as config cleanup.

## History

This package once contained its own legacy React demo app under `src/`. That
app was retired in July 2026 when the build was repointed at
`ecoxchange-dashboard`, and its source, Vite/Tailwind config, and legacy-only
dependencies have since been deleted so no stale app can be built or deployed
here. The retired app remains in git history.

Superseded by: `../ecoxchange-dashboard`
