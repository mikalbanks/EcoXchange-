/**
 * Spec 19 G3 — public-surface gate for simulated data.
 *
 * Mirrors the pattern in `src/config/chain-view.ts`: a build-time flag, OFF by
 * default, that must be set explicitly for simulated verification data to reach
 * a public surface at all.
 *
 * `ecoxchange-demo/scripts/build-from-dashboard.mjs` builds demo.ecoxchange.net
 * *from* this app, so shipping simulated data here is equivalent to publishing
 * it. The public demo genuinely does run on simulated telemetry, so the demo
 * build sets this to `true` in `.env.demo-site`. That is the point: publishing
 * simulated numbers becomes a deliberate, reviewable act rather than something
 * that happens by default because a fixture was lying around.
 *
 * The failure this prevents is precisely what happened before Spec 19 — twelve
 * verification records with a 0.0% INV→EXP deviation, seeded from a
 * `monthly_deviation_pct: 0` backtest, served for two months as though they
 * were verification. See docs/spec-19-diagnostic.md.
 *
 * Two rules follow from this flag, and both are enforced in the components:
 *   1. When it is off, simulated records do not render.
 *   2. When it is on, simulated records ALWAYS render with their provenance tag
 *      adjacent to the number. There is no untagged path.
 */
import type { DataProvenance } from "../utils/types.js";

export const SIMULATED_DATA_ENABLED =
  import.meta.env.VITE_ALLOW_SIMULATED_DATA === "true";

/** Short form, rendered beside a number. */
export const PROVENANCE_LABEL: Record<DataProvenance, string> = {
  simulated: "SIMULATED — illustrative",
  live_telemetry: "VERIFIED — live telemetry",
};

/** Long form, for report headers and page-level banners. */
export const PROVENANCE_LABEL_LONG: Record<DataProvenance, string> = {
  simulated: "BACKTEST — real irradiance, simulated telemetry",
  live_telemetry: "VERIFIED — live telemetry",
};

/**
 * The honest, and stronger, version of the disclaimer. The irradiance really is
 * real measured data for these coordinates; only the inverter and utility legs
 * are modelled. Saying so beats hedging, and it is true.
 */
export const PROVENANCE_DETAIL: Record<DataProvenance, string> = {
  simulated:
    "Expected generation is modelled from real NASA POWER satellite irradiance " +
    "for this site's actual coordinates. The inverter and utility meter readings " +
    "are simulated — this is a backtest, not live verification.",
  live_telemetry:
    "Inverter, utility meter and satellite irradiance all read from live data sources.",
};

/**
 * Whether a record may be rendered on this build.
 *
 * Records with no provenance are never renderable: a record that cannot say
 * where it came from does not get shown (the client-side counterpart of the G2
 * check in server/services/backtest-supabase-writer.ts).
 */
export function canRenderProvenance(
  provenance: DataProvenance | null | undefined,
): boolean {
  if (provenance == null) return false;
  if (provenance === "simulated") return SIMULATED_DATA_ENABLED;
  return true;
}
