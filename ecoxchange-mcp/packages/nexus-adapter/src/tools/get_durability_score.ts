import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getProjectById,
  getVerificationHistory,
} from "../db/queries.js";
import { jsonContent, nowIso } from "./util.js";
import { scoreCashFlowDurability } from "../scoring/cash_flow.js";
import { scorePhysicalDurability } from "../scoring/physical.js";
import { scoreStructuralDurability } from "../scoring/structural.js";
import { analyzeRegime, type Regime } from "../scoring/regime.js";
import { ENGINE_VERSION } from "../utils/nexus_constants.js";

const inputShape = {
  project_id: z.string().uuid().describe("EcoXchange project UUID."),
  regime: z
    .enum(["growth", "transition", "hard_asset", "deflation", "repression"])
    .optional()
    .describe(
      "Macro regime label. When provided, the response includes regime-specific impact analysis.",
    ),
};

const InputSchema = z.object(inputShape).strict();

function tier(score: number): "high" | "medium" | "low" {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function registerGetDurabilityScore(server: McpServer): void {
  server.registerTool(
    "ecoxchange_get_durability_score",
    {
      title: "Get durability score for an EcoXchange asset",
      description:
        "Composite durability score across cash-flow, physical, and structural dimensions. When a regime is provided, returns regime-specific impact and historical context.",
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
          `ecoxchange_get_durability_score: no project ${params.project_id}`,
        );
      }
      const records = await getVerificationHistory(project.id);

      const cashFlow = scoreCashFlowDurability(project);
      const physical = scorePhysicalDurability(project, records);
      const structural = scoreStructuralDurability();

      const overall =
        0.4 * cashFlow.score + 0.3 * physical.score + 0.3 * structural.score;
      const decay = 0.05 + (10 - overall) * 0.01;

      const regimeAnalysis = params.regime
        ? analyzeRegime(params.regime as Regime)
        : null;

      return jsonContent({
        project_id: project.id,
        project_name: project.name,
        durability: {
          cash_flow_durability: cashFlow,
          physical_durability: physical,
          structural_durability: structural,
          overall_durability_score: overall,
          durability_tier: tier(overall),
          decay_constant_estimate: decay,
        },
        regime_analysis: regimeAnalysis,
        metadata: {
          engine_version: ENGINE_VERSION,
          data_as_of: nowIso(),
          source: "ecoxchange_verification_engine",
          methodology:
            "Durability score derived from verified production data, contract terms, and system specifications. Regime analysis based on Preqin Infrastructure Index historical behavior. Decay constant heuristic: 0.05 + (10 - overall_score) * 0.01.",
        },
      });
    },
  );
}
