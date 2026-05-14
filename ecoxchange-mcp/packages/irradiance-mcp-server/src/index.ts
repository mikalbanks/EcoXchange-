import "dotenv/config";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerGetDaily } from "./tools/get_daily.js";
import { registerGetMonthly } from "./tools/get_monthly.js";
import { registerCheckCoverage } from "./tools/check_coverage.js";

function buildServer(): McpServer {
  const server = new McpServer({
    name: "irradiance-mcp-server",
    version: "1.0.0",
  });
  registerGetDaily(server);
  registerGetMonthly(server);
  registerCheckCoverage(server);
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
    res.json({ status: "ok", service: "irradiance-mcp-server" });
  });

  const port = parseInt(process.env.PORT ?? "3002", 10);
  app.listen(port, () => {
    console.error(
      `irradiance-mcp-server running on http://localhost:${port}/mcp`,
    );
  });
}

main().catch((err) => {
  console.error("Fatal error starting irradiance-mcp-server:", err);
  process.exit(1);
});
