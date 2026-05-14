import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonContent } from "./util.js";

const BRAND_REGISTRY = [
  {
    brand: "solaredge",
    display_name: "SolarEdge Monitoring Portal",
    api_docs_url:
      "https://knowledge-center.solaredge.com/sites/kc/files/se_monitoring_api.pdf",
    required_credentials: [
      {
        field: "api_key",
        label: "API Key",
        description:
          "Found in SolarEdge monitoring portal under Admin > Site Access > API Access",
        example: "L4QLVQ1LOKCQX2193VSEICXW61NP6B1O",
      },
    ],
    available_resolutions: ["15min", "hourly", "daily"],
    notes:
      "plant_id is the numeric Site ID shown in the monitoring portal URL",
  },
  {
    brand: "enphase",
    display_name: "Enphase Enlighten",
    api_docs_url: "https://developer-v4.enphase.com/docs",
    required_credentials: [
      {
        field: "api_key",
        label: "API Key",
        description:
          "Generated in Enphase Developer Portal — requires OAuth app",
        example: "eyJhbGciOiJSUzI1NiJ9...",
      },
      {
        field: "system_id",
        label: "System ID",
        description: "Enphase system ID, found in Enlighten portal URL",
        example: "67890",
      },
    ],
    available_resolutions: ["15min", "daily"],
    notes:
      "Requires OAuth 2.0. Set ENPHASE_CLIENT_ID and ENPHASE_CLIENT_SECRET in server env.",
  },
  {
    brand: "fronius",
    display_name: "Fronius Solar.web",
    api_docs_url:
      "https://www.fronius.com/en/photovoltaics/products/all-products/solutions/fronius-solar.web/fronius-solar-web/fronius-solar-web#Tabs",
    required_credentials: [
      {
        field: "api_key",
        label: "Access Token",
        description:
          "Generated in Solar.web portal under Account > API Access",
        example: "sw_abc123def456",
      },
      {
        field: "site_id",
        label: "PV System ID",
        description: "Found in Solar.web portal URL after /pvsystems/",
        example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      },
    ],
    available_resolutions: ["hourly", "daily"],
    notes:
      "plant_id in tool calls should be the UUID shown in the Solar.web URL",
  },
  {
    brand: "sma",
    display_name: "SMA Sunny Portal / Ennexos",
    api_docs_url: "https://ennexos.sunnyportal.com/api/v1/docs",
    required_credentials: [
      {
        field: "api_key",
        label: "Bearer Token",
        description: "OAuth bearer token from Ennexos developer portal",
        example: "Bearer eyJhbGc...",
      },
      {
        field: "plant_key",
        label: "Plant Key",
        description: "Plant identifier from Ennexos dashboard",
        example: "urn:sma:plant:abc123",
      },
    ],
    available_resolutions: ["15min", "hourly", "daily"],
    notes:
      "SMA migrated from Sunny Portal to Ennexos in 2024. Use Ennexos API.",
  },
];

const inputShape = {} as const;
const InputSchema = z.object({}).strict();

export function registerListSupportedBrands(server: McpServer): void {
  server.registerTool(
    "plant_list_supported_brands",
    {
      title: "List supported inverter brands",
      description:
        "Returns the list of supported inverter brands and the credential fields required for each. Use during project onboarding to prompt for the right credentials.",
      inputSchema: inputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => {
      InputSchema.parse(args);
      return jsonContent({ brands: BRAND_REGISTRY });
    },
  );
}
