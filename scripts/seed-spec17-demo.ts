/**
 * Seed a demo SPV for the Spec 17 distribution engine, then drive the full
 * lifecycle: close a period → compute a run → approve → submit → settle.
 *
 * This is the golden path from § 3, exercised against a real database with the
 * real gates in place.
 *
 *   sudo pg_ctlcluster 16 main start
 *   export DATABASE_URL="postgresql://ecoxchange:ecoxchange@localhost:5432/ecoxchange"
 *   npx drizzle-kit push --force
 *   psql "$DATABASE_URL" -f migrations/0009_distribution_waterfall.sql
 *   npx tsx scripts/seed-spec17-demo.ts
 *
 * Idempotent: re-running wipes and rebuilds the demo SPV.
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db, pool } from "../server/db";
import {
  capitalAccountEntries,
  distributionAllocations,
  distributionRuns,
  itcPositions,
  memberPositions,
  members,
  periodFinancials,
  reserveAccounts,
  reserveMovements,
  spvs,
  taxAllocations,
  waterfallTerms,
} from "@shared/schema";
import { computeDistributionRun, ENGINE_VERSION } from "../server/services/distribution";
import { approveRun, submitRun } from "../server/services/distribution/execution";
import { defaultDeps, defaultSubmitter } from "../server/services/distribution/default-deps";
import { recapturePeriodEnd } from "../server/services/distribution/itc";
import {
  StaticProductionVerificationReader,
  StaticRevenueReconciliationReader,
} from "../server/services/distribution/ports";
import { checkCloseGates } from "../server/services/distribution/period-close";
import * as repo from "../server/services/distribution/repository";

const SPV_ID = "00000000-0000-4000-9100-000000000001";
const TERMS_ID = "00000000-0000-4000-9100-000000000002";
const MEMBER_SPONSOR = "00000000-0000-4000-9100-000000000010";
const MEMBER_B1 = "00000000-0000-4000-9100-000000000011";
const MEMBER_B2 = "00000000-0000-4000-9100-000000000012";

const PERIOD_START = new Date(Date.UTC(2026, 0, 1));
const PERIOD_END = new Date(Date.UTC(2026, 0, 31));

async function wipe(): Promise<void> {
  await db.execute(sql`ALTER TABLE capital_account_entries DISABLE TRIGGER USER`);
  await db.execute(sql`
    DELETE FROM capital_account_entries
     WHERE member_id IN (SELECT id FROM members WHERE spv_id = ${SPV_ID})
  `);
  await db.execute(sql`ALTER TABLE capital_account_entries ENABLE TRIGGER USER`);

  await db.delete(taxAllocations).where(eq(taxAllocations.spvId, SPV_ID));
  await db.delete(itcPositions).where(eq(itcPositions.spvId, SPV_ID));
  await db.execute(sql`
    DELETE FROM reserve_movements
     WHERE reserve_account_id IN (SELECT id FROM reserve_accounts WHERE spv_id = ${SPV_ID})
  `);
  await db.delete(reserveAccounts).where(eq(reserveAccounts.spvId, SPV_ID));
  await db.execute(sql`
    DELETE FROM distribution_allocations
     WHERE distribution_run_id IN (SELECT id FROM distribution_runs WHERE spv_id = ${SPV_ID})
  `);
  await db.execute(sql`UPDATE distribution_runs SET reversed_by = NULL, reverses = NULL WHERE spv_id = ${SPV_ID}`);
  await db.delete(distributionRuns).where(eq(distributionRuns.spvId, SPV_ID));
  await db.execute(sql`
    DELETE FROM member_positions
     WHERE member_id IN (SELECT id FROM members WHERE spv_id = ${SPV_ID})
  `);
  await db.delete(members).where(eq(members.spvId, SPV_ID));
  await db.delete(periodFinancials).where(eq(periodFinancials.spvId, SPV_ID));
  await db.delete(waterfallTerms).where(eq(waterfallTerms.spvId, SPV_ID));
  await db.delete(spvs).where(eq(spvs.id, SPV_ID));
}

async function seed(): Promise<void> {
  await db.insert(spvs).values({
    id: SPV_ID,
    name: "Savannah Solar I",
    legalName: "EcoXchange Savannah Solar I, LLC",
    jurisdiction: "DE",
    entityType: "LLC",
    status: "OPERATING",
    formedOn: new Date(Date.UTC(2025, 8, 1)),
    fiscalYearEnd: "12-31",
  });

  // Terms confirmed by counsel — without this the database rejects every run.
  await db.insert(waterfallTerms).values({
    id: TERMS_ID,
    spvId: SPV_ID,
    version: 1,
    effectiveFrom: new Date(Date.UTC(2025, 8, 1)),
    feeSchedule: [
      {
        code: "platform",
        name: "EcoXchange platform fee (0.5% AUA)",
        basis: "assets_under_administration",
        rate_pct: "0.5",
        priority: 10,
      },
      {
        code: "asset_mgmt",
        name: "Asset management",
        basis: "gross_revenue",
        rate_pct: "1.5",
        priority: 20,
      },
    ],
    reservePolicy: [
      {
        code: "om",
        name: "O&M reserve",
        target_basis: "months_opex",
        target_value: "6",
        funding_priority: 1,
        draw_permitted_for: ["operating_shortfall", "equipment_replacement"],
      },
    ],
    debtSchedule: null,
    tiers: [
      {
        seq: 1,
        type: "preferred_return",
        class: "B",
        rate_pct: "7",
        compounding: "simple",
        basis: "unreturned_capital",
        cumulative: true,
      },
      { seq: 2, type: "return_of_capital", class: "B", target: "unreturned_capital" },
      {
        seq: 3,
        type: "residual_split",
        splits: [
          { class: "A", pct: "20" },
          { class: "B", pct: "80" },
        ],
      },
    ],
    classes: [
      { code: "A", name: "Sponsor", units_authorized: "100", is_sponsor: true },
      { code: "B", name: "Investor", units_authorized: "1000", is_sponsor: false },
    ],
    taxAllocationMethod: "targeted",
    itcTreatment: "transferred_6418",
    distributionFrequency: "monthly",
    minDistributionPerMemberCents: 100,
    roundingResidualTreatment: "carry_forward",
    sourceDocumentPath: "docs/savannah-solar-i-operating-agreement.pdf",
    counselConfirmedAt: new Date(Date.UTC(2025, 8, 15)),
    counselConfirmedBy: "counsel@examplefirm.com",
  });

  await db.insert(members).values([
    {
      id: MEMBER_SPONSOR,
      spvId: SPV_ID,
      transferAgentInvestorRef: "INV-SPONSOR",
      legalName: "EcoXchange Sponsor LLC",
      memberClass: "A",
      taxClassification: "entity",
      admittedOn: new Date(Date.UTC(2025, 8, 1)),
    },
    {
      id: MEMBER_B1,
      spvId: SPV_ID,
      transferAgentInvestorRef: "INV-0001",
      legalName: "Redwood Capital Partners LP",
      memberClass: "B",
      taxClassification: "entity",
      admittedOn: new Date(Date.UTC(2025, 9, 1)),
    },
    {
      id: MEMBER_B2,
      spvId: SPV_ID,
      transferAgentInvestorRef: "INV-0002",
      legalName: "Jordan Avery",
      memberClass: "B",
      taxClassification: "individual",
      admittedOn: new Date(Date.UTC(2025, 9, 1)),
    },
  ]);

  await db.insert(memberPositions).values([
    {
      memberId: MEMBER_SPONSOR,
      effectiveFrom: new Date(Date.UTC(2025, 8, 1)),
      effectiveTo: null,
      units: "100.000000",
      source: "subscription",
    },
    {
      memberId: MEMBER_B1,
      effectiveFrom: new Date(Date.UTC(2025, 9, 1)),
      effectiveTo: null,
      units: "600.000000",
      source: "subscription",
    },
    {
      memberId: MEMBER_B2,
      effectiveFrom: new Date(Date.UTC(2025, 9, 1)),
      effectiveTo: null,
      units: "400.000000",
      source: "subscription",
    },
  ]);

  // Contributions — the ledger exists before the first dollar moves.
  await db.insert(capitalAccountEntries).values([
    {
      memberId: MEMBER_B1,
      entryType: "contribution",
      periodStart: new Date(Date.UTC(2025, 9, 1)),
      bookAmount: "60000.00",
      taxAmount: "60000.00",
      bookBalanceAfter: "60000.00",
      taxBalanceAfter: "60000.00",
      sourceType: "subscription",
      engineVersion: ENGINE_VERSION,
    },
    {
      memberId: MEMBER_B2,
      entryType: "contribution",
      periodStart: new Date(Date.UTC(2025, 9, 1)),
      bookAmount: "40000.00",
      taxAmount: "40000.00",
      bookBalanceAfter: "40000.00",
      taxBalanceAfter: "40000.00",
      sourceType: "subscription",
      engineVersion: ENGINE_VERSION,
    },
  ]);

  await db.insert(reserveAccounts).values({
    spvId: SPV_ID,
    code: "om",
    name: "O&M reserve",
    targetBasis: "months_opex",
    targetValue: "6",
    fundingPriority: 1,
    fundingCapPerPeriod: "2000.00",
    drawPermittedFor: ["operating_shortfall", "equipment_replacement"],
    currentBalance: "0.00",
  });

  await db.insert(itcPositions).values({
    spvId: SPV_ID,
    memberId: null,
    placedInServiceDate: new Date(Date.UTC(2025, 8, 30)),
    eligibleBasis: "2400000.00",
    creditRatePct: "30.000",
    adders: { domestic_content: "10" },
    creditAmount: "960000.00",
    treatment: "transferred_6418",
    transferProceeds: "912000.00",
    transfereeRef: "TAX-EQUITY-CO",
    vestingStart: new Date(Date.UTC(2025, 8, 30)),
    vestedPct: "0.000",
    recaptureEvents: [],
    recapturePeriodEnds: recapturePeriodEnd(new Date(Date.UTC(2025, 8, 30))),
  });

  await db.insert(periodFinancials).values({
    spvId: SPV_ID,
    periodStart: PERIOD_START,
    periodEnd: PERIOD_END,
    energyRevenue: "18400.00",
    recRevenue: "1250.00",
    itcTransferProceeds: "0.00",
    otherRevenue: "0.00",
    expenses: [
      { code: "om", description: "O&M contract", amount: "3200.00", vendor: "Sunwatt O&M", recognition: "paid" },
      { code: "ins", description: "Insurance", amount: "1450.00", vendor: "Chubb", recognition: "paid" },
      { code: "admin", description: "Fund admin", amount: "900.00", vendor: "Juniper Admin", recognition: "paid" },
      { code: "audit", description: "Audit accrual", amount: "1000.00", vendor: null, recognition: "accrued" },
    ],
    totalOpex: "5550.00",
    closeStatus: "open",
    bankReconciledAt: new Date(Date.UTC(2026, 1, 3)),
    bankReconciledBy: "controller@ecoxchange.net",
  });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  console.log("→ wiping any previous demo SPV");
  await wipe();

  console.log("→ seeding Savannah Solar I");
  await seed();

  // ── Close the period ─────────────────────────────────────────────────────
  // The demo SPV has no projects attached, so the production and revenue
  // readers are stubbed here rather than reading an empty verification table
  // and passing vacuously.
  console.log("→ closing period 2026-01");
  const gates = await checkCloseGates(
    {
      spvId: SPV_ID,
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
      closedBy: "controller@ecoxchange.net",
      bankReconciledAt: new Date(Date.UTC(2026, 1, 3)),
      bankReconciledBy: "controller@ecoxchange.net",
    },
    {
      productionVerification: new StaticProductionVerificationReader([
        { projectId: "demo-project", status: "VERIFIED", verificationRecordIds: ["vr-demo-1"] },
      ]),
      revenueReconciliation: new StaticRevenueReconciliationReader([
        { id: "rr-demo-1", status: "variance", detail: "1.8% under invoice, within tolerance" },
      ]),
    },
  );
  console.log(`   gates passed; warnings: ${gates.warnings.length}`);
  for (const warning of gates.warnings) console.log(`   · ${warning}`);

  await repo.closePeriod(SPV_ID, PERIOD_START, {
    closedBy: "controller@ecoxchange.net",
    verificationRecordIds: gates.verificationRecordIds,
    revenueReconciliationIds: gates.revenueReconciliationIds,
  });

  // ── Compute ──────────────────────────────────────────────────────────────
  console.log("→ computing the distribution run");
  const { run, warnings } = await computeDistributionRun({
    spvId: SPV_ID,
    periodStart: PERIOD_START,
    deps: defaultDeps(),
  });

  console.log(`   run ${run.id} (${run.status})`);
  console.log(`   cash revenue        ${run.cashRevenue}`);
  console.log(`   less opex           ${run.lessOpex}`);
  console.log(`   less reserves       ${run.lessReserveFunding}`);
  console.log(`   less fees           ${run.lessFees}`);
  console.log(`   distributable       ${run.distributableCash}`);
  console.log(`   total distributed   ${run.totalDistributed}`);
  for (const warning of warnings) console.log(`   · ${warning}`);

  for (const tier of run.tierResults) {
    console.log(
      `   tier ${tier.seq} ${tier.type.padEnd(18)} demand ${tier.demand.padStart(10)}  ` +
        `allocated ${tier.allocated.padStart(10)}  unmet ${tier.unmet.padStart(10)}`,
    );
  }

  const allocations = await repo.listAllocations([run.id]);
  for (const allocation of allocations) {
    console.log(
      `   ${allocation.memberClass} ${allocation.memberId.slice(-4)} ` +
        `weighted ${allocation.weightedUnits.padStart(14)} → ${allocation.netAmount.padStart(10)}`,
    );
  }

  // ── Approve and submit ───────────────────────────────────────────────────
  console.log("→ approving (named human required)");
  const approved = await approveRun({ runId: run.id, approvedBy: "mikal@ecoxchange.net" });
  console.log(`   ${approved.status} by ${approved.approvedBy}`);

  console.log("→ submitting to the transfer agent");
  const settled = await submitRun({ runId: run.id, submitter: defaultSubmitter });
  console.log(`   ${settled.status}; batch ${settled.transferAgentBatchRef}`);
  console.log(`   settled total ${settled.settledTotal}`);

  // ── Capital accounts ─────────────────────────────────────────────────────
  const ledger = await repo.listLedger(SPV_ID);
  console.log(`→ capital account ledger now holds ${ledger.length} entries`);
  for (const entry of ledger) {
    console.log(
      `   ${entry.periodStart.toISOString().slice(0, 10)} ${entry.entryType.padEnd(18)} ` +
        `book ${entry.bookAmount.padStart(11)} → ${entry.bookBalanceAfter.padStart(11)}  ` +
        `tax ${entry.taxAmount.padStart(11)} → ${entry.taxBalanceAfter.padStart(11)}`,
    );
  }

  console.log("\n✅ Spec 17 golden path complete.");
}

main()
  .catch((error) => {
    console.error("\n❌ seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
