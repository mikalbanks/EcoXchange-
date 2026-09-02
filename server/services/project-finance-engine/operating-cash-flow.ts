import {
  parseProjectFinanceInput,
  type AnnualProjectCashFlow,
  type CalculationWarning,
  type MetricTrace,
  type ProjectFinanceInput,
} from "./domain-contracts";

/**
 * V0 deliberately uses a fixed 8,760-hour year to match the approved annual
 * project-finance model. Calendar dates and leap years are outside Ticket 03.
 */
export const HOURS_PER_YEAR = 8_760;

export const OPERATING_FORMULA_IDS = {
  generationYear1: "GENERATION_YEAR1_V1",
  generationDegradation: "GENERATION_DEGRADATION_V1",
  ppaEscalation: "PPA_ESCALATION_V1",
  revenueContracted: "REVENUE_CONTRACTED_V1",
  opexEscalation: "OPEX_ESCALATION_V1",
  cfads: "CFADS_V1",
} as const;

export type OperatingFormulaId = (typeof OPERATING_FORMULA_IDS)[keyof typeof OPERATING_FORMULA_IDS];

export interface OperatingCashFlowResult {
  annual_project_cash_flows: AnnualProjectCashFlow[];
  warnings: CalculationWarning[];
  metric_traces: MetricTrace[];
}

function trace(
  metric_key: string,
  value: number,
  formula_id: OperatingFormulaId,
  dependencies: string[],
  inputs: Record<string, number>,
): MetricTrace {
  return {
    metric_key,
    value,
    formula_id,
    dependencies,
    metadata: { inputs },
  };
}

/**
 * Returns exactly one annual production value per modeled project year.
 * A complete explicit annual override takes precedence and is used verbatim;
 * no additional degradation is applied because the source series may already
 * embody engineering-model degradation.
 */
export function calculateGenerationProfile(rawInput: ProjectFinanceInput): number[] {
  const input = parseProjectFinanceInput(rawInput);
  const override = input.generation.annual_generation_override_mwh;

  if (override) return [...override];

  const yearOneGeneration =
    input.project.capacity_mw_ac * HOURS_PER_YEAR * input.generation.capacity_factor_p50;

  return Array.from({ length: input.project.project_life_years }, (_, index) =>
    yearOneGeneration * Math.pow(1 - input.generation.annual_degradation_rate, index),
  );
}

function calculatePpaPrice(input: ProjectFinanceInput, year: number): number {
  if (year > input.revenue.ppa_term_years) return 0;
  return (
    input.revenue.ppa_price_year_1_per_mwh *
    Math.pow(1 + input.revenue.ppa_escalation_rate, year - 1)
  );
}

function calculateOpex(input: ProjectFinanceInput, year: number): number {
  return (
    input.operating_costs.opex_year_1 *
    Math.pow(1 + input.operating_costs.opex_escalation_rate, year - 1)
  );
}

/**
 * Ticket 03 operating model only: production, contracted PPA revenue, Opex and
 * CFADS. It intentionally contains no debt, tax-credit, returns, downside,
 * underwriting, persistence, HTTP, UI or AI behavior.
 */
export function calculateOperatingCashFlows(rawInput: ProjectFinanceInput): OperatingCashFlowResult {
  const input = parseProjectFinanceInput(rawInput);
  const generation = calculateGenerationProfile(input);
  const rows: AnnualProjectCashFlow[] = [];
  const warnings: CalculationWarning[] = [];
  const metric_traces: MetricTrace[] = [];

  if (input.revenue.ppa_term_years < input.project.project_life_years) {
    warnings.push({
      code: "UNCONTRACTED_TAIL",
      severity: "MEDIUM",
      message: "Contracted PPA revenue ends before the modeled project life; V0 assigns zero revenue after PPA expiration.",
      year: input.revenue.ppa_term_years + 1,
      metadata: {
        ppa_term_years: input.revenue.ppa_term_years,
        project_life_years: input.project.project_life_years,
      },
    });
  }

  for (let index = 0; index < input.project.project_life_years; index += 1) {
    const year = index + 1;
    const generation_mwh = generation[index];
    const ppa_price_per_mwh = calculatePpaPrice(input, year);
    const revenue = year <= input.revenue.ppa_term_years
      ? generation_mwh * ppa_price_per_mwh
      : 0;
    const opex = calculateOpex(input, year);
    const cfads = revenue - opex;

    rows.push({
      year,
      generation_mwh,
      ppa_price_per_mwh,
      revenue,
      opex,
      cfads,
    });

    if (cfads < 0) {
      warnings.push({
        code: "NEGATIVE_CFADS",
        severity: "HIGH",
        message: "Operating CFADS is negative and is retained without flooring.",
        metric_key: `cfads.year_${year}`,
        year,
        metadata: { revenue, opex },
      });
    }

    const generationFormula = input.generation.annual_generation_override_mwh
      ? OPERATING_FORMULA_IDS.generationDegradation
      : year === 1
        ? OPERATING_FORMULA_IDS.generationYear1
        : OPERATING_FORMULA_IDS.generationDegradation;

    metric_traces.push(
      trace(
        `generation_mwh.year_${year}`,
        generation_mwh,
        generationFormula,
        input.generation.annual_generation_override_mwh
          ? ["generation.annual_generation_override_mwh"]
          : year === 1
            ? ["project.capacity_mw_ac", "HOURS_PER_YEAR", "generation.capacity_factor_p50"]
            : ["generation_mwh.year_1", "generation.annual_degradation_rate", "year"],
        input.generation.annual_generation_override_mwh
          ? { annual_generation_override_mwh: generation_mwh, year }
          : year === 1
            ? {
                capacity_mw_ac: input.project.capacity_mw_ac,
                hours_per_year: HOURS_PER_YEAR,
                capacity_factor_p50: input.generation.capacity_factor_p50,
              }
            : {
                generation_year_1_mwh: generation[0],
                annual_degradation_rate: input.generation.annual_degradation_rate,
                year,
              },
      ),
      trace(
        `ppa_price_per_mwh.year_${year}`,
        ppa_price_per_mwh,
        OPERATING_FORMULA_IDS.ppaEscalation,
        ["revenue.ppa_price_year_1_per_mwh", "revenue.ppa_escalation_rate", "revenue.ppa_term_years", "year"],
        {
          ppa_price_year_1_per_mwh: input.revenue.ppa_price_year_1_per_mwh,
          ppa_escalation_rate: input.revenue.ppa_escalation_rate,
          ppa_term_years: input.revenue.ppa_term_years,
          year,
        },
      ),
      trace(
        `revenue.year_${year}`,
        revenue,
        OPERATING_FORMULA_IDS.revenueContracted,
        ["generation_mwh", "ppa_price_per_mwh", "revenue.ppa_term_years", "year"],
        { generation_mwh, ppa_price_per_mwh, ppa_term_years: input.revenue.ppa_term_years, year },
      ),
      trace(
        `opex.year_${year}`,
        opex,
        OPERATING_FORMULA_IDS.opexEscalation,
        ["operating_costs.opex_year_1", "operating_costs.opex_escalation_rate", "year"],
        {
          opex_year_1: input.operating_costs.opex_year_1,
          opex_escalation_rate: input.operating_costs.opex_escalation_rate,
          year,
        },
      ),
      trace(
        `cfads.year_${year}`,
        cfads,
        OPERATING_FORMULA_IDS.cfads,
        ["revenue", "opex"],
        { revenue, opex },
      ),
    );
  }

  return {
    annual_project_cash_flows: rows,
    warnings,
    metric_traces,
  };
}
