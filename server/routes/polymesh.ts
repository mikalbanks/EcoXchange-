/**
 * Spec 18 § 2.6 — the Polymesh chain read surface.
 *
 * Reads are public. That is deliberate and not an oversight: this endpoint set
 * exposes data that is already on a public ledger, and the product claim is
 * that the verification-to-payment link is independently checkable by anyone.
 * Gating it behind auth would defeat the point. It follows the same posture as
 * the existing `/api/public/backtest/*` surface.
 *
 * The sync trigger is ADMIN-only — it costs requests against a free public
 * endpoint and writes to Supabase.
 *
 * Paths are flat `/api/polymesh/*` to match the repository's convention;
 * `/api/v1/spv/...` in distributions.ts is the deliberate exception, not the
 * rule.
 */
import type { Express, Request, Response } from "express";
import {
  getAssetByProject,
  getCurrentHolders,
  getDistributions,
  getRecentSyncRuns,
  isSupabaseConfigured,
  listAssets,
  loadPolymeshConfig,
  runPolymeshSync,
  PolymeshClient,
} from "../../ecoxchange-reconciliation-engine/src/polymesh/index.js";

type RequireRole = (...roles: string[]) => (req: any, res: any, next: any) => void;

/**
 * Chain reads are a supplementary surface — a server booted without Supabase
 * still serves the rest of the app, so an unconfigured store is 503 with an
 * explanation rather than a 500.
 */
function requirePersistence(res: Response): boolean {
  if (isSupabaseConfigured()) return true;
  res.status(503).json({
    message:
      "Polymesh chain data requires Supabase. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    configured: false,
  });
  return false;
}

/** Express 5 types route params as `string | string[]`; these are all single. */
function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function handleError(error: unknown, res: Response, context: string): void {
  const message = (error as Error)?.message ?? "unknown error";
  console.error(`[polymesh] ${context}: ${message}`);
  res.status(500).json({ message, context });
}

export function registerPolymeshRoutes(
  app: Express,
  requireRole: RequireRole,
): void {
  const admin = requireRole("ADMIN");

  /** All tracked assets with sync status. */
  app.get("/api/polymesh/assets", async (req: Request, res: Response) => {
    if (!requirePersistence(res)) return;
    try {
      const network =
        typeof req.query.network === "string" ? req.query.network : undefined;
      res.json({ network: network ?? null, assets: await listAssets(network) });
    } catch (error) {
      handleError(error, res, "listAssets");
    }
  });

  /** Asset detail for one project. */
  app.get(
    "/api/polymesh/assets/:projectId",
    async (req: Request, res: Response) => {
      if (!requirePersistence(res)) return;
      try {
        const asset = await getAssetByProject(param(req.params.projectId));
        if (!asset) {
          res.status(404).json({
            message: `No Polymesh asset mapped to project ${param(req.params.projectId)}`,
          });
          return;
        }
        res.json(asset);
      } catch (error) {
        handleError(error, res, "getAssetByProject");
      }
    },
  );

  /** Current holder snapshot. */
  app.get(
    "/api/polymesh/assets/:projectId/holders",
    async (req: Request, res: Response) => {
      if (!requirePersistence(res)) return;
      try {
        const asset = await getAssetByProject(param(req.params.projectId));
        if (!asset) {
          res.status(404).json({ message: "No Polymesh asset for this project" });
          return;
        }
        const { snapshotAt, holders } = await getCurrentHolders(asset.id);
        res.json({
          assetId: asset.asset_id,
          ticker: asset.ticker,
          snapshotAt,
          holderCount: holders.length,
          holders,
        });
      } catch (error) {
        handleError(error, res, "getCurrentHolders");
      }
    },
  );

  /** Distribution history with reconciliation status and the verification join. */
  app.get(
    "/api/polymesh/assets/:projectId/distributions",
    async (req: Request, res: Response) => {
      if (!requirePersistence(res)) return;
      try {
        const asset = await getAssetByProject(param(req.params.projectId));
        if (!asset) {
          res.status(404).json({ message: "No Polymesh asset for this project" });
          return;
        }
        const distributions = await getDistributions(asset.id);
        res.json({
          assetId: asset.asset_id,
          ticker: asset.ticker,
          distributions,
          summary: {
            total: distributions.length,
            matched: distributions.filter((d) => d.reconciliation_status === "matched")
              .length,
            unmatched: distributions.filter(
              (d) => d.reconciliation_status === "unmatched",
            ).length,
            discrepancy: distributions.filter(
              (d) => d.reconciliation_status === "discrepancy",
            ).length,
          },
        });
      } catch (error) {
        handleError(error, res, "getDistributions");
      }
    },
  );

  /** Manual sync trigger — for demos and for recovering a failed scheduled run. */
  app.post("/api/polymesh/sync", admin, async (req: Request, res: Response) => {
    if (!requirePersistence(res)) return;
    try {
      const assetId =
        typeof req.body?.assetId === "string" ? req.body.assetId : undefined;
      const summary = await runPolymeshSync({ triggerType: "manual", assetId });
      // A partial sync is a real outcome, not a server error — report it as 200
      // with the status in the body so the caller can decide.
      res.json(summary);
    } catch (error) {
      handleError(error, res, "runPolymeshSync");
    }
  });

  /** Recent sync run log. */
  app.get("/api/polymesh/sync/runs", async (_req: Request, res: Response) => {
    if (!requirePersistence(res)) return;
    try {
      res.json({ runs: await getRecentSyncRuns() });
    } catch (error) {
      handleError(error, res, "getRecentSyncRuns");
    }
  });

  /**
   * Liveness of the middleware itself. Separate from /api/health so a public
   * endpoint being down never degrades the app's own health signal.
   */
  app.get("/api/polymesh/health", async (_req: Request, res: Response) => {
    const config = loadPolymeshConfig();
    const reachable = await new PolymeshClient(config).healthCheck();
    res.json({
      network: config.network,
      endpoint: config.graphqlUrl,
      reachable,
      persistence: isSupabaseConfigured(),
    });
  });
}
