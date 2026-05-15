import cron from "node-cron";
import { refreshMarketplace } from "../services/marketplace-refresh";

let started = false;

/**
 * Wires in-process schedulers. Idempotent — safe to call multiple times.
 * Disabled when NODE_ENV=test or DISABLE_SCHEDULERS=1.
 */
export function startSchedulers(): void {
  if (started) return;
  if (process.env.NODE_ENV === "test") return;
  if (process.env.DISABLE_SCHEDULERS === "1") {
    console.log("[scheduler] DISABLE_SCHEDULERS=1 — skipping cron registration");
    return;
  }

  // Daily at 06:00 UTC: refresh marketplace listings (GridStatus + stale analytics).
  cron.schedule(
    "0 6 * * *",
    async () => {
      try {
        await refreshMarketplace({ force: false });
      } catch (err: any) {
        console.error(`[scheduler] daily marketplace refresh failed: ${err.message}`);
      }
    },
    { timezone: "UTC" },
  );
  console.log("[scheduler] daily marketplace refresh registered (06:00 UTC)");

  if (process.env.MARKETPLACE_REFRESH_ON_BOOT === "1") {
    setTimeout(() => {
      refreshMarketplace({ force: false }).catch((err) =>
        console.error(`[scheduler] boot refresh failed: ${err.message}`),
      );
    }, 30_000);
    console.log("[scheduler] boot refresh scheduled (+30s)");
  }

  started = true;
}
