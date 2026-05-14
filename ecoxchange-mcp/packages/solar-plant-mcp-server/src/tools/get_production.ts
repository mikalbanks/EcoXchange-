import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SupportedBrandSchema, IntervalResolutionSchema, IsoDateSchema } from "@ecoxchange/shared";
import { BrandAdapterFactory } from "../adapters/factory.js";
import { jsonContent } from "./util.js";

const inputShape = {
  brand: SupportedBrandSchema.describe(
    "Inverter monitoring platform brand for this plant",
  ),
  plant_id: z
    .string()
    .min(1)
    .max(100)
    .describe(
      "Plant identifier from the brand's monitoring portal (e.g. SolarEdge site ID, Enphase system ID)",
    ),
  api_key: z
    .string()
    .min(1)
    .describe(
      "API key or access token for the brand's monitoring API",
    ),
  start_date: IsoDateSchema.describe(
    "Start date inclusive, ISO 8601 format: YYYY-MM-DD",
  ),
  end_date: IsoDateSchema.describe(
    "End date inclusive, ISO 8601 format: YYYY-MM-DD. Max range is 365 days.",
  ),
  resolution: IntervalResolutionSchema.default("daily").describe(
    "Data granularity. 'daily' is recommended for reconciliation. Sub-daily resolutions may not be available for all brands.",
  ),
  credentials: z
    .record(z.string())
    .optional()
    .describe(
      "Brand-specific extra credentials. SolarEdge: none needed. Enphase: { system_id }. Fronius: { site_id }. SMA: { plant_key }.",
    ),
};

const InputSchema = z.object(inputShape).strict();

export function registerGetProduction(server: McpServer): void {
  server.registerTool(
    "plant_get_production",
    {
      title: "Get plant production",
      description:
        "Fetch normalized kWh production readings for a solar plant over a date range. Routes to the correct brand-specific monitoring API adapter and returns records normalized to PlantProductionRecord shape.",
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
      const adapter = BrandAdapterFactory.create(params.brand);
      const records = await adapter.getProduction({
        plant_id: params.plant_id,
        api_key: params.api_key,
        start_date: params.start_date,
        end_date: params.end_date,
        resolution: params.resolution,
        credentials: params.credentials,
      });

      const totalKwh = records.reduce((sum, r) => sum + r.energy_kwh, 0);
      const missing = records.filter((r) => r.quality_flag === "MISSING").length;

      return jsonContent({
        plant_id: params.plant_id,
        brand: params.brand,
        start_date: params.start_date,
        end_date: params.end_date,
        resolution: params.resolution,
        record_count: records.length,
        total_kwh: totalKwh,
        missing_intervals: missing,
        records: records.map((r) => ({
          timestamp_utc: r.timestamp_utc,
          interval_minutes: r.interval_minutes,
          energy_kwh: r.energy_kwh,
          quality_flag: r.quality_flag,
        })),
      });
    },
  );
}
