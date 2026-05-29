# @ecoxchange/demo

Public investor dashboard demo for **demo.ecoxchange.net**. JSON-only, no auth, no backend — a Vite + React SPA that lifts the ecoxchange.net editorial brand (Playfair Display italic + IBM Plex Mono + dark green stat bands + rectangular CTAs) and walks a visitor through the Savannah 5MW community solar reference deal.

## Pages

| Route | Purpose |
|---|---|
| `/` | Portfolio overview — investor stat band + Savannah project card |
| `/project/demo-savannah-5mw` | Project detail with monthly production chart + verification ledger |
| `/project/demo-savannah-5mw/verification/2024-04-01` | Three-way reconciliation figure + supporting data |

The header has a small **Demo · Verified/Flagged** toggle. Flipping to "Flagged" swaps the underlying JSON to a -20% deviation scenario so reviewers can see how the engine surfaces issues — bars turn amber, badges become `▲ FLAGGED`, the flag-reason callout appears.

## Scripts

```
npm install
npm run dev         # http://localhost:5173
npm run build       # tsc -b && vite build → ./dist
npm run preview     # serve dist on :4173
npm run check       # tsc -b --noEmit
npm run deploy:dry  # build + wrangler deploy --dry-run (no production push)
npm run deploy      # build + wrangler deploy (publishes to demo.ecoxchange.net)
```

## Deployment

`wrangler.jsonc` is wired to deploy as a Cloudflare Worker named `ecoxchange-demo` with a `custom_domain` route on **demo.ecoxchange.net**. Cloudflare auto-issues the TLS cert on first deploy. The `ecoxchange.net` zone must be on the same Cloudflare account as the existing `ecoxchange1` Worker — based on the root `wrangler.jsonc`, it is.

After the first successful `npm run deploy`, the demo is live at:

- **Production:** https://demo.ecoxchange.net
- **Workers preview:** `https://ecoxchange-demo.<account>.workers.dev`

## Brand tokens

All design tokens live in `tailwind.config.ts` under the `eco.*` color scale and the `display` / `body` / `mono` font families. Google Fonts are loaded from a single `<link>` in `index.html` — no font bundling.

| Token | Hex | Used for |
|---|---|---|
| `eco-dark` | `#1B4D35` | Primary CTAs, table headers, dark stat band |
| `eco-lime` | `#76C945` | Large stat numbers on dark bg, accents |
| `eco-olive` | `#7A9B6D` | Section tags (`§ I`), mono labels |
| `eco-flagged` | `#C17B1A` | Amber for flagged status |
| `eco-pale` | `#E8F0EA` | Subtle row-hover fill |

## Data

Two JSON files under `src/data/` carry the demo backtest — `demo-savannah.json` (verified) and `demo-savannah-flagged.json` (×0.78 inverter, status=flagged). Copied verbatim from `../ecoxchange-dashboard/src/data/`; intentionally duplicated to keep this package self-contained.

## What this is not

- Not authenticated. Not gated. Public by design.
- Not wallet-aware. No tokens, no chain IDs, no Web3 wording (acceptance #12).
- Not wired to Supabase or the reconciliation engine — the spec called for a static demo that loads under 2 s on a cold cache.
