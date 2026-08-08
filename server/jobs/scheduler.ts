import cron from "node-cron";
import { refreshMarketplace } from "../services/marketplace-refresh";
import {
  isSupabaseConfigured as isPolymeshPersistenceConfigured,
  runPolymeshSync,
} from "../../ecoxchange-reconciliation-engine/src/polymesh/index.js";

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

  // Spec 18 § 2.7 — daily Polymesh chain sync at 06:00 ET.
  //
  // Daily is deliberate rather than lazy: distributions are monthly and holder
  // changes are rare pre-secondary-market, so chain data is not real-time
  // critical here — and the middleware is a free public endpoint that deserves
  // a respectful request volume (risk #5). The manual trigger at
  // POST /api/polymesh/sync covers demos.
  cron.schedule(
    "0 6 * * *",
    async () => {
      if (!isPolymeshPersistenceConfigured()) return;
      try {
        const summary = await runPolymeshSync({ triggerType: "scheduled" });
        console.log(
          `[scheduler] polymesh sync ${summary.status}: ` +
            `${summary.assetsSynced}/${summary.assetsAttempted} assets, ` +
            `${summary.holdersUpserted} holders, ` +
            `${summary.distributionsFound} distributions, ` +
            `${summary.reconciled} reconciled`,
        );
      } catch (err: any) {
        console.error(`[scheduler] daily polymesh sync failed: ${err.message}`);
      }
    },
    { timezone: "America/New_York" },
  );
  console.log("[scheduler] daily polymesh sync registered (06:00 ET)");

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
