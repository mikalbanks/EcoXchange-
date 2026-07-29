import { describe, it, expect } from "vitest";
import {
  assertBalancesMatchLedger,
  assertEquityReconciles,
  contributionEntry,
  distributionEntry,
  incomeAllocationEntry,
  prepareEntries,
  recomputeBalances,
  reversalEntry,
  syndicationCostEntry,
  type LedgerEntry,
  type PendingEntry,
} from "./capital-accounts";
import { formatCents, type Cents } from "./money";

/**
 * Spec 17 AC 14, 15, 17 — book and tax are independently correct across a
 * 36-period sequence; recomputed balances match stored balances at every
 * period; a reversal restores prior state without editing the original.
 */

const P = (month: number) => new Date(Date.UTC(2026 + Math.floor(month / 12), month % 12, 1));

/** Persist a batch the way the orchestrator does, assigning `seq` monotonically. */
function commit(ledger: LedgerEntry[], pending: PendingEntry[]): LedgerEntry[] {
  // Opening balances come from replaying the ledger, which is the authoritative
  // definition — never from the stored `*_balance_after` columns.
  const byMember = new Map<string, LedgerEntry[]>();
  for (const entry of ledger) {
    const bucket = byMember.get(entry.memberId) ?? [];
    bucket.push(entry);
    byMember.set(entry.memberId, bucket);
  }

  const opening = new Map<string, { book: Cents; tax: Cents }>();
  for (const [memberId, entries] of byMember) {
    opening.set(memberId, recomputeBalances(entries));
  }

  let seq = ledger.length;
  const prepared = prepareEntries(pending, opening);
  const written = prepared.map((entry) => ({
    id: `e${++seq}`,
    memberId: entry.memberId,
    entryType: entry.entryType,
    periodStart: entry.periodStart,
    bookAmount: formatCents(entry.bookAmount),
    taxAmount: formatCents(entry.taxAmount),
    bookBalanceAfter: formatCents(entry.bookBalanceAfter),
    taxBalanceAfter: formatCents(entry.taxBalanceAfter),
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    reversesEntryId: entry.reversesEntryId ?? null,
    reason: entry.reason ?? null,
    seq,
  }));
  return [...ledger, ...written];
}

function entriesFor(ledger: LedgerEntry[], memberId: string): LedgerEntry[] {
  return ledger.filter((e) => e.memberId === memberId);
}

describe("entry constructors carry the right book and tax signs", () => {
  it("a contribution raises both books equally", () => {
    const entry = contributionEntry({
      memberId: "m",
      periodStart: P(0),
      amount: 100_000,
      sourceType: "subscription",
      sourceId: null,
    });
    expect(entry.bookAmount).toBe(100_000);
    expect(entry.taxAmount).toBe(100_000);
  });

  it("a distribution lowers both books equally", () => {
    const entry = distributionEntry({
      memberId: "m",
      periodStart: P(0),
      amount: 25_000,
      distributionRunId: "run-1",
    });
    expect(entry.bookAmount).toBe(-25_000);
    expect(entry.taxAmount).toBe(-25_000);
  });

  it("income allocations carry independent book and tax shares", () => {
    const entry = incomeAllocationEntry({
      memberId: "m",
      periodStart: P(0),
      bookShare: 10_000,
      taxShare: 4_000, // tax depreciation runs ahead of book
      sourceType: "tax_allocation",
      sourceId: null,
    });
    expect(entry.bookAmount).toBe(10_000);
    expect(entry.taxAmount).toBe(4_000);
    expect(entry.entryType).toBe("income_allocation");
  });

  it("classifies a negative allocation as a loss", () => {
    const entry = incomeAllocationEntry({
      memberId: "m",
      periodStart: P(0),
      bookShare: -5_000,
      taxShare: -9_000,
      sourceType: "tax_allocation",
      sourceId: null,
    });
    expect(entry.entryType).toBe("loss_allocation");
  });

  it("syndication costs reduce book but are not deductible for tax", () => {
    const entry = syndicationCostEntry({
      memberId: "m",
      periodStart: P(0),
      amount: 15_000,
      sourceType: "offering_cost",
      sourceId: null,
    });
    expect(entry.bookAmount).toBe(-15_000);
    expect(entry.taxAmount).toBe(0);
  });
});

describe("AC 14 / AC 15 — a 36-period sequence", () => {
  // Two members. Contributions up front, then monthly distributions, an annual
  // income allocation whose tax share differs from book, and one loss year.
  let ledger: LedgerEntry[] = [];

  ledger = commit(ledger, [
    contributionEntry({
      memberId: "m1",
      periodStart: P(0),
      amount: 6_000_000,
      sourceType: "subscription",
      sourceId: null,
    }),
    contributionEntry({
      memberId: "m2",
      periodStart: P(0),
      amount: 4_000_000,
      sourceType: "subscription",
      sourceId: null,
    }),
    syndicationCostEntry({
      memberId: "m1",
      periodStart: P(0),
      amount: 90_000,
      sourceType: "offering_cost",
      sourceId: null,
    }),
    syndicationCostEntry({
      memberId: "m2",
      periodStart: P(0),
      amount: 60_000,
      sourceType: "offering_cost",
      sourceId: null,
    }),
  ]);

  for (let month = 0; month < 36; month++) {
    ledger = commit(ledger, [
      distributionEntry({
        memberId: "m1",
        periodStart: P(month),
        amount: 30_000,
        distributionRunId: `run-${month}`,
      }),
      distributionEntry({
        memberId: "m2",
        periodStart: P(month),
        amount: 20_000,
        distributionRunId: `run-${month}`,
      }),
    ]);

    // Year end: income allocation where tax and book legitimately diverge.
    if (month % 12 === 11) {
      const lossYear = month === 23;
      ledger = commit(ledger, [
        incomeAllocationEntry({
          memberId: "m1",
          periodStart: P(month),
          bookShare: lossYear ? -120_000 : 240_000,
          taxShare: lossYear ? -300_000 : 90_000,
          sourceType: "tax_allocation",
          sourceId: null,
        }),
        incomeAllocationEntry({
          memberId: "m2",
          periodStart: P(month),
          bookShare: lossYear ? -80_000 : 160_000,
          taxShare: lossYear ? -200_000 : 60_000,
          sourceType: "tax_allocation",
          sourceId: null,
        }),
      ]);
    }
  }

  it("AC 15 — recomputed balances match stored balances at every entry", () => {
    assertBalancesMatchLedger("m1", entriesFor(ledger, "m1"));
    assertBalancesMatchLedger("m2", entriesFor(ledger, "m2"));
  });

  it("AC 14 — book and tax are independently correct", () => {
    const m1 = recomputeBalances(entriesFor(ledger, "m1"));

    // Book:  6,000,000 − 90,000 − 36×30,000 + 2×240,000 − 120,000 = 5,349,000
    expect(m1.book).toBe(6_000_000 - 90_000 - 36 * 30_000 + 2 * 240_000 - 120_000);
    // Tax:   syndication costs are capitalized, so they never hit the tax book,
    //        and the tax shares differ from book in every allocation year.
    expect(m1.tax).toBe(6_000_000 - 36 * 30_000 + 2 * 90_000 - 300_000);

    // The two books have genuinely diverged.
    expect(m1.book).not.toBe(m1.tax);
  });

  it("invariant 2 — member book balances sum to SPV book equity", () => {
    const balances = new Map([
      ["m1", recomputeBalances(entriesFor(ledger, "m1"))],
      ["m2", recomputeBalances(entriesFor(ledger, "m2"))],
    ]);
    const equity = balances.get("m1")!.book + balances.get("m2")!.book;

    expect(() => assertEquityReconciles(balances, equity)).not.toThrow();
    expect(() => assertEquityReconciles(balances, equity + 1)).toThrow(/SPV book equity/);
  });

  it("detects a tampered stored balance", () => {
    const tampered = entriesFor(ledger, "m1").map((entry, index) =>
      index === 5 ? { ...entry, bookBalanceAfter: "1.00" } : entry,
    );
    expect(() => assertBalancesMatchLedger("m1", tampered)).toThrow(/does not match ledger sum/);
  });
});

describe("AC 17 — reversal restores prior state without editing the original", () => {
  it("nets the original to zero and leaves it untouched", () => {
    let ledger: LedgerEntry[] = [];
    ledger = commit(ledger, [
      contributionEntry({
        memberId: "m1",
        periodStart: P(0),
        amount: 1_000_000,
        sourceType: "subscription",
        sourceId: null,
      }),
    ]);

    const before = recomputeBalances(entriesFor(ledger, "m1"));

    ledger = commit(ledger, [
      distributionEntry({
        memberId: "m1",
        periodStart: P(1),
        amount: 250_000,
        distributionRunId: "run-bad",
      }),
    ]);

    const mistaken = ledger[ledger.length - 1];
    const snapshot = { ...mistaken };
    expect(recomputeBalances(entriesFor(ledger, "m1")).book).toBe(750_000);

    ledger = commit(ledger, [
      reversalEntry({ original: mistaken, periodStart: P(2), reason: "duplicate distribution run" }),
    ]);

    // Prior state restored.
    expect(recomputeBalances(entriesFor(ledger, "m1"))).toEqual(before);

    // The original row is byte-identical to what it was.
    expect(ledger.find((e) => e.id === snapshot.id)).toEqual(snapshot);

    // The reversal points at what it reverses and states why.
    const reversal = ledger[ledger.length - 1];
    expect(reversal.reversesEntryId).toBe(mistaken.id);
    expect(reversal.reason).toBe("duplicate distribution run");
    expect(reversal.entryType).toBe("reversal");

    // Balances still tie out end to end.
    assertBalancesMatchLedger("m1", entriesFor(ledger, "m1"));
  });

  it("reverses book and tax independently", () => {
    const original: LedgerEntry = {
      id: "e1",
      memberId: "m1",
      entryType: "income_allocation",
      periodStart: P(0),
      bookAmount: "240.00",
      taxAmount: "90.00",
      bookBalanceAfter: "240.00",
      taxBalanceAfter: "90.00",
      sourceType: "tax_allocation",
      sourceId: null,
      reversesEntryId: null,
      reason: null,
      seq: 1,
    };

    const reversal = reversalEntry({ original, periodStart: P(1), reason: "restated allocation" });
    expect(reversal.bookAmount).toBe(-24_000);
    expect(reversal.taxAmount).toBe(-9_000);
  });

  it("refuses a reversal with no stated reason", () => {
    const original: LedgerEntry = {
      id: "e1",
      memberId: "m1",
      entryType: "distribution",
      periodStart: P(0),
      bookAmount: "-10.00",
      taxAmount: "-10.00",
      bookBalanceAfter: "-10.00",
      taxBalanceAfter: "-10.00",
      sourceType: "distribution_run",
      sourceId: "run-1",
      reversesEntryId: null,
      reason: null,
      seq: 1,
    };
    expect(() => reversalEntry({ original, periodStart: P(1), reason: "   " })).toThrow(
      /stated reason/,
    );
  });
});

describe("prepareEntries", () => {
  it("applies a batch in order for the same member", () => {
    const prepared = prepareEntries(
      [
        incomeAllocationEntry({
          memberId: "m",
          periodStart: P(0),
          bookShare: 100,
          taxShare: 50,
          sourceType: "t",
          sourceId: null,
        }),
        distributionEntry({ memberId: "m", periodStart: P(0), amount: 30, distributionRunId: "r" }),
      ],
      new Map([["m", { book: 1_000, tax: 1_000 }]]),
    );

    expect(prepared[0].bookBalanceAfter).toBe(1_100);
    expect(prepared[1].bookBalanceAfter).toBe(1_070);
    expect(prepared[1].taxBalanceAfter).toBe(1_020);
  });

  it("starts a member with no history at zero", () => {
    const prepared = prepareEntries(
      [
        contributionEntry({
          memberId: "new",
          periodStart: P(0),
          amount: 500,
          sourceType: "subscription",
          sourceId: null,
        }),
      ],
      new Map(),
    );
    expect(prepared[0].bookBalanceAfter).toBe(500);
  });
});
