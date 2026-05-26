import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getProjectById,
  getVerificationHistory,
} from "../db/queries.js";
import { jsonContent, nowIso } from "./util.js";
import { computeRiskMetrics } from "../scoring/risk.js";
import {
  ENGINE_VERSION,
  NEXUS_CONSTANTS,
  subClassFor,
} from "../utils/nexus_constants.js";

const inputShape = {
  project_id: z.string().uuid().describe("EcoXchange project UUID."),
};

const InputSchema = z.object(inputShape).strict();

export function registerGetRiskMetrics(server: McpServer): void {
  server.registerTool(
    "ecoxchange_get_risk_metrics",
    {
      title: "Get risk metrics for an EcoXchange asset",
      description:
        "Institutional-grade risk analytics: production volatility, drawdown, degradation trend, revenue volatility, and Nexus Core scoring inputs.",
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
          `ecoxchange_get_risk_metrics: no project ${params.project_id}`,
        );
      }
      const records = await getVerificationHistory(project.id);
      const risk = computeRiskMetrics(project, records);

      return jsonContent({
        project_id: project.id,
        project_name: project.name,
        risk_metrics: risk,
        nexus_scoring_inputs: {
          asset_class: NEXUS_CONSTANTS.asset_class,
          sub_class: subClassFor(project.offtake_type),
          income_mechanism: NEXUS_CONSTANTS.income_mechanism,
          liquidity_profile: NEXUS_CONSTANTS.liquidity_profile,
          inflation_linkage: NEXUS_CONSTANTS.inflation_linkage,
          physical_backing: NEXUS_CONSTANTS.physical_backing,
          verified_production_data: NEXUS_CONSTANTS.verified_production_data,
          regulatory_wrapper: NEXUS_CONSTANTS.regulatory_wrapper,
          custody_path: NEXUS_CONSTANTS.custody_path,
          distribution_frequency: NEXUS_CONSTANTS.distribution_frequency,
          distribution_currency: NEXUS_CONSTANTS.distribution_currency,
        },
        metadata: {
          engine_version: ENGINE_VERSION,
          data_as_of: nowIso(),
          source: "ecoxchange_verification_engine",
          methodology_note:
            "Risk metrics derived from verified production records. Production volatility reflects real operational variance, not model assumptions.",
        },
      });
    },
  );
}
