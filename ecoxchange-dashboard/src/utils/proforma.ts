// Project-level pro-forma for the Savannah Community Solar 5MW demo — the
// same project the distribution simulation pays out on. Pure functions, no
// backend. All outputs are MODELED ESTIMATES: the UI must wrap them in
// YieldDisclosure / ProjectionDisclosure (Spec 07).
//
// Anchored to the canonical demo dataset (data/demo-offering.ts) so every
// surface agrees:
//   - Annual production 8,102,755 kWh (demo-savannah.json, 2024 verified)
//   - Distributable pool $14,583.33/month -> $175,000/yr, which is the 7.0%
//     target cash yield on the $2,500,000 raise
//   - $10,000 investment = 100 ESN = 0.4% ownership -> $58.33/month

import { DEMO_OFFERING } from "../data/demo-offering.js";

export interface ProFormaInputs {
  investmentUsd: number; // $10,000 – $250,000
  holdingPeriodYears: number; // 5 – 25
  includeItc: boolean; // 30% ITC pass-through
}

export interface ProFormaYearPoint {
  year: number;
  cumulativeWithItc: number; // cumulative cash received incl. ITC benefit
  cumulativeWithoutItc: number;
  sp500Reference: number; // 10% historical average gain on same basis
}

export interface ProFormaOutputs {
  monthlyDistribution: number; // year-1, e.g. 58.33 at $10,000
  annualCashYieldPct: number; // e.g. 7.0
  netIrrPct: number; // over the holding period (with ITC if enabled)
  tokenCount: number; // ESN at $100/token (canonical demo pricing)
  ownershipPct: number; // e.g. 0.4 at $10,000
  series: ProFormaYearPoint[];
}

// ── Fixed Savannah 5MW demo economics ────────────────────────────────────
export const PROJECT_ANNUAL_KWH = 8_102_755; // 2024 verified production
export const PPA_RATE_USD_PER_KWH = 0.085;
export const ANNUAL_ESCALATOR = 0.02;
export const PROJECT_RAISE_USD = DEMO_OFFERING.total_raise_usd; // $2,500,000
export const TOKEN_PRICE_USD = DEMO_OFFERING.token_price_usd; // $100
export const ITC_RATE = 0.3;
export const SP500_REFERENCE_RATE = 0.1; // historical avg — imperfect comparison

// Year-1 distributable cash: the canonical $14,583.33/month pool, i.e. the 7.0%
// target cash yield on the raise. Roughly 25% of PPA revenue — the remainder
// models O&M, insurance, asset management, and debt service ahead of the token
// holders in the waterfall.
export const ANNUAL_DISTRIBUTABLE_USD_Y1 =
  DEMO_OFFERING.offering_distributions.annual_total_usd;

/** Investor cash received in a given pro-forma year (1-indexed). */
function investorCashForYear(ownership: number, year: number): number {
  return ownership * ANNUAL_DISTRIBUTABLE_USD_Y1 * Math.pow(1 + ANNUAL_ESCALATOR, year - 1);
}

/**
 * Annual-flow IRR via Newton-Raphson with a bisection fallback. Flows:
 * -investment at t=0, escalating distributions each year (plus the ITC
 * benefit at end of year 1 when enabled), plus return of principal at par
 * in the final year.
 */
export function computeAnnualIrr(flows: number[]): number {
  const npv = (rate: number) =>
    flows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);

  let rate = 0.08;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    if (Math.abs(f) < 0.01) return rate;
    const h = 1e-6;
    const derivative = (npv(rate + h) - f) / h;
    if (!Number.isFinite(derivative) || derivative === 0) break;
    const next = rate - f / derivative;
    if (!Number.isFinite(next) || next <= -0.99 || next > 5) break;
    rate = next;
  }

  // Bisection fallback over a sane bracket.
  let lo = -0.9;
  let hi = 5;
  if (npv(lo) * npv(hi) > 0) return rate;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function computeProForma(inputs: ProFormaInputs): ProFormaOutputs {
  const { investmentUsd, holdingPeriodYears, includeItc } = inputs;
  const ownership = investmentUsd / PROJECT_RAISE_USD;
  const itcBenefit = ITC_RATE * investmentUsd;

  const series: ProFormaYearPoint[] = [];
  let cumulative = 0;
  const flows: number[] = [-investmentUsd];

  for (let year = 1; year <= holdingPeriodYears; year++) {
    const cash = investorCashForYear(ownership, year);
    cumulative += cash;

    let flow = cash;
    if (includeItc && year === 1) flow += itcBenefit;
    if (year === holdingPeriodYears) flow += investmentUsd; // par redemption
    flows.push(flow);

    series.push({
      year,
      cumulativeWithItc: Math.round(cumulative + itcBenefit),
      cumulativeWithoutItc: Math.round(cumulative),
      sp500Reference: Math.round(
        investmentUsd * (Math.pow(1 + SP500_REFERENCE_RATE, year) - 1),
      ),
    });
  }

  const yearOneCash = investorCashForYear(ownership, 1);

  return {
    monthlyDistribution: Math.round((yearOneCash / 12) * 100) / 100,
    annualCashYieldPct: Math.round((yearOneCash / investmentUsd) * 1000) / 10,
    netIrrPct: Math.round(computeAnnualIrr(flows) * 1000) / 10,
    tokenCount: Math.round(investmentUsd / TOKEN_PRICE_USD),
    ownershipPct: Math.round(ownership * 1000) / 10,
    series,
  };
}
