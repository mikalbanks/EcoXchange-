import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../../db";

/**
 * Spec 17 AC 11, AC 13, AC 16 — the gates the specification requires be
 * enforced *at the database layer*, not in application code.
 *
 * These exercise `migrations/0009_distribution_waterfall.sql` directly, via raw
 * SQL rather than the repository, because the whole point is that they hold
 * even when something bypasses the engine.
 *
 * Skipped without `DATABASE_URL`. To run:
 *
 *   sudo pg_ctlcluster 16 main start
 *   export DATABASE_URL="postgresql://ecoxchange:ecoxchange@localhost:5432/ecoxchange"
 *   npx drizzle-kit push --force
 *   psql "$DATABASE_URL" -f migrations/0009_distribution_waterfall.sql
 *   npm test
 */
const hasDatabase = Boolean(process.env.DATABASE_URL);

const SPV_ID = "00000000-0000-4000-9000-0000000017a1";
const UNCONFIRMED_TERMS_ID = "00000000-0000-4000-9000-0000000017a2";
const CONFIRMED_TERMS_ID = "00000000-0000-4000-9000-0000000017a3";
const MEMBER_ID = "00000000-0000-4000-9000-0000000017a4";

const EMPTY_TERMS = {
  fee_schedule: "[]",
  reserve_policy: "[]",
  tiers: '[{"seq":1,"type":"pro_rata"}]',
  classes: '[{"code":"B","name":"Investor","units_authorized":"1000","is_sponsor":false}]',
};

describe.skipIf(!hasDatabase)("Spec 17 database-layer gates", () => {
  beforeAll(async () => {
    await cleanup();

    await db.execute(sql`
      INSERT INTO spvs (id, name, legal_name, jurisdiction, entity_type, status, fiscal_year_end)
      VALUES (${SPV_ID}, 'Gate Test SPV', 'Gate Test SPV, LLC', 'DE', 'LLC', 'OPERATING', '12-31')
    `);

    for (const [id, version, confirmedAt] of [
      [UNCONFIRMED_TERMS_ID, 1, null],
      [CONFIRMED_TERMS_ID, 2, "2026-01-01"],
    ] as const) {
      await db.execute(sql`
        INSERT INTO waterfall_terms (
          id, spv_id, version, effective_from, fee_schedule, reserve_policy, tiers, classes,
          tax_allocation_method, itc_treatment, source_document_path, counsel_confirmed_at,
          counsel_confirmed_by
        ) VALUES (
          ${id}, ${SPV_ID}, ${version}, '2026-01-01',
          ${EMPTY_TERMS.fee_schedule}::jsonb, ${EMPTY_TERMS.reserve_policy}::jsonb,
          ${EMPTY_TERMS.tiers}::jsonb, ${EMPTY_TERMS.classes}::jsonb,
          'targeted', 'transferred_6418', 'docs/operating-agreement.pdf',
          ${confirmedAt}::timestamp, ${confirmedAt === null ? null : "counsel@example.com"}
        )
      `);
    }

    await db.execute(sql`
      INSERT INTO members (id, spv_id, transfer_agent_investor_ref, legal_name, member_class, admitted_on)
      VALUES (${MEMBER_ID}, ${SPV_ID}, 'INV-GATE-1', 'Gate Test Member', 'B', '2026-01-01')
    `);
  });

  afterAll(async () => {
    await cleanup();
    await pool.end();
  });

  // ── AC 11 ────────────────────────────────────────────────────────────────

  it("AC 11 — refuses a run against terms counsel has not confirmed", async () => {
    await expect(insertRun(UNCONFIRMED_TERMS_ID, "computed")).rejects.toThrow(
      /have not been confirmed by counsel/,
    );
  });

  it("AC 11 — allows a run against confirmed terms", async () => {
    const id = await insertRun(CONFIRMED_TERMS_ID, "computed");
    expect(id).toBeTruthy();
    await db.execute(sql`DELETE FROM distribution_runs WHERE id = ${id}`);
  });

  it("AC 11 — refuses to repoint an existing run at unconfirmed terms", async () => {
    const id = await insertRun(CONFIRMED_TERMS_ID, "computed");
    await expect(
      db.execute(
        sql`UPDATE distribution_runs SET waterfall_terms_id = ${UNCONFIRMED_TERMS_ID} WHERE id = ${id}`,
      ),
    ).rejects.toThrow(/have not been confirmed by counsel/);
    await db.execute(sql`DELETE FROM distribution_runs WHERE id = ${id}`);
  });

  // ── AC 13 ────────────────────────────────────────────────────────────────

  it("AC 13 — refuses to insert a submitted run with no named approver", async () => {
    await expect(insertRun(CONFIRMED_TERMS_ID, "submitted")).rejects.toThrow(
      /without a named human approval/,
    );
  });

  it("AC 13 — refuses to advance a computed run straight to submitted", async () => {
    const id = await insertRun(CONFIRMED_TERMS_ID, "computed");
    await expect(
      db.execute(sql`UPDATE distribution_runs SET status = 'submitted' WHERE id = ${id}`),
    ).rejects.toThrow(/without a named human approval/);
    await db.execute(sql`DELETE FROM distribution_runs WHERE id = ${id}`);
  });

  it("AC 13 — refuses an empty approver string", async () => {
    const id = await insertRun(CONFIRMED_TERMS_ID, "computed");
    await expect(
      db.execute(sql`
        UPDATE distribution_runs
           SET status = 'submitted', approved_by = '   ', approved_at = now()
         WHERE id = ${id}
      `),
    ).rejects.toThrow(/without a named human approval/);
    await db.execute(sql`DELETE FROM distribution_runs WHERE id = ${id}`);
  });

  it("AC 13 — allows submission once a named human has approved", async () => {
    const id = await insertRun(CONFIRMED_TERMS_ID, "computed");
    await db.execute(sql`
      UPDATE distribution_runs
         SET status = 'approved', approved_by = 'mikal@ecoxchange.net', approved_at = now()
       WHERE id = ${id}
    `);
    await expect(
      db.execute(sql`UPDATE distribution_runs SET status = 'submitted' WHERE id = ${id}`),
    ).resolves.toBeTruthy();
    await db.execute(sql`DELETE FROM distribution_runs WHERE id = ${id}`);
  });

  // ── AC 16 ────────────────────────────────────────────────────────────────

  describe("AC 16 — capital_account_entries is append-only", () => {
    let entryId: string;

    beforeAll(async () => {
      const result = await db.execute(sql`
        INSERT INTO capital_account_entries (
          member_id, entry_type, period_start, book_amount, tax_amount,
          book_balance_after, tax_balance_after, source_type, engine_version
        ) VALUES (
          ${MEMBER_ID}, 'contribution', '2026-01-01', '1000.00', '1000.00',
          '1000.00', '1000.00', 'subscription', '17.0.0'
        ) RETURNING id
      `);
      entryId = (result.rows[0] as { id: string }).id;
    });

    it("rejects UPDATE", async () => {
      await expect(
        db.execute(
          sql`UPDATE capital_account_entries SET book_amount = '9999.00' WHERE id = ${entryId}`,
        ),
      ).rejects.toThrow(/append-only/);
    });

    it("rejects DELETE", async () => {
      await expect(
        db.execute(sql`DELETE FROM capital_account_entries WHERE id = ${entryId}`),
      ).rejects.toThrow(/append-only/);
    });

    it("leaves the entry exactly as written", async () => {
      const result = await db.execute(
        sql`SELECT book_amount FROM capital_account_entries WHERE id = ${entryId}`,
      );
      expect((result.rows[0] as { book_amount: string }).book_amount).toBe("1000.00");
    });

    it("still accepts new entries — corrections are reversals, not edits", async () => {
      const result = await db.execute(sql`
        INSERT INTO capital_account_entries (
          member_id, entry_type, period_start, book_amount, tax_amount,
          book_balance_after, tax_balance_after, source_type, reverses_entry_id, reason,
          engine_version
        ) VALUES (
          ${MEMBER_ID}, 'reversal', '2026-02-01', '-1000.00', '-1000.00',
          '0.00', '0.00', 'subscription', ${entryId}, 'contribution recorded twice', '17.0.0'
        ) RETURNING id
      `);
      expect(result.rows).toHaveLength(1);
    });
  });

  // ── Supporting constraints ───────────────────────────────────────────────

  it("rejects an unknown run status", async () => {
    await expect(insertRun(CONFIRMED_TERMS_ID, "totally_fine")).rejects.toThrow(
      /distribution_runs_status_chk/,
    );
  });

  it("rejects a zero-amount reserve movement", async () => {
    const reserveResult = await db.execute(sql`
      INSERT INTO reserve_accounts (spv_id, code, name, target_basis, target_value,
                                    funding_priority, draw_permitted_for)
      VALUES (${SPV_ID}, 'om', 'O&M reserve', 'fixed', '1000.00', 1, ARRAY['operating_shortfall'])
      RETURNING id
    `);
    const reserveId = (reserveResult.rows[0] as { id: string }).id;

    await expect(
      db.execute(sql`
        INSERT INTO reserve_movements (reserve_account_id, direction, amount, reason, balance_after)
        VALUES (${reserveId}, 'fund', '0.00', 'noop', '0.00')
      `),
    ).rejects.toThrow(/reserve_movements_amount_chk/);
  });

  it("refuses to mark a tax allocation final with no recorded CPA review", async () => {
    await expect(
      db.execute(sql`
        INSERT INTO tax_allocations (spv_id, member_id, tax_year, allocation_method, status,
                                     engine_version)
        VALUES (${SPV_ID}, ${MEMBER_ID}, 2026, 'targeted', 'final', '17.0.0')
      `),
    ).rejects.toThrow(/tax_allocations_cpa_final_chk/);
  });
});

async function insertRun(termsId: string, status: string): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO distribution_runs (
      spv_id, waterfall_terms_id, period_start, period_end, cash_revenue, less_opex,
      distributable_cash, tier_results, total_distributed, status, engine_version
    ) VALUES (
      ${SPV_ID}, ${termsId}, '2026-01-01', '2026-01-31', '0.00', '0.00',
      '0.00', '[]'::jsonb, '0.00', ${status}, ${`test-${Math.random().toString(36).slice(2, 10)}`}
    ) RETURNING id
  `);
  return (result.rows[0] as { id: string }).id;
}

async function cleanup(): Promise<void> {
  // Ordered by dependency. Capital account entries need the trigger disabled —
  // which is itself a demonstration that nothing short of superuser DDL can
  // remove a row.
  await db.execute(sql`ALTER TABLE capital_account_entries DISABLE TRIGGER USER`);
  await db.execute(
    sql`DELETE FROM capital_account_entries WHERE member_id = ${MEMBER_ID}`,
  );
  await db.execute(sql`ALTER TABLE capital_account_entries ENABLE TRIGGER USER`);

  await db.execute(sql`DELETE FROM tax_allocations WHERE spv_id = ${SPV_ID}`);
  await db.execute(
    sql`DELETE FROM reserve_movements WHERE reserve_account_id IN (SELECT id FROM reserve_accounts WHERE spv_id = ${SPV_ID})`,
  );
  await db.execute(sql`DELETE FROM reserve_accounts WHERE spv_id = ${SPV_ID}`);
  await db.execute(
    sql`DELETE FROM distribution_allocations WHERE distribution_run_id IN (SELECT id FROM distribution_runs WHERE spv_id = ${SPV_ID})`,
  );
  await db.execute(sql`DELETE FROM distribution_runs WHERE spv_id = ${SPV_ID}`);
  await db.execute(sql`DELETE FROM member_positions WHERE member_id = ${MEMBER_ID}`);
  await db.execute(sql`DELETE FROM members WHERE spv_id = ${SPV_ID}`);
  await db.execute(sql`DELETE FROM period_financials WHERE spv_id = ${SPV_ID}`);
  await db.execute(sql`DELETE FROM waterfall_terms WHERE spv_id = ${SPV_ID}`);
  await db.execute(sql`DELETE FROM spvs WHERE id = ${SPV_ID}`);
}
