# @ecoxchange/nexus-adapter

MCP server that exposes EcoXchange's verified solar production data to any MCP-compatible AI client (Nexus Core, Claude, GPT, Gemini, MCP Inspector).

Reads from Supabase (`projects`, `verification_records`, `raw_readings`) with the anon key. Read-only. Runs on port 3003.

## Tools

| Tool | Purpose |
|---|---|
| `ecoxchange_list_assets` | Discovery: all projects with verified data, filterable by state, capacity, offtake type |
| `ecoxchange_get_asset_profile` | Diligence: full system specs, contract details, performance summary |
| `ecoxchange_get_production_history` | Transparency: monthly inverter/utility/expected kWh + flag reasons |
| `ecoxchange_get_risk_metrics` | Volatility, drawdown, degradation trend, revenue-at-risk, Nexus scoring inputs |
| `ecoxchange_get_durability_score` | Composite 0-10 score across cash-flow / physical / structural dimensions, optional macro-regime impact |

All tools are `readOnlyHint: true, openWorldHint: false`.

## Run

```
# from monorepo root
npm install
npm run build -w @ecoxchange/nexus-adapter
npm run start -w @ecoxchange/nexus-adapter   # listens on http://localhost:3003/mcp
# or dev mode (tsx watch):
npm run dev -w @ecoxchange/nexus-adapter
```

`.env` must set `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Optional `PORT` (default 3003).

### Quick smoke

```
curl -s http://localhost:3003/health
curl -s -X POST http://localhost:3003/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Tests

```
npm test -w @ecoxchange/nexus-adapter                      # unit (no network)
RUN_NETWORK_TESTS=1 SUPABASE_URL=... SUPABASE_ANON_KEY=... \
  npm test -w @ecoxchange/nexus-adapter -- tests/integration.test.ts   # live
```

## Scoring

Three durability dimensions, weighted 40 / 30 / 30:

- **Cash-flow** — contract length, escalator presence, offtake type. Penalizes merchant exposure.
- **Physical** — verification pass rate, capacity factor vs regional benchmark, system age, mean tracking error.
- **Structural** — constant of the EcoXchange issuance model (Reg D 506(c), ERC-3643, Coinbase Base L2, USDC).

Composite ≥ 8 = "high" tier, ≥ 5 = "medium", else "low". Decay constant heuristic: `0.05 + (10 − overall) × 0.01`.

Regime analysis (optional `regime` arg) returns favorable / neutral / unfavorable impact plus a Preqin-sourced historical context string. Five regimes: growth, transition, hard_asset, deflation, repression.

## Caveats

- `location.city` is best-effort extraction from the project name; `location.state` is derived from a lat/lon bounding-box lookup for the 50 US states. Both are null outside the US or when the name doesn't follow `"{City} ..."` convention. Real city/state belongs on the projects table eventually.
- `total_aum_estimate_usd` and `equity_raise_estimate_usd` assume `$2/W × 30% equity`. These are heuristics, not actuals; flagged in `metadata.aum_estimate_assumptions`.
- `observed_degradation_trend` is null when fewer than 3 records exist.
