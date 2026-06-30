# archive/

Decommissioned components, retained for provenance only. **Nothing here is part
of the standing build or the live verification pipeline.**

- `ecoxchange-fleet-validation/` — the legacy TypeScript EIA-fleet backtest
  harness (artifact **C**). It ran its own hand-rolled Hay-Davies physics plus a
  `trackingBoost` multiplier, not the production engine. **Decommissioned** in
  favour of `verification-engine/src/validate_eia_fleet.py`, which runs the real
  Engine A pipeline. Do not re-introduce it as a benchmark.
- `fleet-validation-legacy-snapshot.{md,json}` — provenance record for the
  contaminated "+15.45% / 38%-within-±10%" figure that C produced. See the `.md`
  for the full health warning and why it could not be re-executed at merge time.
