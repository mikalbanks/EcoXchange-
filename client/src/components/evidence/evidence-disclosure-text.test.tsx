import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  describeBacktestEvidence,
  describePerformanceEvidence,
} from "@shared/evidence-disclosure";
import { EvidenceDisclosureText } from "./evidence-disclosure-text";

describe("EvidenceDisclosureText", () => {
  it.each([
    ["SELF_REPORTED", "SELF-REPORTED DATA", "Demonstration performance"],
    ["AUTOMATED", "CONNECTED SOURCE", "not independent verification"],
    ["VERIFIED", "SGT ENGINE STATUS: VERIFIED", "engine records a verified status"],
    [undefined, "EVIDENCE NOT VERIFIED", "Source verification is not established"],
  ] as const)("renders the public performance qualification for %s", (status, badge, title) => {
    const html = renderToStaticMarkup(
      <EvidenceDisclosureText evidence={describePerformanceEvidence(status)} />,
    );

    expect(html).toContain(badge);
    expect(html).toContain(title);
    expect(html).not.toMatch(/Live Performance Data|Start Investing|three independent sources/i);
  });

  it("renders the dependent-comparison warning for stored uploads plus fallback modeling", () => {
    const html = renderToStaticMarkup(
      <EvidenceDisclosureText
        evidence={describeBacktestEvidence("stored", "SYNTHETIC_FALLBACK")}
      />,
    );

    expect(html).toContain("DEPENDENT COMPARISON");
    expect(html).toContain("ingestion origin is not encoded");
    expect(html).not.toMatch(/verified SCADA|institutional-grade|suitable for securities/i);
  });

  it("renders a neutral loading state before provenance is available", () => {
    const html = renderToStaticMarkup(
      <EvidenceDisclosureText
        evidence={describePerformanceEvidence(undefined)}
        loading
      />,
    );
    expect(html).toContain("CHECKING EVIDENCE");
    expect(html).toContain("Loading source provenance");
    expect(html).not.toContain("EVIDENCE NOT VERIFIED");
  });
});
