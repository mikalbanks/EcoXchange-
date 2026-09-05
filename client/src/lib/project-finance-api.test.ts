import { describe, expect, it } from "vitest";
import { canRunAnalyze, displaySource, dscr, humanize, isWithinV0Scope, percentFromDecimal, percentToDecimal } from "./project-finance-api";

describe("Ticket 14 project-finance UI adapters",()=>{
  it("maps resolver provenance to sponsor-facing source labels without value inference",()=>{
    expect(displaySource("VERIFIED_PROJECT_FACT")).toBe("Fact");
    expect(displaySource("DOCUMENT_FACT")).toBe("Document");
    expect(displaySource("POLICY_DEFAULT")).toBe("EcoXchange Assumption");
    expect(displaySource("SCENARIO_ASSUMPTION")).toBe("Custom Scenario");
    expect(displaySource("POLICY_OVERRIDE")).toBe("Override");
  });
  it("uses explicit percent-decimal adapters",()=>{
    expect(percentFromDecimal(.30)).toContain("30");
    expect(percentToDecimal("30")).toBe(.30);
    expect(()=>percentToDecimal("thirty")).toThrow();
  });
  it("formats DSCR as a ratio and never percent",()=>{
    expect(dscr(1.3)).toBe("1.30x");
  });
  it("humanizes status enums while preserving the underlying API value",()=>{
    expect(humanize("PASS_WITH_CONDITIONS")).toBe("Pass With Conditions");
    expect(humanize("INDEPENDENT_ENGINEER_P90")).toBe("Independent Engineer P90");
  });
  it("applies only product-scope gating, not underwriting thresholds",()=>{
    const base={technology:"SOLAR_PV",country_code:"US",capacity_mw_ac:5,revenue_structure:"FULLY_CONTRACTED"};
    expect(isWithinV0Scope(base as any)).toBe(true);
    expect(isWithinV0Scope({...base,capacity_mw_ac:.99} as any)).toBe(false);
    expect(isWithinV0Scope({...base,revenue_structure:"MERCHANT"} as any)).toBe(false);
  });
  it("allows analysis only when backend says calculation-ready, scope is valid, and saves are complete",()=>{
    const p={technology:"SOLAR_PV",country_code:"US",capacity_mw_ac:5,revenue_structure:"FULLY_CONTRACTED"};
    expect(canRunAnalyze({calculation_ready:true} as any,p as any,0)).toBe(true);
    expect(canRunAnalyze({calculation_ready:false} as any,p as any,0)).toBe(false);
    expect(canRunAnalyze({calculation_ready:true} as any,p as any,1)).toBe(false);
  });
});
