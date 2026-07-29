/**
 * Spec 17 § 8 — capital accounts.
 *
 * Every money movement writes a ledger entry. No exceptions.
 *
 * | Event            | Book       | Tax                              |
 * |------------------|------------|----------------------------------|
 * | Contribution     | + amount   | + amount                         |
 * | Distribution     | − amount   | − amount                         |
 * | Income alloc.    | + share    | + share (may differ)             |
 * | Loss alloc.      | − share    | − share (may differ)             |
 * | Syndication cost | − share    | not deductible — capitalized     |
 *
 * Book and tax diverge immediately: depreciation methods differ, and ITC basis
 * reduction applies to tax basis only. Both columns are always populated and
 * neither is derived from the other by assumption.
 *
 * The ledger is append-only. `UPDATE` and `DELETE` are rejected at the database
 * layer (see `migrations/0009_distribution_waterfall.sql`); corrections are
 * `reversal` entries with a stated reason. A distribution ledger that can be
 * edited is worthless as evidence.
 */
import { type Cents, formatCents, parseCents } from "./money";
import { CapEntryType } from "@shared/schema";

export interface LedgerEntry {
  id: string;
  memberId: string;
  entryType: string;
  periodStart: Date;
  bookAmount: string;
  taxAmount: string;
  bookBalanceAfter: string;
  taxBalanceAfter: string;
  sourceType: string;
  sourceId: string | null;
  reversesEntryId: string | null;
  reason: string | null;
  seq: number;
}

export interface PendingEntry {
  memberId: string;
  entryType: string;
  periodStart: Date;
  bookAmount: Cents;
  taxAmount: Cents;
  sourceType: string;
  sourceId: string | null;
  reversesEntryId?: string | null;
  reason?: string | null;
}

export interface PreparedEntry extends PendingEntry {
  bookBalanceAfter: Cents;
  taxBalanceAfter: Cents;
}

export interface Balances {
  book: Cents;
  tax: Cents;
}

/**
 * Recompute a member's balances by summing the ledger from the beginning.
 *
 * This is the authoritative definition of a capital account balance — the
 * stored `*_balance_after` columns are a convenience for reading, and
 * `assertBalancesMatchLedger` proves they agree.
 */
export function recomputeBalances(entries: LedgerEntry[]): Balances {
  let book = 0;
  let tax = 0;
  for (const entry of orderEntries(entries)) {
    book += parseCents(entry.bookAmount);
    tax += parseCents(entry.taxAmount);
  }
  return { book, tax };
}

/** Ledger order is by `seq`, which the database assigns monotonically. */
export function orderEntries<T extends { seq: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.seq - b.seq);
}

/**
 * Invariant 1 of § 8: `book_balance_after` equals the sum of all prior book
 * amounts for that member. Recomputed and asserted on every write, and
 * re-checkable at any time against the stored history.
 */
export function assertBalancesMatchLedger(memberId: string, entries: LedgerEntry[]): void {
  let book = 0;
  let tax = 0;

  for (const entry of orderEntries(entries)) {
    book += parseCents(entry.bookAmount);
    tax += parseCents(entry.taxAmount);

    const storedBook = parseCents(entry.bookBalanceAfter);
    const storedTax = parseCents(entry.taxBalanceAfter);

    if (storedBook !== book) {
      throw new Error(
        `capital account ${memberId}, entry ${entry.id} (seq ${entry.seq}): book balance ` +
          `${formatCents(storedBook)} does not match ledger sum ${formatCents(book)}`,
      );
    }
    if (storedTax !== tax) {
      throw new Error(
        `capital account ${memberId}, entry ${entry.id} (seq ${entry.seq}): tax balance ` +
          `${formatCents(storedTax)} does not match ledger sum ${formatCents(tax)}`,
      );
    }
  }
}

/**
 * Invariant 2 of § 8: the sum of member book balances equals SPV book equity.
 */
export function assertEquityReconciles(
  memberBalances: Map<string, Balances>,
  spvBookEquity: Cents,
): void {
  const total = Array.from(memberBalances.values()).reduce((sum, b) => sum + b.book, 0);
  if (total !== spvBookEquity) {
    throw new Error(
      `member book balances sum to ${formatCents(total)} but SPV book equity is ` +
        `${formatCents(spvBookEquity)} (difference ${formatCents(total - spvBookEquity)})`,
    );
  }
}

/**
 * Stamp running balances onto a batch of new entries.
 *
 * Entries for the same member are applied in the order given, so a batch that
 * contains both an income allocation and a distribution for one member lands
 * with the balances in that sequence.
 */
export function prepareEntries(
  pending: PendingEntry[],
  openingBalances: Map<string, Balances>,
): PreparedEntry[] {
  const running = new Map<string, Balances>();
  for (const [memberId, balance] of openingBalances) {
    running.set(memberId, { ...balance });
  }

  return pending.map((entry) => {
    const current = running.get(entry.memberId) ?? { book: 0, tax: 0 };
    const next: Balances = {
      book: current.book + entry.bookAmount,
      tax: current.tax + entry.taxAmount,
    };
    running.set(entry.memberId, next);

    return { ...entry, bookBalanceAfter: next.book, taxBalanceAfter: next.tax };
  });
}

// ─── Entry constructors ─────────────────────────────────────────────────────
//
// One per row of the § 8 table, so the book/tax signs live in exactly one place
// rather than at every call site.

export function contributionEntry(args: {
  memberId: string;
  periodStart: Date;
  amount: Cents;
  sourceType: string;
  sourceId: string | null;
}): PendingEntry {
  return {
    memberId: args.memberId,
    entryType: CapEntryType.CONTRIBUTION,
    periodStart: args.periodStart,
    bookAmount: args.amount,
    taxAmount: args.amount,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
  };
}

export function distributionEntry(args: {
  memberId: string;
  periodStart: Date;
  amount: Cents;
  distributionRunId: string;
}): PendingEntry {
  return {
    memberId: args.memberId,
    entryType: CapEntryType.DISTRIBUTION,
    periodStart: args.periodStart,
    bookAmount: -args.amount,
    taxAmount: -args.amount,
    sourceType: "distribution_run",
    sourceId: args.distributionRunId,
  };
}

/** Book and tax shares are passed separately because they legitimately differ. */
export function incomeAllocationEntry(args: {
  memberId: string;
  periodStart: Date;
  bookShare: Cents;
  taxShare: Cents;
  sourceType: string;
  sourceId: string | null;
}): PendingEntry {
  return {
    memberId: args.memberId,
    entryType: args.bookShare >= 0 ? CapEntryType.INCOME_ALLOCATION : CapEntryType.LOSS_ALLOCATION,
    periodStart: args.periodStart,
    bookAmount: args.bookShare,
    taxAmount: args.taxShare,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
  };
}

/**
 * Syndication costs reduce book capital but are **not deductible** — they are
 * capitalized for tax, so the tax column is zero rather than mirroring book.
 */
export function syndicationCostEntry(args: {
  memberId: string;
  periodStart: Date;
  amount: Cents;
  sourceType: string;
  sourceId: string | null;
}): PendingEntry {
  return {
    memberId: args.memberId,
    entryType: CapEntryType.SYNDICATION_COST,
    periodStart: args.periodStart,
    bookAmount: -args.amount,
    taxAmount: 0,
    sourceType: args.sourceType,
    sourceId: args.sourceId,
  };
}

/**
 * Invariant 3 of § 8: no entry may be modified. A correction is a new entry
 * with the opposite signs, pointing at what it reverses and carrying a stated
 * reason — the original stays exactly as written.
 */
export function reversalEntry(args: {
  original: LedgerEntry;
  periodStart: Date;
  reason: string;
}): PendingEntry {
  if (!args.reason.trim()) {
    throw new Error("a reversal must carry a stated reason");
  }
  return {
    memberId: args.original.memberId,
    entryType: CapEntryType.REVERSAL,
    periodStart: args.periodStart,
    bookAmount: -parseCents(args.original.bookAmount),
    taxAmount: -parseCents(args.original.taxAmount),
    sourceType: args.original.sourceType,
    sourceId: args.original.sourceId,
    reversesEntryId: args.original.id,
    reason: args.reason,
  };
}
