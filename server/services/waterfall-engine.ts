import { db } from "../db";
import {
  projects,
  meters,
  accounts,
  sgtIntervals,
  transactions as transactionsTable,
  postings as postingsTable,
  type Project,
  type Account,
} from "@shared/schema";
import { eq, sql, and, isNull, inArray, gte, lte } from "drizzle-orm";
import { resolveMarketPpaUsdPerKwh } from "../lib/market-rates";

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
  const reserveTarget = Number((dailyRevenueUsd * reserveRate).toFixed(4));
  const reserveAmount = Math.min(remaining, reserveTarget);
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

  const fixedPpa = Number(project.ppaRate || 0);
  const market = resolveMarketPpaUsdPerKwh({
    state: project.state,
    latitude: project.latitude,
    longitude: project.longitude,
    fixedPpaRatePerKwh: Number.isFinite(fixedPpa) && fixedPpa > 0 ? fixedPpa : null,
  });
  const ppaRatePerKwh = market.usdPerKwh;
  if (ppaRatePerKwh <= 0) {
    throw new Error(`Project ${projectId} has no resolvable PPA rate (fixed or market)`);
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
    "REVENUE_CLEARING",
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

  return await db.transaction(async (tx) => {
    const conditions = [
      isNull(sgtIntervals.settledAt),
      inArray(sgtIntervals.meterId, meterIds),
    ];
    if (fromDate) conditions.push(gte(sgtIntervals.intervalStart, fromDate));
    if (toDate) conditions.push(lte(sgtIntervals.intervalEnd, toDate));

    const unsettledIntervals = await tx
      .select()
      .from(sgtIntervals)
      .where(and(...conditions))
      .orderBy(sgtIntervals.intervalStart)
      .for("update", { skipLocked: true });

    if (unsettledIntervals.length === 0) {
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

    const settledIds = unsettledIntervals.map((i) => i.id);
    await tx
      .update(sgtIntervals)
      .set({ settledAt: new Date() })
      .where(inArray(sgtIntervals.id, settledIds));

    const dailyGroups = new Map<
      string,
      { intervalIds: number[]; totalGrossWh: number; count: number }
    >();

    for (const row of unsettledIntervals) {
      const dateKey = new Date(row.intervalStart).toISOString().slice(0, 10);
      if (!dailyGroups.has(dateKey)) {
        dailyGroups.set(dateKey, { intervalIds: [], totalGrossWh: 0, count: 0 });
      }
      const group = dailyGroups.get(dateKey)!;
      group.intervalIds.push(row.id);
      group.totalGrossWh += Number(row.syntheticGrossWh || 0);
      group.count++;
    }

    const dailySettlements: DailySettlement[] = [];
    const waterfallSummary: Record<string, number> = {};
    let totalGrossWh = 0;
    let totalRevenueUsd = 0;
    let totalIntervalsSettled = 0;

    const revenueAccountId = accountsByType.get("REVENUE_CLEARING")!.id;

    for (const [dateKey, group] of Array.from(dailyGroups.entries()).sort()) {
      const grossKwh = group.totalGrossWh / 1000;
      const dailyRevenue = grossKwh * ppaRatePerKwh;

      const waterfall = computeWaterfall(dailyRevenue, project, accountsByType);

      const [txRow] = await tx
        .insert(transactionsTable)
        .values({
          projectId,
          memo: `Daily settlement for ${dateKey}: ${group.count} intervals, ${grossKwh.toFixed(2)} kWh gross, $${dailyRevenue.toFixed(2)} revenue`,
          status: "PENDING",
          occurredAt: new Date(dateKey),
        })
        .returning();

      const txId = txRow.id;

      const totalCredited = waterfall.reduce((sum, t) => sum + t.amount, 0);
      await tx.insert(postingsTable).values({
        transactionId: txId,
        accountId: revenueAccountId,
        amount: totalCredited.toFixed(4),
        direction: "DEBIT",
      });

      for (const tier of waterfall) {
        const acct = accountsByType.get(tier.accountType)!;
        await tx.insert(postingsTable).values({
          transactionId: txId,
          accountId: acct.id,
          amount: tier.amount.toFixed(4),
          direction: "CREDIT",
        });
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
  });
}
