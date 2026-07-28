/**
 * Project economics: production realism and capital structure.
 *
 * This module exists because the marketplace used to answer the wrong question.
 * It divided cash flow *after* debt service by *total project capex*, which is a
 * levered numerator over an unlevered denominator — a hybrid no underwriter uses,
 * and one that structurally understated every listing by roughly 3x.
 *
 * An investor buying an SPV membership interest funds the equity, not the whole
 * asset. So we report two numbers side by side:
 *
 *   Unlevered cash yield  = CFADS / total capex          (asset-level return)
 *   Cash yield on equity  = distributable cash / equity  (what the investor earns)
 *
 * Both are cash-on-cash: no time value, no PPA escalator, no residual value, no
 * tax benefits beyond the ITC already monetized into the capital stack. Neither
 * is an IRR and neither should be presented as one.
 */

import type { CapitalStack } from "@shared/schema";

// ─── Production ──────────────────────────────────────────────────────────────

/**
 * Net capacity factors for US solar, by resource region and mounting type.
 *
 * Sourced to the range EIA reports for utility-scale PV (EIA-923 net generation
 * over nameplate) and NREL's ATB: single-axis tracking in the Southwest runs
 * 28-31%, fixed-tilt in the Southeast 17-19%, rooftop C&I 14-16%. These are
 * deliberately mid-range rather than P50-optimistic.
 *
 * The previous fallback — capacityKw x 4 sun-hours x 365 x 0.78 — implied a
 * 13.0% capacity factor at every site in the country, which no US utility-scale
 * plant is that bad. It was roughly half of reality.
 */
const CAPACITY_FACTORS = {
  SOUTHWEST_TRACKER: 0.29,
  SOUTHWEST_FIXED: 0.235,
  SOUTH_CENTRAL_TRACKER: 0.265,
  SOUTH_CENTRAL_FIXED: 0.215,
  SOUTHEAST_TRACKER: 0.225,
  SOUTHEAST_FIXED: 0.185,
  MIDWEST_TRACKER: 0.21,
  MIDWEST_FIXED: 0.175,
  NORTHEAST_FIXED: 0.155,
  ROOFTOP_CI: 0.15,
} as const;

/** States whose irradiance sits in the Southwest (high desert) regime. */
const SOUTHWEST_STATES = new Set([
  "ARIZONA", "AZ", "NEVADA", "NV", "NEW MEXICO", "NM", "UTAH", "UT", "CALIFORNIA", "CA",
]);

const SOUTH_CENTRAL_STATES = new Set([
  "TEXAS", "TX", "OKLAHOMA", "OK", "KANSAS", "KS", "COLORADO", "CO", "ARKANSAS", "AR",
  "LOUISIANA", "LA",
]);

const SOUTHEAST_STATES = new Set([
  "FLORIDA", "FL", "GEORGIA", "GA", "ALABAMA", "AL", "MISSISSIPPI", "MS",
  "SOUTH CAROLINA", "SC", "NORTH CAROLINA", "NC", "TENNESSEE", "TN", "VIRGINIA", "VA",
]);

const NORTHEAST_STATES = new Set([
  "MAINE", "ME", "NEW HAMPSHIRE", "NH", "VERMONT", "VT", "MASSACHUSETTS", "MA",
  "RHODE ISLAND", "RI", "CONNECTICUT", "CT", "NEW YORK", "NY", "NEW JERSEY", "NJ",
  "PENNSYLVANIA", "PA", "MARYLAND", "MD", "DELAWARE", "DE", "WASHINGTON", "WA",
  "OREGON", "OR",
]);

export type ResourceRegion =
  | "SOUTHWEST"
  | "SOUTH_CENTRAL"
  | "SOUTHEAST"
  | "MIDWEST"
  | "NORTHEAST";

export function resolveResourceRegion(state: string): ResourceRegion {
  const s = (state ?? "").trim().toUpperCase();
  if (SOUTHWEST_STATES.has(s)) return "SOUTHWEST";
  if (SOUTH_CENTRAL_STATES.has(s)) return "SOUTH_CENTRAL";
  if (SOUTHEAST_STATES.has(s)) return "SOUTHEAST";
  if (NORTHEAST_STATES.has(s)) return "NORTHEAST";
  return "MIDWEST";
}

export interface CapacityFactorInput {
  state: string;
  latitude?: number | string | null;
  /** Project technology code, e.g. SOLAR / SOLAR_STORAGE. */
  technology?: string | null;
  /** Mounting: SINGLE_AXIS_TRACKER | FIXED_TILT | ROOFTOP. Inferred when absent. */
  arrayType?: string | null;
  /** Rooftop / behind-the-meter arrays are capacity-limited by the host roof. */
  offtakerType?: string | null;
}

export interface CapacityFactorResolution {
  capacityFactor: number;
  region: ResourceRegion;
  arrayType: "SINGLE_AXIS_TRACKER" | "FIXED_TILT" | "ROOFTOP";
  basis: string;
}

function inferArrayType(input: CapacityFactorInput): CapacityFactorResolution["arrayType"] {
  const declared = (input.arrayType ?? "").trim().toUpperCase();
  if (declared.includes("ROOF")) return "ROOFTOP";
  if (declared.includes("TRACK") || declared.includes("SINGLE_AXIS")) return "SINGLE_AXIS_TRACKER";
  if (declared.includes("FIXED")) return "FIXED_TILT";
  // Rooftop C&I is behind-the-meter by definition and is never tracked.
  if ((input.offtakerType ?? "").toUpperCase() === "C_AND_I") return "ROOFTOP";
  // Ground-mount utility-scale in the US is predominantly single-axis today.
  return "SINGLE_AXIS_TRACKER";
}

/**
 * Net AC capacity factor for the site. Explicit and auditable rather than a
 * single national constant, because a Kern County tracker and a Massachusetts
 * rooftop differ by nearly 2x and the marketplace was pricing them identically.
 */
export function resolveCapacityFactor(input: CapacityFactorInput): CapacityFactorResolution {
  const region = resolveResourceRegion(input.state);
  const arrayType = inferArrayType(input);

  if (arrayType === "ROOFTOP") {
    return {
      capacityFactor: CAPACITY_FACTORS.ROOFTOP_CI,
      region,
      arrayType,
      basis: "rooftop_ci_net_cf",
    };
  }

  const tracker = arrayType === "SINGLE_AXIS_TRACKER";
  let cf: number;
  switch (region) {
    case "SOUTHWEST":
      cf = tracker ? CAPACITY_FACTORS.SOUTHWEST_TRACKER : CAPACITY_FACTORS.SOUTHWEST_FIXED;
      break;
    case "SOUTH_CENTRAL":
      cf = tracker ? CAPACITY_FACTORS.SOUTH_CENTRAL_TRACKER : CAPACITY_FACTORS.SOUTH_CENTRAL_FIXED;
      break;
    case "SOUTHEAST":
      cf = tracker ? CAPACITY_FACTORS.SOUTHEAST_TRACKER : CAPACITY_FACTORS.SOUTHEAST_FIXED;
      break;
    case "NORTHEAST":
      cf = CAPACITY_FACTORS.NORTHEAST_FIXED;
      break;
    default:
      cf = tracker ? CAPACITY_FACTORS.MIDWEST_TRACKER : CAPACITY_FACTORS.MIDWEST_FIXED;
  }

  return {
    capacityFactor: cf,
    region,
    arrayType,
    basis: `${region.toLowerCase()}_${tracker ? "tracker" : "fixed"}_net_cf`,
  };
}

/**
 * Annual net generation from nameplate and capacity factor.
 * Mirrors the formula the interconnection-queue seed already uses, so the
 * project path and the queue path can no longer drift apart.
 */
export function estimateAnnualKwh(capacityKw: number, capacityFactor: number): number {
  if (!Number.isFinite(capacityKw) || capacityKw <= 0) return 0;
  if (!Number.isFinite(capacityFactor) || capacityFactor <= 0) return 0;
  return Math.round(capacityKw * 8760 * capacityFactor);
}

// ─── Capital structure ───────────────────────────────────────────────────────

/** Senior debt terms used when a project carries no recorded debt structure. */
export const SENIOR_DEBT_TARGET_DSCR = 1.30;
export const SENIOR_DEBT_TENOR_YEARS = 18;
export const SENIOR_DEBT_RATE = 0.0625;
/** Advance rate ceiling — lenders will not size past this share of capex. */
export const SENIOR_DEBT_MAX_ADVANCE = 0.60;
/**
 * Sponsor equity floor. Debt plus monetized ITC cannot cover the whole stack:
 * without this, a 60% advance rate stacked on a 30% ITC leaves ~10% equity and
 * prints an absurd yield. Real DG and utility-scale structures leave the sponsor
 * with 25-35% of the capital.
 */
export const MIN_SPONSOR_EQUITY_SHARE = 0.25;

/** ITC transfer discount: buyers of transferable credits pay below face value. */
export const ITC_TRANSFER_PRICE = 0.92;
/** Default ITC rate when the capital stack carries no estimate. */
export const DEFAULT_ITC_RATE = 0.30;
/** The ITC cannot fund more of the stack than the credit is worth against basis. */
export const ITC_MAX_SHARE_OF_CAPEX = 0.30;

/**
 * The annual debt constant on the standard term sheet above — the share of
 * principal paid out each year across interest and amortization.
 *
 * This number governs whether leverage helps or hurts *cash* yield, and it is
 * the single most misunderstood figure in project finance marketing. Amortizing
 * debt at 6.25% over 18 years costs ~9.4c per dollar per year. An asset yielding
 * less than that unlevered will show a LOWER cash yield once levered — the
 * leverage still builds equity through principal paydown, but it does not put
 * more cash in the investor's pocket in year one.
 *
 * Consequence for this platform: a 9% cash yield comes from buying assets whose
 * unlevered yield is already near 9%, not from adding debt to a 6% asset.
 */
export const SENIOR_DEBT_ANNUAL_CONSTANT =
  (SENIOR_DEBT_RATE * Math.pow(1 + SENIOR_DEBT_RATE, SENIOR_DEBT_TENOR_YEARS)) /
  (Math.pow(1 + SENIOR_DEBT_RATE, SENIOR_DEBT_TENOR_YEARS) - 1);

/** Level annual payment on a fully amortizing loan. */
function annualDebtServiceFor(principal: number, rate: number, years: number): number {
  if (principal <= 0) return 0;
  if (rate <= 0) return principal / years;
  const factor = Math.pow(1 + rate, years);
  return (principal * rate * factor) / (factor - 1);
}

/** Principal supportable by a given annual debt service, inverted from the above. */
function principalFor(annualDebtService: number, rate: number, years: number): number {
  if (annualDebtService <= 0) return 0;
  if (rate <= 0) return annualDebtService * years;
  const factor = Math.pow(1 + rate, years);
  return (annualDebtService * (factor - 1)) / (rate * factor);
}

export interface CapitalStructureInput {
  capexUsd: number;
  /** Cash available for debt service: gross revenue less opex and reserves. */
  annualCfadsUsd: number;
  capitalStack?: CapitalStack | null;
  /** Recorded monthly debt service, when the project has a real loan on it. */
  knownMonthlyDebtServiceUsd?: number;
}

export interface CapitalStructure {
  seniorDebtUsd: number;
  annualDebtServiceUsd: number;
  dscr: number;
  itcTransferProceedsUsd: number;
  investorEquityUsd: number;
  /** How the structure was derived, surfaced as the confidence source string. */
  basis: string;
  debtConfidence: "KNOWN" | "ESTIMATED";
  equityConfidence: "KNOWN" | "ESTIMATED";
}

/**
 * Derive the slice of the project the investor actually funds.
 *
 *   capex = senior debt + monetized ITC + investor equity
 *
 * Three resolution paths, most-specific first:
 *
 *  1. **Fully specified stack** — the capital stack records both total capex and
 *     the equity raise. Nothing is inferred; debt is whatever the stack implies.
 *     An unlevered SPV is expressed this way, with equity equal to capex.
 *  2. **Recorded debt service** — the project carries a real loan, so the
 *     principal is backed out of the payment.
 *  3. **Nothing recorded** — size debt off CFADS at the target DSCR, capped by
 *     the advance rate and by the sponsor-equity floor.
 */
export function deriveCapitalStructure(input: CapitalStructureInput): CapitalStructure {
  const capex = Number.isFinite(input.capexUsd) && input.capexUsd > 0 ? input.capexUsd : 0;
  const cfads = Number.isFinite(input.annualCfadsUsd) ? Math.max(0, input.annualCfadsUsd) : 0;

  // ITC first — it reduces the capital that debt and equity have to cover.
  // An acquisition of an operating asset records no credit, because the original
  // owner claimed it at COD; that correctly yields zero proceeds here.
  const stack = input.capitalStack;
  const hasStack = stack != null && Number(stack.totalCapex ?? 0) > 0;
  const stackItc = Number(stack?.taxCreditEstimated ?? 0);
  const itcFace = hasStack ? stackItc : capex * DEFAULT_ITC_RATE;
  const transferable = stack?.taxCreditTransferabilityReady !== false;
  const itcTransferProceedsUsd = transferable
    ? Math.min(itcFace * ITC_TRANSFER_PRICE, capex * ITC_MAX_SHARE_OF_CAPEX)
    : 0;

  const knownAnnualDebt = Number(input.knownMonthlyDebtServiceUsd ?? 0) * 12;
  const stackEquity = Number(stack?.equityNeeded ?? 0);

  let annualDebtServiceUsd: number;
  let seniorDebtUsd: number;
  let investorEquityUsd: number;
  let debtConfidence: CapitalStructure["debtConfidence"];
  let equityConfidence: CapitalStructure["equityConfidence"];
  let basis: string;

  if (hasStack && stackEquity > 0) {
    // Path 1 — the stack is fully specified. Equity is a recorded fact and debt
    // is the residual after the ITC. Equity == capex means an unlevered SPV.
    investorEquityUsd = stackEquity;
    seniorDebtUsd = Math.max(0, capex - stackEquity - itcTransferProceedsUsd);
    annualDebtServiceUsd = annualDebtServiceFor(
      seniorDebtUsd,
      SENIOR_DEBT_RATE,
      SENIOR_DEBT_TENOR_YEARS,
    );
    debtConfidence = seniorDebtUsd > 0 ? "ESTIMATED" : "KNOWN";
    equityConfidence = "KNOWN";
    basis = "capitalStacks.equityNeeded_residual_debt";
  } else if (knownAnnualDebt > 0) {
    // Path 2 — a real loan is on the books.
    annualDebtServiceUsd = knownAnnualDebt;
    seniorDebtUsd = principalFor(annualDebtServiceUsd, SENIOR_DEBT_RATE, SENIOR_DEBT_TENOR_YEARS);
    investorEquityUsd = Math.max(
      capex - seniorDebtUsd - itcTransferProceedsUsd,
      capex * MIN_SPONSOR_EQUITY_SHARE,
    );
    debtConfidence = "KNOWN";
    equityConfidence = "ESTIMATED";
    basis = "recorded_debt_service_implied_principal";
  } else {
    // Path 3 — size to cash flow, then respect the advance cap and equity floor.
    const supportable = cfads / SENIOR_DEBT_TARGET_DSCR;
    const sizedPrincipal = principalFor(supportable, SENIOR_DEBT_RATE, SENIOR_DEBT_TENOR_YEARS);
    seniorDebtUsd = Math.min(sizedPrincipal, capex * SENIOR_DEBT_MAX_ADVANCE);

    const residualEquity = capex - seniorDebtUsd - itcTransferProceedsUsd;
    const equityFloor = capex * MIN_SPONSOR_EQUITY_SHARE;
    if (residualEquity < equityFloor) {
      // Give the floor back out of the debt, not out of the ITC.
      investorEquityUsd = equityFloor;
      seniorDebtUsd = Math.max(0, capex - equityFloor - itcTransferProceedsUsd);
    } else {
      investorEquityUsd = residualEquity;
    }

    annualDebtServiceUsd = annualDebtServiceFor(
      seniorDebtUsd,
      SENIOR_DEBT_RATE,
      SENIOR_DEBT_TENOR_YEARS,
    );
    debtConfidence = "ESTIMATED";
    equityConfidence = "ESTIMATED";
    basis = `dscr_${SENIOR_DEBT_TARGET_DSCR}x_${SENIOR_DEBT_TENOR_YEARS}yr_${(SENIOR_DEBT_RATE * 100).toFixed(2)}pct`;
  }

  const dscr = annualDebtServiceUsd > 0 ? cfads / annualDebtServiceUsd : Infinity;

  return {
    seniorDebtUsd,
    annualDebtServiceUsd,
    dscr,
    itcTransferProceedsUsd,
    investorEquityUsd,
    basis,
    debtConfidence,
    equityConfidence,
  };
}

// ─── Yields ──────────────────────────────────────────────────────────────────

export interface CashYieldInput {
  /** Cash distributed to investors after debt, opex, reserves and platform fee. */
  annualInvestorCashUsd: number;
  /** Cash available for debt service — the unlevered numerator. */
  annualCfadsUsd: number;
  capexUsd: number;
  investorEquityUsd: number;
}

export interface CashYields {
  /** CFADS over total capex — the asset-level, capital-structure-neutral return. */
  unleveredCashYieldPct: number;
  /** Distributable cash over investor equity — what a subscriber actually earns. */
  cashYieldOnEquityPct: number;
}

export function computeCashYields(input: CashYieldInput): CashYields {
  const unlevered =
    input.capexUsd > 0 ? (input.annualCfadsUsd / input.capexUsd) * 100 : 0;
  const onEquity =
    input.investorEquityUsd > 0
      ? (input.annualInvestorCashUsd / input.investorEquityUsd) * 100
      : 0;
  return {
    unleveredCashYieldPct: Number.isFinite(unlevered) ? unlevered : 0,
    cashYieldOnEquityPct: Number.isFinite(onEquity) ? onEquity : 0,
  };
}

/** The yield an offering must clear to be worth a sophisticated investor's time. */
export const CASH_YIELD_HURDLE_PCT = 9.0;
