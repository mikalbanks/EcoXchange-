import type { ProjectFinanceInput } from "../domain-contracts";
import { calculateProjectFinanceCore, runSensitivity, type ProjectFinanceCoreResult } from "../returns-downside";

export type GoldenValidationStatus =
  | "PASS_EXACT"
  | "PASS_WITHIN_SOURCE_ROUNDING"
  | "PASS_WITHIN_TOLERANCE"
  | "FAIL_IMPLEMENTATION"
  | "UNRESOLVED_SOURCE_ASSUMPTION"
  | "KNOWN_SPEC_DIFFERENCE"
  | "NOT_SOURCE_BENCHMARKED";

export const GOLDEN_TOLERANCES = Object.freeze({
  EXACT_SIMPLE_ARITHMETIC_ABS: 0.01,
  OPERATING_SOURCE_ROUNDED_PCT: 0.001,
  DEBT_PCT: 0.0025,
  SPONSOR_EQUITY_PCT: 0.0025,
  ITC_PCT: 0.0001,
  IRR_ABS: 0.001,
  DSCR_DISPLAYED_ABS: 0.01,
  CAPITAL_STACK_PERCENT_ABS: 0.002,
  RECONCILIATION_USD: 1,
});

export interface GoldenFixtureFile {
  case_id: string;
  source_inputs: Record<string, number>;
  explicit_fixture_inputs: ProjectFinanceInput;
  expected_outputs: Record<string, number>;
  source_rounding_precision: Record<string, string>;
  inferred_inputs: Record<string, { value: number; provenance: string; note?: string }>;
  provenance: Record<string, string>;
  validation_notes: string[];
}

export interface GoldenMetricComparison {
  metric: string;
  source: number | null;
  calculated: number | null;
  variance: number | null;
  status: GoldenValidationStatus;
  note?: string;
}

export interface GoldenCaseComparison {
  case_id: string;
  result: ProjectFinanceCoreResult;
  comparisons: GoldenMetricComparison[];
}

function relativeVariance(calculated: number, source: number): number {
  if (source === 0) return calculated === 0 ? 0 : Infinity;
  return (calculated - source) / Math.abs(source);
}

export function sourceRoundedInterval(displayedValue: number, precision: "nearest_1000" | "nearest_100" | "nearest_0.01x" | "nearest_10_bps"): [number, number] {
  const halfStep = precision === "nearest_1000" ? 500
    : precision === "nearest_100" ? 50
      : precision === "nearest_0.01x" ? 0.005
        : 0.0005;
  return [displayedValue - halfStep, displayedValue + halfStep];
}

export function matchesSourceRounded(calculated: number, displayedValue: number, precision: "nearest_1000" | "nearest_100" | "nearest_0.01x" | "nearest_10_bps"): boolean {
  const [low, high] = sourceRoundedInterval(displayedValue, precision);
  return calculated >= low && calculated < high;
}

function exact(metric: string, calculated: number, source: number): GoldenMetricComparison {
  const variance = calculated - source;
  return {
    metric,
    source,
    calculated,
    variance,
    status: Math.abs(variance) <= GOLDEN_TOLERANCES.EXACT_SIMPLE_ARITHMETIC_ABS ? "PASS_EXACT" : "FAIL_IMPLEMENTATION",
  };
}

function tolerance(metric: string, calculated: number, source: number, relativeTolerance: number): GoldenMetricComparison {
  const variance = relativeVariance(calculated, source);
  return {
    metric,
    source,
    calculated,
    variance,
    status: Math.abs(variance) <= relativeTolerance ? "PASS_WITHIN_TOLERANCE" : "FAIL_IMPLEMENTATION",
  };
}

function rounded(metric: string, calculated: number, source: number, precision: "nearest_1000" | "nearest_100" | "nearest_0.01x" | "nearest_10_bps", fallbackAbs?: number): GoldenMetricComparison {
  const withinDisplay = matchesSourceRounded(calculated, source, precision);
  const absVariance = calculated - source;
  const withinFallback = fallbackAbs !== undefined && Math.abs(absVariance) <= fallbackAbs;
  return {
    metric,
    source,
    calculated,
    variance: absVariance,
    status: withinDisplay ? "PASS_WITHIN_SOURCE_ROUNDING" : withinFallback ? "PASS_WITHIN_TOLERANCE" : "FAIL_IMPLEMENTATION",
  };
}

export function calculateGoldenCase(fixture: GoldenFixtureFile): GoldenCaseComparison {
  const result = calculateProjectFinanceCore(structuredClone(fixture.explicit_fixture_inputs));
  const expected = fixture.expected_outputs;
  const y1 = result.operating.annual_project_cash_flows[0];
  if (!y1) throw new Error(`${fixture.case_id}: missing Year-1 operating row`);
  const capital = result.capital_stack.capital_stack;
  const tax = result.capital_stack.tax_credit;
  const debt = result.debt.financing_summary;
  const downside = result.downside;
  const cashIrr = result.returns.levered_sponsor_cash_irr.irr;
  const taxIrr = result.returns.simplified_sponsor_after_tax_irr?.irr ?? null;

  const comparisons: GoldenMetricComparison[] = [
    exact("generation_year_1_mwh", y1.generation_mwh, expected.generation_year_1_mwh_exact),
    exact("revenue_year_1", y1.revenue, expected.revenue_year_1_exact),
    exact("opex_year_1", y1.opex, expected.opex_year_1_exact),
    exact("cfads_year_1", y1.cfads, expected.cfads_year_1_exact),
    exact("ltc_limit", debt.ltc_debt_limit, expected.ltc_limit_exact),
    tolerance("permanent_debt", debt.permanent_debt, expected.permanent_debt_source_display, GOLDEN_TOLERANCES.DEBT_PCT),
    exact("itc_eligible_basis", tax.eligible_basis, expected.itc_eligible_basis_exact),
    exact("itc_face", tax.itc_face_value, expected.itc_face_exact),
    exact("itc_proceeds", tax.net_transfer_proceeds, expected.itc_proceeds_exact),
    rounded("dsra", result.capital_stack.dsra, expected.dsra_source_display, "nearest_100", 100),
    rounded("lender_fee", result.capital_stack.lender_fee, expected.lender_fee_source_display, "nearest_100", 100),
    tolerance("sponsor_equity", capital.sponsor_equity, expected.sponsor_equity_source_display, GOLDEN_TOLERANCES.SPONSOR_EQUITY_PCT),
  ];

  if (cashIrr === null) comparisons.push({ metric: "cash_irr", source: expected.cash_irr_source, calculated: null, variance: null, status: "FAIL_IMPLEMENTATION" });
  else comparisons.push(rounded("cash_irr", cashIrr, expected.cash_irr_source, "nearest_10_bps", GOLDEN_TOLERANCES.IRR_ABS));

  if (downside?.minimum_downside_dscr === null || downside?.minimum_downside_dscr === undefined) {
    comparisons.push({ metric: "illustrative_downside_dscr", source: expected.downside_dscr_source_display, calculated: null, variance: null, status: "FAIL_IMPLEMENTATION" });
  } else {
    comparisons.push(rounded("illustrative_downside_dscr", downside.minimum_downside_dscr, expected.downside_dscr_source_display, "nearest_0.01x", GOLDEN_TOLERANCES.DSCR_DISPLAYED_ABS));
  }

  const sourceTaxShield = expected.source_tax_shield_display;
  const calculatedTaxShield = result.returns.immediate_tax_shield;
  comparisons.push({
    metric: "source_full_tax_tax_shield",
    source: sourceTaxShield,
    calculated: calculatedTaxShield,
    variance: calculatedTaxShield === null ? null : calculatedTaxShield - sourceTaxShield,
    status: "KNOWN_SPEC_DIFFERENCE",
    note: "SPEC 02 simplified tax module uses ITC-eligible basis less one-half of ITC face. The source shield targets imply project capex less one-half of ITC face and likely include additional annual tax mechanics.",
  });
  comparisons.push({
    metric: "source_full_tax_irr",
    source: expected.full_tax_irr_source,
    calculated: taxIrr,
    variance: taxIrr === null ? null : taxIrr - expected.full_tax_irr_source,
    status: "KNOWN_SPEC_DIFFERENCE",
    note: "Source full-tax IRR is not a blocking V0 golden because the approved simplified tax module does not reproduce the source's richer tax treatment.",
  });

  return { case_id: fixture.case_id, result, comparisons };
}

export function blockingComparisons(caseComparison: GoldenCaseComparison): GoldenMetricComparison[] {
  return caseComparison.comparisons.filter((item) => item.status !== "KNOWN_SPEC_DIFFERENCE" && item.status !== "NOT_SOURCE_BENCHMARKED" && item.status !== "UNRESOLVED_SOURCE_ASSUMPTION");
}

export function runGoldenSensitivityDiagnostics(fixture: GoldenFixtureFile) {
  const input = fixture.explicit_fixture_inputs;
  const ppa = runSensitivity(input, "PPA_PRICE", [40, 45, 50, 55, 60]);
  const baseRate = input.financing.annual_interest_rate;
  const rates = runSensitivity(input, "INTEREST_RATE", [baseRate - 0.02, baseRate - 0.01, baseRate, baseRate + 0.01, baseRate + 0.02]);
  const itc = runSensitivity(input, "ITC_RATE", [0.06, 0.30, 0.40, 0.50]);
  return { ppa, rates, itc };
}
