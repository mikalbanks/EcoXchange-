// Live integration test against the seeded Supabase project.
// Run with: RUN_NETWORK_TESTS=1 npm test -w @ecoxchange/nexus-adapter
import { describe, it, expect } from "vitest";
import { listProjects, getVerificationHistory } from "../src/db/queries.js";
import { computeRiskMetrics } from "../src/scoring/risk.js";
import { scoreCashFlowDurability } from "../src/scoring/cash_flow.js";
import { scorePhysicalDurability } from "../src/scoring/physical.js";
import { scoreStructuralDurability } from "../src/scoring/structural.js";

const RUN = process.env.RUN_NETWORK_TESTS === "1";
const d = RUN ? describe : describe.skip;

const SEEDED_PROJECT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

d("nexus-adapter live integration", () => {
  it("lists at least one active project", async () => {
    const projects = await listProjects({ status: "active" });
    expect(projects.length).toBeGreaterThanOrEqual(1);
    const savannah = projects.find((p) => p.id === SEEDED_PROJECT_ID);
    expect(savannah).toBeDefined();
    expect(savannah?.capacity_kw_dc).toBe(5000);
  });

  it("returns 12 verification records for the seeded project", async () => {
    const recs = await getVerificationHistory(SEEDED_PROJECT_ID);
    expect(recs.length).toBe(12);
    const verified = recs.filter((r) => r.status === "verified").length;
    expect(verified).toBe(12);
  });

  it("computes risk metrics with zero flag rate on the seeded data", async () => {
    const projects = await listProjects({ status: "active" });
    const savannah = projects.find((p) => p.id === SEEDED_PROJECT_ID)!;
    const recs = await getVerificationHistory(SEEDED_PROJECT_ID);
    const m = computeRiskMetrics(savannah, recs);
    expect(m.flag_rate_pct).toBe(0);
    expect(m.annual_revenue_estimate_usd).toBeGreaterThan(600_000);
    expect(m.annual_revenue_estimate_usd).toBeLessThan(750_000);
  });

  it("scores durability at tier 'high'", async () => {
    const projects = await listProjects({ status: "active" });
    const savannah = projects.find((p) => p.id === SEEDED_PROJECT_ID)!;
    const recs = await getVerificationHistory(SEEDED_PROJECT_ID);
    const cf = scoreCashFlowDurability(savannah);
    const ph = scorePhysicalDurability(savannah, recs);
    const st = scoreStructuralDurability();
    const overall = 0.4 * cf.score + 0.3 * ph.score + 0.3 * st.score;
    expect(overall).toBeGreaterThanOrEqual(8);
  });
});
