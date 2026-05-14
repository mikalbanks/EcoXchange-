import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  AzimuthSchema,
  IsoMonthSchema,
  LatSchema,
  LonSchema,
  TiltSchema,
} from "@ecoxchange/shared";
import { assertMonthRange, monthBounds, monthOf } from "../dates.js";
import { fetchDailyWithFallback, jsonContent } from "./util.js";

const inputShape = {
  lat: LatSchema,
  lon: LonSchema,
  start_month: IsoMonthSchema.describe(
    "Start month inclusive, format: YYYY-MM",
  ),
  end_month: IsoMonthSchema.describe(
    "End month inclusive, format: YYYY-MM. Max 60 months (5 years) per call.",
  ),
  tilt_deg: TiltSchema.optional(),
  azimuth_deg: AzimuthSchema.optional(),
  source: z
    .enum(["nasa_power", "nrel_nsrdb", "solargis", "auto"])
    .default("auto"),
};

const InputSchema = z.object(inputShape).strict();

interface MonthlyAccumulator {
  ghi: number;
  poa: number;
  poaHas: boolean;
  tempSum: number;
  tempN: number;
}

export function registerGetMonthly(server: McpServer): void {
  server.registerTool(
    "irradiance_get_monthly",
    {
      title: "Get monthly irradiance",
      description:
        "Fetch monthly aggregated irradiance totals for a lat/lon. Reuses the daily logic and rolls up to month buckets. Used for longer-horizon reconciliation and investor reporting periods.",
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
      assertMonthRange(params.start_month, params.end_month);

      const { start } = monthBounds(params.start_month);
      const { end } = monthBounds(params.end_month);

      const { source_used, records } = await fetchDailyWithFallback(
        params.source,
        {
          lat: params.lat,
          lon: params.lon,
          start_date: start,
          end_date: end,
          tilt_deg: params.tilt_deg,
          azimuth_deg: params.azimuth_deg,
        },
      );

      const buckets = new Map<string, MonthlyAccumulator>();
      for (const r of records) {
        const key = monthOf(r.date);
        const cur = buckets.get(key) ?? {
          ghi: 0,
          poa: 0,
          poaHas: false,
          tempSum: 0,
          tempN: 0,
        };
        cur.ghi += r.ghi_kwh_m2;
        if (r.poa_kwh_m2 !== undefined) {
          cur.poa += r.poa_kwh_m2;
          cur.poaHas = true;
        }
        if (r.air_temp_c !== undefined) {
          cur.tempSum += r.air_temp_c;
          cur.tempN += 1;
        }
        buckets.set(key, cur);
      }

      const monthly = Array.from(buckets.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([month, acc]) => ({
          month,
          ghi_kwh_m2: acc.ghi,
          poa_kwh_m2: acc.poaHas ? acc.poa : null,
          avg_air_temp_c: acc.tempN > 0 ? acc.tempSum / acc.tempN : null,
        }));

      return jsonContent({
        lat: params.lat,
        lon: params.lon,
        source_used,
        record_count: monthly.length,
        records: monthly,
      });
    },
  );
}
