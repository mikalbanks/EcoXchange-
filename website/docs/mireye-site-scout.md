# Site Scout × Mireye (2026-10-22)

## Scope and hosting reality

**This change targets `website/` on `ecoxchange-site-rebuild`, not the old `client/` on main.** Render's `ecoxchange-website` service is a **static** site building `website/dist/client`; its published frontend cannot execute `website/cloudflare/worker.ts` on Render. The API handlers only become active when the Cloudflare Worker is deployed, with the same-site `/api` path.

The public Site Scout will show an enrichment button and fall back gracefully on a static host whose `/api/site-scout/context` route is missing. **Do not claim the integration is live** until both the app and its worker are deployed on the same canonical domain and exercised end to end. Do not add Mireye credentials to Vite `VITE_*` variables, source, browser JavaScript, or GitHub. Worker secrets only.

## Features

* Public button: after selecting a candidate map coordinate, POST `/api/site-scout/context` for **ten explicit Free Fetch public coordinate fields**. Display only whitelisted field values with source links. Unknowns remain unknown.
* Private staff-only POST `/api/internal/site-scout/search`: state + acreage + optional county to find up to 25 parcel candidates. Maximum provider charge **$0.20 per page** at current free-tier pricing. It does not support arbitrary vendor query payloads.
* Private staff-only POST `/api/internal/site-scout/enrich`: enrich a candidate coordinate with owner, zoning, slope, floodplain, mapped transmission distance, utility territory. Maximum provider charge **$0.02 per match** at current pricing.
* Neither licensed Search nor Enrich is reachable through the public UI. The internal endpoints require an independent, >=24-character admin bearer secret; they are not substitutes for user authentication + audit logging in a future internal dashboard.
* No site-power readiness or free-MW number is inferred. Mireye's point and infrastructure data cannot establish load-serving capacity, utility approval, dated firm supply, or developer project economics.

## Configuration (Cloudflare)

1. Sign up at https://www.mireye.com/, accept the current Mireye Earth terms, create an API key with required `Fetch` and licensed-data permissions, and set a spending limit. The free welcome $10 is one-time, not a monthly allowance.
2. Store `MIREYE_API_TOKEN` as a **Cloudflare Worker secret**, not a public build-time environment variable.
3. Generate and store an independent `ECOXCHANGE_SITE_SCOUT_ADMIN_TOKEN` Worker secret for internal-only Search/Enrich calls. Don't reuse the Mireye key.
4. Deploy `website/cloudflare/worker.ts` via the existing `website/wrangler.jsonc` configuration to the production domain hosting Site Scout. Current Render **static hosting will not run this file**.
5. Test public enrichment after selecting a pin, then test internal-only routes using a private HTTP client. Confirm no owner, zoning, parcel boundaries or licensed data appear in public responses, HTML, client JS or browser local storage.

Public smoke test:

```sh
curl -i 'https://www.ecoxchange.net/api/site-scout/context' \
  -H 'content-type: application/json' \
  --data '{"lat":39.0438,"lng":-77.4874}'
```

Private Search example, **run only from a trusted terminal and never paste the resulting licensed owner data into public pages**:

```sh
curl -i 'https://www.ecoxchange.net/api/internal/site-scout/search' \
  -H "authorization: Bearer $ECOXCHANGE_SITE_SCOUT_ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -H 'idempotency-key: scout-va-first-review-01' \
  --data '{"state":"VA","minAcres":20,"maxAcres":200,"limit":10}'
```

Private parcel enrichment:

```sh
curl -i 'https://www.ecoxchange.net/api/internal/site-scout/enrich' \
  -H "authorization: Bearer $ECOXCHANGE_SITE_SCOUT_ADMIN_TOKEN" \
  -H 'content-type: application/json' \
  -H 'idempotency-key: scout-va-parcel-01' \
  --data '{"lat":39.0438,"lng":-77.4874}'
```

Idempotency keys are unique **per exact paid request body**, and must be reused on retries to avoid double-billing. Requests to Search/Enrich without an accepted licensed-data grant may fail. Upstream data results have not been tested until credentials are present.

## License guardrails

See https://www.mireye.com/terms (Oct. 20, 2026). Mireye explicitly permits licensed property data for internal property research, but **does not grant a general right to display licensed parcel records to EcoXchange users/customers**. Obtain written distribution authorization before customer-facing owner/zoning/APN/boundary fields, downloads, lead-data exports, or embedding licensed records in AI models. Do not publish licensed data on-chain. Public Free Fetch is restricted to public coordinate fields with their data-source provenance.

Mireye is a vendor and competitor-adjacent data source, **not EcoXchange's differentiated IP**. Our sellable output must be qualified power constraints, utility-confirmed service gaps and commercially deliverable bridge plans.

## Go-live checklist

- [ ] Credentials/terms/worker spending limit configured
- [ ] Cloudflare Worker deployed on SAME canonical host as /site-scout
- [ ] Browser smoke test verifies sourced public fields + partial/missing data
- [ ] Licensed routes denied (401) without internal admin token
- [ ] Internal Search/Enrich calls succeed and no customer-facing disclosure
- [ ] Mobile layout + accessibility verification
- [ ] Traffic limits, logging and account-level rate rules reviewed before broad public launch
- [ ] At least 5 candidate sites screened; 3 utility/power data requests made; >=1 qualified buyer conversation sourced to Site Scout

## Commercial test

Site Scout is a lead-capture instrument, not an independent parcel-API business. Assess conversion from researched land -> identified MW/date constraint -> qualified decision-maker -> paid power access study or origination mandate. If no high-intent conversations appear within 30 days, stop feature additions and redirect attention to direct sales.
