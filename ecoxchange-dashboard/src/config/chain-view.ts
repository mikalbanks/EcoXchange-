/**
 * Spec 18 § 2.8 — release gate for the on-chain view.
 *
 * `ecoxchange-demo/scripts/build-from-dashboard.mjs` builds the public demo site
 * *from* this app, so merging the chain view is equivalent to publishing it.
 * That must not happen before the Polymesh queries have been validated against a
 * live endpoint: EcoXchange has zero issued assets today, so every query in
 * `src/polymesh/queries.ts` ships having never seen a real response.
 *
 * There is already an INV→EXP 0.0% bug on the demo contradicting the core
 * verification claim. A second unvalidated verification surface next to it is how
 * a reviewer clicks through and concludes the whole story is decorative.
 *
 * So the flag defaults OFF and, when off, the route is not registered at all —
 * there is no reachable surface to stumble onto, not merely a hidden link.
 *
 * Turn it on only after:
 *   1. `scripts/introspect-polymesh.sh` diffs clean against the committed schema,
 *   2. a reference asset's real responses are captured as fixtures
 *      (`docs/polymesh-reference-asset.md`), and
 *   3. `POST /api/polymesh/sync` has run end-to-end against testnet.
 */
export const CHAIN_VIEW_ENABLED =
  import.meta.env.VITE_CHAIN_VIEW_ENABLED === "true";
