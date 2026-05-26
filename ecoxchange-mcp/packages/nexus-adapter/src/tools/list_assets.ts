import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getVerificationHistoryForMany,
  listProjects,
} from "../db/queries.js";
import { jsonContent, nowIso } from "./util.js";
import { ENGINE_VERSION } from "../utils/nexus_constants.js";
import { lookupUsState, cityFromName } from "../utils/location.js";
import {
  annualKwh,
  capacityFactorPct,
} from "../utils/calculations.js";
import type { DbVerificationRecord } from "../db/types.js";

// Rough $/W and equity share estimates for AUM rollup.
const ESTIMATED_DOLLAR_PER_WATT = 2.0;
const ESTIMATED_EQUITY_FRACTION = 0.3;

const inputShape = {
  min_months_verified: z
    .number()
    .min(0)
    .default(6)
    .describe("Minimum count of VERIFIED months required to include the asset."),
  status: z
    .enum(["active", "all"])
    .default("active")
    .describe("Filter by project status. 'active' is the default."),
  offtake_type: z
    .enum(["ppa", "community_solar", "net_metering", "merchant", "all"])
    .default("all")
    .describe("Filter by offtake mechanism."),
  min_capacity_kw: z.number().optional().describe("Minimum DC capacity in kW."),
  max_capacity_kw: z.number().optional().describe("Maximum DC capacity in kW."),
  state: z
    .string()
    .length(2)
    .optional()
    .describe(
      "Two-letter US state code (e.g. 'GA'). Filter to projects whose lat/lon resolves to this state.",
    ),
};

const InputSchema = z.object(inputShape).strict();

export function registerListAssets(server: McpServer): void {
  server.registerTool(
    "ecoxchange_list_assets",
    {
      title: "List EcoXchange solar assets",
      description:
        "Returns the universe of EcoXchange projects with verified production data. The discovery tool: call first to see which assets are available for scoring.",
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
      const projects = await listProjects({
        status: params.status,
        minCapacityKw: params.min_capacity_kw,
        maxCapacityKw: params.max_capacity_kw,
        offtakeType: params.offtake_type,
      });
      const ids = projects.map((p) => p.id);
      const records = await getVerificationHistoryForMany(ids);
      const byProject = new Map<string, DbVerificationRecord[]>();
      for (const r of records) {
        const bucket = byProject.get(r.project_id);
        if (bucket) bucket.push(r);
        else byProject.set(r.project_id, [r]);
      }

      const assets: Array<Record<string, unknown>> = [];
      let totalVerifiedCapacity = 0;
      for (const p of projects) {
        const recs = byProject.get(p.id) ?? [];
        const verifiedMonths = recs.filter(
          (r) => r.status === "verified",
        ).length;
        if (verifiedMonths < params.min_months_verified) continue;

        const state = lookupUsState(p.latitude, p.longitude);
        if (params.state && state?.code !== params.state.toUpperCase()) continue;

        const flaggedMonths = recs.filter((r) => r.status === "flagged").length;
        const latest = recs[recs.length - 1];
        const cf = capacityFactorPct(p, recs);
        const ak = annualKwh(recs);
        const passRate =
          recs.length > 0 ? (verifiedMonths / recs.length) * 100 : 0;

        totalVerifiedCapacity += p.capacity_kw_dc;

        assets.push({
          project_id: p.id,
          name: p.name,
          location: {
            city: cityFromName(p.name),
            state: state?.code ?? null,
            latitude: p.latitude,
            longitude: p.longitude,
          },
          capacity_kw_dc: p.capacity_kw_dc,
          offtake_type: p.offtake_type,
          ppa_rate_per_kwh: p.ppa_rate_per_kwh,
          commissioning_date: p.commissioning_date,
          months_verified: verifiedMonths,
          months_flagged: flaggedMonths,
          latest_verification_status: latest?.status ?? "pending",
          latest_period: latest?.period_start ?? null,
          annual_production_mwh: ak !== null ? ak / 1000 : null,
          capacity_factor_pct: cf,
          verification_pass_rate_pct: passRate,
        });
      }

      const totalAum =
        totalVerifiedCapacity *
        1000 *
        ESTIMATED_DOLLAR_PER_WATT *
        ESTIMATED_EQUITY_FRACTION;

      return jsonContent({
        total_assets: assets.length,
        total_verified_capacity_kw: totalVerifiedCapacity,
        total_aum_estimate_usd: totalAum,
        assets,
        metadata: {
          engine_version: ENGINE_VERSION,
          data_as_of: nowIso(),
          source: "ecoxchange_verification_engine",
          aum_estimate_assumptions: {
            dollar_per_watt: ESTIMATED_DOLLAR_PER_WATT,
            equity_fraction: ESTIMATED_EQUITY_FRACTION,
          },
        },
      });
    },
  );
}
