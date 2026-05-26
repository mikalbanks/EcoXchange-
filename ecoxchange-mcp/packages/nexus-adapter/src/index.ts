import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerListAssets } from "./tools/list_assets.js";
import { registerGetAssetProfile } from "./tools/get_asset_profile.js";
import { registerGetProductionHistory } from "./tools/get_production_history.js";
import { registerGetRiskMetrics } from "./tools/get_risk_metrics.js";
import { registerGetDurabilityScore } from "./tools/get_durability_score.js";

function buildServer(): McpServer {
  const server = new McpServer({
    name: "ecoxchange-nexus-adapter",
    version: "1.0.0",
  });
  registerListAssets(server);
  registerGetAssetProfile(server);
  registerGetProductionHistory(server);
  registerGetRiskMetrics(server);
  registerGetDurabilityScore(server);
  return server;
}

async function main(): Promise<void> {
  const app = express();
  app.use(express.json());

  app.post("/mcp", async (req, res) => {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "ecoxchange-nexus-adapter" });
  });

  const port = parseInt(process.env.PORT ?? "3003", 10);
  app.listen(port, () => {
    console.error(
      `ecoxchange-nexus-adapter running on http://localhost:${port}/mcp`,
    );
  });
}

main().catch((err) => {
  console.error("Fatal error starting ecoxchange-nexus-adapter:", err);
  process.exit(1);
});
