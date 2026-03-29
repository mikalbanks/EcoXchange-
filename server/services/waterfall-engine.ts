import { db, pool } from "../db";
import {
  projects,
  meters,
  accounts,
  type Project,
  type Account,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface WaterfallTier {
  accountCode: string;
  accountName: string;
  accountType: string;
  amount: number;
}

export interface DailySettlement {
  date: string;
  intervalCount: number;
  totalSyntheticGrossWh: number;
  totalRevenueUsd: number;
  transactionId: string;
  waterfall: WaterfallTier[];
}

export interface SettlementResult {
  projectId: string;
  projectName: string;
  dateRange: { from: string; to: string };
  daysSettled: number;
  totalIntervalsSettled: number;
  totalGrossWh: number;
  totalRevenueUsd: number;
  waterfallSummary: Record<string, number>;
  dailySettlements: DailySettlement[];
}

const PLATFORM_FEE_RATE = 0.015;

function computeWaterfall(
  dailyRevenueUsd: number,
  project: Project,
  accountsByType: Map<string, Account>,
): WaterfallTier[] {
  const tiers: WaterfallTier[] = [];
  let remaining = dailyRevenueUsd;

  const dailyDebt = Number(project.monthlyDebtService || 0) / 30;
  const debtAmount = Math.min(remaining, dailyDebt);
  remaining -= debtAmount;
  const debtAcct = accountsByType.get("DEBT_SERVICE");
  if (debtAcct) {
    tiers.push({
      accountCode: debtAcct.code,
      accountName: debtAcct.name,
      accountType: "DEBT_SERVICE",
      amount: Number(debtAmount.toFixed(4)),
    });
  }

  const dailyOpex = Number(project.monthlyOpex || 0) / 30;
  const opexAmount = Math.min(remaining, dailyOpex);
  remaining -= opexAmount;
  const opexAcct = accountsByType.get("OPEX_FUND");
  if (opexAcct) {
    tiers.push({
      accountCode: opexAcct.code,
      accountName: opexAcct.name,
      accountType: "OPEX_FUND",
      amount: Number(opexAmount.toFixed(4)),
    });
  }

  const reserveRate = Math.max(0, Math.min(1, Number(project.reserveRate || 0)));
  const reserveAmount = Number((remaining * reserveRate).toFixed(4));
  remaining -= reserveAmount;
  const reserveAcct = accountsByType.get("RESERVES");
  if (reserveAcct) {
    tiers.push({
      accountCode: reserveAcct.code,
      accountName: reserveAcct.name,
      accountType: "RESERVES",
      amount: reserveAmount,
    });
  }

  const platformFee = Number((remaining * PLATFORM_FEE_RATE).toFixed(4));
  remaining -= platformFee;
  const platformAcct = accountsByType.get("PLATFORM_FEE");
  if (platformAcct) {
    tiers.push({
      accountCode: platformAcct.code,
      accountName: platformAcct.name,
      accountType: "PLATFORM_FEE",
      amount: platformFee,
    });
  }

  const investorYield = Number(Math.max(0, remaining).toFixed(4));
  const yieldAcct = accountsByType.get("INVESTOR_YIELD");
  if (yieldAcct) {
    tiers.push({
      accountCode: yieldAcct.code,
      accountName: yieldAcct.name,
      accountType: "INVESTOR_YIELD",
      amount: investorYield,
    });
  }

  return tiers;
}

export async function settleIntervals(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
): Promise<SettlementResult> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  const ppaRatePerKwh = Number(project.ppaRate || 0);
  if (ppaRatePerKwh <= 0) {
    throw new Error(`Project ${projectId} has no PPA rate configured`);
  }

  const projectAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.projectId, projectId));

  const accountsByType = new Map<string, Account>();
  for (const acct of projectAccounts) {
    accountsByType.set(acct.accountType, acct);
  }

  const requiredTypes = [
    "DEBT_SERVICE",
    "OPEX_FUND",
    "RESERVES",
    "PLATFORM_FEE",
    "INVESTOR_YIELD",
  ];
  for (const t of requiredTypes) {
    if (!accountsByType.has(t)) {
      throw new Error(
        `Project ${projectId} missing ${t} account. Create waterfall accounts first.`,
      );
    }
  }

  const projectMeters = await db
    .select()
    .from(meters)
    .where(eq(meters.projectId, projectId));

  if (projectMeters.length === 0) {
    throw new Error(`No meters found for project ${projectId}`);
  }

  const meterIds = projectMeters.map((m) => m.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let lockQuery = `
      UPDATE sgt_intervals
      SET settled_at = NOW()
      WHERE id IN (
        SELECT id FROM sgt_intervals
        WHERE settled_at IS NULL
          AND meter_id = ANY($1)
    `;
    const lockParams: any[] = [meterIds];
    let paramIdx = 2;

    if (fromDate) {
      lockQuery += ` AND interval_start >= $${paramIdx}`;
      lockParams.push(fromDate);
      paramIdx++;
    }
    if (toDate) {
      lockQuery += ` AND interval_end <= $${paramIdx}`;
      lockParams.push(toDate);
      paramIdx++;
    }

    lockQuery += ` ORDER BY interval_start FOR UPDATE SKIP LOCKED
      )
      RETURNING id, meter_id, interval_start, interval_end,
                net_wh, expected_gross_wh, synthetic_gross_wh,
                irradiance_wm2, source, quality_flag`;

    const lockResult = await client.query(lockQuery, lockParams);
    const claimedIntervals = lockResult.rows;

    if (claimedIntervals.length === 0) {
      await client.query("COMMIT");
      return {
        projectId,
        projectName: project.name,
        dateRange: {
          from: fromDate?.toISOString() || "N/A",
          to: toDate?.toISOString() || "N/A",
        },
        daysSettled: 0,
        totalIntervalsSettled: 0,
        totalGrossWh: 0,
        totalRevenueUsd: 0,
        waterfallSummary: {},
        dailySettlements: [],
      };
    }

    const dailyGroups = new Map<
      string,
      { intervalIds: number[]; totalGrossWh: number; count: number }
    >();

    for (const row of claimedIntervals) {
      const dateKey = new Date(row.interval_start).toISOString().slice(0, 10);
      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, { intervalIds: [], totalGrossWh: 0, count: 0 });
      }
      const group = dailyGroups.get(dateKey)!;
      group.intervalIds.push(row.id);
      group.totalGrossWh += Number(row.synthetic_gross_wh || 0);
      group.count++;
    }

    const dailySettlements: DailySettlement[] = [];
    const waterfallSummary: Record<string, number> = {};
    let totalGrossWh = 0;
    let totalRevenueUsd = 0;
    let totalIntervalsSettled = 0;

    const revenueAccountId = accountsByType.get("INVESTOR_YIELD")!.id;

    for (const [dateKey, group] of Array.from(dailyGroups.entries()).sort()) {
      const grossKwh = group.totalGrossWh / 1000;
      const dailyRevenue = grossKwh * ppaRatePerKwh;

      const waterfall = computeWaterfall(dailyRevenue, project, accountsByType);

      const txResult = await client.query(
        `INSERT INTO transactions (id, project_id, memo, status, occurred_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'PENDING', $3, NOW())
         RETURNING id`,
        [
          projectId,
          `Daily settlement for ${dateKey}: ${group.count} intervals, ${grossKwh.toFixed(2)} kWh gross, $${dailyRevenue.toFixed(2)} revenue`,
          new Date(dateKey),
        ],
      );
      const txId = txResult.rows[0].id;

      const totalCredited = waterfall.reduce((sum, t) => sum + t.amount, 0);
      await client.query(
        `INSERT INTO postings (transaction_id, account_id, amount, direction, created_at)
         VALUES ($1, $2, $3, 'DEBIT', NOW())`,
        [txId, revenueAccountId, totalCredited.toFixed(4)],
      );

      for (const tier of waterfall) {
        const acct = accountsByType.get(tier.accountType)!;
        await client.query(
          `INSERT INTO postings (transaction_id, account_id, amount, direction, created_at)
           VALUES ($1, $2, $3, 'CREDIT', NOW())`,
          [txId, acct.id, tier.amount.toFixed(4)],
        );
      }

      dailySettlements.push({
        date: dateKey,
        intervalCount: group.count,
        totalSyntheticGrossWh: group.totalGrossWh,
        totalRevenueUsd: dailyRevenue,
        transactionId: txId,
        waterfall,
      });

      for (const tier of waterfall) {
        waterfallSummary[tier.accountType] =
          (waterfallSummary[tier.accountType] || 0) + tier.amount;
      }

      totalGrossWh += group.totalGrossWh;
      totalRevenueUsd += dailyRevenue;
      totalIntervalsSettled += group.count;
    }

    await client.query("COMMIT");

    return {
      projectId,
      projectName: project.name,
      dateRange: {
        from: dailySettlements[0]?.date || "N/A",
        to: dailySettlements[dailySettlements.length - 1]?.date || "N/A",
      },
      daysSettled: dailySettlements.length,
      totalIntervalsSettled,
      totalGrossWh,
      totalRevenueUsd,
      waterfallSummary,
      dailySettlements,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
