import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getProjectById,
  getSatelliteReadings,
  getVerificationHistory,
} from "../db/queries.js";
import { jsonContent, nowIso } from "./util.js";
import { ENGINE_VERSION } from "../utils/nexus_constants.js";

const inputShape = {
  project_id: z.string().uuid().describe("EcoXchange project UUID."),
  start_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .describe("Inclusive start month, YYYY-MM. Omit for full history."),
  end_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional()
    .describe("Inclusive end month, YYYY-MM."),
  include_irradiance: z
    .boolean()
    .default(false)
    .describe(
      "If true, joins satellite GHI from raw_readings for each month.",
    ),
};

const InputSchema = z.object(inputShape).strict();

function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

function inRange(period: string, start?: string, end?: string): boolean {
  const m = monthOf(period);
  if (start && m < start) return false;
  if (end && m > end) return false;
  return true;
}

export function registerGetProductionHistory(server: McpServer): void {
  server.registerTool(
    "ecoxchange_get_production_history",
    {
      title: "Get verified production history",
      description:
        "Returns monthly verified production records for a project. The transparency tool: the actual kWh numbers behind the NAV.",
      inputSchema: inputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      const params = InputSchema.parse(args);
      const project = await getProjectById(params.project_id);
      if (!project) {
        throw new Error(
          `ecoxchange_get_production_history: no project ${params.project_id}`,
        );
      }
      const all = await getVerificationHistory(project.id);
      const records = all.filter((r) =>
        inRange(r.period_start, params.start_month, params.end_month),
      );

      let satelliteByMonth = new Map<string, number | null>();
      if (params.include_irradiance) {
        const readings = await getSatelliteReadings(project.id);
        for (const r of readings) {
          satelliteByMonth.set(monthOf(r.period_start), r.ghi_kwh_m2);
        }
      }

      const out = records.map((r) => {
        const tol = r.tolerance_config ?? {};
        return {
          period: monthOf(r.period_start),
          inverter_kwh: r.inverter_kwh,
          utility_kwh: r.utility_kwh,
          expected_kwh: r.expected_kwh,
          inv_vs_expected_pct: r.inv_vs_expected_pct,
          inv_vs_utility_pct: r.inv_vs_utility_pct,
          util_vs_expected_pct: r.util_vs_expected_pct,
          status: r.status,
          flag_reasons: r.flag_reasons ?? [],
          tolerance_config: {
            inv_vs_expected_band: `±${tol.inv_vs_expected_upper_pct ?? 15}%`,
            inv_vs_utility_band: `±${tol.inv_vs_utility_pct ?? 10}%`,
            util_vs_expected_band: `±${tol.util_vs_expected_upper_pct ?? 20}%`,
          },
          estimated_revenue_usd: r.estimated_revenue,
          ghi_kwh_m2: params.include_irradiance
            ? satelliteByMonth.get(monthOf(r.period_start)) ?? null
            : null,
          irradiance_source: params.include_irradiance ? "nasa_power" : null,
        };
      });

      const totalProductionKwh = out.reduce(
        (s, r) => s + (r.inverter_kwh ?? 0),
        0,
      );
      const totalExpectedKwh = out.reduce((s, r) => s + r.expected_kwh, 0);
      const totalRevenue = out.reduce(
        (s, r) => s + (r.estimated_revenue_usd ?? 0),
        0,
      );

      return jsonContent({
        project_id: project.id,
        project_name: project.name,
        capacity_kw_dc: project.capacity_kw_dc,
        records: out,
        summary: {
          total_months: out.length,
          total_production_mwh: totalProductionKwh / 1000,
          total_expected_mwh: totalExpectedKwh / 1000,
          production_vs_expected_pct:
            totalExpectedKwh > 0
              ? (totalProductionKwh / totalExpectedKwh) * 100
              : 0,
          total_revenue_estimate_usd: totalRevenue,
        },
        metadata: {
          engine_version: ENGINE_VERSION,
          data_as_of: nowIso(),
          source: "ecoxchange_verification_engine",
        },
      });
    },
  );
}
