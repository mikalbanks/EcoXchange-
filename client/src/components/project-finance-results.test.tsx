import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BindingConstraintPanel, CapitalStack, DscrDownside, FinancialProfileReadiness, Findings, LenderFitTable, MetricCard, ModelNotes, StatusBadge } from "./project-finance-results";

describe("Ticket 15 underwriting result components",()=>{
  it("renders credit FAIL as completed status text rather than a technical error",()=>{
    const html=renderToStaticMarkup(<StatusBadge value="FAIL"/>);
    expect(html).toContain("Fail");
    expect(html).not.toContain("Something went wrong");
  });
  it("keeps financial profile and financing readiness separate",()=>{
    const html=renderToStaticMarkup(<FinancialProfileReadiness profile="ACCEPTABLE" readiness="DEVELOPING"/>);
    expect(html).toContain("Financial Profile"); expect(html).toContain("Financing Readiness"); expect(html).toContain("Acceptable"); expect(html).toContain("Developing");
  });
  it("uses backend binding constraint without inferring it",()=>{
    const html=renderToStaticMarkup(<BindingConstraintPanel financing={{binding_constraint:"DSCR",dscr_sized_debt:3364000,ltc_debt_limit:5600000,permanent_debt:3364000}}/>);
    expect(html).toContain("Binding Financing Constraint"); expect(html).toContain("Dscr"); expect(html).toContain("Project cash flow limits debt");
  });
  it("renders backend capital stack percentages with an equivalent table",()=>{
    const html=renderToStaticMarkup(<CapitalStack stack={{project_capex:8000000,closing_costs:250000,lender_fee:42000,dsra:165000,other_financing_uses:0,total_closing_uses:8457000,permanent_debt:3364000,net_itc_proceeds:2098000,other_permanent_sources:0,sponsor_equity:2995000,debt_pct_total_uses:.3978,itc_pct_total_uses:.2481,sponsor_equity_pct_total_uses:.3541,other_sources_pct_total_uses:0}} reconciliation={{sources_uses_reconciled:true}}/>);
    expect(html).toContain("Capital Stack"); expect(html).toContain("39.78%"); expect(html).toContain("Sponsor Equity"); expect(html).toContain("Sources &amp; Uses Reconciled");
  });
  it("never labels illustrative downside as P90",()=>{
    const calculation:any={financing_result:{minimum_dscr:1.3},downside_result:{generation_source_type:"ILLUSTRATIVE_PERCENT_OF_P50",minimum_downside_dscr:1.1,full_repayment:true,interest_shortfall:false}};
    const html=renderToStaticMarkup(<DscrDownside calculation={calculation} rules={[]}/>);
    expect(html).toContain("not an independent-engineer P90"); expect(html).not.toContain("P90 Case");
  });
  it("labels independent engineer provenance only when provided",()=>{
    const calculation:any={financing_result:{minimum_dscr:1.3},downside_result:{generation_source_type:"INDEPENDENT_ENGINEER_P90",minimum_downside_dscr:1.1,full_repayment:true,interest_shortfall:false}};
    const html=renderToStaticMarkup(<DscrDownside calculation={calculation} rules={[]}/>);
    expect(html).toContain("Independent Engineer P90");
  });
  it("separates risks, conditions and missing information",()=>{
    const html=renderToStaticMarkup(<Findings risks={[{risk_code:"R",category:"FINANCIAL",severity:"HIGH",title:"Risk",description:"Risk detail",source_rule_id:"X"}]} conditions={[{condition_code:"C",severity:"MEDIUM",title:"Condition",description:"Condition detail",source_rule_id:"Y"}]} missing={[{field_key:"offtaker_credit",reason:"Needed",required_for:"UNDERWRITING",severity:"MEDIUM"}]}/>);
    expect(html).toContain("Risks"); expect(html).toContain("Conditions"); expect(html).toContain("Missing Information");
  });
  it("uses only generic lender categories supplied by backend",()=>{
    const html=renderToStaticMarkup(<LenderFitTable rows={[{lender_category:"REGIONAL_SPECIALTY_ENERGY_BANK",fit:"HIGH",reason_codes:["SMALL_PROJECT"]}]}/>);
    expect(html).toContain("Regional Specialty Energy Bank"); expect(html).not.toContain("JPMorgan");
  });
  it("keeps model warnings distinct",()=>{
    const html=renderToStaticMarkup(<ModelNotes warnings={[{code:"ILLUSTRATIVE_DOWNSIDE_NOT_P90",message:"Illustrative only"}]}/>);
    expect(html).toContain("Model Notes"); expect(html).toContain("Illustrative only");
  });
  it("handles null metrics without rendering zero",()=>{
    const html=renderToStaticMarkup(<MetricCard label="Cash-Only Sponsor IRR" value="Not available"/>);
    expect(html).toContain("Not available"); expect(html).not.toContain("0.0%");
  });
});
