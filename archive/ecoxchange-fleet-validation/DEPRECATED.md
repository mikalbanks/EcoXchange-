# DEPRECATED — do not use

This package (`ecoxchange-fleet-validation`, "artifact C") is **decommissioned**.

It was the original TypeScript fleet-validation harness. It ran its own
hand-rolled Hay-Davies transposition physics and approximated single-axis
tracking with a scalar `trackingBoost` multiplier — a contaminated baseline.
Its output must never be cited as a benchmark or used as a target.

## Migration

Fleet validation now lives in the pvlib-based verification engine:

- **Engine:** `verification-engine/` (Engine A, `__version__ = "2.0.0"`,
  pvlib ModelChain with real single-axis tracking)
- **Fleet harness:** `verification-engine/src/validate_eia_fleet.py`
  (EIA-923 metered net generation, absolute acceptance criteria)
- **Service wrapper:** `ecoxchange-pvlib-service/` (port 3004), consumed by
  `ecoxchange-reconciliation-engine/src/physics/pvlib-client.ts`

The legacy result is preserved once, clearly labeled as a contaminated
reference, at `archive/fleet-validation-legacy-snapshot.{json,md}`.

Nothing in the standing build imports this package. It is retained only for
historical forensics; see `archive/README.md`.
