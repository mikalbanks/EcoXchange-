import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const workspace = read("client/src/pages/developer/bankability.tsx");
const landing = read("client/src/pages/landing.tsx");
const developers = read("client/src/pages/develop.tsx");

describe("Bankability P0 customer-facing product guards", () => {
  it.each([4.99, 5.0, 5.01])("does not identify a real %s MW project as the reference case", (capacity) => {
    expect(Number.isFinite(capacity)).toBe(true);
    expect(workspace).not.toContain("isReferenceFiveMw");
    expect(workspace).not.toContain("Math.abs(capacity - 5)");
    expect(workspace).not.toContain("capacity === 5");
    expect(workspace).toContain("p50CapacityFactor: Number.NaN");
    expect(workspace).toContain("yearOnePpaPricePerMwh: Number.NaN");
    expect(workspace).toContain("yearOneOpexUsd: Number.NaN");
    expect(workspace).toContain("itcEligibleBasisPercent: Number.NaN");
  });

  it("keeps missing real-project economics visible instead of silently substituting benchmark facts", () => {
    expect(workspace).toContain("Required to calculate financing");
    expect(workspace).toContain('placeholder={missing ? "Missing" : undefined}');
  });

  it("opens Project Economics first and keeps bank, tax-credit, and advanced assumptions collapsed", () => {
    expect(workspace).toContain('title="Project Economics"');
    expect(workspace).toContain('title="Project Economics" subtitle="Give EcoXchange the core project economics and we will analyze the financing." defaultOpen');
    expect(workspace).toContain('title="Bank Assumptions"');
    expect(workspace).toContain('title="Tax Credit Assumptions"');
    expect(workspace).toContain('title="Advanced Assumptions"');
  });

  it("renders Economic Financeability and Transaction Readiness as distinct concepts", () => {
    expect(workspace).toContain('title="Economic Financeability"');
    expect(workspace).toContain('title="Transaction Readiness"');
    expect(workspace).toContain("Measures modeled cash-flow support for indicative financing.");
    expect(workspace).toContain("Measures the completeness and maturity of lender diligence information.");
  });

  it("uses Indicative Lender Profile customer-facing terminology", () => {
    expect(workspace).toContain("Indicative Lender Profile");
    expect(workspace).toContain("This is not lender eligibility");
  });

  it("makes bankability discoverable in public positioning", () => {
    expect(landing).toContain("Understand how much permanent debt your project may support — and how much sponsor equity remains.");
    expect(landing).toContain("Explore Bankability Analysis");
    expect(developers).toContain("Bankability & Sponsor Equity Analysis");
  });

  it("does not reintroduce the obsolete customer-facing equity-underwriting claim", () => {
    const publicCopy = `${landing}\n${developers}\n${workspace}`.toLowerCase();
    expect(publicCopy).not.toContain("ecoxchange underwrites equity raises");
    expect(publicCopy).not.toContain("get bank approved");
    expect(publicCopy).not.toContain("guaranteed financing");
  });
});
