import { describe, it, expect } from "vitest";
import { runWaterfall, type MemberWaterfallResult } from "./waterfall";
import type { MemberState } from "./tiers";
import { formatCents, parseCents, sumCents, type Cents } from "./money";
import type { MemberClass, WaterfallTier } from "@shared/spec17-terms";

/**
 * Spec 17 AC 5-8.
 *
 * The reference case is the spec's own § 7.1 structure: a 7% cumulative
 * preferred return to class B, return of capital to class B, then a 20/80
 * residual split between the sponsor (A) and the investors (B).
 *
 *   B1  600 units, contributed $60,000
 *   B2  400 units, contributed $40,000
 *   A1  100 units (sponsor), contributed nothing
 *
 * Run over 24 monthly periods including two zero-cash periods and one period
 * where cash covers only part of the preferred return.
 */

const CLASSES: MemberClass[] = [
  { code: "A", name: "Sponsor", units_authorized: "100", is_sponsor: true },
  { code: "B", name: "Investor", units_authorized: "1000", is_sponsor: false },
];

const REFERENCE_TIERS: WaterfallTier[] = [
  {
    seq: 1,
    type: "preferred_return",
    class: "B",
    rate_pct: "7",
    compounding: "simple",
    basis: "unreturned_capital",
    cumulative: true,
  },
  { seq: 2, type: "return_of_capital", class: "B", target: "unreturned_capital" },
  {
    seq: 3,
    type: "residual_split",
    splits: [
      { class: "A", pct: "20" },
      { class: "B", pct: "80" },
    ],
  },
];

function initialMembers(): MemberState[] {
  return [
    {
      memberId: "A1",
      memberClass: "A",
      weightedMicroUnits: 100_000_000n,
      contributedCapital: 0,
      unreturnedCapital: 0,
      accruedUnpaidPreferred: 0,
      cumulativeDistributions: 0,
      cumulativeProfitDistributed: 0,
    },
    {
      memberId: "B1",
      memberClass: "B",
      weightedMicroUnits: 600_000_000n,
      contributedCapital: 6_000_000,
      unreturnedCapital: 6_000_000,
      accruedUnpaidPreferred: 0,
      cumulativeDistributions: 0,
      cumulativeProfitDistributed: 0,
    },
    {
      memberId: "B2",
      memberClass: "B",
      weightedMicroUnits: 400_000_000n,
      contributedCapital: 4_000_000,
      unreturnedCapital: 4_000_000,
      accruedUnpaidPreferred: 0,
      cumulativeDistributions: 0,
      cumulativeProfitDistributed: 0,
    },
  ];
}

/** Days in each month of 2026 and 2027 — neither is a leap year. */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface PeriodOutcome {
  period: number;
  daysInPeriod: number;
  distributable: Cents;
  members: MemberWaterfallResult[];
  tierResults: ReturnType<typeof runWaterfall>["tierResults"];
  undistributed: Cents;
}

/**
 * Drive a cash series through the engine, rolling member state between periods
 * exactly the way the orchestrator does.
 */
function driveSeries(
  cashSeries: Cents[],
  tiers: WaterfallTier[] = REFERENCE_TIERS,
  members: MemberState[] = initialMembers(),
): PeriodOutcome[] {
  const state = members.map((m) => ({ ...m }));
  const outcomes: PeriodOutcome[] = [];

  cashSeries.forEach((distributable, index) => {
    const daysInPeriod = MONTH_DAYS[index % 12];
    const result = runWaterfall({
      distributable,
      tiers,
      classes: CLASSES,
      members: state,
      daysInPeriod,
    });

    for (const memberResult of result.members) {
      const member = state.find((m) => m.memberId === memberResult.memberId)!;
      member.accruedUnpaidPreferred = memberResult.accruedUnpaidPreferredAfter;
      member.unreturnedCapital = Math.max(0, member.unreturnedCapital - memberResult.capitalReturned);
      member.cumulativeDistributions += memberResult.gross;
      member.cumulativeProfitDistributed += memberResult.profitDistributed;
    }

    outcomes.push({
      period: index + 1,
      daysInPeriod,
      distributable,
      members: result.members,
      tierResults: result.tierResults,
      undistributed: result.undistributed,
    });
  });

  return outcomes;
}

function gross(outcome: PeriodOutcome, memberId: string): Cents {
  return outcome.members.find((m) => m.memberId === memberId)!.gross;
}

function tier(outcome: PeriodOutcome, seq: number) {
  return outcome.tierResults.find((t) => t.seq === seq)!;
}

describe("AC 5 — reference case over 24 periods", () => {
  // $10,000/month, with two zero-cash periods and one that covers only part of
  // the preferred return.
  const CASH_SERIES: Cents[] = Array.from({ length: 24 }, (_, i) => {
    if (i === 3) return 20_000; // period 4: partial preferred
    if (i === 4 || i === 5) return 0; // periods 5 and 6: zero cash
    return 1_000_000;
  });

  const outcomes = driveSeries(CASH_SERIES);

  it("period 1 matches hand computation", () => {
    const p1 = outcomes[0];
    expect(p1.daysInPeriod).toBe(31);

    // Preferred: 7% of unreturned capital, Actual/365 Fixed, per member.
    //   B1  $60,000 × 7% × 31/365 = $356.7123  → 35,671 cents
    //   B2  $40,000 × 7% × 31/365 = $237.8082  → 23,781 cents
    const t1 = tier(p1, 1);
    expect(t1.demand).toBe("594.52");
    expect(t1.allocated).toBe("594.52");
    expect(t1.unmet).toBe("0.00");
    expect(t1.perMember).toEqual({ B1: "356.71", B2: "237.81" });

    // Return of capital takes everything left: $10,000 − $594.52 = $9,405.48,
    // split 60/40 by contributed capital with the odd cent to the largest
    // remainder (B1).
    const t2 = tier(p1, 2);
    expect(t2.demand).toBe("100000.00");
    expect(t2.allocated).toBe("9405.48");
    expect(t2.perMember).toEqual({ B1: "5643.29", B2: "3762.19" });

    // Nothing reaches the residual split while capital is outstanding.
    const t3 = tier(p1, 3);
    expect(t3.allocated).toBe("0.00");
    expect(gross(p1, "A1")).toBe(0);

    expect(sumCents(p1.members.map((m) => m.gross))).toBe(1_000_000);
    expect(p1.undistributed).toBe(0);
  });

  it("period 4 partially satisfies the preferred return and accrues the rest", () => {
    const p4 = outcomes[3];
    const t1 = tier(p4, 1);

    // Only $200 available against a demand of more than that.
    expect(parseCents(t1.demand)).toBeGreaterThan(20_000);
    expect(t1.allocated).toBe("200.00");
    expect(parseCents(t1.unmet)).toBe(parseCents(t1.demand) - 20_000);

    // The whole $200 went to the preferred tier; nothing below it was reached.
    expect(tier(p4, 2).allocated).toBe("0.00");
    expect(sumCents(p4.members.map((m) => m.gross))).toBe(20_000);

    // The shortfall becomes a claim on future cash.
    const b1 = p4.members.find((m) => m.memberId === "B1")!;
    expect(b1.accruedUnpaidPreferredAfter).toBeGreaterThan(0);
  });

  it("zero-cash periods distribute nothing but keep accruing", () => {
    const [p5, p6] = [outcomes[4], outcomes[5]];

    for (const period of [p5, p6]) {
      expect(period.distributable).toBe(0);
      expect(sumCents(period.members.map((m) => m.gross))).toBe(0);
      expect(period.undistributed).toBe(0);
      // Demand is still recorded, so the trace shows what was owed.
      expect(parseCents(tier(period, 1).demand)).toBeGreaterThan(0);
      expect(tier(period, 1).allocated).toBe("0.00");
    }

    // AC 6 — the unpaid balance grows across both dry periods.
    const after4 = outcomes[3].members.find((m) => m.memberId === "B1")!;
    const after5 = p5.members.find((m) => m.memberId === "B1")!;
    const after6 = p6.members.find((m) => m.memberId === "B1")!;
    expect(after5.accruedUnpaidPreferredAfter).toBeGreaterThan(after4.accruedUnpaidPreferredAfter);
    expect(after6.accruedUnpaidPreferredAfter).toBeGreaterThan(after5.accruedUnpaidPreferredAfter);
  });

  it("AC 6 — accumulated preferred is satisfied first in the next sufficient period", () => {
    const p6 = outcomes[5];
    const p7 = outcomes[6];

    const owedEnteringP7 = sumCents(
      p6.members.map((m) => m.accruedUnpaidPreferredAfter),
    );
    expect(owedEnteringP7).toBeGreaterThan(0);

    // Period 7's preferred demand is the carried balance plus the new accrual,
    // and with $10,000 available it is paid in full before anything else.
    const t1 = tier(p7, 1);
    expect(parseCents(t1.demand)).toBeGreaterThan(owedEnteringP7);
    expect(t1.allocated).toBe(t1.demand);
    expect(t1.unmet).toBe("0.00");

    for (const member of p7.members) {
      expect(member.accruedUnpaidPreferredAfter).toBe(0);
    }
  });

  it("reaches the residual split once capital is fully returned", () => {
    const withResidual = outcomes.filter((o) => parseCents(tier(o, 3).allocated) > 0);
    expect(withResidual.length).toBeGreaterThan(0);

    const first = withResidual[0];
    // In the period that *finishes* returning capital, the preferred still
    // accrues on the balance outstanding at the start of it — both tiers are
    // fully satisfied, and only then does the residual get anything.
    expect(tier(first, 1).unmet).toBe("0.00");
    expect(tier(first, 2).unmet).toBe("0.00");

    // From the next period on there is no capital left to accrue on at all.
    const next = outcomes[outcomes.indexOf(first) + 1];
    expect(tier(next, 1).demand).toBe("0.00");
    expect(tier(next, 2).demand).toBe("0.00");
    expect(parseCents(tier(next, 3).allocated)).toBe(next.distributable);

    // 20/80 between the sponsor and the investors. Compared against the tier 3
    // breakdown rather than gross, because B's gross in this period also
    // includes its preferred and its final return of capital.
    const residualTier = tier(first, 3);
    const residual = parseCents(residualTier.allocated);
    const sponsorShare = parseCents(residualTier.perMember.A1 ?? "0");
    const investorShare =
      parseCents(residualTier.perMember.B1 ?? "0") + parseCents(residualTier.perMember.B2 ?? "0");

    expect(sponsorShare).toBe(Math.round(residual * 0.2));
    expect(investorShare).toBe(residual - sponsorShare);
    // The sponsor holds no capital, so the residual is all it ever receives.
    expect(gross(first, "A1")).toBe(sponsorShare);
  });

  it("never creates or destroys money in any of the 24 periods", () => {
    for (const outcome of outcomes) {
      const distributed = sumCents(outcome.members.map((m) => m.gross));
      expect(distributed + outcome.undistributed).toBe(outcome.distributable);

      // Every tier's per-member payments sum to what the tier allocated.
      for (const t of outcome.tierResults) {
        const perMemberTotal = sumCents(Object.values(t.perMember).map(parseCents));
        expect(formatCents(perMemberTotal)).toBe(t.allocated);
      }
    }
  });

  it("returns exactly the contributed capital, no more", () => {
    const capitalByMember = new Map<string, Cents>([
      ["B1", 0],
      ["B2", 0],
    ]);
    for (const outcome of outcomes) {
      for (const member of outcome.members) {
        if (!capitalByMember.has(member.memberId)) continue;
        capitalByMember.set(
          member.memberId,
          capitalByMember.get(member.memberId)! + member.capitalReturned,
        );
      }
    }
    expect(capitalByMember.get("B1")).toBe(6_000_000);
    expect(capitalByMember.get("B2")).toBe(4_000_000);
  });
});

describe("AC 7 — cumulative vs non-cumulative on the same cash series", () => {
  // A dry period followed by a flush one. Cumulative recovers the shortfall;
  // non-cumulative does not.
  const CASH_SERIES: Cents[] = [0, 1_000_000];

  const cumulativeTiers: WaterfallTier[] = [
    {
      seq: 1,
      type: "preferred_return",
      class: "B",
      rate_pct: "7",
      compounding: "simple",
      basis: "unreturned_capital",
      cumulative: true,
    },
  ];

  const nonCumulativeTiers: WaterfallTier[] = [
    { ...cumulativeTiers[0], cumulative: false } as WaterfallTier,
  ];

  it("cumulative carries the missed period forward", () => {
    const outcomes = driveSeries(CASH_SERIES, cumulativeTiers);
    const p1 = outcomes[0];
    const p2 = outcomes[1];

    expect(sumCents(p1.members.map((m) => m.gross))).toBe(0);
    expect(tier(p1, 1).accrues).toBe(true);

    // Period 2's demand covers both months.
    const januaryAccrual = parseCents(tier(p1, 1).demand);
    expect(parseCents(tier(p2, 1).demand)).toBeGreaterThan(januaryAccrual);
  });

  it("non-cumulative lets the missed period expire", () => {
    const outcomes = driveSeries(CASH_SERIES, nonCumulativeTiers);
    const p1 = outcomes[0];
    const p2 = outcomes[1];

    expect(tier(p1, 1).accrues).toBe(false);
    for (const member of p1.members) {
      expect(member.accruedUnpaidPreferredAfter).toBe(0);
    }

    // Period 2 owes only February's accrual — January is gone.
    const februaryOnly = parseCents(tier(p2, 1).demand);
    expect(februaryOnly).toBeLessThan(parseCents(tier(p1, 1).demand));
  });

  it("the two diverge on identical inputs", () => {
    const cumulative = driveSeries(CASH_SERIES, cumulativeTiers);
    const nonCumulative = driveSeries(CASH_SERIES, nonCumulativeTiers);

    const cumulativePaid = sumCents(cumulative[1].members.map((m) => m.gross));
    const nonCumulativePaid = sumCents(nonCumulative[1].members.map((m) => m.gross));
    expect(cumulativePaid).toBeGreaterThan(nonCumulativePaid);
  });
});

describe("AC 8 — simple vs compound diverge by year 10", () => {
  const TEN_YEARS_OF_DRY_MONTHS: Cents[] = Array.from({ length: 120 }, () => 0);

  function accruedAfter(compounding: "simple" | "compound"): Cents {
    const tiers: WaterfallTier[] = [
      {
        seq: 1,
        type: "preferred_return",
        class: "B",
        rate_pct: "7",
        compounding,
        basis: "unreturned_capital",
        cumulative: true,
      },
    ];
    const outcomes = driveSeries(TEN_YEARS_OF_DRY_MONTHS, tiers);
    const final = outcomes[outcomes.length - 1];
    return sumCents(final.members.map((m) => m.accruedUnpaidPreferredAfter));
  }

  it("compound exceeds simple, materially", () => {
    const simple = accruedAfter("simple");
    const compound = accruedAfter("compound");

    // Simple: $100,000 × 7% × ten years of month-days ≈ $70,000.
    expect(simple).toBeGreaterThan(6_900_000);
    expect(simple).toBeLessThan(7_100_000);

    // Compound on the same series is roughly double — the divergence the spec
    // warns must never be defaulted silently.
    expect(compound).toBeGreaterThan(simple);
    expect(compound / simple).toBeGreaterThan(1.4);
  });
});

describe("pro_rata — the right default for a first offering", () => {
  it("splits everything across all units", () => {
    const tiers: WaterfallTier[] = [{ seq: 1, type: "pro_rata" }];
    const outcomes = driveSeries([1_100_000], tiers);
    const p1 = outcomes[0];

    // 100 : 600 : 400 units out of 1,100.
    expect(gross(p1, "A1")).toBe(100_000);
    expect(gross(p1, "B1")).toBe(600_000);
    expect(gross(p1, "B2")).toBe(400_000);
    expect(sumCents(p1.members.map((m) => m.gross))).toBe(1_100_000);
  });
});

describe("guards", () => {
  it("refuses a negative distributable amount", () => {
    expect(() =>
      runWaterfall({
        distributable: -1,
        tiers: REFERENCE_TIERS,
        classes: CLASSES,
        members: initialMembers(),
        daysInPeriod: 31,
      }),
    ).toThrow(/cannot be negative/);
  });

  it("leaves cash undistributed when no tier claims it", () => {
    const result = runWaterfall({
      distributable: 500_000,
      tiers: [{ seq: 1, type: "return_of_capital", class: "B", target: "unreturned_capital" }],
      classes: CLASSES,
      members: initialMembers().map((m) => ({ ...m, unreturnedCapital: 0 })),
      daysInPeriod: 31,
    });
    expect(result.totalDistributed).toBe(0);
    expect(result.undistributed).toBe(500_000);
  });
});
