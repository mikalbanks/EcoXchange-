import { getActiveProjects, getProjectById } from "../src/db/projects.js";
import {
  getVerificationHistory,
  getVerificationRecord,
  storeVerificationRecord,
} from "../src/db/verification-records.js";
import {
  completeEngineRun,
  createEngineRun,
  updateRunCounter,
} from "../src/db/engine-runs.js";
import { storeRawReading } from "../src/db/raw-readings.js";
import { archiveRawEvidence } from "../src/orchestration/archive.js";
import { ENGINE_VERSION } from "../src/config/constants.js";
import { DEFAULT_TOLERANCES } from "../src/config/tolerances.js";

async function main() {
  console.log("== getActiveProjects ==");
  const projects = await getActiveProjects();
  console.log(`  found ${projects.length} active project(s)`);
  for (const p of projects) console.log(`  - ${p.id}  ${p.name}  ${p.capacity_kw_dc}kW`);

  const seeded = projects[0];
  if (!seeded) throw new Error("expected at least one active project");

  console.log("\n== getProjectById ==");
  const fetched = await getProjectById(seeded.id);
  console.log(`  ${fetched?.name} (lat ${fetched?.latitude}, lon ${fetched?.longitude})`);

  console.log("\n== getVerificationHistory ==");
  const history = await getVerificationHistory(seeded.id);
  console.log(`  ${history.length} record(s)`);
  if (history.length > 0) {
    const first = history[0];
    const last = history[history.length - 1];
    console.log(`  first: ${first.period_start} status=${first.status} expected=${first.expected_kwh}`);
    console.log(`  last:  ${last.period_start} status=${last.status} expected=${last.expected_kwh}`);
  }

  console.log("\n== getVerificationRecord ==");
  const apr = await getVerificationRecord(seeded.id, "2024-04-01");
  console.log(`  Apr 2024: status=${apr?.status} inv_kwh=${apr?.inverter_kwh}`);

  console.log("\n== createEngineRun + updateRunCounter + completeEngineRun ==");
  const run = await createEngineRun("2024-04-01", "backtest", ENGINE_VERSION);
  console.log(`  created run ${run.id}`);
  await updateRunCounter(run.id, "verified");
  await completeEngineRun(run.id);
  console.log(`  counter updated, run completed`);

  console.log("\n== storeRawReading (upsert) ==");
  const reading = await storeRawReading({
    project_id: seeded.id,
    source: "satellite",
    period_start: "2024-04-01",
    period_end: "2024-04-30",
    kwh_gross: null,
    kwh_net: null,
    ghi_kwh_m2: 185.5,
    dni_kwh_m2: 175.0,
    dhi_kwh_m2: 50.2,
    raw_response: { smoke_test: true },
    archive_path: null,
    data_quality: "complete",
    quality_notes: null,
  });
  console.log(`  stored reading ${reading.id} for ${reading.period_start}`);

  console.log("\n== archiveRawEvidence ==");
  const path = await archiveRawEvidence(seeded.id, "satellite", "2024-04", {
    smoke_test: true,
    ghi_kwh_m2: 185.5,
  });
  console.log(`  archived to ${path}`);

  console.log("\n== storeVerificationRecord (upsert no-op) ==");
  // Re-write the existing April record (should upsert on unique constraint)
  if (apr) {
    const upserted = await storeVerificationRecord({
      project_id: apr.project_id,
      period_start: apr.period_start,
      period_end: apr.period_end,
      inverter_kwh: apr.inverter_kwh,
      utility_kwh: apr.utility_kwh,
      expected_kwh: apr.expected_kwh,
      inv_vs_expected_pct: apr.inv_vs_expected_pct,
      inv_vs_utility_pct: apr.inv_vs_utility_pct,
      util_vs_expected_pct: apr.util_vs_expected_pct,
      status: apr.status,
      flag_reasons: apr.flag_reasons,
      tolerance_config: DEFAULT_TOLERANCES,
      estimated_revenue: apr.estimated_revenue,
      engine_version: apr.engine_version,
      reviewed_by: apr.reviewed_by,
      review_notes: apr.review_notes,
      review_resolved_at: apr.review_resolved_at,
    });
    console.log(`  upserted ${upserted.id} (period ${upserted.period_start})`);
  }

  console.log("\nALL DB MODULES OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
