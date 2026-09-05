import { hashCalculationResult } from "./calculation-service";
import type { ProjectFinanceInput } from "./domain-contracts";
import type { ProjectFinanceCoreResult, SensitivityVariable } from "./returns-downside";
import { hashFinanceInput } from "./scenario-resolver";

export type SensitivityPointSummary = {
  input_value:number;
  is_base:boolean;
  child_calculation_run_id:string;
  permanent_debt:number;
  debt_to_capex:number;
  sponsor_equity:number;
  minimum_dscr:number|null;
  levered_sponsor_cash_irr:number|null;
  simplified_sponsor_after_tax_irr:number|null;
  binding_constraint:string;
  minimum_downside_dscr:number|null;
  input_hash:string;
  result_hash:string;
};

export type SensitivityRunBundle = {
  id:string;
  project_id:string;
  scenario_id:string;
  base_calculation_run_id:string;
  variable:SensitivityVariable;
  status:"PENDING"|"RUNNING"|"SUCCESS"|"FAILED";
  created_at?:string;
  completed_at?:string|null;
  points:SensitivityPointSummary[];
};

export function sensitivityField(variable:SensitivityVariable):string {
  if(variable==="PPA_PRICE") return "revenue.ppa_price_year_1_per_mwh";
  if(variable==="INTEREST_RATE") return "financing.annual_interest_rate";
  if(variable==="PROJECT_CAPEX") return "transaction_costs.project_capex";
  if(variable==="CAPACITY_FACTOR") return "generation.capacity_factor_p50";
  return "tax_credit.itc_rate";
}

export function sensitivityBaseValue(input:ProjectFinanceInput,variable:SensitivityVariable):number {
  if(variable==="PPA_PRICE") return input.revenue.ppa_price_year_1_per_mwh;
  if(variable==="INTEREST_RATE") return input.financing.annual_interest_rate;
  if(variable==="PROJECT_CAPEX") return input.transaction_costs.project_capex;
  if(variable==="CAPACITY_FACTOR") return input.generation.capacity_factor_p50;
  return input.tax_credit.itc_rate;
}

export function sensitivitySummary(result:ProjectFinanceCoreResult,inputValue:number,isBase:boolean,childId=""):SensitivityPointSummary {
  return {
    input_value:inputValue,
    is_base:isBase,
    child_calculation_run_id:childId,
    permanent_debt:result.debt.financing_summary.permanent_debt,
    debt_to_capex:result.debt.financing_summary.debt_to_capex,
    sponsor_equity:result.capital_stack.capital_stack.sponsor_equity,
    minimum_dscr:result.debt.financing_summary.minimum_dscr,
    levered_sponsor_cash_irr:result.returns.levered_sponsor_cash_irr.irr,
    simplified_sponsor_after_tax_irr:result.returns.simplified_sponsor_after_tax_irr?.irr??null,
    binding_constraint:result.debt.financing_summary.binding_constraint,
    minimum_downside_dscr:result.downside?.minimum_downside_dscr??null,
    input_hash:hashFinanceInput(result.input),
    result_hash:hashCalculationResult(result),
  };
}
