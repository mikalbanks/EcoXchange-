import { pool } from "../db";
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
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (let i = 0; i < txIds.length; i += 100) {
      const batch = txIds.slice(i, i + 100);
      const placeholders = batch.map((_, idx) => `$${idx + 2}`).join(", ");
      await client.query(
        `UPDATE transactions SET status = $1 WHERE id IN (${placeholders})`,
        [status, ...batch],
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
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
