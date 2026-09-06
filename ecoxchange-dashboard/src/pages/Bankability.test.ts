import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/pages/Bankability.tsx", "utf8");

describe("bankability demo product surface", () => {
  it("explicitly identifies the published reference case", () => {
    expect(source).toContain('projectName: "EcoXchange 5 MW Reference Case"');
    expect(source).toContain('scenarioId: nextScenario === "BASE" ? "demo-5mw-reference-case"');
  });

  it("auto-runs the reference case through the live API on page load", () => {
    expect(source).toContain("useEffect(() => {");
    expect(source).toContain('void analyze(BASE, "BASE")');
    expect(source).toContain('fetch("/api/project-finance/analyze"');
  });

  it("renders results only from the API response and fails visibly without canned fallback values", () => {
    expect(source).toContain("setResult(body as AnalysisResult)");
    expect(source).toContain("No canned debt or sponsor-equity values are substituted.");
    expect(source).not.toContain("3_364_160");
    expect(source).not.toContain("2_097_600");
    expect(source).not.toContain("2_994_968");
  });

  it("separates financeability, readiness, and lender profile customer-facing labels", () => {
    expect(source).toContain('title="Economic Financeability"');
    expect(source).toContain('title="Transaction Readiness"');
    expect(source).toContain("Indicative Lender Profile");
  });

  it("shows results before assumptions and exposes an explicit custom-scenario control", () => {
    const resultsPosition = source.indexOf('title="Bank Debt Capacity"');
    const assumptionsPosition = source.indexOf("Explore a Custom Scenario");
    expect(resultsPosition).toBeGreaterThan(-1);
    expect(assumptionsPosition).toBeGreaterThan(resultsPosition);
    expect(source).toContain("Change assumptions");
  });
});
