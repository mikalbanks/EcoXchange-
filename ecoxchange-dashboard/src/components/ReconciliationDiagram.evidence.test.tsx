import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describeVerificationEvidence } from "../data/index.js";
import { PVDAQ_9068_PROJECT_ID } from "../data/demo-pvdaq-9068.js";
import { ReconciliationDiagram } from "./ReconciliationDiagram.js";
import type { VerificationRecord } from "../utils/types.js";

const record: VerificationRecord = {
  period_start: "2024-01-01",
  expected_kwh: 100,
  inverter_kwh: 98,
  utility_kwh: 97,
  inv_vs_expected_pct: -2,
  inv_vs_utility_pct: 1.03,
  util_vs_expected_pct: -3,
  status: "verified",
  flag_reasons: [],
  estimated_revenue: 0,
};

function renderEvidence(id: string, mode: "demo" | "supabase") {
  const evidence = describeVerificationEvidence(id, mode);
  return renderToStaticMarkup(
    <ReconciliationDiagram
      record={record}
      title={evidence.diagramTitle}
      sourceLabels={{
        inverter: evidence.sourceNames.inverter,
        utility: evidence.sourceNames.utility,
        expected: evidence.sourceNames.satellite,
      }}
    />,
  );
}

describe("ReconciliationDiagram evidence labels", () => {
  it("uses the evidence-aware satellite label in the irradiance section", () => {
    const source = readFileSync(
      new URL("../pages/VerificationDetail.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("{evidence.sourceNames.satellite}");
    expect(source).not.toContain('>NASA POWER</dd>');
  });

  it("retains conservative generic labels when no evidence descriptor is supplied", () => {
    const html = renderToStaticMarkup(<ReconciliationDiagram record={record} />);
    expect(html).toContain("Source Comparison");
    expect(html).toContain("Inverter");
    expect(html).toContain("Utility Meter");
    expect(html).toContain("Modeled Expected Generation");
  });

  it("labels the PVDAQ utility leg as derived", () => {
    const html = renderEvidence(PVDAQ_9068_PROJECT_ID, "demo");
    expect(html).toContain("Measured and Modeled Source Comparison");
    expect(html).toContain("Utility Proxy (Derived)");
    expect(html).toContain("Measured Inverter Telemetry");
  });

  it("labels the Savannah sources as simulated", () => {
    const html = renderEvidence("demo-savannah-5mw", "demo");
    expect(html).toContain("Simulated Source Comparison");
    expect(html).toContain("Simulated Utility Meter");
    expect(html).not.toContain("Three-Way Reconciliation");
  });

  it("labels database source bases as unstated", () => {
    const html = renderEvidence("project-from-db", "supabase");
    expect(html).toContain("Stored Source Comparison");
    expect(html).toContain("Utility Meter (Basis Unstated)");
    expect(html).toContain("Inverter Telemetry (Basis Unstated)");
  });
});
