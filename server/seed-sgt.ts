import "dotenv/config";
import { db } from "./db";
import { projects, meters, sgtIntervals, accounts, transactions } from "@shared/schema";
import { subDays, startOfDay, addMinutes, isAfter } from "date-fns";
import { settleIntervals } from "./services/waterfall-engine";
import { inArray } from "drizzle-orm";

async function seed1MW() {
  console.log("🌞 Scaling up: Seeding 1 MW EcoXchange Asset...");

  const [project] = await db.insert(projects).values({
    developerId: "dev1",
    name: "Centennial Logistics Hub - Site 01",
    technology: "SOLAR",
    stage: "COD",
    country: "US",
    state: "CA",
    county: "Los Angeles",
    latitude: "34.052200",
    longitude: "-118.243700",
    capacityMW: "1.00",
    capacityKw: "1000.00",
    status: "ACTIVE",
    summary: "1 MW rooftop C&I solar on logistics warehouse in LA Basin. High-yield location with premium PPA rate.",
    offtakerType: "C_AND_I",
    interconnectionStatus: "COMPLETED",
    permittingStatus: "APPROVED",
    siteControlStatus: "OWNED",
    feocAttested: true,
    ppaRate: "0",
    monthlyDebtService: "8500.00",
    monthlyOpex: "3200.00",
    reserveRate: "0.05",
  }).returning();

  console.log(`📋 Project created: ${project.id}`);

  const [meter] = await db.insert(meters).values({
    projectId: project.id,
    meterType: "NET",
    provider: "UTILITY_API",
    providerUid: "METER_CAL_9901",
    name: "Main Revenue Meter - Centennial Hub",
    timezone: "America/Los_Angeles",
    isActive: true,
  }).returning();

  console.log(`📡 Meter created: ${meter.id}`);

  const waterfallAccounts = [
    { code: "3000", name: "Revenue Clearing", accountType: "REVENUE_CLEARING", denominatedIn: "USD" },
    { code: "4000", name: "Debt Service", accountType: "DEBT_SERVICE", denominatedIn: "USD" },
    { code: "4100", name: "Operating Expenses", accountType: "OPEX_FUND", denominatedIn: "USD" },
    { code: "4200", name: "Reserve Fund", accountType: "RESERVES", denominatedIn: "USD" },
    { code: "4300", name: "Platform Fee", accountType: "PLATFORM_FEE", denominatedIn: "USD" },
    { code: "4400", name: "Investor Yield", accountType: "INVESTOR_YIELD", denominatedIn: "USD" },
  ];

  for (const acct of waterfallAccounts) {
    const [created] = await db.insert(accounts).values({
      projectId: project.id,
      ...acct,
    }).returning();
    console.log(`💰 Account created: ${created.code} - ${created.name}`);
  }

  const intervals: Array<{
    meterId: string;
    intervalStart: Date;
    intervalEnd: Date;
    netWh: string;
    expectedGrossWh: string;
    syntheticGrossWh: string;
    irradianceWm2: string;
    source: string;
    qualityFlag: string;
  }> = [];

  let currentStep = startOfDay(subDays(new Date(), 30));

  while (isAfter(new Date(), currentStep)) {
    const hour = currentStep.getHours();

    const isWorkHours = hour >= 8 && hour <= 18;
    const consumptionKw = isWorkHours
      ? 300 + (Math.random() * 50)
      : 120 + (Math.random() * 10);

    let solarGrossKw = 0;
    if (hour >= 6 && hour <= 20) {
      const sunIntensity = Math.sin(Math.PI * (hour - 6) / 14);
      const cloudNoise = (Math.random() > 0.8) ? 0.7 : 0.95;
      solarGrossKw = 950 * sunIntensity * cloudNoise;
    }

    const netMeterKw = consumptionKw - solarGrossKw;
    const satIrradianceKw = solarGrossKw * (1 + (Math.random() * 0.02 - 0.01));
    const driftPct = Math.random() * 1.5;

    const intervalEnd = addMinutes(currentStep, 15);

    intervals.push({
      meterId: meter.id,
      intervalStart: currentStep,
      intervalEnd: intervalEnd,
      netWh: ((netMeterKw / 4) * 1000).toFixed(2),
      expectedGrossWh: ((satIrradianceKw / 4) * 1000).toFixed(2),
      syntheticGrossWh: ((solarGrossKw / 4) * 1000).toFixed(2),
      irradianceWm2: (solarGrossKw > 0 ? (solarGrossKw / 1000 * 1000).toFixed(4) : "0.0000"),
      source: "CALCULATED",
      qualityFlag: driftPct > 1.0 ? "DRIFT_WARNING" : "OK",
    });

    currentStep = intervalEnd;
  }

  for (let i = 0; i < intervals.length; i += 500) {
    await db.insert(sgtIntervals).values(intervals.slice(i, i + 500));
    console.log(`📡 Uploaded Telemetry Batch: ${i} to ${Math.min(i + 500, intervals.length)}`);
  }

  console.log(`\n✅ SUCCESS: 1 MW Asset Live on Ledger.`);
  console.log(`📊 Project: Centennial Logistics Hub - Site 01`);
  console.log(`🔋 Capacity: 1,000 kW (1 MW)`);
  console.log(`📈 Intervals seeded: ${intervals.length}`);

  console.log(`\n💰 Running partial settlement (first 20 days)...`);
  const settleTo = startOfDay(subDays(new Date(), 10));
  const result = await settleIntervals(project.id, undefined, settleTo);

  console.log(`✅ Settlement complete:`);
  console.log(`   Days settled: ${result.daysSettled}`);
  console.log(`   Intervals settled: ${result.totalIntervalsSettled}`);
  console.log(`   Total gross Wh: ${result.totalGrossWh.toFixed(2)}`);
  console.log(`   Total revenue: $${result.totalRevenueUsd.toFixed(2)}`);
  console.log(`   Waterfall breakdown:`);
  for (const [tier, amount] of Object.entries(result.waterfallSummary)) {
    console.log(`     ${tier}: $${amount.toFixed(2)}`);
  }

  const txIds = result.dailySettlements.map((d) => d.transactionId);
  if (txIds.length > 0) {
    await db
      .update(transactions)
      .set({ status: "COMPLETED" })
      .where(inArray(transactions.id, txIds));
    console.log(`   Marked ${txIds.length} transactions as COMPLETED`);
  }

  console.log(`\n🎉 Full seed complete. Exiting.`);
  process.exit(0);
}

seed1MW().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
