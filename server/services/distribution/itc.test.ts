import { describe, it, expect } from "vitest";
import {
  computeCreditAmount,
  computeExposure,
  computeSpvExposure,
  fullYearsElapsed,
  recapturePeriodEnd,
  recordRecaptureEvent,
  vestedPct,
  type ItcPositionLike,
} from "./itc";

/**
 * Spec 17 AC 21 and AC 22 — vesting computes correctly at each anniversary, and
 * recapture exposure surfaces for the full five-year window.
 */

const PLACED_IN_SERVICE = new Date(Date.UTC(2026, 5, 15)); // 15 June 2026

function position(overrides: Partial<ItcPositionLike> = {}): ItcPositionLike {
  return {
    id: "itc-1",
    spvId: "spv-1",
    memberId: null,
    placedInServiceDate: PLACED_IN_SERVICE,
    vestingStart: PLACED_IN_SERVICE,
    creditAmount: "300000.00",
    treatment: "transferred_6418",
    recapturePeriodEnds: recapturePeriodEnd(PLACED_IN_SERVICE),
    recaptureEvents: [],
    ...overrides,
  };
}

describe("fullYearsElapsed", () => {
  it("counts on anniversary boundaries, not calendar years", () => {
    expect(fullYearsElapsed(PLACED_IN_SERVICE, new Date(Date.UTC(2027, 5, 14)))).toBe(0);
    expect(fullYearsElapsed(PLACED_IN_SERVICE, new Date(Date.UTC(2027, 5, 15)))).toBe(1);
    expect(fullYearsElapsed(PLACED_IN_SERVICE, new Date(Date.UTC(2027, 11, 31)))).toBe(1);
    expect(fullYearsElapsed(PLACED_IN_SERVICE, new Date(Date.UTC(2028, 0, 1)))).toBe(1);
  });

  it("never returns a negative", () => {
    expect(fullYearsElapsed(PLACED_IN_SERVICE, new Date(Date.UTC(2020, 0, 1)))).toBe(0);
  });
});

describe("AC 21 — vesting at each anniversary", () => {
  it("vests 20% a year for five years", () => {
    const anniversaries = [0, 1, 2, 3, 4, 5, 6].map((years) =>
      vestedPct(PLACED_IN_SERVICE, new Date(Date.UTC(2026 + years, 5, 15))),
    );
    expect(anniversaries).toEqual([0, 20, 40, 60, 80, 100, 100]);
  });

  it("does not vest early", () => {
    // One day before the third anniversary.
    expect(vestedPct(PLACED_IN_SERVICE, new Date(Date.UTC(2029, 5, 14)))).toBe(40);
    expect(vestedPct(PLACED_IN_SERVICE, new Date(Date.UTC(2029, 5, 15)))).toBe(60);
  });

  it("caps at 100%", () => {
    expect(vestedPct(PLACED_IN_SERVICE, new Date(Date.UTC(2099, 0, 1)))).toBe(100);
  });
});

describe("recapturePeriodEnd", () => {
  it("is the fifth anniversary of vesting start", () => {
    expect(recapturePeriodEnd(PLACED_IN_SERVICE).toISOString().slice(0, 10)).toBe("2031-06-15");
  });
});

describe("computeExposure", () => {
  it("splits the credit into vested and unvested", () => {
    const exposure = computeExposure(position(), new Date(Date.UTC(2029, 5, 15)));
    expect(exposure.vestedPct).toBe(60);
    expect(exposure.vestedAmount).toBe(18_000_000); // $180,000 of $300,000
    expect(exposure.unvestedAmount).toBe(12_000_000);
    expect(exposure.atRisk).toBe(true);
  });

  it("leaves nothing at risk once the window closes", () => {
    const exposure = computeExposure(position(), new Date(Date.UTC(2031, 5, 15)));
    expect(exposure.vestedPct).toBe(100);
    expect(exposure.unvestedAmount).toBe(0);
    expect(exposure.atRisk).toBe(false);
    expect(exposure.daysRemaining).toBe(0);
  });

  it("exposes the whole credit on day one", () => {
    const exposure = computeExposure(position(), PLACED_IN_SERVICE);
    expect(exposure.unvestedAmount).toBe(30_000_000);
    expect(exposure.daysRemaining).toBe(1826); // five years including one leap day
  });
});

describe("AC 22 — SPV exposure surfaces for the full window", () => {
  it("aggregates across positions and counts those still at risk", () => {
    const exposure = computeSpvExposure(
      [
        position({ id: "a" }),
        position({ id: "b", creditAmount: "100000.00" }),
        position({
          id: "closed",
          vestingStart: new Date(Date.UTC(2015, 0, 1)),
          recapturePeriodEnds: recapturePeriodEnd(new Date(Date.UTC(2015, 0, 1))),
        }),
      ],
      new Date(Date.UTC(2029, 5, 15)),
    );

    expect(exposure.totalCreditAmount).toBe(30_000_000 + 10_000_000 + 30_000_000);
    // Only the two open positions carry unvested credit.
    expect(exposure.totalUnvestedAmount).toBe(12_000_000 + 4_000_000);
    expect(exposure.positionsAtRisk).toBe(2);
  });

  it("alerts as the window approaches its end", () => {
    const exposure = computeSpvExposure([position()], new Date(Date.UTC(2031, 4, 1)), {
      alertWithinDays: 90,
    });
    expect(exposure.alerts).toHaveLength(1);
    expect(exposure.alerts[0]).toMatch(/recapture period ends in 45 days/);
  });

  it("stays quiet in the middle of the window", () => {
    const exposure = computeSpvExposure([position()], new Date(Date.UTC(2028, 0, 1)));
    expect(exposure.alerts).toEqual([]);
  });

  it("raises an un-escalated event no matter where in the window it sits", () => {
    const withEvent = position({
      recaptureEvents: [
        {
          occurredOn: "2028-03-01",
          kind: "ownership_change",
          detail: "class B secondary transfer above 20%",
          unvestedPctAtEvent: "80.000",
          escalatedAt: null,
        },
      ],
    });

    const exposure = computeSpvExposure([withEvent], new Date(Date.UTC(2028, 5, 1)));
    expect(exposure.unescalatedEvents).toHaveLength(1);
    expect(exposure.alerts[0]).toMatch(/has not been escalated for CPA review/);
  });

  it("stops raising an event once it has been escalated", () => {
    const escalated = position({
      recaptureEvents: [
        {
          occurredOn: "2028-03-01",
          kind: "disposition",
          detail: "partial sale",
          unvestedPctAtEvent: "80.000",
          escalatedAt: "2028-03-05",
        },
      ],
    });
    const exposure = computeSpvExposure([escalated], new Date(Date.UTC(2028, 5, 1)));
    expect(exposure.unescalatedEvents).toEqual([]);
    expect(exposure.alerts).toEqual([]);
  });
});

describe("recordRecaptureEvent", () => {
  it("captures what happened and how much was unvested, and nothing more", () => {
    const event = recordRecaptureEvent(position(), {
      kind: "disposition",
      detail: "project sold to a third party",
      occurredOn: new Date(Date.UTC(2029, 5, 15)),
    });

    expect(event.occurredOn).toBe("2029-06-15");
    expect(event.kind).toBe("disposition");
    expect(event.unvestedPctAtEvent).toBe("40.000");
    // Not escalated yet — that is a human action, and the tax consequence is a
    // CPA determination this function deliberately does not attempt.
    expect(event.escalatedAt).toBeNull();
    expect(Object.keys(event)).not.toContain("recaptureAmount");
  });
});

describe("computeCreditAmount", () => {
  it("applies the base rate", () => {
    expect(computeCreditAmount({ eligibleBasis: "1000000.00", creditRatePct: "30" })).toBe(
      30_000_000,
    );
  });

  it("adds bonus adders on top of the base rate", () => {
    const amount = computeCreditAmount({
      eligibleBasis: "1000000.00",
      creditRatePct: "30",
      adders: { energy_community: "10", domestic_content: "10" },
    });
    expect(amount).toBe(50_000_000); // 50% of $1,000,000
  });

  it("treats no adders as zero", () => {
    expect(
      computeCreditAmount({ eligibleBasis: "500000.00", creditRatePct: "6", adders: null }),
    ).toBe(3_000_000);
  });
});
