import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerGetProduction } from "./tools/get_production.js";
import { registerGetSystemInfo } from "./tools/get_system_info.js";
import { registerCheckCredentials } from "./tools/check_credentials.js";
import { registerListSupportedBrands } from "./tools/list_supported_brands.js";

function buildServer(): McpServer {
  const server = new McpServer({
    name: "solar-plant-mcp-server",
    version: "1.0.0",
  });
  registerGetProduction(server);
  registerGetSystemInfo(server);
  registerCheckCredentials(server);
  registerListSupportedBrands(server);
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
    res.json({ status: "ok", service: "solar-plant-mcp-server" });
  });

  const port = parseInt(process.env.PORT ?? "3001", 10);
  app.listen(port, () => {
    console.error(
      `solar-plant-mcp-server running on http://localhost:${port}/mcp`,
    );
  });
}

main().catch((err) => {
  console.error("Fatal error starting solar-plant-mcp-server:", err);
  process.exit(1);
});
