/**
 * Generate the EIA Solar Fleet Catalog PDF from enriched benchmark results.
 *
 * Usage:
 *   npx tsx scripts/generate-fleet-catalog-pdf.ts [--out <path>]
 *
 * Defaults to verification-engine/reports/eia-fleet-catalog.pdf.
 */
import * as fs from "fs";
import * as path from "path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { registerReportFonts } from "../server/report/fonts";
import { buildFleetCatalogModel } from "../server/report/fleet-catalog/fleetCatalogModel";
import { FleetCatalogDocument } from "../server/report/fleet-catalog/FleetCatalogDocument";

async function main() {
  const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
  const outFlag = process.argv.indexOf("--out");
  const outPath =
    outFlag !== -1 && process.argv[outFlag + 1]
      ? path.resolve(process.argv[outFlag + 1])
      : path.join(repoRoot, "verification-engine", "reports", "eia-fleet-catalog.pdf");

  const resultsPath = path.join(
    repoRoot,
    "verification-engine",
    "reports",
    "eia_fleet_benchmark_results.json",
  );

  console.log(`[info] Reading ${resultsPath}`);
  const raw = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
  const model = buildFleetCatalogModel(raw);
  console.log(
    `[info] Prime: ${model.primePlants.length} plants, excluded: ${model.defectivePlants.length}`,
  );

  registerReportFonts();
  console.log("[info] Rendering PDF (this can take a minute for ~140 pages)...");
  const buffer = await renderToBuffer(
    React.createElement(FleetCatalogDocument, { model }) as never,
  );
  fs.writeFileSync(outPath, buffer);
  const mb = (buffer.length / 1_048_576).toFixed(1);
  console.log(`[done] Wrote ${outPath} (${mb} MB)`);
}

main().catch((err) => {
  console.error("[error]", err);
  process.exit(1);
});
