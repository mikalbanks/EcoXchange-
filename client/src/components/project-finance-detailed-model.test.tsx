import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CalculationWarnings,
  CashSweepTable,
  DebtScheduleTable,
  DownsideSummary,
  FormulaTracePanel,
  InputSnapshotTable,
  OperatingModelTable,
  ReturnSummary,
  SourcesUsesTable,
  TaxCreditDetail,
} from "./project-finance-detailed-model";

const calculation:any={
  run:{id:"11111111-1111-4111-8111-111111111111",project_id:"22222222-2222-4222-8222-222222222222",scenario_id:"33333333-3333-4333-8333-333333333333",status:"SUCCESS",calculation_engine_version:"0.1.0",resolver_version:"0.1.0",underwriting_policy_id:"44444444-4444-4444-8444-444444444444",underwriting_policy_version:"0.1.0",input_hash:"abc",result_hash:"def",input_snapshot_json:{finance_input:{project:{capacity_mw_ac:5,project_life_years:25},generation:{capacity_factor_p50:.24,annual_degradation_rate:.005,generation_source_type:"CAPACITY_FACTOR_MODEL"},revenue:{ppa_price_year_1_per_mwh:55,ppa_escalation_rate:.01,ppa_term_years:25},operating_costs:{opex_year_1:150000,opex_escalation_rate:.025},tax_credit:{itc_rate:.30,itc_eligible_basis_pct:.95,itc_transfer_price:.92,itc_transaction_costs:0},financing:{annual_interest_rate:.065,target_dscr:1.30,max_ltc:.70,amortization_years:18,debt_maturity_years:18,lender_fee_rate:.0125},reserves:{dsra_months:6},transaction_costs:{project_capex:8000000,closing_costs:250000,other_financing_uses:0,other_permanent_sources:0},downside:{downside_type:"ILLUSTRATIVE_MULTIPLIER",downside_generation_multiplier:.90,generation_source_type:"ILLUSTRATIVE_PERCENT_OF_P50"},calculation_options:{tax_module_enabled:false}},provenance:{"financing.target_dscr":{field_key:"financing.target_dscr",value:1.3,unit:"RATIO",resolution_source:"POLICY_DEFAULT",policy_default_used:true,policy_value:1.3,override_used:false}},policy_context:{policy_code:"ECOXCHANGE_SOLAR_BASE",policy_version:"0.1.0"}}},
  annual_project_cashflows:[{year:1,generation_mwh:10512,ppa_price_per_mwh:55,revenue:578160,opex:150000,cfads:428160,sponsor_operating_cash_flow:98806.15}],
  annual_debt_schedules:[{year:1,opening_balance:3364160.17,interest:218670.41,principal:110683.44,debt_service:329353.85,ending_balance:3253476.73,dscr:1.30}],
  financing_result:{dscr_sized_debt:3364160.17,ltc_debt_limit:5600000,permanent_debt:3364160.17,binding_constraint:"DSCR",debt_to_capex:.42052,minimum_dscr:1.30,minimum_dscr_year:1,balloon_balance:0,lender_fee:42052,dsra:164676.92},
  tax_credit_result:{eligible_basis:7600000,itc_rate:.30,itc_face_value:2280000,transfer_price:.92,gross_transfer_proceeds:2097600,transaction_costs:0,net_transfer_proceeds:2097600},
  capital_stack_result:{project_capex:8000000,closing_costs:250000,lender_fee:42052,dsra:164676.92,other_financing_uses:0,total_closing_uses:8456728.92,permanent_debt:3364160.17,net_itc_proceeds:2097600,other_permanent_sources:0,sponsor_equity:2994968.75,debt_pct_total_uses:.3978,itc_pct_total_uses:.2480,sponsor_equity_pct_total_uses:.3542,other_sources_pct_total_uses:0},
  return_result:{levered_sponsor_cash_irr:.02443,levered_sponsor_cash_irr_status:"VALID",project_unlevered_cash_irr_before_tax_attributes:.04,unlevered_irr_status:"VALID",sponsor_npv:null,project_npv:null,simplified_sponsor_after_tax_irr:null,tax_module_enabled:false},
  downside_result:{downside_type:"ILLUSTRATIVE_MULTIPLIER",generation_source_type:"ILLUSTRATIVE_PERCENT_OF_P50",generation_multiplier:.90,minimum_downside_dscr:1.096,minimum_downside_dscr_year:1,full_repayment:true,repayment_year:20,unrepaid_balance:0,interest_shortfall:false},
  downside_cash_sweep_rows:[{year:1,opening_balance:3364160.17,downside_cfads:376000,interest_due:218670.41,cash_available:376000,principal_paid:157329.59,ending_balance:3206830.58,interest_shortfall:false}],
  reconciliation_result:{debt_reconciled:true,sources_uses_reconciled:true,sources_uses_difference:0,debt_reconciliation_difference:0},
  warnings:[{code:"ILLUSTRATIVE_DOWNSIDE_NOT_P90",severity:"INFO",message:"Multiplier-based downside is illustrative and is not a lender-grade independent-engineer P90."}],
  metric_traces:[{metric_key:"permanent_debt",value:3364160.17,formula_id:"PERMANENT_DEBT_V1",dependencies:["dscr_sized_debt","ltc_debt_limit"]},{metric_key:"levered_sponsor_cash_irr",value:.02443,formula_id:"SPONSOR_CASH_IRR_V1",dependencies:["capital_stack.sponsor_equity","sponsor_operating_cash_flows[]"]}],
};

describe("Ticket 16 detailed financial model",()=>{
  it("renders immutable input provenance and policy-default state",()=>{const html=renderToStaticMarkup(<InputSnapshotTable snapshot={calculation.run.input_snapshot_json}/>);expect(html).toContain("Input Snapshot");expect(html).toContain("EcoXchange Assumption");expect(html).toContain("Policy Default?");});
  it("renders persisted operating rows without creating a spreadsheet editor",()=>{const html=renderToStaticMarkup(<OperatingModelTable rows={calculation.annual_project_cashflows}/>);expect(html).toContain("10,512 MWh");expect(html).toContain("$578,160");expect(html).toContain("$428,160");});
  it("renders backend minimum DSCR and annual debt schedule",()=>{const html=renderToStaticMarkup(<DebtScheduleTable calculation={calculation}/>);expect(html).toContain("DSCR-Sized Debt");expect(html).toContain("1.30x");expect(html).toContain("Annual debt schedule");});
  it("renders sources and uses and persisted reconciliation",()=>{const html=renderToStaticMarkup(<SourcesUsesTable calculation={calculation}/>);expect(html).toContain("Sponsor Equity");expect(html).toContain("Sources &amp; Uses Reconciled");});
  it("renders modeled ITC detail and disabled tax module truthfully",()=>{const html=renderToStaticMarkup(<TaxCreditDetail calculation={calculation}/>);expect(html).toContain("ITC Face Value");expect(html).toContain("$2,280,000");expect(html).toContain("tax module disabled");});
  it("keeps cash-only returns separate and preserves null NPV",()=>{const html=renderToStaticMarkup(<ReturnSummary calculation={calculation}/>);expect(html).toContain("Levered Cash-Only Sponsor IRR");expect(html).toContain("2.44%");expect(html).toContain("Sponsor NPV");expect(html).toContain("—");});
  it("labels illustrative downside as non-P90 and renders sweep rows",()=>{const html=renderToStaticMarkup(<DownsideSummary calculation={calculation}/>);expect(html).toContain("not an independent-engineer P90");expect(html).toContain("Downside cash-sweep schedule");expect(html).toContain("Full Cash-Sweep Repayment");});
  it("renders cash-sweep failure values without making a credit conclusion",()=>{const rows=[{...calculation.downside_cash_sweep_rows[0],interest_shortfall:true,ending_balance:100000}];const html=renderToStaticMarkup(<CashSweepTable rows={rows}/>);expect(html).toContain("Interest Shortfall");expect(html).toContain("Yes");expect(html).not.toContain("Credit Fail");});
  it("renders backend formula IDs and explanatory dependencies",()=>{const html=renderToStaticMarkup(<FormulaTracePanel traces={calculation.metric_traces}/>);expect(html).toContain("PERMANENT_DEBT_V1");expect(html).toContain("Permanent Debt = min(DSCR Capacity, LTC Limit)");expect(html).toContain("SPONSOR_CASH_IRR_V1");});
  it("separates deterministic calculation warnings from underwriting risks",()=>{const html=renderToStaticMarkup(<CalculationWarnings warnings={calculation.warnings}/>);expect(html).toContain("Calculation Warnings");expect(html).toContain("Illustrative Downside Not P90");expect(html).toContain("separate from underwriting risks");});
});
