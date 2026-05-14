import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { LatSchema, LonSchema } from "@ecoxchange/shared";
import { computeCoverage } from "../coverage.js";
import {
  NASA_POWER_EARLIEST,
  NREL_NSRDB_EARLIEST,
  SOLARGIS_EARLIEST,
} from "../constants.js";
import { isoYesterdayUtc } from "../dates.js";
import { jsonContent } from "./util.js";

const inputShape = {
  lat: LatSchema,
  lon: LonSchema,
};

const InputSchema = z.object(inputShape).strict();

export function registerCheckCoverage(server: McpServer): void {
  server.registerTool(
    "irradiance_check_coverage",
    {
      title: "Check irradiance coverage",
      description:
        "Verify data availability for a given lat/lon. Use during project onboarding to confirm the site is supported. No external API call is made.",
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
      const hasSolargis = Boolean(process.env.SOLARGIS_API_KEY);
      const hasNrel = Boolean(process.env.NREL_API_KEY);
      const cov = computeCoverage(params.lat, params.lon, hasSolargis, hasNrel);

      const earliest =
        cov.recommended === "nrel_nsrdb"
          ? NREL_NSRDB_EARLIEST
          : cov.recommended === "solargis"
            ? SOLARGIS_EARLIEST
            : NASA_POWER_EARLIEST;

      const notes: string[] = [];
      if (!cov.nrelAvailable && (cov.isContiguousUS || cov.isHawaii || cov.isPuertoRico)) {
        notes.push(
          "Site is within NREL NSRDB coverage area but NREL_API_KEY is not set on the server.",
        );
      }
      if (!cov.solargisAvailable) {
        notes.push("Solargis premium source unavailable (SOLARGIS_API_KEY not set).");
      }

      return jsonContent({
        lat: params.lat,
        lon: params.lon,
        available_sources: cov.available,
        recommended_source: cov.recommended,
        earliest_date: earliest,
        latest_date: isoYesterdayUtc(),
        notes: notes.length > 0 ? notes.join(" ") : undefined,
      });
    },
  );
}
