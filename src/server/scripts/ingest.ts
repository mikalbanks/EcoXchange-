/**
 * Manual SCADA Ingestion Script
 * =============================
 * Run: npx tsx src/server/scripts/ingest.ts [startDate] [endDate]
 *
 * Triggers the full Virtual SCADA pipeline for the default SPV:
 *   NASA POWER → Perez Model → pvlib chain → P_ac → Yield Ledger
 */
import { seedDefaultSpv, runScadaPipeline } from "../services/scadaPipeline";
import { goesS3Path, logGoesProvenance } from "../services/goesS3";

async function main() {
  const args = process.argv.slice(2);

  // Default: ingest the last 3 days
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400_000);
  const yesterday = new Date(now.getTime() - 86400_000);

  const startDate = args[0] || formatDate(threeDaysAgo);
  const endDate = args[1] || formatDate(yesterday);

  console.log("═══════════════════════════════════════════════════");
  console.log("  EcoXchange Virtual SCADA — Manual Ingestion");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Date range: ${startDate} → ${endDate}`);

  // Log GOES-16 S3 data provenance
  const goesRef = goesS3Path(yesterday);
  console.log(`  ${logGoesProvenance(goesRef)}`);
  console.log("═══════════════════════════════════════════════════\n");

  const spv = await seedDefaultSpv();
  console.log(`SPV: "${spv.name}" | ${spv.capacityKw} kW | PPA: $${spv.ppaRateCentsKwh}¢/kWh`);
  console.log(`Location: ${spv.location} (${spv.latitude}°N, ${spv.longitude}°W)`);
  console.log(`Reg D Exemption: ${spv.regDExemption} | Tokens: ${spv.totalTokens}\n`);

  const result = await runScadaPipeline(spv, startDate, endDate);

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Ingestion Summary");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Irradiance records: ${result.irradianceRecords}`);
  console.log(`  Power records:      ${result.powerRecords}`);
  console.log(`  Yield entries:      ${result.yieldRecords}`);
  console.log(`  Total energy:       ${result.totalEnergyKwh.toFixed(1)} kWh`);
  console.log(`  Total energy:       ${(result.totalEnergyKwh / 1000).toFixed(3)} MWh`);
  console.log(`  Total revenue:      $${result.totalRevenueUsd.toFixed(2)}`);
  console.log(`  Yield per token:    $${(result.totalRevenueUsd / 10000).toFixed(6)}`);
  console.log("═══════════════════════════════════════════════════");

  process.exit(0);
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
