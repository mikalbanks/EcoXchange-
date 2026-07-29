/**
 * Spec 17 — failures that are decisions, not bugs.
 *
 * Each of these represents the engine correctly refusing to proceed. They are
 * distinct classes so the API layer can map them to the right status code and
 * so a caller can tell "this period cannot close yet" apart from "this code
 * threw".
 */

/** § 5 — a gate on period close did not pass. */
export class PeriodBlocked extends Error {
  readonly gate: "verification" | "revenue_reconciliation" | "bank_reconciliation" | "period_state";

  constructor(gate: PeriodBlocked["gate"], message: string) {
    super(message);
    this.name = "PeriodBlocked";
    this.gate = gate;
  }
}

/**
 * § 6 — debt service could not be paid from operating cash. Halt immediately
 * and escalate; the DSRA is not drawn without explicit approval, because doing
 * so silently converts a covenant problem into a reserve problem.
 */
export class DebtServiceHalt extends Error {
  readonly shortfallCents: number;

  constructor(message: string, shortfallCents: number) {
    super(message);
    this.name = "DebtServiceHalt";
    this.shortfallCents = shortfallCents;
  }
}

/** § 11.3 — the cap table did not reconcile. Every drift case halts. */
export class CapTableDrift extends Error {
  readonly discrepancies: string[];

  constructor(discrepancies: string[]) {
    super(`cap table does not reconcile: ${discrepancies.join("; ")}`);
    this.name = "CapTableDrift";
    this.discrepancies = discrepancies;
  }
}

/** § 4.1 / § 11.1 — a governance gate blocked the action. */
export class GateNotSatisfied extends Error {
  readonly gate: string;

  constructor(gate: string, message: string) {
    super(message);
    this.name = "GateNotSatisfied";
    this.gate = gate;
  }
}

/** § 6 — a draw cited a purpose the reserve does not permit. */
export class ReserveDrawNotPermitted extends Error {
  constructor(reserveCode: string, reason: string, permitted: string[]) {
    super(
      `reserve "${reserveCode}" does not permit a draw for "${reason}" ` +
        `(permitted: ${permitted.length > 0 ? permitted.join(", ") : "none"})`,
    );
    this.name = "ReserveDrawNotPermitted";
  }
}
