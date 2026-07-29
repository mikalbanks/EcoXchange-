import { describe, it, expect } from "vitest";
import {
  computeWeightedUnits,
  daysInPeriod,
  overlapDays,
  unitsOutstandingOn,
  type PositionSlice,
} from "./weighting";
import { formatUnits, parseUnits } from "./money";

/** Spec 17 AC 4 — a transfer must move economics, not duplicate or destroy them. */

const JAN_START = new Date(Date.UTC(2026, 0, 1));
const JAN_END = new Date(Date.UTC(2026, 0, 31));

describe("daysInPeriod", () => {
  it("counts both endpoints", () => {
    expect(daysInPeriod(JAN_START, JAN_END)).toBe(31);
    expect(daysInPeriod(new Date(Date.UTC(2026, 1, 1)), new Date(Date.UTC(2026, 1, 28)))).toBe(28);
    expect(daysInPeriod(JAN_START, JAN_START)).toBe(1);
  });

  it("rejects an inverted period", () => {
    expect(() => daysInPeriod(JAN_END, JAN_START)).toThrow(/precedes start/);
  });
});

describe("overlapDays", () => {
  const slice = (from: string, to: string | null): PositionSlice => ({
    memberId: "m",
    effectiveFrom: new Date(`${from}T00:00:00Z`),
    effectiveTo: to === null ? null : new Date(`${to}T00:00:00Z`),
    units: "1",
  });

  it("clips to the period", () => {
    expect(overlapDays(slice("2025-06-01", null), JAN_START, JAN_END)).toBe(31);
    expect(overlapDays(slice("2026-01-16", null), JAN_START, JAN_END)).toBe(16);
    expect(overlapDays(slice("2026-01-01", "2026-01-15"), JAN_START, JAN_END)).toBe(15);
  });

  it("returns zero for a slice entirely outside the period", () => {
    expect(overlapDays(slice("2025-01-01", "2025-12-31"), JAN_START, JAN_END)).toBe(0);
    expect(overlapDays(slice("2026-02-01", null), JAN_START, JAN_END)).toBe(0);
  });
});

describe("computeWeightedUnits — AC 4", () => {
  it("weights a full-period holding at its face units", () => {
    const result = computeWeightedUnits(
      [
        { memberId: "a", effectiveFrom: JAN_START, effectiveTo: null, units: "600" },
        { memberId: "b", effectiveFrom: JAN_START, effectiveTo: null, units: "400" },
      ],
      JAN_START,
      JAN_END,
    );

    expect(result.daysInPeriod).toBe(31);
    expect(result.totalWeightedUnits).toBe("1000.000000");
    expect(result.members.find((m) => m.memberId === "a")!.weightedUnits).toBe("600.000000");
    expect(result.members.find((m) => m.memberId === "b")!.weightedUnits).toBe("400.000000");
  });

  it("splits a mid-period transfer without duplicating or losing units", () => {
    // 1,000 units move from `a` to `b` on 16 January: `a` holds days 1-15,
    // `b` holds days 16-31.
    const slices: PositionSlice[] = [
      {
        memberId: "a",
        effectiveFrom: JAN_START,
        effectiveTo: new Date(Date.UTC(2026, 0, 15)),
        units: "1000",
      },
      {
        memberId: "b",
        effectiveFrom: new Date(Date.UTC(2026, 0, 16)),
        effectiveTo: null,
        units: "1000",
      },
    ];

    const result = computeWeightedUnits(slices, JAN_START, JAN_END);

    // Outstanding is 1,000 units for every one of the 31 days.
    expect(result.totalWeightedUnits).toBe("1000.000000");

    const a = result.members.find((m) => m.memberId === "a")!;
    const b = result.members.find((m) => m.memberId === "b")!;

    // 1000 × 15/31 and 1000 × 16/31.
    expect(a.weightedUnits).toBe("483.870968");
    expect(b.weightedUnits).toBe("516.129032");

    // AC 4: the parts sum to the whole, exactly.
    expect(a.weightedMicroUnits + b.weightedMicroUnits).toBe(result.totalWeightedMicroUnits);
    expect(result.totalWeightedMicroUnits).toBe(parseUnits("1000"));
  });

  it("keeps a member who held nothing this period, with zero weight", () => {
    const result = computeWeightedUnits(
      [
        { memberId: "a", effectiveFrom: JAN_START, effectiveTo: null, units: "100" },
        {
          memberId: "gone",
          effectiveFrom: new Date(Date.UTC(2025, 0, 1)),
          effectiveTo: new Date(Date.UTC(2025, 11, 31)),
          units: "500",
        },
      ],
      JAN_START,
      JAN_END,
    );

    const gone = result.members.find((m) => m.memberId === "gone")!;
    expect(gone.weightedUnits).toBe("0.000000");
    expect(result.totalWeightedUnits).toBe("100.000000");
  });

  it("sums exactly with awkward day splits across many members", () => {
    // Seven members each entering on a different day — the kind of split that
    // does not divide evenly by 31.
    const slices: PositionSlice[] = Array.from({ length: 7 }, (_, i) => ({
      memberId: `m${i}`,
      effectiveFrom: new Date(Date.UTC(2026, 0, 1 + i * 3)),
      effectiveTo: null,
      units: "333.333333",
    }));

    const result = computeWeightedUnits(slices, JAN_START, JAN_END);
    const summed = result.members.reduce((acc, m) => acc + m.weightedMicroUnits, 0n);
    expect(formatUnits(summed)).toBe(result.totalWeightedUnits);
  });

  it("handles an empty cap table", () => {
    const result = computeWeightedUnits([], JAN_START, JAN_END);
    expect(result.totalWeightedUnits).toBe("0.000000");
    expect(result.members).toEqual([]);
  });
});

describe("unitsOutstandingOn", () => {
  it("reports point-in-time holdings for the cap table gate", () => {
    const slices: PositionSlice[] = [
      {
        memberId: "a",
        effectiveFrom: JAN_START,
        effectiveTo: new Date(Date.UTC(2026, 0, 15)),
        units: "1000",
      },
      {
        memberId: "b",
        effectiveFrom: new Date(Date.UTC(2026, 0, 16)),
        effectiveTo: null,
        units: "1000",
      },
    ];

    const onThe10th = unitsOutstandingOn(slices, new Date(Date.UTC(2026, 0, 10)));
    expect(onThe10th.get("a")).toBe(parseUnits("1000"));
    expect(onThe10th.get("b")).toBe(0n);

    const onThe20th = unitsOutstandingOn(slices, new Date(Date.UTC(2026, 0, 20)));
    expect(onThe20th.get("a")).toBe(0n);
    expect(onThe20th.get("b")).toBe(parseUnits("1000"));
  });
});
