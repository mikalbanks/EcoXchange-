import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const backtestSource = readFileSync(
  new URL("../../pages/backtest-report.tsx", import.meta.url),
  "utf8",
);
const performanceSource = readFileSync(
  new URL("../../pages/performance.tsx", import.meta.url),
  "utf8",
);

describe("public trust UI policy", () => {
  it("keeps the public backtest report read-only", () => {
    expect(backtestSource).toContain("Read-only evidence snapshot");
    expect(backtestSource).not.toContain("/api/public/backtest/run");
    expect(backtestSource).not.toContain("button-run-backtest");
    expect(backtestSource).not.toContain("useMutation");
  });

  it("does not certify alignment metrics with pass or checkmark semantics", () => {
    expect(backtestSource).not.toMatch(/✓ PASS|✗ FAIL|Pass @2%|Pass @5%/);
    expect(backtestSource).toContain("within ±5% band");
    expect(backtestSource).toContain("Configured Band Rate");
    expect(backtestSource).toContain('const color = "#3B82F6"');
    expect(backtestSource).not.toContain("statistics.mae < 5 ? \"#A3E635\"");
  });

  it("keeps investment actions off the public evidence page", () => {
    expect(performanceSource).not.toMatch(/Start Investing|Live Performance Data/);
    expect(performanceSource).toContain("A performance display is not an investment offer");
    expect(performanceSource).toMatch(/<Button asChild[\s\S]*?<Link href="\/backtest-report">/);
  });
});
