import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getProjectById,
  getVerificationHistory,
} from "../db/queries.js";
import { jsonContent, nowIso } from "./util.js";
import { ENGINE_VERSION } from "../utils/nexus_constants.js";
import { cityFromName, lookupUsState } from "../utils/location.js";
import {
  annualKwh,
  capacityFactorPct,
  meanAbsDeviationPct,
  maxAbsDeviationPct,
  yearsOperating,
} from "../utils/calculations.js";
import { counterpartyTypeFor } from "../utils/nexus_constants.js";

const PRIMARY_LIFE_YEARS = 25;
const ESTIMATED_DOLLAR_PER_WATT = 2.0;
const ESTIMATED_EQUITY_FRACTION = 0.3;

const inputShape = {
  project_id: z.string().uuid().describe("EcoXchange project UUID."),
};

const InputSchema = z.object(inputShape).strict();

export function registerGetAssetProfile(server: McpServer): void {
  server.registerTool(
    "ecoxchange_get_asset_profile",
    {
      title: "Get EcoXchange asset profile",
      description:
        "Full profile of a single project: system specs, contract details, and summary performance. The diligence tool.",
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
          `ecoxchange_get_asset_profile: no project found with id ${params.project_id}`,
        );
      }
      const records = await getVerificationHistory(project.id);

      const age = yearsOperating(project.commissioning_date);
      const remainingYears = Math.max(0, PRIMARY_LIFE_YEARS - age);

      const monthsVerified = records.filter(
        (r) => r.status === "verified",
      ).length;
      const monthsFlagged = records.filter(
        (r) => r.status === "flagged",
      ).length;
      const monthsPending = records.filter(
        (r) => r.status === "pending",
      ).length;
      const passRate =
        records.length > 0 ? (monthsVerified / records.length) * 100 : 0;
      const ak = annualKwh(records);
      const cf = capacityFactorPct(project, records);
      const meanDev = meanAbsDeviationPct(records);
      const maxDev = maxAbsDeviationPct(records);
      const cumRevenue = records.reduce(
        (s, r) => s + (r.estimated_revenue ?? 0),
        0,
      );

      const annualRevenue =
        records.length > 0 ? (cumRevenue * 12) / records.length : 0;
      const monthlyDistribution = annualRevenue / 12;
      const equityRaiseEstimate =
        project.capacity_kw_dc *
        1000 *
        ESTIMATED_DOLLAR_PER_WATT *
        ESTIMATED_EQUITY_FRACTION;
      const yieldOnEquityPct =
        equityRaiseEstimate > 0 ? (annualRevenue / equityRaiseEstimate) * 100 : null;

      const currentEffectiveRate =
        project.ppa_rate_per_kwh !== null
          ? project.ppa_rate_per_kwh *
            Math.pow(1 + (project.ppa_escalator ?? 0), age)
          : null;

      const state = lookupUsState(project.latitude, project.longitude);

      return jsonContent({
        project: {
          id: project.id,
          name: project.name,
          location: {
            city: cityFromName(project.name),
            state: state?.code ?? null,
            latitude: project.latitude,
            longitude: project.longitude,
            timezone: project.timezone,
          },
          system: {
            capacity_kw_dc: project.capacity_kw_dc,
            tilt_deg: project.tilt_deg,
            azimuth_deg: project.azimuth_deg,
            module_efficiency: project.module_efficiency,
            system_losses: project.system_losses,
            degradation_rate_annual: project.degradation_rate,
            inverter_brand: project.inverter_brand,
            commissioning_date: project.commissioning_date,
            system_age_years: age,
            expected_remaining_life_years: remainingYears,
          },
          contract: {
            offtake_type: project.offtake_type,
            ppa_rate_per_kwh: project.ppa_rate_per_kwh,
            ppa_escalator_annual: project.ppa_escalator,
            current_effective_rate: currentEffectiveRate,
            contract_counterparty_type: counterpartyTypeFor(
              project.offtake_type,
            ),
          },
          performance: {
            total_months_on_platform: records.length,
            months_verified: monthsVerified,
            months_flagged: monthsFlagged,
            months_pending: monthsPending,
            verification_pass_rate_pct: passRate,
            annual_production_mwh: ak !== null ? ak / 1000 : null,
            capacity_factor_pct: cf,
            mean_monthly_deviation_pct: meanDev,
            max_monthly_deviation_pct: maxDev,
            cumulative_revenue_estimate_usd: cumRevenue,
          },
          cash_flow: {
            estimated_annual_revenue_usd: annualRevenue,
            estimated_monthly_distribution_usd: monthlyDistribution,
            yield_on_equity_pct: yieldOnEquityPct,
            inflation_linkage: "ppa_escalator",
            distribution_frequency: "monthly",
            distribution_currency: "USDC",
            distribution_mechanism: "smart_contract",
            equity_raise_estimate_usd: equityRaiseEstimate,
            equity_raise_assumptions: {
              dollar_per_watt: ESTIMATED_DOLLAR_PER_WATT,
              equity_fraction: ESTIMATED_EQUITY_FRACTION,
            },
          },
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
