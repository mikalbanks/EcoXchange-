/**
 * Spec 17 § 11.3 — cap table reconciliation, a pre-flight gate on every run.
 *
 * The transfer agent is authoritative for token holdings; this ledger is
 * authoritative for capital accounts. Before any run computes, the two are
 * compared as of the period end.
 *
 * | Condition                                  | Action  |
 * |--------------------------------------------|---------|
 * | Match                                      | Proceed |
 * | Transfer agent has a holder we lack        | Halt    |
 * | Unit counts differ                         | Halt    |
 * | We have a member the transfer agent lacks  | Halt    |
 *
 * **Every drift case halts. None proceeds with a warning.** Distributing
 * against a cap table you cannot reconcile is how money reaches the wrong
 * person.
 */
import { formatUnits, parseUnits, type MicroUnits } from "./money";
import { CapTableDrift } from "./errors";
import type { CapTableHolding } from "./ports";

export interface LocalHolding {
  memberId: string;
  investorRef: string;
  units: MicroUnits;
}

export interface CapTableReconciliation {
  reconciled: boolean;
  discrepancies: string[];
  /** Investor refs present and equal on both sides. */
  matchedRefs: string[];
  localTotalUnits: string;
  remoteTotalUnits: string;
}

/**
 * Compare local positions against the transfer agent's holdings.
 *
 * Members holding zero units are excluded from the "we have, they lack" test: a
 * fully-redeemed member legitimately disappears from the transfer agent's cap
 * table while remaining on ours forever, because their capital account history
 * does not go away.
 */
export function reconcileCapTable(
  local: LocalHolding[],
  remote: CapTableHolding[],
): CapTableReconciliation {
  const discrepancies: string[] = [];
  const matchedRefs: string[] = [];

  const localByRef = new Map<string, MicroUnits>();
  for (const holding of local) {
    localByRef.set(holding.investorRef, (localByRef.get(holding.investorRef) ?? 0n) + holding.units);
  }

  const remoteByRef = new Map<string, MicroUnits>();
  for (const holding of remote) {
    const units = parseUnits(holding.units);
    remoteByRef.set(holding.investorRef, (remoteByRef.get(holding.investorRef) ?? 0n) + units);
  }

  const allRefs = Array.from(new Set([...localByRef.keys(), ...remoteByRef.keys()])).sort();

  for (const ref of allRefs) {
    const localUnits = localByRef.get(ref);
    const remoteUnits = remoteByRef.get(ref);

    if (localUnits === undefined || localUnits === 0n) {
      if (remoteUnits !== undefined && remoteUnits !== 0n) {
        discrepancies.push(
          `transfer agent holds ${formatUnits(remoteUnits)} units for "${ref}", which has no position in this ledger`,
        );
      }
      continue;
    }

    if (remoteUnits === undefined || remoteUnits === 0n) {
      discrepancies.push(
        `this ledger holds ${formatUnits(localUnits)} units for "${ref}", which the transfer agent does not list`,
      );
      continue;
    }

    if (localUnits !== remoteUnits) {
      discrepancies.push(
        `unit count differs for "${ref}": ledger ${formatUnits(localUnits)}, transfer agent ${formatUnits(remoteUnits)}`,
      );
      continue;
    }

    matchedRefs.push(ref);
  }

  const localTotal = Array.from(localByRef.values()).reduce((a, b) => a + b, 0n);
  const remoteTotal = Array.from(remoteByRef.values()).reduce((a, b) => a + b, 0n);

  return {
    reconciled: discrepancies.length === 0,
    discrepancies,
    matchedRefs,
    localTotalUnits: formatUnits(localTotal),
    remoteTotalUnits: formatUnits(remoteTotal),
  };
}

/** The gate itself. Throws `CapTableDrift` on any discrepancy. */
export function assertCapTableReconciled(reconciliation: CapTableReconciliation): void {
  if (!reconciliation.reconciled) {
    throw new CapTableDrift(reconciliation.discrepancies);
  }
}
