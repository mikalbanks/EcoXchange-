# Spec 19 — INV→EXP deviation diagnostic

**Date run:** 2026-08-10
**Database:** Supabase project `xgcrooajrdpcgpgoazti`
**Verdict:** **Cause A — fixture leak.** Data-provenance failure, not a logic defect.

The public demo displayed an INV→EXP deviation of exactly 0.0%. This document records the
diagnostic that identified why, with query output pasted verbatim. It is the audit trail for
the fix and the evidence if a reviewer later asks what happened.

---

## D1 — Is EXP computed without INV in scope?

**Result: INV is not in scope. No derivation defect.**

`reconcile()` (`ecoxchange-reconciliation-engine/src/reconciliation/reconcile.ts:11`) receives
`inverter_reading` and `expected_generation` as separate inputs:

```ts
const expected_kwh = expected_generation.expected_kwh;   // line 15
const inverter_kwh = inverter_reading?.kwh_gross ?? null; // line 19

const inv_vs_expected_pct =
  expected_kwh > 0 ? ((inverter_kwh - expected_kwh) / expected_kwh) * 100 : 0; // line 66
```

The expected-generation path takes project configuration and irradiance only:
`calculateExpectedGeneration({...project, period_start, period_end, daily_irradiance})`
(`src/backtest/runner.ts:31-36`), or the pvlib microservice via
`getExpectedGeneration(project, daily)` (`src/physics/pvlib-client.ts`). No caller passes an
inverter-derived value into either.

**The reconciliation algorithm and the expected-generation module are not defective and were
not modified by this work.**

## D2 — What produced the demo's records?

### Row-level dump

```sql
SELECT vr.project_id, vr.period_start, vr.inverter_kwh, vr.expected_kwh,
       vr.inv_vs_expected_pct, vr.status, vr.flag_reasons, vr.engine_version
FROM verification_records vr ORDER BY vr.period_start;
```

| period_start | inverter_kwh | expected_kwh | inv_vs_expected_pct | status | flag_reasons | engine_version |
|---|---|---|---|---|---|---|
| 2024-01-01 | 516016 | 516016 | 0 | verified | [] | 0.1.0 |
| 2024-02-01 | 546624 | 546624 | 0 | verified | [] | 0.1.0 |
| 2024-03-01 | 667163 | 667163 | 0 | verified | [] | 0.1.0 |
| 2024-04-01 | 836859 | 836859 | 0 | verified | [] | 0.1.0 |
| 2024-05-01 | 796045 | 796045 | 0 | verified | [] | 0.1.0 |
| 2024-06-01 | 858953 | 858953 | 0 | verified | [] | 0.1.0 |
| 2024-07-01 | 795158 | 795158 | 0 | verified | [] | 0.1.0 |
| 2024-08-01 | 776243 | 776243 | 0 | verified | [] | 0.1.0 |
| 2024-09-01 | 611196 | 611196 | 0 | verified | [] | 0.1.0 |
| 2024-10-01 | 721974 | 721974 | 0 | verified | [] | 0.1.0 |
| 2024-11-01 | 486701 | 486701 | 0 | verified | [] | 0.1.0 |
| 2024-12-01 | 489823 | 489823 | 0 | verified | [] | 0.1.0 |

`inverter_kwh` is byte-identical to `expected_kwh` on all twelve months. All twelve are
`verified` with no flag reasons.

### Aggregate fingerprint

```sql
SELECT
  (SELECT count(*) FROM verification_records) AS verification_records,
  (SELECT count(*) FROM raw_readings)         AS raw_readings,
  (SELECT count(*) FROM engine_runs)          AS engine_runs,
  (SELECT count(DISTINCT verified_at) FROM verification_records) AS distinct_verified_at,
  (SELECT min(verified_at)::text FROM verification_records)      AS verified_at_value,
  (SELECT count(*) FROM verification_records WHERE inverter_kwh = expected_kwh) AS inv_eq_exp_rows,
  (SELECT count(*) FROM verification_records WHERE abs(utility_kwh - inverter_kwh*0.97) < 0.5) AS util_is_97pct_of_inv,
  (SELECT count(DISTINCT engine_version) FROM verification_records) AS distinct_engine_versions;
```

```json
[{"verification_records":12,"raw_readings":0,"engine_runs":0,"distinct_verified_at":1,
  "verified_at_value":"2026-06-14 04:15:14.697761+00","inv_eq_exp_rows":12,
  "util_is_97pct_of_inv":11,"distinct_engine_versions":1}]
```

`util_is_97pct_of_inv` reads 11 rather than 12 only because of integer rounding — the largest
residual across the set is −0.52 kWh:

```json
[{"period_start":"2024-01-01","inverter_kwh":516016,"utility_kwh":500535,"util_over_inv":"0.96999899","residual_kwh":"-0.5200"},
 {"period_start":"2024-06-01","inverter_kwh":858953,"utility_kwh":833184,"util_over_inv":"0.96999952","residual_kwh":"-0.4100"},
 {"period_start":"2024-05-01","inverter_kwh":796045,"utility_kwh":772164,"util_over_inv":"0.97000044","residual_kwh":"0.3500"}]
```

So `utility_kwh = round(inverter_kwh × 0.97)` on **all twelve** months.

### Project row

```json
[{"id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","name":"Savannah Community Solar 5MW",
  "inverter_plant_id":"demo-plant-001","status":"active","utility_provider":null,
  "utility_account_ref":null,"capacity_kw_dc":5000,"latitude":32.08,"longitude":-81.09,
  "created_at":"2026-06-14 04:15:14.697761+00"}]
```

`utility_provider` is NULL while every verification record carries a `utility_kwh` — incoherent,
and further evidence the utility leg was fabricated rather than ingested.

### Schema check

`information_schema.columns` for `verification_records` returned 19 columns and **no
`data_provenance`**. There was no way for a record to declare where its telemetry came from.

### Conclusion

`raw_readings` and `engine_runs` are both empty while twelve verification records exist. Records
cannot be engine output without underlying readings. All twelve share one `verified_at`
timestamp (`2026-06-14 04:15:14.697761+00`), identical to the project's `created_at` — a single
INSERT, not twelve monthly runs.

These are Reference Scenario 1 from engine spec §5.5 generated at `monthly_deviation_pct: 0`,
where `simulated_inverter_kwh = expected_kwh × (1 + 0/100)` collapses to `expected_kwh` by
construction and `simulated_utility_kwh = simulated_inverter_kwh × 0.97`
(`src/backtest/runner.ts:152-153`).

**The reconciliation engine had never run against this database.**

## D3 — Two findings not in the original brief

### 1. There was no code path that could have written this data

Within `ecoxchange-reconciliation-engine/src/`, the typed DB helpers
`storeVerificationRecord`, `storeRawReading` and `createEngineRun` had **zero callers** outside
their own modules. `runBacktest` returns a report object and never persisted. The CLI defaulted
to `--deviation 0` (`src/index.ts:21`) — precisely the fixture-generation path.

This corroborates the conclusion independently: the engine had no persistence path to run
through, so Task C had to *build* one rather than merely re-run.

### 2. The 0.0% was not on demo.ecoxchange.net

There are two public surfaces with different data sources:

| Surface | Build profile | Data source | State at diagnosis |
|---|---|---|---|
| demo.ecoxchange.net | `.env.demo-site` — deliberately **no** Supabase vars | baked-in `demo-savannah.json` | realistic noise (−3.79%…+3.5%) since commit `8c891ac`, but 12/12 VERIFIED |
| dashboard worker | `.env.production` — Supabase configured | Supabase `xgcroo…` | **the 0.0% rows** |

`ecoxchange-dashboard/.env.demo-site` states the intent explicitly: *"Deliberately NO Supabase
vars: the public demo runs on the baked-in canonical demo dataset."*

So the zero-deviation rows reached the Supabase-backed dashboard build, while the demo site
showed realistic deviations but twelve green badges and no provenance labelling. Both surfaces
needed work: the database reseed fixes the former, the regenerated fixtures fix the latter.
