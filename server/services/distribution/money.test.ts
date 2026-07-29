import { describe, it, expect } from "vitest";
import {
  allocateByWeights,
  applyMicroPercentProrated,
  applyPercent,
  assertSumEquals,
  formatCents,
  formatUnits,
  largestRemainder,
  parseCents,
  parseUnits,
  prorate,
  sumCents,
} from "./money";

/**
 * Spec 17 AC 1 and AC 2 live here: all money arithmetic is integer cents, and
 * the sum of member allocations equals distributable cash exactly across
 * 10,000 randomised runs with adversarial unit counts and amounts.
 */

describe("parseCents / formatCents", () => {
  it("parses money strings exactly", () => {
    expect(parseCents("0")).toBe(0);
    expect(parseCents("0.00")).toBe(0);
    expect(parseCents("1234.56")).toBe(123456);
    expect(parseCents("1234.5")).toBe(123450);
    expect(parseCents("1234")).toBe(123400);
    expect(parseCents("-98.10")).toBe(-9810);
    expect(parseCents(null)).toBe(0);
    expect(parseCents(undefined)).toBe(0);
  });

  it("survives values a float would corrupt", () => {
    // 0.1 + 0.2 !== 0.3 in binary floating point; in cents it is exact.
    expect(parseCents("0.10") + parseCents("0.20")).toBe(parseCents("0.30"));
    // A value with more significant digits than a double can hold exactly.
    expect(parseCents("9007199254740.99")).toBe(900719925474099);
  });

  it("refuses malformed input rather than coercing it", () => {
    expect(() => parseCents("1,234.56")).toThrow(/invalid money string/);
    expect(() => parseCents("1.234")).toThrow(/invalid money string/);
    expect(() => parseCents("abc")).toThrow(/invalid money string/);
    expect(() => parseCents("1e3")).toThrow(/invalid money string/);
  });

  it("refuses amounts beyond exact integer representation", () => {
    expect(() => parseCents("99999999999999999.00")).toThrow(/safe integer range/);
  });

  it("round-trips", () => {
    for (const value of ["0.00", "1.05", "999.99", "-42.07", "1000000.00"]) {
      expect(formatCents(parseCents(value))).toBe(value === "-42.07" ? "-42.07" : value);
    }
  });
});

describe("parseUnits / formatUnits", () => {
  it("handles six decimal places exactly", () => {
    expect(parseUnits("1000")).toBe(1_000_000_000n);
    expect(parseUnits("1000.5")).toBe(1_000_500_000n);
    expect(parseUnits("0.000001")).toBe(1n);
    expect(formatUnits(1_000_500_000n)).toBe("1000.500000");
  });
});

describe("applyPercent", () => {
  it("applies a rate exactly and rounds half away from zero", () => {
    expect(applyPercent(100_000, "7")).toBe(7_000);
    expect(applyPercent(100_000, "7.5")).toBe(7_500);
    // 1 cent at 50% is half a cent, which rounds up.
    expect(applyPercent(1, "50")).toBe(1);
    expect(applyPercent(1, "49")).toBe(0);
  });

  it("does not overflow on large balances", () => {
    // A naive `cents * micro_pct` would exceed Number.MAX_SAFE_INTEGER here.
    expect(applyPercent(900_719_925_474_099, "7")).toBe(63_050_394_783_187);
  });
});

describe("applyMicroPercentProrated", () => {
  it("rounds once, not twice", () => {
    // 7% of $10,000 for 31/365 days = $59.4520...  → 5945 cents.
    expect(applyMicroPercentProrated(1_000_000, 7_000_000, 31, 365)).toBe(5_945);
  });

  it("matches a full year exactly", () => {
    expect(applyMicroPercentProrated(1_000_000, 7_000_000, 365, 365)).toBe(70_000);
  });
});

describe("prorate", () => {
  it("splits exactly", () => {
    expect(prorate(1000, 1, 3)).toBe(333);
    expect(prorate(1000, 2, 3)).toBe(667);
  });
});

describe("allocateByWeights — AC 2", () => {
  it("returns zero for every member when there is nothing to allocate", () => {
    const result = allocateByWeights(0, [
      { id: "a", weight: 1n },
      { id: "b", weight: 2n },
    ]);
    expect(Array.from(result.values())).toEqual([0, 0]);
  });

  it("splits evenly when weights are equal", () => {
    const result = allocateByWeights(300, [
      { id: "a", weight: 1n },
      { id: "b", weight: 1n },
      { id: "c", weight: 1n },
    ]);
    expect(result.get("a")).toBe(100);
    expect(result.get("b")).toBe(100);
    expect(result.get("c")).toBe(100);
  });

  it("gives the odd cent to the largest remainder, deterministically", () => {
    // 100 cents across three equal holders: 33/33/33 with 1 left over.
    const first = allocateByWeights(100, [
      { id: "a", weight: 1n },
      { id: "b", weight: 1n },
      { id: "c", weight: 1n },
    ]);
    expect(sumCents(first.values())).toBe(100);
    // Ties break on ascending id, so the same input always yields the same map.
    const second = allocateByWeights(100, [
      { id: "c", weight: 1n },
      { id: "b", weight: 1n },
      { id: "a", weight: 1n },
    ]);
    expect(Object.fromEntries(first)).toEqual(Object.fromEntries(second));
    expect(first.get("a")).toBe(34);
  });

  it("never allocates to a zero-weight member", () => {
    const result = allocateByWeights(999, [
      { id: "a", weight: 0n },
      { id: "b", weight: 1n },
    ]);
    expect(result.get("a")).toBe(0);
    expect(result.get("b")).toBe(999);
  });

  it("refuses a negative amount", () => {
    expect(() => allocateByWeights(-1, [{ id: "a", weight: 1n }])).toThrow(/negative amount/);
  });

  it("refuses to allocate a non-zero amount across zero total weight", () => {
    expect(() => allocateByWeights(100, [{ id: "a", weight: 0n }])).toThrow(/zero total weight/);
  });

  it("sums exactly across 10,000 randomised adversarial runs", () => {
    // Deterministic PRNG so a failure is reproducible from the seed alone.
    let seed = 0x5eed_1717;
    const next = () => {
      seed = (seed * 1_103_515_245 + 12_345) & 0x7fff_ffff;
      return seed;
    };

    for (let run = 0; run < 10_000; run++) {
      const memberCount = 1 + (next() % 40);
      const weights = Array.from({ length: memberCount }, (_, i) => {
        const shape = next() % 5;
        // Adversarial unit counts: a lone dust holder against a whale, prime
        // numbers that never divide evenly, and exact zeroes.
        const weight =
          shape === 0
            ? 0n
            : shape === 1
              ? 1n
              : shape === 2
                ? BigInt(999_983 * (1 + (next() % 7)))
                : shape === 3
                  ? BigInt(next()) * 1_000_000n
                  : BigInt(next() % 1_000);
        return { id: `m${String(i).padStart(3, "0")}`, weight };
      });

      if (weights.every((w) => w.weight === 0n)) weights[0].weight = 1n;

      // Adversarial amounts: zero, one cent, primes, and very large sums.
      const shape = next() % 4;
      const total =
        shape === 0 ? 0 : shape === 1 ? 1 : shape === 2 ? next() % 1_000_003 : next() * 977;

      const allocation = allocateByWeights(total, weights);

      expect(sumCents(allocation.values())).toBe(total);
      for (const [id, amount] of allocation) {
        expect(Number.isSafeInteger(amount)).toBe(true);
        expect(amount).toBeGreaterThanOrEqual(0);
        if (weights.find((w) => w.id === id)!.weight === 0n) {
          expect(amount).toBe(0);
        }
      }
    }
  });
});

describe("largestRemainder", () => {
  it("is exact on bigint totals beyond Number range", () => {
    const total = 10n ** 25n;
    const result = largestRemainder(total, [
      { id: "a", weight: 1n },
      { id: "b", weight: 2n },
    ]);
    expect(Array.from(result.values()).reduce((a, b) => a + b, 0n)).toBe(total);
  });

  it("rejects duplicate ids rather than silently overwriting one", () => {
    expect(() =>
      largestRemainder(10n, [
        { id: "a", weight: 1n },
        { id: "a", weight: 1n },
      ]),
    ).toThrow(/duplicate weight id/);
  });
});

describe("assertSumEquals", () => {
  it("reports the difference when a sum is wrong", () => {
    expect(() => assertSumEquals([100, 200], 500, "test")).toThrow(/difference -2\.00/);
  });
});
