/**
 * Spec 17 § 2.8 / § 7.4 — the money path.
 *
 * Every amount in this engine is an integer number of cents. Every unit count
 * is an integer number of micro-units (1e-6, matching `NUMERIC(20,6)`). No
 * value in this file is ever produced by `parseFloat`, `Number()` on a decimal
 * string, or floating-point division — a cent created or destroyed by rounding
 * is a defect, not a tolerance.
 *
 * The database returns `NUMERIC` columns as strings. `parseCents` is the only
 * sanctioned way in, and `formatCents` the only way back out.
 */
import { parseMicroPercent, ONE_PERCENT_MICRO } from "@shared/spec17-terms";

/** An integer number of cents. Never fractional, never a float. */
export type Cents = number;

/** An integer number of micro-units (1e-6 of a unit). */
export type MicroUnits = bigint;

export const MICRO_UNITS_PER_UNIT = 1_000_000n;

/** Percent → cents divisor: `micro_pct / (100 * 1e6)`. */
const MICRO_PERCENT_DIVISOR = 100n * BigInt(ONE_PERCENT_MICRO);

// ─── Parsing and formatting ─────────────────────────────────────────────────

const MONEY_RE = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * `"1234.56"` → `123456`. String arithmetic only.
 *
 * Throws above `Number.MAX_SAFE_INTEGER` cents (~$90 trillion) rather than
 * silently losing precision. `NUMERIC(18,2)` can technically hold more than a
 * JS integer can represent exactly, and a silently-wrong balance is worse than
 * a loud failure.
 */
export function parseCents(value: string | null | undefined): Cents {
  if (value === null || value === undefined) return 0;
  const trimmed = value.trim();
  const match = MONEY_RE.exec(trimmed);
  if (!match) {
    throw new Error(`invalid money string: ${JSON.stringify(value)}`);
  }
  const [, sign, whole, fraction = ""] = match;
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`money value exceeds safe integer range: ${value}`);
  }
  const result = Number(cents);
  return sign === "-" ? -result : result;
}

/** `123456` → `"1234.56"`. Always two decimal places. */
export function formatCents(cents: Cents): string {
  assertInteger(cents, "formatCents");
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const remainder = abs - whole * 100;
  return `${negative ? "-" : ""}${whole}.${String(remainder).padStart(2, "0")}`;
}

const UNITS_RE = /^(\d+)(?:\.(\d{1,6}))?$/;

/** `"1000.5"` → `1000500000n` micro-units. */
export function parseUnits(value: string | null | undefined): MicroUnits {
  if (value === null || value === undefined) return 0n;
  const match = UNITS_RE.exec(value.trim());
  if (!match) {
    throw new Error(`invalid units string: ${JSON.stringify(value)}`);
  }
  const [, whole, fraction = ""] = match;
  return BigInt(whole) * MICRO_UNITS_PER_UNIT + BigInt(fraction.padEnd(6, "0"));
}

/** `1000500000n` → `"1000.500000"`. Always six decimal places. */
export function formatUnits(units: MicroUnits): string {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / MICRO_UNITS_PER_UNIT;
  const fraction = abs % MICRO_UNITS_PER_UNIT;
  return `${negative ? "-" : ""}${whole}.${String(fraction).padStart(6, "0")}`;
}

// ─── Rate application ───────────────────────────────────────────────────────

/**
 * Apply a percent (as a terms string, e.g. `"7.0"`) to a cents base.
 *
 * Computed in `BigInt` because `cents × micro_percent` overflows the safe
 * integer range for perfectly ordinary amounts. Rounds half away from zero,
 * deterministically — the same inputs always yield the same cent.
 */
export function applyPercent(base: Cents, percent: string): Cents {
  return applyMicroPercent(base, parseMicroPercent(percent));
}

export function applyMicroPercent(base: Cents, microPercent: number): Cents {
  assertInteger(base, "applyMicroPercent base");
  const negative = base < 0;
  const numerator = BigInt(Math.abs(base)) * BigInt(microPercent);
  const rounded = divideRoundHalfUp(numerator, MICRO_PERCENT_DIVISOR);
  const result = Number(rounded);
  if (!Number.isSafeInteger(result)) {
    throw new Error(`percent application overflowed safe integer range`);
  }
  return negative ? -result : result;
}

/**
 * Apply a percent *and* a period fraction in one rounding step:
 * `base × micro_pct / (100 × 1e6) × numerator / denominator`.
 *
 * Single-shot because chaining `applyMicroPercent` into `prorate` rounds twice,
 * and a preferred return that rounds twice a month diverges from one that
 * rounds once over a ten-year hold.
 */
export function applyMicroPercentProrated(
  base: Cents,
  microPercent: number,
  numerator: number,
  denominator: number,
): Cents {
  assertInteger(base, "applyMicroPercentProrated base");
  if (denominator <= 0) throw new Error("day-count denominator must be positive");
  if (numerator < 0) throw new Error("day-count numerator must be non-negative");

  const negative = base < 0;
  const product = BigInt(Math.abs(base)) * BigInt(microPercent) * BigInt(numerator);
  const divisor = MICRO_PERCENT_DIVISOR * BigInt(denominator);
  const result = Number(divideRoundHalfUp(product, divisor));
  if (!Number.isSafeInteger(result)) {
    throw new Error("prorated percent application overflowed safe integer range");
  }
  return negative ? -result : result;
}

/**
 * Pro-rate an amount across a fraction of a period — used for daily accrual of
 * a preferred return. Exact: `base × numerator / denominator`, half-up.
 */
export function prorate(base: Cents, numerator: number, denominator: number): Cents {
  assertInteger(base, "prorate base");
  if (denominator <= 0) throw new Error("prorate denominator must be positive");
  const negative = base < 0;
  const scaled = divideRoundHalfUp(BigInt(Math.abs(base)) * BigInt(numerator), BigInt(denominator));
  const result = Number(scaled);
  if (!Number.isSafeInteger(result)) {
    throw new Error("prorate overflowed safe integer range");
  }
  return negative ? -result : result;
}

function divideRoundHalfUp(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

// ─── § 7.4 Allocation ───────────────────────────────────────────────────────

export interface AllocationWeight {
  id: string;
  weight: MicroUnits;
}

/**
 * Largest-remainder allocation. The sum of the outputs equals `total` EXACTLY.
 *
 * Every per-tier and per-member split in the engine goes through this one
 * function, so there is a single place where money could be created or
 * destroyed by rounding — and it asserts that it wasn't.
 *
 * Ties on the remainder are broken by ascending `id`, which makes the result
 * reproducible on replay rather than dependent on input order (§ 2.1).
 */
export function allocateByWeights(total: Cents, weights: AllocationWeight[]): Map<string, Cents> {
  assertInteger(total, "allocateByWeights total");
  if (total < 0) {
    throw new Error(`cannot allocate a negative amount: ${total}`);
  }

  const exact = largestRemainder(BigInt(total), weights);
  const result = new Map<string, Cents>();
  for (const [id, value] of exact) {
    const asNumber = Number(value);
    if (!Number.isSafeInteger(asNumber)) {
      throw new Error(`allocation for ${id} overflowed safe integer range`);
    }
    result.set(id, asNumber);
  }

  assertSumEquals(result, total, "allocateByWeights");
  return result;
}

/**
 * The largest-remainder core, in exact integer arithmetic. Shared by the cents
 * allocator above and by the day-weighted unit calculation in `weighting.ts`,
 * so both round the same way and both sum exactly to their input.
 */
export function largestRemainder(total: bigint, weights: AllocationWeight[]): Map<string, bigint> {
  const result = new Map<string, bigint>();
  for (const w of weights) {
    if (w.weight < 0n) throw new Error(`negative weight for ${w.id}`);
    if (result.has(w.id)) throw new Error(`duplicate weight id: ${w.id}`);
    result.set(w.id, 0n);
  }

  if (total === 0n) return result;

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0n);
  if (totalWeight === 0n) {
    throw new Error("cannot allocate a non-zero amount across zero total weight");
  }

  const remainders: { id: string; remainder: bigint }[] = [];
  let assigned = 0n;

  for (const w of weights) {
    const numerator = total * w.weight;
    const floor = numerator / totalWeight;
    remainders.push({ id: w.id, remainder: numerator % totalWeight });
    result.set(w.id, floor);
    assigned += floor;
  }

  // Hand out the leftover, largest remainder first. Ties break on ascending id
  // so the result is reproducible on replay rather than input-order dependent.
  let leftover = total - assigned;
  remainders.sort((a, b) => {
    if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  for (const entry of remainders) {
    if (leftover <= 0n) break;
    result.set(entry.id, result.get(entry.id)! + 1n);
    leftover -= 1n;
  }

  return result;
}

/**
 * The § 7.4 guard: assert before persisting, fail the run on mismatch. Money is
 * never created or destroyed by rounding, and this is where we prove it.
 */
export function assertSumEquals(
  allocations: Map<string, Cents> | Cents[],
  expected: Cents,
  context: string,
): void {
  const values = allocations instanceof Map ? Array.from(allocations.values()) : allocations;
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum !== expected) {
    throw new Error(
      `${context}: allocations sum to ${formatCents(sum)} but expected ${formatCents(expected)} ` +
        `(difference ${formatCents(sum - expected)})`,
    );
  }
}

export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;
  for (const v of values) {
    assertInteger(v, "sumCents");
    total += v;
  }
  return total;
}

/** `min(a, b)` with both operands checked — used all through the tier loop. */
export function minCents(a: Cents, b: Cents): Cents {
  assertInteger(a, "minCents");
  assertInteger(b, "minCents");
  return a < b ? a : b;
}

function assertInteger(value: number, context: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${context}: expected an integer number of cents, got ${value}`);
  }
}
