export type Regime =
  | "growth"
  | "transition"
  | "hard_asset"
  | "deflation"
  | "repression";

export interface RegimeAnalysis {
  regime: Regime;
  regime_impact: "favorable" | "neutral" | "unfavorable";
  rationale: string;
  historical_context: string;
}

/**
 * Regime impact on contracted solar infrastructure assets. Sources: Preqin
 * Infrastructure Index quarterly performance vs S&P 500 across macro regimes;
 * NREL ATB cost trajectories.
 */
const REGIME_TABLE: Record<Regime, RegimeAnalysis> = {
  growth: {
    regime: "growth",
    regime_impact: "neutral",
    rationale:
      "Contracted solar yields are stable; equity benchmarks tend to outperform in expansion. Asset still delivers its contracted USDC distributions independent of broader equity drawdowns.",
    historical_context:
      "Private infrastructure returned ~7% annualized in expansion quarters; S&P 500 delivered higher absolute returns but with materially higher volatility.",
  },
  transition: {
    regime: "transition",
    regime_impact: "favorable",
    rationale:
      "Transition regimes (rising volatility, shifting rate expectations) tend to widen credit spreads and compress equity multiples while contracted infrastructure cash flows stay fixed. Solar production is uncorrelated with capital-market regimes.",
    historical_context:
      "In the four quarters following peak inflation expectations (2022–2023), Preqin Infrastructure Index outperformed both equities and IG credit on a Sharpe basis.",
  },
  hard_asset: {
    regime: "hard_asset",
    regime_impact: "favorable",
    rationale:
      "Above-average inflation with PPA escalators provides direct inflation linkage. The asset's revenue stream rises in nominal terms while bond cash flows are eroded.",
    historical_context:
      "Private infrastructure returned 5.0% annualized in above-average-inflation quarters vs 0.9% for the S&P 500, per Preqin's regime decomposition.",
  },
  deflation: {
    regime: "deflation",
    regime_impact: "unfavorable",
    rationale:
      "Deflationary periods compress retail electricity rates and PPA escalators that index to CPI may turn negative. Counterparty credit risk also rises for offtakers exposed to deflation-sensitive demand.",
    historical_context:
      "Infrastructure returns dipped in the 2009 deflationary quarter as PPA renegotiations rose; recovery was rapid once inflation expectations normalized.",
  },
  repression: {
    regime: "repression",
    regime_impact: "favorable",
    rationale:
      "Financial repression (real rates held below inflation) favors cash-flowing physical assets with inflation linkage and contracted revenue. Solar infrastructure is among the most durable income streams under repression.",
    historical_context:
      "During the 1940s repression period, infrastructure equity (utilities) outperformed nominal Treasuries by ~400 bps annually on a real basis.",
  },
};

export function analyzeRegime(regime: Regime): RegimeAnalysis {
  return REGIME_TABLE[regime];
}
