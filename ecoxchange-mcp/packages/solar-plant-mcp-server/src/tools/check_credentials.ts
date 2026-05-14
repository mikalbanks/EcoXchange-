import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SupportedBrandSchema } from "@ecoxchange/shared";
import { BrandAdapterFactory } from "../adapters/factory.js";
import { jsonContent } from "./util.js";

const inputShape = {
  brand: SupportedBrandSchema,
  plant_id: z.string().min(1).max(100),
  api_key: z.string().min(1),
  credentials: z.record(z.string()).optional(),
};

const InputSchema = z.object(inputShape).strict();

export function registerCheckCredentials(server: McpServer): void {
  server.registerTool(
    "plant_check_credentials",
    {
      title: "Check plant credentials",
      description:
        "Validate that an API key is valid and can access the specified plant. Use during project onboarding before attempting a full data pull.",
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
      const result = await adapter.checkCredentials({
        plant_id: params.plant_id,
        api_key: params.api_key,
        credentials: params.credentials,
      });
      return jsonContent({
        valid: result.valid,
        plant_name: result.plant_name,
        status: result.status,
        brand: params.brand,
        plant_id: params.plant_id,
      });
    },
  );
}
