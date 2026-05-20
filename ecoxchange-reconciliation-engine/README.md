# EcoXchange Reconciliation Engine

Patent-pending three-way solar production verification engine. Takes inverter kWh, utility meter kWh, and satellite-derived expected kWh, and emits a deterministic `VERIFIED | FLAGGED | PENDING` verdict per project per period.

This package covers **Phases A–C** of the spec: physics model, reconciliation algorithm, backtest harness. Database persistence and orchestration (Phases D–E) are intentionally not built here.

## Layout

```
src/
├── physics/              Hay-Davies transposition + expected-generation pipeline
├── reconciliation/       Three-way reconcile() + edge-case helpers
├── ingestion/            NASA POWER daily GHI/DNI/DHI client
├── backtest/             Runner, three reference scenarios, JSON+markdown reports
├── config/               DEFAULT_TOLERANCES, constants
├── utils/                Dates, math, types
└── __tests__/            Vitest suites
```

## Scripts

```
npm install
npm run check                 # tsc --noEmit
npm test                      # unit tests (no network)
npm run backtest -- --scenario all      # write reports/{scenario}-{ts}.{json,md}
npm run backtest:validate     # integration tests against live NASA POWER
```

## Reference backtest results

Run against NASA POWER daily irradiance for 2024 (kWh/m²/day, free, no API key):

| Scenario | Annual (MWh) | PVWatts band (MWh) | Within ±10% | Capacity factor |
|---|---|---|---|---|
| Savannah, GA (5 MW, 20° tilt) | 8103 | 8200–8800 | yes | 18.5% |
| Billerica, MA (2 MW, 25° tilt) | 2831 | 2800–3200 | yes | 16.2% |
| Phoenix, AZ (1 MW, 15° tilt) | 2014 | 1800–2000 | yes | 23.0% |

All three sit inside spec §5.6 acceptance criteria:
1. Annual expected within ±10% of NREL PVWatts band.
2. Capacity factors land in industry norms (Savannah 16–20%, MA 14–17%, Phoenix 20–25%).
3. Zero false flags when simulated inverter exactly matches expected.
4. Every month is flagged when -20% deviation is injected.
5. Monthly pattern preserves seasonal shape (max/min ratio > 1.3).

## Implementation notes

The spec's literal `beam_poa = DNI × R_b` double-counts beam radiation (DNI is direct-normal; R_b transposes horizontal beam to tilted). Canonical Hay-Davies uses **beam-on-horizontal = GHI − DHI** with R_b. The implementation follows the canonical form, which is the only way to match PVWatts; the DNI value is still used as the reference for the Hay-Davies anisotropy index.

The daily-noon hour-angle approximation in spec §2.2 is preserved — daily integration is done at noon and applied to the daily kWh/m² totals from NASA POWER.

## Next phases (not in this package)

- Phase D: Supabase tables (`projects`, `raw_readings`, `verification_records`, `engine_runs`) and orchestration (`runMonthlyReconciliation`).
- Phase E: CLI commands `reconcile --month`, `report --project`.
- Chainlink Functions oracle write.
