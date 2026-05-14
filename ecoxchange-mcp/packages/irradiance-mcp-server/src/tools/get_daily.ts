import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AzimuthSchema,
  IsoDateSchema,
  LatSchema,
  LonSchema,
  TiltSchema,
} from "@ecoxchange/shared";
import { assertDailyRange } from "../dates.js";
import { fetchDailyWithFallback, jsonContent } from "./util.js";

const inputShape = {
  lat: LatSchema.describe(
    "Latitude of the solar site in decimal degrees. e.g. 33.4484 for Phoenix, AZ",
  ),
  lon: LonSchema.describe(
    "Longitude of the solar site in decimal degrees. e.g. -112.0740 for Phoenix, AZ",
  ),
  start_date: IsoDateSchema.describe(
    "Start date inclusive, ISO 8601: YYYY-MM-DD",
  ),
  end_date: IsoDateSchema.describe(
    "End date inclusive, ISO 8601: YYYY-MM-DD. Max range 365 days per call.",
  ),
  tilt_deg: TiltSchema.optional().describe(
    "Panel tilt from horizontal in degrees. Required for poa_kwh_m2 output. Omit to get GHI only.",
  ),
  azimuth_deg: AzimuthSchema.optional().describe(
    "Panel azimuth in degrees (0=N, 90=E, 180=S, 270=W). Required for poa_kwh_m2. Omit to get GHI only.",
  ),
  source: z
    .enum(["nasa_power", "nrel_nsrdb", "solargis", "auto"])
    .default("auto")
    .describe(
      "Irradiance data source. 'auto' selects the best available: NREL for US sites, NASA POWER elsewhere. 'solargis' requires SOLARGIS_API_KEY env var.",
    ),
};

const InputSchema = z.object(inputShape).strict();

export function registerGetDaily(server: McpServer): void {
  server.registerTool(
    "irradiance_get_daily",
    {
      title: "Get daily irradiance",
      description:
        "Fetch daily GHI (and optionally POA) irradiance for a lat/lon over a date range. Primary input to the reconciliation engine's expected-output calculation.",
      inputSchema: inputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (args) => {
      const params = InputSchema.parse(args);
      assertDailyRange(params.start_date, params.end_date);

      const { source_used, records } = await fetchDailyWithFallback(
        params.source,
        {
          lat: params.lat,
          lon: params.lon,
          start_date: params.start_date,
          end_date: params.end_date,
          tilt_deg: params.tilt_deg,
          azimuth_deg: params.azimuth_deg,
        },
      );

      const sumGhi = records.reduce((s, r) => s + r.ghi_kwh_m2, 0);
      const usePoa =
        params.tilt_deg !== undefined && params.azimuth_deg !== undefined;
      const sumPoa = usePoa
        ? records.reduce((s, r) => s + (r.poa_kwh_m2 ?? 0), 0)
        : null;

      return jsonContent({
        lat: params.lat,
        lon: params.lon,
        start_date: params.start_date,
        end_date: params.end_date,
        source_used,
        record_count: records.length,
        sum_ghi_kwh_m2: sumGhi,
        sum_poa_kwh_m2: sumPoa,
        records: records.map((r) => ({
          date: r.date,
          ghi_kwh_m2: r.ghi_kwh_m2,
          poa_kwh_m2: r.poa_kwh_m2 ?? null,
          air_temp_c: r.air_temp_c ?? null,
        })),
      });
    },
  );
}
