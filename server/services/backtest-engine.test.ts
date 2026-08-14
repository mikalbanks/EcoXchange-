import { afterEach, describe, expect, it } from "vitest";

import { assertUtcPowerAlignment, runBacktest } from "./backtest-engine";

const originalSolcastKey = process.env.SOLCAST_API_KEY;

afterEach(() => {
  if (originalSolcastKey === undefined) delete process.env.SOLCAST_API_KEY;
  else process.env.SOLCAST_API_KEY = originalSolcastKey;
});

describe("backtest UTC alignment", () => {
  it("places a California solar peak in the UTC evening", async () => {
    delete process.env.SOLCAST_API_KEY;

    const report = await runBacktest({
      siteId: "utc-alignment-regression",
      siteName: "UTC alignment regression",
      latitude: 32.8476,
      longitude: -115.5695,
      capacityKw: 12_000,
      arrayType: "fixed",
      startDate: "2024-06-15",
      endDate: "2024-06-15",
      meterDataSource: "synthetic",
    });

    expect(report.statistics.peakProductionHour).toBeGreaterThanOrEqual(18);
    expect(report.statistics.peakProductionHour).toBeLessThanOrEqual(21);
  });

  it("rejects power assigned to UTC hours when the sun is below the horizon", () => {
    expect(() => assertUtcPowerAlignment([
      {
        timestamp: "2024-06-15T11:00:00.000Z",
        hour: 11,
        satelliteKw: 1_000,
        meterKw: 1_000,
        deltaKw: 0,
        deltaPct: 0,
        handshakeCleared2Pct: true,
        handshakeCleared5Pct: true,
      },
    ], {
      latitude: 32.8476,
      longitude: -115.5695,
    })).toThrow(/below the horizon/);
  });
});
