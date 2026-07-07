# EcoXchange pvlib Expected Generation Service

A Python microservice that calculates **expected solar PV generation** with
[pvlib](https://pvlib-python.readthedocs.io/), replacing the simplified
hand-rolled TypeScript physics model in the reconciliation engine.

It adds the five corrections the old Hay-Davies model lacked: temperature
derating, incidence-angle modifier (IAM), module-technology coefficients,
inverter clipping, and an explicit system-loss budget — using Perez
transposition and the Sandia (SAPM) cell-temperature model.

The reconciliation engine (TypeScript) still owns irradiance ingestion, the
three-way reconciliation, and the VERIFIED / FLAGGED / PENDING verdicts. The
**only** thing that moves here is how `expected_kwh` is computed.

## API

`POST /expected-generation`

```jsonc
{
  "project": {
    "latitude": 32.08, "longitude": -81.09,
    "capacity_kw_dc": 5000, "tilt_deg": 20, "azimuth_deg": 180,
    "commissioning_date": "2023-01-01",
    // optional: module_efficiency, system_losses, degradation_rate,
    //           module_type, inverter_efficiency, dc_ac_ratio, albedo, racking_type
  },
  "daily_weather": [
    { "date": "2024-06-01", "ghi_kwh_m2": 6.0, "dni_kwh_m2": 7.0, "dhi_kwh_m2": 1.4,
      "temp_air_c": 28.0, "wind_speed_m_s": 2.0 }
  ]
}
```

Returns `total_expected_kwh`, a per-month breakdown (expected kWh, POA
irradiance, average cell temperature, performance ratio, capacity factor), a
`system_summary`, `model_metadata`, and `warnings`. Limits: 1–750 days per
request.

`GET /health` → service + pvlib version.

## Run locally

```bash
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 3004
curl http://localhost:3004/health
```

## Docker

```bash
docker compose up --build
# service on http://localhost:3004
```

## Tests

```bash
pip install -r requirements.txt
pytest
```

The suite runs fully offline against committed climatological fixtures in
`tests/fixtures/` (monthly NASA POWER normals expanded to a full year). It
asserts physical sanity — specific yield, seasonal shape, summer heat
derating, inverter clipping, and degradation — rather than a tight numeric
match. The suite is compute-heavy (it simulates full years) and takes a couple
of minutes.

## Live PVWatts benchmark

The tight ±5% comparison against NREL PVWatts uses real weather and needs
network access plus an NREL API key:

```bash
# with the service running on :3004
export NREL_API_KEY=your_key
python benchmarks/pvwatts_comparison.py --year 2023
# writes benchmarks/pvwatts_comparison_report.json
```

## Model configuration

See `src/config.py`. Defaults: Perez transposition, SAPM temperature model,
physical IAM, monocrystalline module coefficients, 14% system losses, 1.2
DC/AC ratio, 0.96 inverter efficiency, 0.2 albedo, open-rack mounting.

## Site-level convenience endpoint (dashboard client)

`POST /api/expected-generation` — flat project specs + a date range; the
service fetches NASA POWER daily weather itself (no API key) and delegates
to the same canonical engine path. Response shape identical to
`/expected-generation`.

```jsonc
{
  "latitude": 32.08, "longitude": -81.09,
  "capacity_kw_dc": 5000, "tilt_deg": 20, "azimuth_deg": 180,
  "module_efficiency": 0.20, "system_losses": 0.14,
  "degradation_rate": 0.0075, "commissioning_date": "2023-01-01",
  "start_date": "2024-01-01", "end_date": "2024-12-31"
}
```

`GET /health` → `{ status, engine_version, model, transposition, pvlib_version }`.

CORS allows localhost dev ports, the ecoxchange.net domains, and
`*.onrender.com` / `*.workers.dev` previews (see `src/main.py`).

## Deploying to Render

**Recommended: Docker runtime.** The Dockerfile installs the canonical
engine from `../verification-engine`, so the build context must be the
REPO ROOT:

- New Web Service → this repo → Runtime: **Docker**
- Dockerfile path: `ecoxchange-pvlib-service/Dockerfile`, context: repo root
- No env vars required. Health check path: `/health`.

**Native Python runtime alternative** (root directory = repo root):

- Build: `pip install ./verification-engine && pip install -r ecoxchange-pvlib-service/requirements.txt`
- Start: `cd ecoxchange-pvlib-service && uvicorn src.main:app --host 0.0.0.0 --port $PORT`
- `Procfile` / `runtime.txt` in this directory cover the case where the
  service directory itself is the root (engine install must then be added
  to the build command as `pip install ../verification-engine` — requires
  "Include all repository files" enabled).

After deploy, point the dashboard at it with `VITE_ENGINE_URL=https://<service>.onrender.com`.
