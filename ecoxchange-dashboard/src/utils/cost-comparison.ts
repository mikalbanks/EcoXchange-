// Developer cost-comparison model (differentiation spec §3.2): traditional
// Reg D placement vs. EcoXchange, first-year, as a function of the target
// equity raise. Pure and unit-tested. Figures are industry-benchmark
// midpoints (SEIA / LBNL soft-cost literature) — estimates only, subject to
// actual deal terms and securities counsel review.

export interface CostLine {
  label: string;
  traditional: number;
  ecoxchange: number;
  /** Display treatment when the EcoXchange cost is zero. */
  zeroLabel?: "Included" | "Automated";
}

export interface CostComparisonResult {
  lines: CostLine[];
  traditionalTotal: number;
  ecoxchangeTotal: number;
  savings: number;
  savingsPct: number; // 0–100, rounded to whole percent
}

export const TRADITIONAL_PLACEMENT_FEE_PCT = 0.06; // 4–8% range, midpoint
export const ECOXCHANGE_ORIGINATION_FEE_PCT = 0.03;

// Product-spec §3.3 headline figures (single source of truth — the savings
// chart, the comparison table, and the results page all cite these; keep
// them in one place so the pitch can't contradict itself mid-demo).
export const SPEC_COST = {
  /** Traditional Reg D 506(c) all-in first-year cost range (USD). */
  traditionalLowUsd: 325_000,
  traditionalHighUsd: 500_000,
  /** EcoXchange: origination at close + annual platform fee (USD). */
  ecoxchangeUpfrontUsd: 90_000,
  ecoxchangeAnnualUsd: 12_500,
  /** Headline lifetime savings claim. */
  lifetimeSavingsLabel: "~$300K–$500K over asset life",
  timeToCapital: {
    traditional: "3–9 months",
    ecoxchange: "2–6 weeks",
  },
} as const;

export function computeCostComparison(equityRaise: number): CostComparisonResult {
  const lines: CostLine[] = [
    {
      label: "Securities counsel (PPM, sub docs)",
      traditional: 20_000, // $12K–$30K midpoint
      ecoxchange: 0,
      zeroLabel: "Included",
    },
    {
      label: `Capital-raise fee benchmark (${TRADITIONAL_PLACEMENT_FEE_PCT * 100}% placement / ${ECOXCHANGE_ORIGINATION_FEE_PCT * 100}% origination)`,
      traditional: Math.round(equityRaise * TRADITIONAL_PLACEMENT_FEE_PCT),
      ecoxchange: Math.round(equityRaise * ECOXCHANGE_ORIGINATION_FEE_PCT),
    },
    {
      label: "Platform setup / investor marketing",
      traditional: 40_000, // $35K + marketing
      ecoxchange: 15_000, // platform setup fee
    },
    {
      label: "Distribution administration (yr 1)",
      traditional: 15_000, // $10–25K/yr
      ecoxchange: 0,
      zeroLabel: "Automated",
    },
    {
      label: "Third-party production audit (yr 1)",
      traditional: 10_000, // $5–15K/yr
      ecoxchange: 0,
      zeroLabel: "Included",
    },
  ];

  const traditionalTotal = lines.reduce((s, l) => s + l.traditional, 0);
  const ecoxchangeTotal = lines.reduce((s, l) => s + l.ecoxchange, 0);
  const savings = traditionalTotal - ecoxchangeTotal;

  return {
    lines,
    traditionalTotal,
    ecoxchangeTotal,
    savings,
    savingsPct: traditionalTotal > 0 ? Math.round((savings / traditionalTotal) * 100) : 0,
  };
}
