# EcoXchange MCP servers

Internal MCP servers that feed raw data into EcoXchange's production reconciliation
engine. Two servers live under `packages/`:

| Server                   | Port | Role                                                                    |
|--------------------------|------|-------------------------------------------------------------------------|
| `solar-plant-mcp-server` | 3001 | Normalized kWh production from supported inverter brand cloud APIs.     |
| `irradiance-mcp-server`  | 3002 | Satellite-derived daily/monthly irradiance from NASA POWER / NREL / Solargis. |

Both servers are **stateless**, **read-only**, and exposed via the MCP Streamable HTTP
transport (`enableJsonResponse: true`, `sessionIdGenerator: undefined`). Neither
talks to on-site hardware. End users never call them directly — the reconciliation
engine is the only intended client.

## Install & build

```bash
cd ecoxchange-mcp
npm install
npm run build
```

The workspace uses npm workspaces; `@ecoxchange/shared` is built first and consumed
by both server packages.

## Run

```bash
# Solar plant server
cp packages/solar-plant-mcp-server/.env.example packages/solar-plant-mcp-server/.env
npm run start:solar

# Irradiance server (separate terminal)
cp packages/irradiance-mcp-server/.env.example packages/irradiance-mcp-server/.env
npm run start:irradiance
```

Health checks:

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## Tools

### `solar-plant-mcp-server`

| Tool                            | Purpose                                                                |
|---------------------------------|------------------------------------------------------------------------|
| `plant_get_production`          | Normalized kWh records over a date range, routed to the brand adapter. |
| `plant_get_system_info`         | Plant capacity / location / commission date.                           |
| `plant_check_credentials`       | Validate API key + plant access during onboarding.                     |
| `plant_list_supported_brands`   | Static brand registry: required credentials, available resolutions.    |

Supported brands: `solaredge`, `enphase`, `fronius`, `sma`. Add a new brand by
implementing the `InverterAdapter` interface in `src/adapters/` and registering it
in `BrandAdapterFactory`.

### `irradiance-mcp-server`

| Tool                          | Purpose                                                                     |
|-------------------------------|-----------------------------------------------------------------------------|
| `irradiance_get_daily`        | Daily GHI (+ optional POA when tilt/azimuth supplied).                      |
| `irradiance_get_monthly`      | Monthly rollup of daily records (no extra API call — reuses daily logic).   |
| `irradiance_check_coverage`   | Static coverage check: which sources cover this lat/lon.                    |

Source selection (`source: "auto"`):

```
if lat∈[24.5, 49.5] and lon∈[-125, -66.5] and NREL_API_KEY set → nrel_nsrdb
elif SOLARGIS_API_KEY set                                       → solargis
else                                                            → nasa_power
```

NREL failures (timeouts, missing key) fall back to NASA POWER and the fallback is
logged and returned in `source_used`.

## Reconciliation contract

Both servers emit normalized records from `@ecoxchange/shared`:

- `PlantProductionRecord` — actual kWh on the EcoXchange side.
- `IrradianceRecord` — expected POA/GHI on the satellite side.
- `PlantSystemInfo` — static plant spec (capacity, tilt, azimuth, location).

The reconciliation engine is a separate internal service (not an MCP server) and
calls these tools in sequence per the design spec.

## Security notes

- All per-plant credentials are passed as **tool parameters**, never stored
  server-side. The server is multi-tenant by design.
- Server-level keys (`NREL_API_KEY`, `SOLARGIS_API_KEY`, Enphase OAuth client) live
  in `.env` and stay untracked.
- All input schemas use `.strict()` to reject unknown fields.
