/**
 * Spec 18 Layer A — Polymesh public chain reads.
 *
 * Nothing here talks to the Polymath Capital Platform. This module reads the
 * public ledger EcoXchange does not need permission to read, which is what lets
 * the platform verify a payment happened rather than take Polymath's word for
 * it. The Capital Platform side is Layer C, in `server/services/pcp/`.
 */

export { PolymeshClient, PolymeshQueryError } from "./client.js";
export {
  loadPolymeshConfig,
  isPersistenceConfigured,
  type PolymeshConfig,
  type PolymeshNetwork,
} from "./config.js";
export { isSupabaseConfigured } from "./db.js";
export {
  CHAIN_DECIMALS,
  descaleToNumber,
  descaleToString,
  msToIso,
  rawString,
  type PolymeshAsset,
  type PolymeshDistribution,
  type PolymeshHolder,
  type PolymeshSyncRun,
  type ReconciliationStatus,
} from "./models.js";
export {
  decideReconciliation,
  reconcileAsset,
  type ReconcileResult,
  type SubmissionLink,
} from "./reconcile.js";
export {
  getAssetByProject,
  getCurrentHolders,
  getDistributions,
  listAssets,
  type DistributionWithVerification,
} from "./repository.js";
export {
  getRecentSyncRuns,
  runPolymeshSync,
  type SyncOptions,
  type SyncSummary,
} from "./sync.js";
