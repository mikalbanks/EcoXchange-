import type { ProjectFinanceInput } from "../domain-contracts";

/**
 * Reference 5 MW input used for domain-contract validation only in Ticket 02.
 * Golden calculated outputs are owned by Ticket 07.
 */
export const REFERENCE_SOLAR_5MW_INPUT: ProjectFinanceInput = {
  project: {
    capacity_mw_ac: 5,
    project_life_years: 25,
    technology: "SOLAR_PV",
    country_code: "US",
    state_code: "GA",
  },
  generation: {
    capacity_factor_p50: 0.24,
    annual_degradation_rate: 0.005,
    generation_source_type: "CAPACITY_FACTOR_MODEL",
  },
  revenue: {
    ppa_price_year_1_per_mwh: 55,
    ppa_escalation_rate: 0.01,
    ppa_term_years: 25,
  },
  operating_costs: {
    opex_year_1: 150_000,
    opex_escalation_rate: 0.025,
  },
  tax_credit: {
    itc_rate: 0.30,
    itc_eligible_basis_pct: 0.95,
    itc_transfer_price: 0.92,
    itc_transaction_costs: 0,
  },
  financing: {
    annual_interest_rate: 0.065,
    target_dscr: 1.30,
    max_ltc: 0.70,
    amortization_years: 18,
    debt_maturity_years: 18,
    lender_fee_rate: 0.0125,
  },
  reserves: {
    dsra_months: 6,
    dsra_reference_method: "YEAR_ONE",
  },
  transaction_costs: {
    project_capex: 8_000_000,
    closing_costs: 400_000,
    other_financing_uses: 0,
  },
  downside: {
    downside_type: "ILLUSTRATIVE_MULTIPLIER",
    downside_generation_multiplier: 0.90,
    generation_source_type: "ILLUSTRATIVE_PERCENT_OF_P50",
  },
  calculation_options: {
    tax_module_enabled: false,
  },
};
