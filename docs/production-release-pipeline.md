# EcoXchange unified production release pipeline

Production releases are controlled by `.github/workflows/production-release.yml`.

## Release sequence

A successful `CI` run on `main` triggers one serialized production release for the exact CI commit SHA:

1. Resolve and verify the exact commit is reachable from `main`.
2. Deploy or adopt that exact commit on the primary Render API service (`srv-d8njcirbc2fs73f49gug`).
3. Wait for Render to report `live` and for `/api/health` to succeed.
4. Build and deploy the root Cloudflare Worker (`ecoxchange1`) for `www.ecoxchange.net`.
5. Verify `www.ecoxchange.net/__deployment` reports the release SHA.
6. Build and deploy `ecoxchange-dashboard` to the Cloudflare Worker that owns `demo.ecoxchange.net`.
7. Verify `demo.ecoxchange.net/__deployment` reports the release SHA.
8. Compare GitHub, Render, website, and demo release identities. The workflow succeeds only if all report the same SHA.

The workflow is intentionally sequential: Render API -> public website -> demo -> equality verification.

## Required GitHub Actions secrets

Create these repository Actions secrets once:

- `RENDER_API_KEY` — Render API key with access to the EcoXchange workspace and primary `ecoxchange` service.
- `CLOUDFLARE_API_TOKEN` — Cloudflare API token that can deploy the `ecoxchange1` and `ecoxchange-dashboard` Workers and their assets/routes.
- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account ID for those Workers.

The workflow fails closed when a required credential is absent. No fallback deployment is attempted.

## Render auto-deploy transition

The workflow can safely coexist with Render's existing `main` auto-deploy while the pipeline is introduced. It first looks for an existing deployment for the exact release SHA and adopts it when present; otherwise it triggers the deployment through the Render API.

After the unified workflow has completed successfully at least once, disable Render's independent Git auto-deploy. That leaves GitHub Actions as the single production release controller and prevents duplicate deploys.

## Cloudflare release identity

Both Cloudflare builds set `WORKERS_CI_COMMIT_SHA` to the exact release SHA. Existing `scripts/write-deployment-manifest.mjs` writes that identity into the built assets, and each Worker exposes it through `/__deployment` with no-cache headers.

The release is not considered successful merely because `wrangler deploy` exits zero. The workflow polls the live custom domains until their deployment markers match the intended SHA.

## Manual release

`workflow_dispatch` is retained for operational recovery. It accepts an optional exact 40-character commit SHA, but refuses to release a commit that is not reachable from `main`.

Normal production releases should flow from a successful CI run on `main`, not manual dispatch.

## Failure behavior

Any of these conditions fails the production release:

- CI did not succeed.
- release SHA is not on `main`.
- Render deploy fails, times out, or reports the wrong commit.
- Render health check fails.
- either Cloudflare deployment command fails.
- either live deployment marker reports a stale/different SHA.
- final GitHub/Render/www/demo SHA equality check fails.
- public Bankability routes do not return successfully during final smoke checks.

A failed release is visible as a failed GitHub Actions run instead of being silently treated as production-complete.
