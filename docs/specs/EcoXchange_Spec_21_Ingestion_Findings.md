# Spec 21 (Rev B) — what the PVDAQ lake actually contains

Implementation notes for `verification-engine/src/ingestion/`. Everything below
was measured against `s3://oedi-data-lake` during the spec 21 build, not
inferred. Where the spec and the bucket disagree, the bucket wins and the code
carries the correction with the evidence attached.

The spec's own §7.7 sets the rule this document follows: when the data does not
produce the expected result, **report it** rather than manufacture one.

---

## 1. Verified as specified

| Spec | Claim | Status |
|---|---|---|
| §3.1 | `systems_20250729.csv`, 1,862 rows, columns as listed | correct |
| §3.1 | Drop `^Unnamed` columns; systems repeat when arrays differ | correct — 5 unnamed columns, 1,862 rows collapse to 1,830 systems |
| §3.2 | `dc_capacity_kW>=100, tracking=='fixed', qa_status=='pass', years>=2` → 16 | correct — 16 rows, 14 distinct systems |
| §3.3 | Partition dirs unpadded (`month=6`), filename padded (`2018_06_01`) | correct |
| §3.3 | Long format `measured_on, utc_measured_on, metric_id, value`; pivot on `metric_id` | correct |
| §5 | pvanalytics 0.2.2 call signatures | all seven match exactly |
| §5 | `outliers.zscore` throws on gapped data; use `hampel` | correct |

## 2. Corrections

### 2.1 There are two time-series layouts, and the seed systems are split across them

§3.3 gives one path. The lake has two stores:

| Store | Path | Systems |
|---|---|---|
| `partitioned` | `pvdaq/parquet/pvdata/system_id={id}/year=/month=/day=` | 157, including seeds **1332** and **4902** |
| `data_prize` | `pvdaq/2023-solar-data-prize/{id}_OEDI/data/*.csv` | 5 (2105, 2107, 7333, 9068, 9069), including seeds **9069** and **2107** |

**Systems 9069 and 2107 have no objects at all under `parquet/pvdata` or
`csv/pvdata`** — not an empty partition, no prefix — even though the index
advertises 7.79 and 7.92 years of record for them. Their telemetry exists only
in the data-prize bundles, in a different shape: wide CSVs with one row per
timestamp and no date partitioning.

Consequence for cost: a one-month fetch from `data_prize` reads the whole
object. 9069's `9069_electrical_ac.csv` is **1.77 GB**, so a naive 24-month
backfill would move ~42 GB. `PVDAQAdapter` materializes the site-total series
once into `cache_dir` (one 116-second pass, 768,862 rows) and slices it after
that.

### 2.2 The metrics dictionary is per-system, and it is not in the JSON

§3.4 says the `metrics` parquet table has "14 rows, all for `system_id=10`" and
sends resolution to `csv/system_metadata/{id}_system_metadata.json` instead.

Both halves are wrong:

* `pvdaq/parquet/metrics/` holds **160 files**, one per system:
  `metrics__system_{id}__part000.parquet`. The "14 rows for system 10" is
  `metrics__system_10__part000.parquet` read as though it were the whole table.
  System 1332 resolves there in full — 22 rows covering exactly the 2638–2659
  range the spec names as unresolvable.
* `{id}_system_metadata.json` contains `System`, `Site`, `Mount`, `Inverters`,
  `Modules`, `Meters`, `Other Instruments` — and **no metric ids at all**, for
  any system. It cannot resolve a channel.

The dictionary carries `sensor_name`, `common_name`, `raw_units`, `units`,
`calc_scale` and `source_type`, which is what makes principled resolution
possible rather than a name-matching heuristic.

§3.4's substantive rule — *never default a metric id* — stands, and is enforced.

### 2.3 `utc_measured_on` is null for entire years

§3.3 says "Use `utc_measured_on`." Every row of system 1332 in 2018 has `NaT`
there; 2021 is fully populated. The adapter uses it where present and otherwise
localizes `measured_on` — which is naive **site-local** — through the site's IANA
zone, the same explicit localization spec 20 §2.1 requires of weather frames. It
never treats a naive stamp as UTC. The basis used is recorded per fetch in
`raw_payload["timestamp_basis"]`.

### 2.4 `timezone_or_utc_offset` is often not an IANA string

§3.1 describes it as an IANA string. Among the four seed systems:

| System | Field value | Resolved | How |
|---|---|---|---|
| 9069 | `5` | `America/New_York` | offset, cross-checked against longitude |
| 2107 | `PST8PDT` | `PST8PDT` | valid zone key as-is |
| 1332 | `7` | `America/Denver` | offset, cross-checked |
| 4902 | `5` | `America/New_York` | offset, cross-checked |

`resolve_iana_timezone()` parses the field three ways and, where it is a number,
requires the resulting zone's standard offset to agree with `-longitude/15`
within 1.75 h before accepting it. Arizona is resolved from `site_location`
ahead of the offset table, since it keeps MST year-round and cannot share
`America/Denver`. A field that resolves to nothing raises — a wrong zone shifts
every monthly bucket boundary without ever looking wrong.

### 2.5 PVDAQ writes missing samples as a sentinel value, not a null

Not mentioned in the spec, and the most damaging thing found.

`-999` and `-7999` are missing-data markers. **All of June 2015** for system 4902
is `-999` on the AC power channel; so are May 2015, and April and October 2016
in part. System 1332's voltage and current channels sit at `-7999` for entire
files.

Read as measurements they fail in the worst available way:

* June 2015 for 4902 integrates to **−520 MWh** on a 271 kW plant, and
* the month still scores **100% complete**, because a sentinel is a value where
  a gap is not — so the QC layer sees nothing wrong.

`MISSING_VALUE_SENTINELS` masks them to `NaN` before any conversion, and the
count is reported per fetch in `raw_payload["sentinel_values_masked"]`. Matching
is by exact value, not threshold: the genuine overnight tare draw at these sites
is −5 to −8 kW, and a threshold wide enough to be safe would swallow it.

### 2.6 System 1332's stored units change under a stable dictionary

The dictionary declares `raw_units=kW, units=W, calc_scale=1000` for
`metered_ac_power` (2638) throughout the record. The stored values are kW
through **2018-07** and W from **2018-08** onward:

```
1332 metered_ac_power, max on the 15th of each month
2017      245     783    1051     976     978     990    1068    1084     949  ...
2018       73    1008    1107    1023    1137    1008     467  934400  839200  ...
```

Dictionary-driven conversion after the break yields a 501 MW peak on a 1.15 MW
plant. `ImplausibleMagnitudeError` rejects any period whose |AC power| p99.9
exceeds 1.5× the DC nameplate rather than picking a scale factor per year, and
the ingestion window for 1332 stops at 2017-12 for that reason.

### 2.7 System 2107 states no units for its AC power columns

9069's prize CSV names its columns `inverter_01_ac_power_(kw)_inv_150953` — the
unit is in the name. 2107's are `inv_01_ac_power_inv_149583`, with no unit, and
the prize bundle carries no metrics dictionary to supply one. Inferring kW from
magnitudes against the 27.6 kW ABB inverter nameplate would be a guess, and a
wrong guess is a clean 1000× error, so **2107 is not seeded**. See §4 below.

### 2.8 §5's night-energy guard needs two corrections, not one

The most important item here, because the check reads as working either way.

**(a) The mask must come from geometry, not from the data.** §5 derives the
daylight mask from `daytime.power_or_irradiance`, which infers day and night
**from the series itself**. Shift a whole month and the inferred daylight window
shifts with it. Measured on a clear-sky June month at Golden CO:

| Series | §5 mask (data-derived) | Solar geometry |
|---|---|---|
| Correctly aligned | 0.005% night energy | 0.000% |
| Shifted +7 h | **0.005% night energy** | **44.74%** |

Under §5 as written, a +7 h misalignment scores identically to a correct series,
and §7.4 (`night_energy_frac < 1.0` on every month) would be satisfied by
construction rather than by evidence. `assess()` therefore takes
`latitude`/`longitude` and builds the mask from `pvlib.solarposition` — the same
construction spec 20's `tests/test_time_alignment.py` uses. The data-derived
path is kept for sources with no coordinates and **discloses itself** in
`qc_notes`.

**(b) Night starts at the end of civil twilight, not at the horizon.** With the
geometry mask in place and the boundary at 0°, the first full ingestion run
failed §7.4 on one month — system 1332, October 2017, at 1.114%. It is not
misaligned. Measured on that month:

| Solar depression | aligned | +30 min | +1 h | +7 h |
|---|---|---|---|---|
| 0° | **1.114** | 0.184 | 0.000 | 55.441 |
| 6° | 0.213 | 0.000 | 0.000 | 48.321 |

At 0° the correct month **fails** and the same month shifted a full hour
**passes**. All 1.114% sits between −6° and 0° — morning diffuse before
geometric sunrise, on a steeply tilted array at 1,770 m with a clear horizon —
and none of it below −18°. 1332's other months behave the same way (median
0.383% at 0°) while 9069 and 4902 sit at 0.000%: it is a property of that site.

`NIGHT_DEPRESSION_DEG = 6.0` puts the boundary at the end of civil twilight,
where the separation is clean — 0.213% healthy against 48.3% for the
longitude-sized shift.

**What the guard is, precisely.** It detects **hour-scale** misalignment — the
error of spec 20 §2.1 — and nothing finer. The table above shows a 30-minute
shift scoring *below* an aligned series, because a small shift moves genuine
twilight production into daylight faster than it pushes evening production past
dusk. A passing night fraction is evidence against a large shift and no more
than that; §7.4 should be read accordingly.

### 2.9 `daytime.power_or_irradiance(clipping=...)` is broken in pvanalytics 0.2.2

`daytime.py:224` evaluates `clipping or False`, which raises *"The truth value of
a Series is ambiguous"* for any Series passed. §5's call signature hits it
directly. The correction that line intends — no clipped sample is ever night —
is applied by hand against the default call instead.

### 2.10 Clipping downgrades through the staleness rule unless stopped

§5 is explicit that clipping is a note and never a downgrade. A clipped ceiling
is also a long run of identical values, so an unguarded stale measure reaches
55% on a healthy clipped plant and downgrades it to `partial` anyway — via the
stale rule, without ever mentioning clipping.

Staleness is measured on daylight samples minus the clipped ceiling (99th
percentile, 2% band). The exclusion is *at the ceiling* rather than "flagged as
clipping", because `clipping.geometric` also fires on a channel frozen mid-ramp,
and dropping everything it flags would hide exactly the fault the check is for.
Measured on one fixture: healthy 0%, clipped-at-500 kW 0%, frozen-for-six-days
14%.

### 2.11 A system's available channels change within its own record

Not a spec error, but the trap the "never default a metric id" rule is really
protecting against, and it bites in a way a per-month resolver does not survive.

System 1332's dictionary declares three per-inverter AC power channels, a
calculated `inv_total_ac_power`, and a `metered_ac_power`. Which of them carry
rows **varies month to month**: `inv3_ac_power` (2650) and `inv_total_ac_power`
(2654) are absent from some day files and present in others. A resolver that
picks per month therefore risks changing measurement point mid-window, and the
deviations either side of such a switch are not comparable.

Two things guard it. `resolve_ac_power` refuses to sum a partial set of inverter
channels — summing two of three under-reports the site by a third and still
looks like a plant. And `scripts/ingest_pvdaq.py` records
`ac_power_channel_consistency` per system, so a window that silently resolved to
two different channels is visible in the artifact rather than only in the
numbers.

This is also where the first full run lost 15 of 1332's 24 months: `_role`
matched `inv_total_ac_power` on "total" before the `inv` prefix, making it
compete with `metered_ac_power` for site total, and the resolver correctly
refused the ambiguity it had been handed. An aggregated inverter channel is an
inverter channel; it now classifies as one.

### 2.12 Sub-minute sampling has nowhere to live in `interval_minutes`

System 1332 logs every **15 seconds**. `reading_quality.interval_minutes` is an
`INT` and `energy_kwh()` multiplies by it, so rounding 0.25 up is a 4× energy
error and rounding down is a divide-by-zero. `infer_interval_minutes()` raises on
sub-minute input and the adapter resamples to a 1-minute grid of means — the
energy-preserving reduction for an instantaneous-power channel — recording it in
`conversion_applied`.

### 2.13 `shifts_ruptures` needs a dependency §1 does not list

`pvanalytics.quality.time.shifts_ruptures` imports `ruptures` lazily and fails
with *"requires ruptures"* at call time, not import time. Added to
`requirements.txt`.

### 2.14 `raw_readings.data_provenance` did not exist

Spec 21 lists it as landed with spec 19. Spec 19 (commit `063f50f`) shipped the
PVDAQ 9068 demo bundle, the independence assertion and CI, and carried leg
provenance inside `demo-pvdaq-9068.json` — it never touched the schema. Running
only §4's `ADD CONSTRAINT` would fail on a missing column, so migration 013
creates it first.

---

## 3. Two findings that are not corrections

**9069 has revenue-meter channels.** §8 states PVDAQ has three meter records
total and therefore no independent utility leg. That is true of
`pvdaq/parquet/meters`, but 9069's prize bundle contains a 73 MB
`9069_meter_data.csv` with `meter_1_ac_power_(kw)` and `meter_2_ac_power_(kw)`
alongside the 40 inverters. Whether those meters are independent of the same
telemetry system — which is what an independent leg requires — is not established
by their existence, so **nothing here is described as three-source validation**
and §8 stands as written. It is worth checking before Bayou.

**9069's peak output falls over the record**, from 33.0 MW in 2016 to 24.4 MW in
2023 on a 33 MW nameplate. Far too steep for degradation alone; likely partial
outage, curtailment or a changed inverter limit. It is the reason the demo window
is 2021–2022 rather than the full record, and it is worth a look on its own.

---

## 4. Seed systems: three of four

| System | Seeded | Window | Note |
|---|---|---|---|
| **9069** Simon Solar Farm | yes | 2021-01 … 2022-12 | primary demo, 24 consecutive months. Reference system only — 33 MW is outside the 1–20 MW band, never a segment example |
| **1332** NREL Parking Garage | yes | 2016-01 … 2017-12 | window ends before the 2018-08 units break (§2.6) |
| **4902** NIST Ground 1 | yes | 2016-01 … 2017-12 | inside the 2014-08 … 2018-02 record |
| **2107** Farm Solar Array | **no** | — | AC power columns state no unit and there is no dictionary (§2.7) |

§7.2 asks for four. Three are seeded. The fourth is not a bug to fix but a
property of the published data: ingesting 2107 means choosing between W and kW
with nothing to choose on, and a wrong choice is a silent 1000× error in the
production leg. Resolving it needs a unit statement from NREL, not more code.

A note on 1332's geometry: the index gives it two rows, tilt 16.77° and 60°, with
only a system-total DC capacity to weight them by. §3.2's table quotes 16.77°
(the first row); §3.1's instruction — DC-weighted merge — gives 38.4°, which
describes neither array. The adapter follows §3.1 and records both source values
in `SiteDescriptor.extra["tilt_rows"]`, so the expected leg's extra uncertainty
for that site is visible rather than buried.

NREL agrees, in the index itself. 1332 passes `qa_status` but carries a
`qa_issue` of *"Filtered time series less than 1.0 years data, Less than 10%
daytime values, **Wrong mounting config identified. Please manually review.**"*
The §3.2 filter selects on `qa_status == 'pass'` and never reads `qa_issue`, so
a system flagged for manual review passes the screen. `qa_issue` is carried
through to `SiteDescriptor.extra` for every site; it is worth reading before
trusting any seed system's geometry.
