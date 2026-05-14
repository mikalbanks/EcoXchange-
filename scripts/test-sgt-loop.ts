import "dotenv/config";
import { db } from "../server/db";
import { projects, meters } from "@shared/schema";
import { eq } from "drizzle-orm";
import { runSgtHandshake } from "../server/services/sgt-handshake";
import { settleProject } from "../server/services/settle-project";

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ECOXCHANGE SGT LOOP — Full Pipeline Test");
  console.log("  Sky Oracle → Utility Shadow → SGT Interval → Waterfall → Securitize");
  console.log("═══════════════════════════════════════════════════════════\n");

  const allProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.status, "ACTIVE"));

  if (allProjects.length === 0) {
    console.error("❌ No ACTIVE projects found. Run seed-sgt first.");
    process.exit(1);
  }

  const project = allProjects.find((p) =>
    p.name.toLowerCase().includes("centennial"),
  ) || allProjects[0];

  console.log(`📋 Target Project: ${project.name}`);
  console.log(`🔋 Capacity: ${project.capacityKw} kW (${project.capacityMW} MW)`);
  console.log(`📍 Location: ${project.state}, ${project.county}\n`);

  console.log("─── Step 1: SGT Handshake ───────────────────────────────");
  const handshakeResult = await runSgtHandshake(project.id);

  console.log(`\n📊 Handshake Result:`);
  console.log(`   Interval ID: ${handshakeResult.intervalId}`);
  console.log(`   Synthetic Gross Wh: ${handshakeResult.syntheticGrossWh}`);
  console.log(`   Sky Oracle Source: ${handshakeResult.skyOracle.source}`);
  console.log(`   PV Estimate: ${handshakeResult.skyOracle.pvEstimateKw} kW`);
  console.log(`   Net Meter (shadow): ${handshakeResult.utilityShadow.netMeterKw} kW`);
  console.log(`   Consumption: ${handshakeResult.utilityShadow.consumptionKw} kW`);
  console.log(`   Telemetry Sources: ${handshakeResult.telemetrySources.join(", ")}`);

  console.log("\n─── Step 2: Settlement (Waterfall) ──────────────────────");
  const settlementResult = await settleProject(project.id);

  console.log(`\n📊 Settlement Result:`);
  console.log(`   Days Settled: ${settlementResult.settlement.daysSettled}`);
  console.log(`   Intervals Settled: ${settlementResult.settlement.totalIntervalsSettled}`);
  console.log(`   Total Gross Wh: ${settlementResult.settlement.totalGrossWh.toFixed(2)}`);
  console.log(`   Total Revenue: $${settlementResult.settlement.totalRevenueUsd.toFixed(2)}`);

  if (Object.keys(settlementResult.settlement.waterfallSummary).length > 0) {
    console.log(`   Waterfall Breakdown:`);
    for (const [tier, amount] of Object.entries(settlementResult.settlement.waterfallSummary)) {
      console.log(`     ${tier}: $${amount.toFixed(4)}`);
    }
  }

  if (settlementResult.distribution) {
    console.log(`\n─── Step 3: Securitize Distribution ─────────────────────`);
    console.log(`   Success: ${settlementResult.distribution.success}`);
    if (settlementResult.distribution.transactionHash) {
      console.log(`   Tx Hash: ${settlementResult.distribution.transactionHash}`);
    }
    if (settlementResult.distribution.network) {
      console.log(`   Network: ${settlementResult.distribution.network}`);
    }
    if (settlementResult.distribution.distributedAmount != null) {
      console.log(`   Distributed: $${settlementResult.distribution.distributedAmount.toFixed(4)}`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Utility Shadow Integrated: SGT Loop Closed.");
  console.log("═══════════════════════════════════════════════════════════");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ SGT Loop Test Failed:", err);
  process.exit(1);
});
