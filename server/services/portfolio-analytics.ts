/**
 * Portfolio-level analytics.
 *
 * A single listing tells an investor what one asset yields. It does not tell
 * them what they are actually exposed to: one state's regulator, one offtaker
 * class, one irradiance regime, one contract expiry. This module blends the
 * listing economics into portfolio figures and — more usefully — names the
 * concentrations that a yield-ranked list of cards hides.
 *
 * All maths is capital-weighted, not equal-weighted: a 40% position in a 9%
 * asset and a 60% position in a 10% asset blends to 9.6%, not 9.5%.
 */

import { listMarketplaceListings, type MarketplaceListing } from "./marketplace-listings";
import { CASH_YIELD_HURDLE_PCT, resolveResourceRegion } from "../lib/project-economics";
import type { PortfolioAllocation } from "@shared/schema";

export interface PortfolioAnalysisInput {
  allocations: PortfolioAllocation[];
  /** Total capital the investor is deploying, used for dollar projections. */
  targetCheckSizeUsd: number;
}

export interface ConcentrationBucket {
  key: string;
  label: string;
  weightPct: number;
}

export interface ConcentrationDimension {
  dimension: string;
  label: string;
  buckets: ConcentrationBucket[];
  /** Herfindahl-Hirschman index over the weights, 0-10000. */
  hhi: number;
  /** Share held by the single largest bucket. */
  topWeightPct: number;
}

export interface PortfolioWarning {
  severity: "INFO" | "WARN";
  code: string;
  message: string;
}

export interface PortfolioPosition {
  listingId: string;
  name: string;
  source: "PROJECT" | "QUEUE";
  state: string;
  stage: string | null;
  offtakerLabel: string;
  capacityMW: number;
  weightPct: number;
  allocatedUsd: number;
  cashYieldOnEquityPct: number;
  unleveredCashYieldPct: number;
  projectedAnnualCashUsd: number;
  dscrX: number;
  isOperating: boolean;
  contractTermRemainingYears: number | null;
  clearsHurdle: boolean;
}

export interface PortfolioAnalysis {
  positions: PortfolioPosition[];
  totalWeightPct: number;
  targetCheckSizeUsd: number;
  blendedCashYieldOnEquityPct: number;
  blendedUnleveredCashYieldPct: number;
  projectedAnnualCashUsd: number;
  projectedQuarterlyCashUsd: number;
  weightedDscrX: number | null;
  weightedContractTermYears: number | null;
  operatingWeightPct: number;
  hurdleClearingWeightPct: number;
  /** 0-100. Higher means capital is spread across more independent risks. */
  diversificationScore: number;
  concentrations: ConcentrationDimension[];
  warnings: PortfolioWarning[];
  hurdlePct: number;
}

const OFFTAKER_LABELS: Record<string, string> = {
  UTILITY: "Utility PPA",
  C_AND_I: "Commercial & industrial",
  COMMUNITY_SOLAR: "Community solar",
  MERCHANT: "Merchant",
};

/**
 * Offtaker class is not carried on the listing, so it is inferred from the
 * contract price band. Behind-the-meter and community solar price well above
 * the wholesale index; utility PPAs sit at or below it.
 */
function offtakerLabelFor(listing: MarketplaceListing): string {
  const usdPerKwh = listing.ppaPriceUsdPerKwh.value;
  if (usdPerKwh >= 0.11) return OFFTAKER_LABELS.C_AND_I;
  if (usdPerKwh >= 0.075) return OFFTAKER_LABELS.COMMUNITY_SOLAR;
  if (listing.source === "QUEUE") return OFFTAKER_LABELS.MERCHANT;
  return OFFTAKER_LABELS.UTILITY;
}

function hhiOf(weights: number[]): number {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return 0;
  return weights.reduce((s, w) => {
    const share = (w / total) * 100;
    return s + share * share;
  }, 0);
}

function buildDimension(
  dimension: string,
  label: string,
  entries: Array<{ key: string; label: string; weight: number }>,
): ConcentrationDimension {
  const byKey = new Map<string, ConcentrationBucket>();
  for (const e of entries) {
    const existing = byKey.get(e.key);
    if (existing) existing.weightPct += e.weight;
    else byKey.set(e.key, { key: e.key, label: e.label, weightPct: e.weight });
  }
  const buckets = Array.from(byKey.values()).sort((a, b) => b.weightPct - a.weightPct);
  const weights = buckets.map((b) => b.weightPct);
  return {
    dimension,
    label,
    buckets,
    hhi: Math.round(hhiOf(weights)),
    topWeightPct: buckets[0]?.weightPct ?? 0,
  };
}

/**
 * Diversification score, 0-100.
 *
 * Averages the HHI across the risk dimensions that actually drive correlated
 * loss in a solar portfolio — geography, resource regime, offtaker class and
 * single-asset concentration — and inverts it. A single-asset portfolio scores
 * 0; capital spread evenly across many independent buckets approaches 100.
 */
function diversificationScoreOf(dims: ConcentrationDimension[]): number {
  if (dims.length === 0) return 0;
  const meanHhi = dims.reduce((s, d) => s + d.hhi, 0) / dims.length;
  // HHI runs 10000 (all in one bucket) down toward 0 (infinitely divided).
  const score = (1 - meanHhi / 10000) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export async function analyzePortfolio(input: PortfolioAnalysisInput): Promise<PortfolioAnalysis> {
  const checkSize = Number.isFinite(input.targetCheckSizeUsd) && input.targetCheckSizeUsd > 0
    ? input.targetCheckSizeUsd
    : 0;

  const { listings } = await listMarketplaceListings({ limit: 200 });
  const byId = new Map(listings.map((l) => [l.id, l]));

  const positions: PortfolioPosition[] = [];
  for (const alloc of input.allocations) {
    const listing = byId.get(alloc.listingId);
    if (!listing) continue; // silently drop stale ids rather than failing the whole analysis
    const weight = Math.max(0, Number(alloc.weightPct) || 0);
    if (weight <= 0) continue;
    const allocatedUsd = (checkSize * weight) / 100;
    positions.push({
      listingId: listing.id,
      name: listing.name,
      source: listing.source,
      state: listing.state,
      stage: listing.stage,
      offtakerLabel: offtakerLabelFor(listing),
      capacityMW: listing.capacityMW,
      weightPct: weight,
      allocatedUsd,
      cashYieldOnEquityPct: listing.cashYieldOnEquityPct.value,
      unleveredCashYieldPct: listing.unleveredCashYieldPct.value,
      projectedAnnualCashUsd: (allocatedUsd * listing.cashYieldOnEquityPct.value) / 100,
      dscrX: listing.dscrX.value,
      isOperating: listing.isOperating,
      contractTermRemainingYears: listing.contractTermRemainingYears,
      clearsHurdle: listing.cashYieldOnEquityPct.value >= CASH_YIELD_HURDLE_PCT,
    });
  }

  const totalWeight = positions.reduce((s, p) => s + p.weightPct, 0);
  const w = (value: (p: PortfolioPosition) => number) =>
    totalWeight > 0
      ? positions.reduce((s, p) => s + value(p) * p.weightPct, 0) / totalWeight
      : 0;

  const blendedEquityYield = w((p) => p.cashYieldOnEquityPct);
  const blendedUnlevered = w((p) => p.unleveredCashYieldPct);
  const projectedAnnualCash = positions.reduce((s, p) => s + p.projectedAnnualCashUsd, 0);

  // Only levered positions carry a DSCR; averaging an unlevered position's
  // "infinite" coverage in would be meaningless.
  const levered = positions.filter((p) => p.dscrX > 0);
  const leveredWeight = levered.reduce((s, p) => s + p.weightPct, 0);
  const weightedDscr =
    leveredWeight > 0
      ? levered.reduce((s, p) => s + p.dscrX * p.weightPct, 0) / leveredWeight
      : null;

  const contracted = positions.filter((p) => p.contractTermRemainingYears != null);
  const contractedWeight = contracted.reduce((s, p) => s + p.weightPct, 0);
  const weightedTerm =
    contractedWeight > 0
      ? contracted.reduce((s, p) => s + (p.contractTermRemainingYears ?? 0) * p.weightPct, 0) /
        contractedWeight
      : null;

  const concentrations: ConcentrationDimension[] = [
    buildDimension(
      "asset",
      "Single asset",
      positions.map((p) => ({ key: p.listingId, label: p.name, weight: p.weightPct })),
    ),
    buildDimension(
      "state",
      "State",
      positions.map((p) => ({ key: p.state, label: p.state, weight: p.weightPct })),
    ),
    buildDimension(
      "region",
      "Solar resource region",
      positions.map((p) => {
        const region = resolveResourceRegion(p.state);
        return {
          key: region,
          label: region.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
          weight: p.weightPct,
        };
      }),
    ),
    buildDimension(
      "offtaker",
      "Offtaker type",
      positions.map((p) => ({ key: p.offtakerLabel, label: p.offtakerLabel, weight: p.weightPct })),
    ),
    buildDimension(
      "stage",
      "Stage",
      positions.map((p) => ({
        key: p.isOperating ? "OPERATING" : "PRE_COD",
        label: p.isOperating ? "Operating" : "Pre-COD",
        weight: p.weightPct,
      })),
    ),
  ];

  const operatingWeight = totalWeight > 0
    ? (positions.filter((p) => p.isOperating).reduce((s, p) => s + p.weightPct, 0) / totalWeight) * 100
    : 0;
  const hurdleWeight = totalWeight > 0
    ? (positions.filter((p) => p.clearsHurdle).reduce((s, p) => s + p.weightPct, 0) / totalWeight) * 100
    : 0;

  const warnings: PortfolioWarning[] = [];
  if (positions.length === 0) {
    warnings.push({
      severity: "INFO",
      code: "EMPTY",
      message: "Add at least two assets to see blended yield and concentration.",
    });
  }
  if (Math.abs(totalWeight - 100) > 0.5 && positions.length > 0) {
    warnings.push({
      severity: "WARN",
      code: "WEIGHTS_UNNORMALIZED",
      message: `Weights total ${totalWeight.toFixed(1)}%, not 100%. Projections are scaled to the weights as entered.`,
    });
  }

  const dimByName = new Map(concentrations.map((d) => [d.dimension, d]));
  const assetDim = dimByName.get("asset");
  if (assetDim && assetDim.topWeightPct > 35) {
    warnings.push({
      severity: "WARN",
      code: "SINGLE_ASSET",
      message: `${assetDim.buckets[0].label} is ${assetDim.topWeightPct.toFixed(0)}% of the portfolio. A single inverter fleet or offtaker default would move the whole return.`,
    });
  }
  const stateDim = dimByName.get("state");
  if (stateDim && stateDim.topWeightPct > 50) {
    warnings.push({
      severity: "WARN",
      code: "SINGLE_STATE",
      message: `${stateDim.topWeightPct.toFixed(0)}% of capital sits in ${stateDim.buckets[0].label}. One state's regulator, tariff or interconnection policy drives most of this portfolio.`,
    });
  }
  const offtakerDim = dimByName.get("offtaker");
  if (offtakerDim && offtakerDim.topWeightPct > 60) {
    warnings.push({
      severity: "WARN",
      code: "SINGLE_OFFTAKER",
      message: `${offtakerDim.topWeightPct.toFixed(0)}% of capital sits behind ${offtakerDim.buckets[0].label} offtake. Those contracts reprice on the same drivers.`,
    });
  }
  const regionDim = dimByName.get("region");
  if (regionDim && regionDim.topWeightPct > 40) {
    warnings.push({
      severity: "WARN",
      code: "RESOURCE_CORRELATION",
      message: `${regionDim.topWeightPct.toFixed(0)}% of capital sits in the ${regionDim.buckets[0].label} resource region. A bad irradiance year there hits those assets together.`,
    });
  }
  if (weightedTerm != null && weightedTerm < 8) {
    warnings.push({
      severity: "WARN",
      code: "SHORT_CONTRACT_TAIL",
      message: `Weighted contract term is ${weightedTerm.toFixed(1)} years. High current yield here is partly compensation for recontracting risk, not free income.`,
    });
  }
  if (blendedEquityYield < CASH_YIELD_HURDLE_PCT && positions.length > 0) {
    warnings.push({
      severity: "INFO",
      code: "BELOW_HURDLE",
      message: `Blended yield of ${blendedEquityYield.toFixed(2)}% is below the ${CASH_YIELD_HURDLE_PCT}% hurdle. Raising the weight on higher-yielding assets will also raise concentration.`,
    });
  }

  return {
    positions: positions.sort((a, b) => b.weightPct - a.weightPct),
    totalWeightPct: totalWeight,
    targetCheckSizeUsd: checkSize,
    blendedCashYieldOnEquityPct: blendedEquityYield,
    blendedUnleveredCashYieldPct: blendedUnlevered,
    projectedAnnualCashUsd: projectedAnnualCash,
    projectedQuarterlyCashUsd: projectedAnnualCash / 4,
    weightedDscrX: weightedDscr,
    weightedContractTermYears: weightedTerm,
    operatingWeightPct: operatingWeight,
    hurdleClearingWeightPct: hurdleWeight,
    diversificationScore: positions.length > 0 ? diversificationScoreOf(concentrations) : 0,
    concentrations,
    warnings,
    hurdlePct: CASH_YIELD_HURDLE_PCT,
  };
}
