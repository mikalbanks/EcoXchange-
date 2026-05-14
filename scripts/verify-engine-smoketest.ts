/**
 * Verification engine end-to-end smoketest.
 *
 * Exercises the verification engine logic against MemStorage with seeded data
 * (project, meters, accounts, intervals, irradiance). Validates the core
 * deterministic invariants:
 *   1) A clean day reconciles to VERIFIED and the daily run holds the frozen
 *      price + evidence hash.
 *   2) Anomaly rules correctly raise BLOCK on out-of-band variance.
 *   3) Per-interval frozen price drives ledger revenue (not project.ppaRate).
 *
 * Run: `tsx scripts/verify-engine-smoketest.ts`
 */
import { storage } from "../server/storage";
import {
  computeExpectedKwh,
  reconcileInterval,
  applyAnomalyRules,
  runDailyVerification,
  runIntervalVerificationFor,
  TOLERANCE_DAILY_PCT,
  TOLERANCE_15M_PCT,
} from "../server/services/verification-engine";
import { archiveSolcastRead } from "../server/services/irradiance-archive";
import type { SgtInterval } from "@shared/schema";

const PROJECT_ID = "smoketest-proj-1";
const PROJECT_BAD_ID = "smoketest-proj-2";
const CAPACITY_KW = 100;

function expect(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

function approx(a: number, b: number, tol = 1e-3): boolean {
  return Math.abs(a - b) <= tol;
}

async function seedProject(projectId: string, name: string) {
  await storage.createUser({
    email: `${projectId}@smoketest.local`,
    passwordHash: "x",
    role: "DEVELOPER",
    name: "Smoke Dev",
    orgName: "Smoke",
  } as any).catch(() => {});

  // MemStorage uses a setter-free API for projects; cast and write the seed
  // directly via createProject (which auto-generates an id). We override the
  // id by using a project map mutation when needed. The repo's seedData seeds
  // proj1/proj2/proj3 manually using direct map writes — for smoketest, we
  // create via the API and use the generated id.
  const project = await storage.createProject({
    developerId: "00000000-0000-4000-8000-000000000002",
    name,
    technology: "SOLAR",
    stage: "COD",
    country: "US",
    state: "California",
    county: "Imperial",
    latitude: "32.84",
    longitude: "-115.56",
    capacityMW: (CAPACITY_KW / 1000).toFixed(2),
    capacityKw: CAPACITY_KW.toFixed(2),
    status: "APPROVED",
    summary: "Smoketest project",
    offtakerType: "C_AND_I",
    interconnectionStatus: "IA_EXECUTED",
    permittingStatus: "APPROVED",
    siteControlStatus: "LEASE",
    feocAttested: true,
    ppaRate: "0",
    monthlyDebtService: "0",
    monthlyOpex: "0",
    reserveRate: "0",
  } as any);

  const meter = await storage.createMeter({
    projectId: project.id,
    meterType: "NET",
    provider: "MANUAL",
    name: "Smoketest Net Meter",
    timezone: "UTC",
    isActive: true,
  } as any);

  return { project, meter };
}

async function seedDay(
  projectId: string,
  meterId: string,
  dayStart: Date,
  noisePct: number,
): Promise<SgtInterval[]> {
  // Clear-sky synthetic curve: sin(π * (h-6)/14) for daylight; capacity 100 kW.
  const intervals: SgtInterval[] = [];
  for (let q = 0; q < 96; q++) {
    const minuteOfDay = q * 15;
    const hour = minuteOfDay / 60;
    let intensity = 0;
    if (hour >= 6 && hour <= 20) {
      intensity = Math.sin((Math.PI * (hour - 6)) / 14);
    }
    const pvEstimateKw = CAPACITY_KW * intensity;
    const start = new Date(dayStart.getTime() + minuteOfDay * 60_000);
    const end = new Date(start.getTime() + 15 * 60_000);

    // Archive irradiance snapshot.
    await archiveSolcastRead({
      projectId,
      meterId,
      capacityKw: CAPACITY_KW,
      latitude: 32.84,
      longitude: -115.56,
      result: { pvEstimateKw, timestamp: start.toISOString(), isRealSite: true, siteName: "Smoketest" },
      intervalStart: start,
      intervalEnd: end,
      satelliteSource: "SOLCAST_LIVE",
    });

    // Build a metered actual within tolerance of expected.
    const expectedKwh = pvEstimateKw * 0.25;
    const actualKwh = expectedKwh * (1 + noisePct / 100);
    const interval = await storage.createSgtInterval({
      meterId,
      intervalStart: start,
      intervalEnd: end,
      netWh: "0.00",
      expectedGrossWh: (pvEstimateKw * 250).toFixed(2),
      syntheticGrossWh: (actualKwh * 1000).toFixed(2),
      irradianceWm2: pvEstimateKw > 0 ? ((pvEstimateKw / CAPACITY_KW) * 1000).toFixed(4) : "0.0000",
      source: "SOLCAST",
      qualityFlag: "OK",
    } as any);
    intervals.push(interval);
  }
  return intervals;
}

async function main() {
  console.log("─── Pure functions ─────────────────────────────────");

  expect(approx(computeExpectedKwh({ pvEstimateKw: 100, intervalMinutes: 60 }), 100), "expected kWh = pv × hours");
  expect(approx(computeExpectedKwh({ pvEstimateKw: 100, intervalMinutes: 15 }), 25), "expected kWh = pv × 0.25 for 15-min");
  expect(approx(computeExpectedKwh({ pvEstimateKw: 100, intervalMinutes: 60, derateFactors: [0.1] }), 90), "derates applied");

  const within = reconcileInterval({ expectedKwh: 100, actualKwh: 102, tolerancePct: 5 });
  expect(within.status === "VERIFIED" && !within.blocking, "within tolerance → VERIFIED");

  const outside = reconcileInterval({ expectedKwh: 100, actualKwh: 130, tolerancePct: 5 });
  expect(outside.status === "REJECTED" && outside.blocking, "outside tolerance → REJECTED");

  const nightOk = reconcileInterval({ expectedKwh: 0, actualKwh: 0, tolerancePct: 5 });
  expect(nightOk.status === "VERIFIED", "0 expected + 0 actual → VERIFIED");

  const nightBad = reconcileInterval({ expectedKwh: 0, actualKwh: 50, tolerancePct: 5 });
  expect(nightBad.status === "REJECTED", "0 expected + nonzero actual → REJECTED");

  const flags = applyAnomalyRules(
    {
      expectedKwh: 100,
      actualKwh: 130,
      pvEstimateKw: 100,
      intervalMinutes: 60,
      capacityKw: 100,
      tolerancePct: 5,
      variancePct: 30,
    },
    {
      recent7dResidualPct: null,
      recent24hActualKwh: null,
      hasDuplicate: false,
      expectedIntervalsInWindow: 1,
      observedIntervalsInWindow: 1,
    },
  );
  expect(
    flags.some((f) => f.ruleCode === "VARIANCE_BAND" && f.severity === "BLOCK"),
    "30% variance raises VARIANCE_BAND BLOCK",
  );

  console.log("\n─── Daily reconciliation (clean day) ─────────────────");

  const { project, meter } = await seedProject(PROJECT_ID, "Smoketest Solar — Clean");
  const dayStart = new Date("2026-05-01T00:00:00Z");
  await seedDay(project.id, meter.id, dayStart, /* noisePct */ 1);

  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  const dailyResult = await runDailyVerification(project.id, dayStart, dayEnd);

  expect(dailyResult.status === "VERIFIED", `daily run VERIFIED (got ${dailyResult.status})`);
  expect(
    Math.abs(Number(dailyResult.run.variancePct)) <= TOLERANCE_DAILY_PCT,
    `daily variance within ±${TOLERANCE_DAILY_PCT}% (got ${dailyResult.run.variancePct}%)`,
  );
  expect(dailyResult.anomalies.length === 0, "no anomalies on clean day");
  expect(Number(dailyResult.run.ppaRateUsdPerKwh) > 0, "ppa price resolved (CAISO hub)");
  expect(dailyResult.run.evidenceHash.length === 64, "evidence hash is sha256");

  console.log("\n─── Out-of-band day blocks ───────────────────────────");

  const { project: pBad, meter: mBad } = await seedProject(PROJECT_BAD_ID, "Smoketest Solar — Drifty");
  const day2Start = new Date("2026-05-02T00:00:00Z");
  await seedDay(pBad.id, mBad.id, day2Start, /* noisePct */ 30);

  const day2End = new Date(day2Start.getTime() + 24 * 3600 * 1000);
  const badResult = await runDailyVerification(pBad.id, day2Start, day2End);

  expect(badResult.status === "REJECTED", `30% noise → REJECTED (got ${badResult.status})`);
  expect(
    badResult.anomalies.some((a) => a.ruleCode === "VARIANCE_BAND" && a.severity === "BLOCK"),
    "VARIANCE_BAND BLOCK raised",
  );

  console.log("\n─── Per-interval verification ────────────────────────");

  const intervals = await storage.getSgtIntervalsByMeter(meter.id);
  expect(intervals.length === 96, `seeded 96 intervals (got ${intervals.length})`);
  // Pick a midday interval where expected > 0
  const midday = intervals.find((i) => i.intervalStart.getUTCHours() === 12);
  expect(!!midday, "midday interval present");
  const intervalResult = await runIntervalVerificationFor(midday!);
  expect(
    intervalResult.status === "VERIFIED" &&
      Math.abs(Number(intervalResult.run.variancePct)) <= TOLERANCE_15M_PCT,
    `midday 15-min interval VERIFIED within ±${TOLERANCE_15M_PCT}%`,
  );
  expect(
    intervalResult.run.ppaSource === "CAISO_NP15_SPOT_PROXY" ||
      intervalResult.run.ppaSource === "CAISO_SP15_SPOT_PROXY",
    `CA project → CAISO hub (got ${intervalResult.run.ppaSource})`,
  );

  console.log("\n─── Frozen price guarantee ────────────────────────────");
  const frozenPrice = Number(intervalResult.run.ppaRateUsdPerKwh);
  expect(frozenPrice > 0, "frozen price > 0");
  // Mutate project.ppaRate after the run; the run's frozen price must not change.
  await storage.updateProject(project.id, { ppaRate: "999" } as any);
  const reloaded = await storage.getVerificationRun(intervalResult.run.id);
  expect(
    !!reloaded && Number(reloaded.ppaRateUsdPerKwh) === frozenPrice,
    "verification run's price is immutable after project.ppaRate edit",
  );

  console.log("\n─── ML scorer BLOCK guard ─────────────────────────────");
  let threw = false;
  try {
    await storage.createAnomalyFlag({
      verificationRunId: intervalResult.run.id,
      ruleCode: "ML_SCORER",
      severity: "BLOCK",
      detail: { rogue: true } as any,
    } as any);
  } catch {
    threw = true;
  }
  expect(threw, "storage rejects ML_SCORER + BLOCK at runtime");

  console.log("\n🎉 ALL CHECKS PASSED\n");
}

main().catch((err) => {
  console.error("Smoketest crashed:", err);
  process.exit(1);
});
