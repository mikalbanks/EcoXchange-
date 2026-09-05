import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IllustrativeDownsideNotice, MissingInputsPanel, ScenarioStatusBanner, SourceBadge } from "./project-finance-workspace";

describe("Ticket 14 underwriting workspace components",()=>{
  it("renders accessible provenance source text",()=>{
    const html=renderToStaticMarkup(<SourceBadge field={{field_key:"financing.target_dscr",value:1.3,resolution_source:"POLICY_DEFAULT",policy_default_used:true,override_used:false} as any}/>);
    expect(html).toContain("EcoXchange Assumption");
    expect(html).toContain("Source:");
  });
  it("explains stale state without removing historical results",()=>{
    const html=renderToStaticMarkup(<ScenarioStatusBanner status="STALE"/>);
    expect(html).toContain("Existing results remain historical");
    expect(html).toContain("run a new analysis");
  });
  it("separates calculation-required and readiness information",()=>{
    const html=renderToStaticMarkup(<MissingInputsPanel financeMissing={["transaction_costs.project_capex"]} readinessMissing={["underwriting.offtaker_credit_status"]}/>);
    expect(html).toContain("Required to calculate");
    expect(html).toContain("Needed for stronger underwriting");
  });
  it("never labels an illustrative percentage-of-P50 case as lender P90",()=>{
    const html=renderToStaticMarkup(<IllustrativeDownsideNotice/>);
    expect(html).toContain("not an independent-engineer P90");
    expect(html).toContain("modeling stress");
  });
});
