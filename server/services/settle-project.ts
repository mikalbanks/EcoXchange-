import { db } from "../db";
import { transactions as transactionsTable } from "@shared/schema";
import { inArray } from "drizzle-orm";
import { settleIntervals, type SettlementResult } from "./waterfall-engine";
import { securitize } from "./securitize-bridge";

export interface FullSettlementResult {
  settlement: SettlementResult;
  distribution: {
    success: boolean;
    transactionHash?: string;
    network?: string;
    distributedAmount?: number;
    error?: string;
  } | null;
}

async function updateTransactionStatuses(txIds: string[], status: "COMPLETED" | "FAILED") {
  for (let i = 0; i < txIds.length; i += 100) {
    const batch = txIds.slice(i, i + 100);
    await db
      .update(transactionsTable)
      .set({ status })
      .where(inArray(transactionsTable.id, batch));
  }
}

export async function settleProject(
  projectId: string,
  fromDate?: Date,
  toDate?: Date,
): Promise<FullSettlementResult> {
  const settlement = await settleIntervals(projectId, fromDate, toDate);

  if (settlement.daysSettled === 0) {
    return { settlement, distribution: null };
  }

  const investorYieldTotal = settlement.waterfallSummary["INVESTOR_YIELD"] || 0;
  const txIds = settlement.dailySettlements.map((d) => d.transactionId);

  let distribution: FullSettlementResult["distribution"] = null;

  if (investorYieldTotal > 0) {
    try {
      const result = await securitize.distributeYield({
        projectId,
        amountUsd: investorYieldTotal,
        investorCount: 1,
      });

      if (result.success) {
        await updateTransactionStatuses(txIds, "COMPLETED");
        distribution = {
          success: true,
          transactionHash: result.transactionHash,
          network: result.network,
          distributedAmount: result.distributedAmount,
        };
      } else {
        await updateTransactionStatuses(txIds, "FAILED");
        distribution = {
          success: false,
          error: "Securitize distribution returned failure",
        };
      }
    } catch (err: any) {
      await updateTransactionStatuses(txIds, "FAILED");
      distribution = {
        success: false,
        error: err.message || "Securitize distribution failed",
      };
    }
  } else {
    await updateTransactionStatuses(txIds, "COMPLETED");
    distribution = {
      success: true,
      distributedAmount: 0,
    };
  }

  return { settlement, distribution };
}
