import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SupportedBrandSchema } from "@ecoxchange/shared";
import { BrandAdapterFactory } from "../adapters/factory.js";
import { jsonContent } from "./util.js";

const inputShape = {
  brand: SupportedBrandSchema.describe("Inverter monitoring platform brand"),
  plant_id: z
    .string()
    .min(1)
    .max(100)
    .describe("Plant identifier from the brand's monitoring portal"),
  api_key: z.string().min(1).describe("API key or access token"),
  credentials: z
    .record(z.string())
    .optional()
    .describe(
      "Brand-specific extra credentials (same as plant_get_production)",
    ),
};

const InputSchema = z.object(inputShape).strict();

export function registerGetSystemInfo(server: McpServer): void {
  server.registerTool(
    "plant_get_system_info",
    {
      title: "Get plant system info",
      description:
        "Retrieve a plant's static specification — capacity, tilt, azimuth, location. The reconciliation engine uses this to compute expected production. If tilt or azimuth are unavailable from the API, returns -1 and expects the caller to supply them from permit data.",
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
      const info = await adapter.getSystemInfo({
        plant_id: params.plant_id,
        api_key: params.api_key,
        credentials: params.credentials,
      });
      if (info.tilt_deg === -1 || info.azimuth_deg === -1) {
        console.error(
          `[plant_get_system_info] ${params.brand} plant ${params.plant_id}: tilt/azimuth not exposed by API; caller must supply from permit data.`,
        );
      }
      return jsonContent(info);
    },
  );
}
