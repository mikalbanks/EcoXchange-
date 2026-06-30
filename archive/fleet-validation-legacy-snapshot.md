# Fleet-validation legacy snapshot — CONTAMINATED BASELINE, DO NOT USE AS A TARGET

> **Provenance / health warning.** This snapshot records the output of the
> now-decommissioned `ecoxchange-fleet-validation` (artifact **C**) harness.
> That harness did **not** use the production verification engine. It ran its
> **own hand-rolled Hay-Davies physics** (a copy of the reconciliation engine)
> and faked single-axis tracking with a `trackingBoost` **multiplier** rather
> than real tracker geometry. It is retained here **only as a contaminated
> reference** so the provenance of the prior "+15.45%" figure is on the record.
>
> It is **not** a valid benchmark and **not** a number to beat. The honest
> baseline is the first clean run of `verification-engine/src/validate_eia_fleet.py`
> (Engine A on real physics), whose acceptance is stated in **absolute** terms
> (median +2–6%, ≥70% within ±10% on the clean fixed-tilt cohort, tracking
> cohort ≥60%) — not relative to anything below.

## Legacy reported figures (transcribed)

| Metric | Legacy value |
|---|---|
| Median deviation (model vs EIA-923 actual) | **+15.45%** (model over-predicts) |
| Plants within ±10% | **~38%** |
| Physics | Hand-rolled Hay-Davies transposition (not pvlib ModelChain) |
| Tracking | `trackingBoost` scalar multiplier (not real tracker geometry) |
| Irradiance | EcoXchange irradiance MCP (`http://localhost:3002/mcp`) |
| Ground truth | EIA-923 monthly net generation |

## Why this was not re-executed during the merge

Per the merge plan, C was to be run **once** to capture its literal output
before archiving. That one-time capture could **not** be reproduced in the
merge environment because the harness has two runtime dependencies that are not
available here and that it cannot run without:

1. the **irradiance MCP service on `:3002`** (`IRRADIANCE_MCP_URL`,
   `src/index.ts`), which is a separate deployed component; and
2. the **federal datasets** (USPVDB + EIA-860 + EIA-923) fetched by
   `scripts/download-data.sh` — hundreds of MB of EIA workbooks.

C's own `reports/` directory was **empty** (`.gitkeep` only) — there was no
committed baseline report to snapshot either. The figures above are therefore
**transcribed from Spec 01-C and prior reporting**, not freshly produced.

The archived code remains at `archive/ecoxchange-fleet-validation/` so the
literal legacy number can still be captured locally if ever needed (stand up the
`:3002` MCP, run `scripts/download-data.sh`, then `npm start`). It has been
removed from the standing run surface so no fudged harness is part of the live
pipeline. **Do not** re-introduce it as a benchmark.
