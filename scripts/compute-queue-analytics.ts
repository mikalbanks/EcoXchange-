/**
 * Batch compute queue analytics for PENDING/FAILED/missing rows.
 *   npx tsx scripts/compute-queue-analytics.ts [limit]
 */
import "dotenv/config";
import { runBatchQueueAnalytics } from "../server/queue-data";

const limit = Number(process.argv[2]) || 20;

runBatchQueueAnalytics(limit)
  .then(({ processed, errors }) => {
    console.log(`Processed: ${processed}`);
    if (errors.length) {
      console.error("Errors:", errors);
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
