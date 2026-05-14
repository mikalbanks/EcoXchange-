/**
 * Institutional market reference rates (LevelTen P25 proxy + CAISO hub placeholders).
 * Override via env for live desk pricing without code changes.
 */
import type { Ppa, Project } from "@shared/schema";

/** LevelTen Q1 2026 P25 solar PPA index benchmark (USD/MWh) — product UI tooltip reference */
export const LEVELTEN_P25_Q1_2026_USD_PER_MWH = 64.49;

/** CAISO all-in proxy when hub env not set (USD/kWh) — aligns to ~$64.49/MWh */
export const CAISO_Q1_2026_PROXY_USD_PER_KWH = LEVELTEN_P25_Q1_2026_USD_PER_MWH / 1000;

export type CaisoHub = "NP15" | "SP15";

function numEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Default hub prices ($/MWh) — NP15 vs SP15 can diverge; defaults track the same benchmark until overridden */
export function getCaisoHubPriceUsdPerMwh(hub: CaisoHub): number {
  if (hub === "NP15") {
    return numEnv("CAISO_NP15_USD_PER_MWH", LEVELTEN_P25_Q1_2026_USD_PER_MWH);
  }
  return numEnv("CAISO_SP15_USD_PER_MWH", LEVELTEN_P25_Q1_2026_USD_PER_MWH);
}

/**
 * Rough CAISO congestion zone from coordinates (Northern vs Southern).
 * NP-15: northern; SP-15: southern — simplified split ~35°N.
 */
export function resolveCaisoHubFromCoords(latitude: number, longitude: number): CaisoHub {
  void longitude;
  return latitude >= 35 ? "NP15" : "SP15";
}

export type MarketPpaResolution = {
  /** Effective energy price in $/kWh */
  usdPerKwh: number;
  /** Human-readable source label */
  source: "FIXED_PPA" | "CAISO_NP15_SPOT_PROXY" | "CAISO_SP15_SPOT_PROXY" | "LEVELTEN_P25_PROXY";
  hub?: CaisoHub;
  benchmarkUsdPerMwh: number;
};

function isCalifornia(state: string): boolean {
  const s = state.trim().toUpperCase();
  return s === "CA" || s === "CALIFORNIA";
}

/**
 * Fixed `ppa_rate` on the project is $/kWh when set (>0). Otherwise:
 * - California: NP15 or SP15 hub proxy from env (defaults to LevelTen benchmark $/MWh).
 * - Other states: LevelTen P25 proxy ($/kWh).
 */
export function resolveMarketPpaUsdPerKwh(params: {
  state: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  fixedPpaRatePerKwh?: string | number | null;
}): MarketPpaResolution {
  const fixed = Number(params.fixedPpaRatePerKwh);
  if (Number.isFinite(fixed) && fixed > 0) {
    return {
      usdPerKwh: fixed,
      source: "FIXED_PPA",
      benchmarkUsdPerMwh: LEVELTEN_P25_Q1_2026_USD_PER_MWH,
    };
  }

  const bench = LEVELTEN_P25_Q1_2026_USD_PER_MWH;

  if (isCalifornia(params.state)) {
    const lat = Number(params.latitude);
    const lon = Number(params.longitude);
    const hub =
      Number.isFinite(lat) && Number.isFinite(lon)
        ? resolveCaisoHubFromCoords(lat, lon)
        : "NP15";
    const usdPerMwh = getCaisoHubPriceUsdPerMwh(hub);
    return {
      usdPerKwh: usdPerMwh / 1000,
      source: hub === "NP15" ? "CAISO_NP15_SPOT_PROXY" : "CAISO_SP15_SPOT_PROXY",
      hub,
      benchmarkUsdPerMwh: bench,
    };
  }

  return {
    usdPerKwh: bench / 1000,
    source: "LEVELTEN_P25_PROXY",
    benchmarkUsdPerMwh: bench,
  };
}

// ─── Strict price resolution for the verification engine ────────────────────

export type OfftakerClass =
  | "UTILITY"
  | "C_AND_I"
  | "COMMUNITY_SOLAR"
  | "WHOLESALE_EXPORT"
  | "BEHIND_THE_METER";

export type PlantUse = "BEHIND_THE_METER_OFFSET" | "WHOLESALE_EXPORT" | "HYBRID";

export type PpaSourceCode =
  | "FIXED_PPA"
  | "CAISO_NP15_SPOT_PROXY"
  | "CAISO_SP15_SPOT_PROXY"
  | "JURISDICTION_BENCHMARK"
  | "LEVELTEN_P25_PROXY"
  | "NATIONAL_AVG";

export interface PpaResolution {
  usdPerKwh: number;
  source: PpaSourceCode;
  hub?: CaisoHub;
  benchmarkUsdPerMwh: number;
  evidence: {
    method:
      | "PPA_LOOKUP"
      | "CAISO_HUB"
      | "JURISDICTION_BENCHMARK"
      | "NATIONAL_AVG";
    ppaId?: string;
    benchmarkId?: number;
    offtakerClass: OfftakerClass;
    plantUse: PlantUse;
    appliedMultiplier: number;
    asOf: string;
  };
}

const RETAIL_RATE_MULTIPLIER_DEFAULT = 2.2;
const C_AND_I_PREMIUM_DEFAULT = 1.15;
const HYBRID_BTM_WEIGHT_DEFAULT = 0.6;

function offtakerMultiplier(offtaker: OfftakerClass, plantUse: PlantUse): number {
  if (offtaker === "BEHIND_THE_METER" && plantUse === "BEHIND_THE_METER_OFFSET") {
    return numEnv("RETAIL_RATE_MULTIPLIER", RETAIL_RATE_MULTIPLIER_DEFAULT);
  }
  if (offtaker === "WHOLESALE_EXPORT" || plantUse === "WHOLESALE_EXPORT") return 1.0;
  if (offtaker === "C_AND_I" || offtaker === "COMMUNITY_SOLAR") {
    return numEnv("C_AND_I_PREMIUM_MULTIPLIER", C_AND_I_PREMIUM_DEFAULT);
  }
  if (plantUse === "HYBRID") {
    const w = numEnv("HYBRID_BTM_WEIGHT", HYBRID_BTM_WEIGHT_DEFAULT);
    const retail = numEnv("RETAIL_RATE_MULTIPLIER", RETAIL_RATE_MULTIPLIER_DEFAULT);
    return w * retail + (1 - w) * 1.0;
  }
  return 1.0;
}

const OFFTAKER_TYPE_TO_CLASS: Record<string, OfftakerClass> = {
  UTILITY: "UTILITY",
  C_AND_I: "C_AND_I",
  COMMUNITY_SOLAR: "COMMUNITY_SOLAR",
  MERCHANT: "WHOLESALE_EXPORT",
};

export function inferOfftakerClassFromProject(project: Project): OfftakerClass {
  return OFFTAKER_TYPE_TO_CLASS[project.offtakerType] ?? "C_AND_I";
}

export function inferPlantUseFromProject(project: Project): PlantUse {
  if (project.offtakerType === "MERCHANT") return "WHOLESALE_EXPORT";
  if (project.offtakerType === "UTILITY") return "WHOLESALE_EXPORT";
  if (project.offtakerType === "C_AND_I") return "BEHIND_THE_METER_OFFSET";
  return "HYBRID";
}

function applyEscalation(ppa: Ppa, intervalStart: Date): number {
  const base = Number(ppa.pricePerMwh);
  if (ppa.escalationType !== "ESCALATING") return base;
  const rate = Number(ppa.escalationRate ?? 0) / 100;
  if (!Number.isFinite(rate) || rate === 0) return base;
  const start = new Date(ppa.contractStartDate).getTime();
  const yrs = Math.max(0, (intervalStart.getTime() - start) / (365.25 * 24 * 3600 * 1000));
  return base * Math.pow(1 + rate, yrs);
}

function findActivePpa(ppas: Ppa[], intervalStart: Date): Ppa | undefined {
  return ppas.find((p) => {
    const start = new Date(p.contractStartDate).getTime();
    const end = new Date(p.contractEndDate).getTime();
    const t = intervalStart.getTime();
    return t >= start && t < end;
  });
}

export interface JurisdictionBenchmarkLike {
  id: number;
  state: string | null;
  isoCode: string | null;
  benchmarkUsdPerMwh: string | number;
  effectiveFrom?: Date | string | null;
}

function findJurisdictionBenchmark(
  benchmarks: JurisdictionBenchmarkLike[],
  state: string,
  intervalStart: Date,
): JurisdictionBenchmarkLike | undefined {
  const stateUp = state.trim().toUpperCase();
  const candidates = benchmarks.filter((b) => {
    const bs = (b.state ?? "").trim().toUpperCase();
    if (bs !== stateUp) return false;
    if (!b.effectiveFrom) return true;
    return new Date(b.effectiveFrom).getTime() <= intervalStart.getTime();
  });
  if (candidates.length === 0) return undefined;
  return candidates.sort((a, b) => {
    const at = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
    const bt = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
    return bt - at;
  })[0];
}

export interface ResolvePpaForIntervalParams {
  project: Project;
  intervalStart: Date;
  ppas: Ppa[];
  jurisdictionBenchmarks: JurisdictionBenchmarkLike[];
  offtakerClass?: OfftakerClass;
  plantUse?: PlantUse;
}

/**
 * Strict per-interval price resolution used by the verification engine.
 * Resolution waterfall: active PPA → CAISO hub (CA) → jurisdiction benchmark → national avg.
 * Off-taker / plant-use multiplier applied last (skipped if source is FIXED_PPA).
 */
export function resolvePpaForInterval(params: ResolvePpaForIntervalParams): PpaResolution {
  const offtakerClass = params.offtakerClass ?? inferOfftakerClassFromProject(params.project);
  const plantUse = params.plantUse ?? inferPlantUseFromProject(params.project);
  const bench = LEVELTEN_P25_Q1_2026_USD_PER_MWH;

  const activePpa = findActivePpa(params.ppas, params.intervalStart);
  if (activePpa) {
    const usdPerMwh = applyEscalation(activePpa, params.intervalStart);
    return {
      usdPerKwh: usdPerMwh / 1000,
      source: "FIXED_PPA",
      benchmarkUsdPerMwh: bench,
      evidence: {
        method: "PPA_LOOKUP",
        ppaId: activePpa.id,
        offtakerClass,
        plantUse,
        appliedMultiplier: 1.0,
        asOf: params.intervalStart.toISOString(),
      },
    };
  }

  if (isCalifornia(params.project.state)) {
    const lat = Number(params.project.latitude);
    const lon = Number(params.project.longitude);
    const hub =
      Number.isFinite(lat) && Number.isFinite(lon)
        ? resolveCaisoHubFromCoords(lat, lon)
        : "NP15";
    const usdPerMwh = getCaisoHubPriceUsdPerMwh(hub);
    const multiplier = offtakerMultiplier(offtakerClass, plantUse);
    return {
      usdPerKwh: (usdPerMwh / 1000) * multiplier,
      source: hub === "NP15" ? "CAISO_NP15_SPOT_PROXY" : "CAISO_SP15_SPOT_PROXY",
      hub,
      benchmarkUsdPerMwh: bench,
      evidence: {
        method: "CAISO_HUB",
        offtakerClass,
        plantUse,
        appliedMultiplier: multiplier,
        asOf: params.intervalStart.toISOString(),
      },
    };
  }

  const jbench = findJurisdictionBenchmark(
    params.jurisdictionBenchmarks,
    params.project.state,
    params.intervalStart,
  );
  if (jbench) {
    const usdPerMwh = Number(jbench.benchmarkUsdPerMwh);
    const multiplier = offtakerMultiplier(offtakerClass, plantUse);
    return {
      usdPerKwh: (usdPerMwh / 1000) * multiplier,
      source: "JURISDICTION_BENCHMARK",
      benchmarkUsdPerMwh: usdPerMwh,
      evidence: {
        method: "JURISDICTION_BENCHMARK",
        benchmarkId: jbench.id,
        offtakerClass,
        plantUse,
        appliedMultiplier: multiplier,
        asOf: params.intervalStart.toISOString(),
      },
    };
  }

  const multiplier = offtakerMultiplier(offtakerClass, plantUse);
  return {
    usdPerKwh: (bench / 1000) * multiplier,
    source: "NATIONAL_AVG",
    benchmarkUsdPerMwh: bench,
    evidence: {
      method: "NATIONAL_AVG",
      offtakerClass,
      plantUse,
      appliedMultiplier: multiplier,
      asOf: params.intervalStart.toISOString(),
    },
  };
}
