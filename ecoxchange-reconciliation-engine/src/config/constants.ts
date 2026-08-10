/**
 * Engine version stamped onto every verification record.
 *
 * Spec 19: bumped 0.1.0 → 2.0.0 so this constant, the demo seed SQL and the
 * pvlib ModelChain the physics actually runs on all agree. It also makes
 * `engine_version` a usable gate on the records themselves:
 *
 *   0.1.0 — the hand-inserted zero-deviation fixture (INV identical to EXP).
 *           Void. See docs/spec-19-diagnostic.md.
 *   2.0.0 — produced by a real run through the reconciliation path.
 */
export const ENGINE_VERSION = "2.0.0";

export const ALBEDO = 0.2;
export const SOLAR_CONSTANT_W_M2 = 1367;
export const STC_IRRADIANCE_KW_M2 = 1.0;

export const NASA_POWER_BASE_URL =
  process.env.NASA_POWER_BASE_URL ??
  "https://power.larc.nasa.gov/api/temporal/daily/point";

export const TRANSPOSITION_MODEL = "hay_davies" as const;
