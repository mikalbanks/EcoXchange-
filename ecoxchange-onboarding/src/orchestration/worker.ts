import {
  claimForProcessing,
  listPendingSubmissions,
  updateStatus,
} from "../db/submissions.js";
import { processSubmission } from "./processor.js";

const POLL_INTERVAL_MS = 60_000;
const MAX_PER_TICK = 3;

let interval: NodeJS.Timeout | null = null;
let running = false;

async function pollOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const pending = await listPendingSubmissions(MAX_PER_TICK);
    for (const sub of pending) {
      const claimed = await claimForProcessing(sub.id);
      if (!claimed) continue;
      try {
        await processSubmission(sub.id);
      } catch (err) {
        const msg = (err as Error).message || String(err);
        try {
          await updateStatus(sub.id, "rejected", `Processing error: ${msg}`);
        } catch (innerErr) {
          console.error(
            `[worker] failed to mark ${sub.id} rejected:`,
            innerErr,
          );
        }
        console.error(`[worker] submission ${sub.id} failed:`, msg);
      }
    }
  } finally {
    running = false;
  }
}

export function startWorker(): void {
  if (interval) return;
  // Run once shortly after startup to drain anything pending.
  setTimeout(() => {
    pollOnce().catch((e) => console.error("[worker] initial poll error:", e));
  }, 1000);
  interval = setInterval(() => {
    pollOnce().catch((e) => console.error("[worker] poll error:", e));
  }, POLL_INTERVAL_MS);
  console.error(
    `[worker] polling every ${POLL_INTERVAL_MS / 1000}s, up to ${MAX_PER_TICK} per tick`,
  );
}

export function stopWorker(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

export { pollOnce as _pollOnce };
