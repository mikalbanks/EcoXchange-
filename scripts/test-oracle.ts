import "dotenv/config";
import { getSatellitePowerEstimate } from "../server/services/solcast";

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ECOXCHANGE SKY ORACLE — Solcast Integration Test");
  console.log("═══════════════════════════════════════════════════════════\n");

  const capacityKw = 50000;
  console.log(`📡 Testing with capacity: ${capacityKw} kW (50 MW)\n`);

  try {
    const result = await getSatellitePowerEstimate(capacityKw, 34.0522, -118.2437);

    console.log("✅ Sky Oracle Response:");
    console.log(`   PV Estimate:   ${result.pvEstimateKw} kW`);
    console.log(`   Timestamp:     ${result.timestamp}`);
    console.log(`   Real Site:     ${result.isRealSite}`);
    console.log(`   Site Name:     ${result.siteName}`);
    console.log("\n🛰️ Satellite telemetry link established.");
  } catch (error: any) {
    console.error("\n❌ Sky Oracle Test Failed:");
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

main();
