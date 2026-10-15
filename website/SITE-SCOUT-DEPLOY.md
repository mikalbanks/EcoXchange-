# Site Scout — integration in the current EcoXchange website

## Critical deployment-source correction (2026-10-15)

The current customer-facing DER-first/mineral-white EcoXchange website is **not** the root React app in `client/`.

| Site implementation | Source and branch | Hosting |
|---|---|---|
| **Current marketing website** | `website/` on `ecoxchange-site-rebuild` | Cloudflare Worker named **`ecoxchange`** from `website/wrangler.jsonc`, and Render static preview `ecoxchange-website.onrender.com` / service `srv-darguvfavr4c73ekmt00` with auto-deploy on that branch |
| **Legacy website / API** | `client/`, `server/` on `main` | Render `ecoxchange-y6ah.onrender.com`, API service `srv-d8njcirbc2fs73f49gug`, and legacy Cloudflare Worker **`ecoxchange1`** |

**Root PR #165 changed the legacy app. Do NOT deploy root `wrangler.jsonc` / Worker `ecoxchange1` to replace the current branded website.** The current site must be updated on `ecoxchange-site-rebuild` with changes under `website/`, then deployed from the website project root.

This integration is implemented directly under `website/src/SiteScout.jsx`, not linked to, embedded in an iframe from, or redirecting to the old Render-hosted website.

## Features

- Current EcoXchange navigation, homepage discovery panel, `/site-scout` page, SEO metadata and sitemap.
- U.S. HIFLD lines (PMTiles), on-demand substation data (gzip GeoJSON, clustered), toggles, feature popups, navigation, manual U.S. location search and site pin.
- Current website's visual system preserved (mineral white, Geist/green, responsive).
- Map location / selected coordinates / requested MW / target month carried via a **one-use sessionStorage handoff** into the existing `/assessment` workflow.
- The current `/assessment` continues to use its established **Turnstile verification and Cloudflare Worker HubSpot contact/company submission**. No duplicate lead API, new table, or backend migration.
- The current Cloudflare Worker explicitly allows `/site-scout` and the minimum external map-data/CDN origins through Content Security Policy. `worker-src blob:` is needed by MapLibre.
- Clear distinction between mapped infrastructure and firm available power: no claims of spare MW, interconnection eligibility or utility dates.

## Attribution / dependencies / operational caveats

The implementation follows [Western Power Pool TransmissionMap](https://github.com/BenHutchinsWPP/TransmissionMap) (MIT software) and uses HIFLD / DHS CISA (public-domain underlying infrastructure, distribution/curation through SeerAI / Source Cooperative identified CC BY 4.0), MapLibre, PMTiles, OpenFreeMap and OpenStreetMap Nominatim. Link attribution is visible in the map.

The map uses pinned third-party browser assets (jsDelivr), raw upstream PMTiles/GeoJSON, public OpenFreeMap and explicit-request-only Nominatim geocoding. This is suitable for low-volume MVP evaluation, but **not** a production SLA. Check the archive hosting conditions, CORS/range support, rate limits and browser CSP before promoting as a guaranteed offering; plan an EcoXchange-controlled tile host for reliability.

The CDN/site dependencies are loaded **only when visiting Site Scout**, not immediately from the homepage. Browsers that block mapping assets can still reach the existing assessment.

## Deployment and acceptance

1. Review PR against **`ecoxchange-site-rebuild`**, not `main`. Build/check from `website/`: `npm install && npm run build && npm run test:sites`.
2. Merge to `ecoxchange-site-rebuild`. Render's `ecoxchange-website` static preview is configured for automatic commit deployments on that branch.
3. Deploy/update the **website** Cloudflare Worker (`website/wrangler.jsonc`, name **`ecoxchange`**) from `website/`; do not deploy root Worker `ecoxchange1`. Confirm Cloudflare custom domain ownership / DNS before any worker-level changes.
4. On the actual `www.ecoxchange.net` website, verify `/site-scout`, mobile/desktop layout, lines/substations, search, selection, and Home/nav links.
5. Continue to `/assessment`; confirm site, MW and ramp prefill. Complete Turnstile and send one **authorized** test inquiry. Check the HubSpot contact and company for the selected site; never claim lead capture works from form presence alone.
6. Check missing-map-CDN / blocked-geocoder fallback, CSP console errors, attribution and accessibility.
7. Report the published URL and confirmed production version. Do not call it fully deployed based on legacy Render app or unverified Cloudflare configuration.

**Unresolved:** Direct Cloudflare deployment tooling/credentials are not available in the current ChatGPT connection, and CI on the root `main` remains separately broken (#167).
