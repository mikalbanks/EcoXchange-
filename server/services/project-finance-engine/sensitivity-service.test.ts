import { describe, expect, it } from "vitest";
import { calculateProjectFinanceCore, runSensitivity } from "./returns-downside";
import { applySensitivity, sensitivityBaseValue, sensitivityField, SUPPORTED_SENSITIVITY_VARIABLES } from "./sensitivity-service";
import type { ProjectFinanceInput } from "./domain-contracts";

const base:ProjectFinanceInput={
  project:{capacity_mw_ac:5,project_life_years:25,technology:"SOLAR_PV",country_code:"US"},
  generation:{capacity_factor_p50:.24,annual_degradation_rate:.005,generation_source_type:"CAPACITY_FACTOR_MODEL"},
  revenue:{ppa_price_year_1_per_mwh:55,ppa_escalation_rate:.01,ppa_term_years:25},
  operating_costs:{opex_year_1:150000,opex_escalation_rate:.025},
  tax_credit:{itc_rate:.30,itc_eligible_basis_pct:.95,itc_transfer_price:.92,itc_transaction_costs:0,bonus_depreciation_pct:1,federal_tax_rate:.21,sponsor_tax_appetite_pct:1},
  financing:{annual_interest_rate:.065,target_dscr:1.30,max_ltc:.70,amortization_years:18,debt_maturity_years:18,lender_fee_rate:.0125},
  reserves:{dsra_months:6,dsra_reference_method:"YEAR_ONE"},
  transaction_costs:{project_capex:8000000,closing_costs:250000,other_financing_uses:0,other_permanent_sources:0},
  downside:{downside_type:"ILLUSTRATIVE_MULTIPLIER",downside_generation_multiplier:.90,generation_source_type:"ILLUSTRATIVE_PERCENT_OF_P50"},
  calculation_options:{tax_module_enabled:true},
};

describe("Ticket 17 sensitivity orchestration mechanics",()=>{
  it("exposes only Ticket 06 approved variables",()=>expect(SUPPORTED_SENSITIVITY_VARIABLES).toEqual(["PPA_PRICE","INTEREST_RATE","PROJECT_CAPEX","CAPACITY_FACTOR","ITC_RATE"]));
  it("maps approved variables to one finance input field",()=>{
    expect(sensitivityField("PPA_PRICE")).toBe("revenue.ppa_price_year_1_per_mwh");
    expect(sensitivityField("INTEREST_RATE")).toBe("financing.annual_interest_rate");
    expect(sensitivityField("PROJECT_CAPEX")).toBe("transaction_costs.project_capex");
    expect(sensitivityField("CAPACITY_FACTOR")).toBe("generation.capacity_factor_p50");
    expect(sensitivityField("ITC_RATE")).toBe("tax_credit.itc_rate");
  });
  it("clones inputs without mutating the Base Case",()=>{
    const changed=applySensitivity(base,"PPA_PRICE",50);
    expect(changed.revenue.ppa_price_year_1_per_mwh).toBe(50);
    expect(base.revenue.ppa_price_year_1_per_mwh).toBe(55);
  });
  it("PPA price reruns revenue, CFADS and debt",()=>{
    const low=calculateProjectFinanceCore(applySensitivity(base,"PPA_PRICE",40));
    const high=calculateProjectFinanceCore(applySensitivity(base,"PPA_PRICE",60));
    expect(low.operating.annual_project_cash_flows[0].revenue).not.toBe(high.operating.annual_project_cash_flows[0].revenue);
    expect(low.operating.annual_project_cash_flows[0].cfads).not.toBe(high.operating.annual_project_cash_flows[0].cfads);
    expect(low.debt.financing_summary.permanent_debt).not.toBe(high.debt.financing_summary.permanent_debt);
  });
  it("interest-rate sensitivity leaves CFADS invariant but resizes debt",()=>{
    const low=calculateProjectFinanceCore(applySensitivity(base,"INTEREST_RATE",.055));
    const high=calculateProjectFinanceCore(applySensitivity(base,"INTEREST_RATE",.075));
    expect(low.operating.annual_project_cash_flows.map(r=>r.cfads)).toEqual(high.operating.annual_project_cash_flows.map(r=>r.cfads));
    expect(low.debt.financing_summary.permanent_debt).not.toBe(high.debt.financing_summary.permanent_debt);
  });
  it("capex sensitivity leaves operating CFADS unchanged while changing capital stack",()=>{
    const low=calculateProjectFinanceCore(applySensitivity(base,"PROJECT_CAPEX",7000000));
    const high=calculateProjectFinanceCore(applySensitivity(base,"PROJECT_CAPEX",9000000));
    expect(low.operating.annual_project_cash_flows.map(r=>r.cfads)).toEqual(high.operating.annual_project_cash_flows.map(r=>r.cfads));
    expect(low.capital_stack.tax_credit_result.itc_face_value).not.toBe(high.capital_stack.tax_credit_result.itc_face_value);
    expect(low.capital_stack.capital_stack.sponsor_equity).not.toBe(high.capital_stack.capital_stack.sponsor_equity);
  });
  it("capacity factor reruns generation, revenue, CFADS and debt",()=>{
    const low=calculateProjectFinanceCore(applySensitivity(base,"CAPACITY_FACTOR",.20));
    const high=calculateProjectFinanceCore(applySensitivity(base,"CAPACITY_FACTOR",.28));
    expect(low.operating.annual_project_cash_flows[0].generation_mwh).not.toBe(high.operating.annual_project_cash_flows[0].generation_mwh);
    expect(low.operating.annual_project_cash_flows[0].revenue).not.toBe(high.operating.annual_project_cash_flows[0].revenue);
    expect(low.debt.financing_summary.permanent_debt).not.toBe(high.debt.financing_summary.permanent_debt);
  });
  it("ITC sensitivity changes proceeds/equity but not permanent debt",()=>{
    const values=[.06,.30,.40,.50];
    const results=values.map(v=>calculateProjectFinanceCore(applySensitivity(base,"ITC_RATE",v)));
    expect(new Set(results.map(r=>r.debt.financing_summary.permanent_debt)).size).toBe(1);
    expect(new Set(results.map(r=>r.capital_stack.tax_credit_result.net_transfer_proceeds)).size).toBe(values.length);
    expect(new Set(results.map(r=>r.capital_stack.capital_stack.sponsor_equity)).size).toBe(values.length);
  });
  it("Ticket 06 rejects capacity-factor sensitivity with explicit generation override",()=>{
    const explicit=structuredClone(base);explicit.generation.annual_generation_override_mwh=Array(25).fill(10512);
    expect(()=>runSensitivity(explicit,"CAPACITY_FACTOR",[.20,.24,.28])).toThrow(/SENSITIVITY_NOT_APPLICABLE/);
  });
  it("resolves base values without changing policy or finance behavior",()=>{
    expect(sensitivityBaseValue(base,"PPA_PRICE")).toBe(55);
    expect(sensitivityBaseValue(base,"INTEREST_RATE")).toBe(.065);
  });
});
