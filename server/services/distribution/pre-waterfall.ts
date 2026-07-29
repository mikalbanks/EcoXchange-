/**
 * Spec 17 § 6 — the pre-waterfall stack.
 *
 *   cash_revenue          energy + REC + ITC transfer proceeds + other
 * − operating_expenses
 * = net_operating_income
 * − debt_service          P&I per schedule (0 if unlevered)
 * = cash_flow_after_debt_service
 * − reserve_funding       by priority, to target, capped per period
 * + reserve_draws         only for purposes in draw_permitted_for
 * − fees                  asset management + platform fee
 * = DISTRIBUTABLE CASH
 *
 * **The order is fixed and deliberately not configurable.** Making it a term
 * would create a way to accidentally pay investors ahead of an insurance
 * premium. Reserves fund before distributions, always — a distribution that
 * starves a reserve is a future capital call.
 *
 * Every intermediate is returned and persisted, so an investor asking "why was
 * this month lower" gets the whole trace rather than a smaller number.
 */
import {
  type Cents,
  applyMicroPercent,
  applyMicroPercentProrated,
  formatCents,
  minCents,
  sumCents,
  parseCents,
} from "./money";
import { DebtServiceHalt, ReserveDrawNotPermitted } from "./errors";
import {
  FeeBasis,
  ReserveTargetBasis,
  parseMicroPercent,
  type FeeSchedule,
} from "@shared/spec17-terms";
import type { PreWaterfallNote } from "@shared/schema";

/** Fees on a stock basis are annual rates, pro-rated Actual/365 Fixed. */
const DAY_COUNT_DENOMINATOR = 365;
/** `months_opex` reserve targets normalise the period's opex to a 30-day month. */
const DAYS_PER_MONTH = 30;

export const ReserveDrawReason = {
  OPERATING_SHORTFALL: "operating_shortfall",
  DEBT_SERVICE: "debt_service",
  EQUIPMENT_REPLACEMENT: "equipment_replacement",
  DECOMMISSIONING: "decommissioning",
} as const;

export interface ReserveState {
  id: string;
  code: string;
  targetBasis: string;
  /** Money for `fixed`/`schedule`, a month count for `months_opex`, a percent for `pct_revenue`. */
  targetValue: string;
  fundingPriority: number;
  fundingCapPerPeriod: string | null;
  drawPermittedFor: string[];
  currentBalance: Cents;
}

export interface PreWaterfallInput {
  daysInPeriod: number;
  energyRevenue: Cents;
  recRevenue: Cents;
  itcTransferProceeds: Cents;
  otherRevenue: Cents;
  /** Cash opex only — accrued-but-unpaid lines belong to the tax books. */
  totalOpex: Cents;
  debtServiceDue: Cents;
  reserves: ReserveState[];
  feeSchedule: FeeSchedule;
  /** Basis for an AUA-denominated platform fee: total contributed capital. */
  assetsUnderAdministration: Cents;
}

export interface PlannedReserveMovement {
  reserveAccountId: string;
  reserveCode: string;
  direction: "fund" | "draw";
  amount: Cents;
  reason: string;
  balanceAfter: Cents;
}

export interface FeeCharge {
  code: string;
  name: string;
  amount: Cents;
  capped: boolean;
}

export interface PreWaterfallResult {
  cashRevenue: Cents;
  lessOpex: Cents;
  netOperatingIncome: Cents;
  lessDebtService: Cents;
  cashFlowAfterDebtService: Cents;
  lessReserveFunding: Cents;
  plusReserveDraws: Cents;
  lessFees: Cents;
  distributableCash: Cents;
  reserveMovements: PlannedReserveMovement[];
  fees: FeeCharge[];
  notes: PreWaterfallNote[];
}

/**
 * Draw from a reserve, refusing any purpose the reserve does not permit.
 *
 * Exported because § 6's draw rule is a standalone invariant — a permitted draw
 * succeeds, a non-permitted one fails, and neither depends on the rest of the
 * stack.
 */
export function drawFromReserve(reserve: ReserveState, amount: Cents, reason: string): Cents {
  if (!reserve.drawPermittedFor.includes(reason)) {
    throw new ReserveDrawNotPermitted(reserve.code, reason, reserve.drawPermittedFor);
  }
  if (amount <= 0) return 0;
  return minCents(amount, Math.max(0, reserve.currentBalance));
}

/** The funding target for a reserve, per its `target_basis`. */
export function reserveTarget(
  reserve: ReserveState,
  input: { cashRevenue: Cents; totalOpex: Cents; daysInPeriod: number },
): Cents {
  switch (reserve.targetBasis) {
    case ReserveTargetBasis.FIXED:
    // A dated funding schedule is out of scope for this pass; treated as a
    // fixed target so the reserve still funds rather than being skipped.
    case ReserveTargetBasis.SCHEDULE:
      return parseCents(reserve.targetValue);

    case ReserveTargetBasis.MONTHS_OPEX: {
      const monthlyRunRate =
        input.daysInPeriod === 0
          ? 0
          : Math.round((input.totalOpex * DAYS_PER_MONTH) / input.daysInPeriod);
      const months = Number(reserve.targetValue);
      if (!Number.isFinite(months) || months < 0) {
        throw new Error(`reserve ${reserve.code}: invalid months_opex target ${reserve.targetValue}`);
      }
      return Math.round(monthlyRunRate * months);
    }

    case ReserveTargetBasis.PCT_REVENUE:
      return applyMicroPercent(input.cashRevenue, parseMicroPercent(reserve.targetValue));

    default:
      throw new Error(`reserve ${reserve.code}: unknown target_basis "${reserve.targetBasis}"`);
  }
}

export function runPreWaterfall(input: PreWaterfallInput): PreWaterfallResult {
  const notes: PreWaterfallNote[] = [];
  const reserveMovements: PlannedReserveMovement[] = [];

  // Working balances so a draw and a later fund on the same reserve compose.
  const reserves = input.reserves.map((r) => ({ ...r }));

  const cashRevenue =
    input.energyRevenue + input.recRevenue + input.itcTransferProceeds + input.otherRevenue;

  // ── Operating expenses ───────────────────────────────────────────────────
  // Revenue below opex draws from reserves that permit it. If still short, the
  // run completes with zero distribution and a stated shortfall — never a
  // negative distribution, and never a distribution that leaves opex unpaid.
  let plusReserveDraws = 0;
  let operatingShortfall = Math.max(0, input.totalOpex - cashRevenue);

  if (operatingShortfall > 0) {
    for (const reserve of reserves) {
      if (operatingShortfall <= 0) break;
      if (!reserve.drawPermittedFor.includes(ReserveDrawReason.OPERATING_SHORTFALL)) continue;

      const drawn = drawFromReserve(reserve, operatingShortfall, ReserveDrawReason.OPERATING_SHORTFALL);
      if (drawn <= 0) continue;

      reserve.currentBalance -= drawn;
      operatingShortfall -= drawn;
      plusReserveDraws += drawn;
      reserveMovements.push({
        reserveAccountId: reserve.id,
        reserveCode: reserve.code,
        direction: "draw",
        amount: drawn,
        reason: ReserveDrawReason.OPERATING_SHORTFALL,
        balanceAfter: reserve.currentBalance,
      });
      notes.push({
        code: "reserve_draw",
        detail: `drew ${formatCents(drawn)} from reserve "${reserve.code}" to cover operating expenses`,
        amount: formatCents(drawn),
      });
    }
  }

  if (operatingShortfall > 0) {
    notes.push({
      code: "funding_shortfall",
      detail:
        `operating expenses of ${formatCents(input.totalOpex)} exceed cash revenue of ` +
        `${formatCents(cashRevenue)} by ${formatCents(operatingShortfall)} after permitted reserve draws; ` +
        `no cash is available to distribute`,
      amount: formatCents(operatingShortfall),
    });

    return {
      cashRevenue,
      lessOpex: input.totalOpex,
      netOperatingIncome: cashRevenue - input.totalOpex + plusReserveDraws,
      lessDebtService: 0,
      cashFlowAfterDebtService: 0,
      lessReserveFunding: 0,
      plusReserveDraws,
      lessFees: 0,
      distributableCash: 0,
      reserveMovements,
      fees: [],
      notes,
    };
  }

  const netOperatingIncome = cashRevenue - input.totalOpex + plusReserveDraws;

  // ── Debt service ─────────────────────────────────────────────────────────
  // Unpayable debt service halts. The DSRA is not drawn automatically — that
  // requires explicit approval, because an automatic draw hides a covenant
  // breach behind a depleted reserve.
  if (input.debtServiceDue > netOperatingIncome) {
    throw new DebtServiceHalt(
      `debt service of ${formatCents(input.debtServiceDue)} exceeds net operating income of ` +
        `${formatCents(netOperatingIncome)}; halting — a DSRA draw requires explicit approval`,
      input.debtServiceDue - netOperatingIncome,
    );
  }

  const cashFlowAfterDebtService = netOperatingIncome - input.debtServiceDue;

  // ── Reserve funding ──────────────────────────────────────────────────────
  // By priority, to target, capped per period. Insufficient cash funds what it
  // can and *records* the underfunding rather than silently skipping it.
  let available = cashFlowAfterDebtService;
  let lessReserveFunding = 0;

  const byPriority = [...reserves].sort((a, b) =>
    a.fundingPriority === b.fundingPriority
      ? a.code < b.code
        ? -1
        : 1
      : a.fundingPriority - b.fundingPriority,
  );

  for (const reserve of byPriority) {
    const target = reserveTarget(reserve, {
      cashRevenue,
      totalOpex: input.totalOpex,
      daysInPeriod: input.daysInPeriod,
    });
    const need = Math.max(0, target - reserve.currentBalance);
    if (need === 0) continue;

    const cap = reserve.fundingCapPerPeriod === null ? need : parseCents(reserve.fundingCapPerPeriod);
    const wanted = minCents(need, cap);
    const funded = minCents(wanted, Math.max(0, available));

    if (funded > 0) {
      reserve.currentBalance += funded;
      available -= funded;
      lessReserveFunding += funded;
      reserveMovements.push({
        reserveAccountId: reserve.id,
        reserveCode: reserve.code,
        direction: "fund",
        amount: funded,
        reason: `funding to target (${reserve.targetBasis})`,
        balanceAfter: reserve.currentBalance,
      });
    }

    if (funded < need) {
      notes.push({
        code: "reserve_underfunded",
        detail:
          `reserve "${reserve.code}" funded ${formatCents(funded)} of ${formatCents(need)} needed ` +
          `to reach its target of ${formatCents(target)}`,
        amount: formatCents(need - funded),
      });
    }
  }

  // ── Fees ─────────────────────────────────────────────────────────────────
  const fees = computeFees(input, {
    cashRevenue,
    netOperatingIncome,
    cashFlowAfterDebtService,
    notes,
  });
  const totalFees = sumCents(fees.map((f) => f.amount));

  // Fees come after reserves, so a fee never starves a reserve; if the cash is
  // gone the fee is simply not paid this period.
  const feesPaid = minCents(totalFees, Math.max(0, available));
  if (feesPaid < totalFees) {
    notes.push({
      code: "fee_capped",
      detail:
        `fees of ${formatCents(totalFees)} exceed the ${formatCents(Math.max(0, available))} ` +
        `remaining after reserve funding; ${formatCents(totalFees - feesPaid)} unpaid this period`,
      amount: formatCents(totalFees - feesPaid),
    });
  }

  const distributableCash = Math.max(0, available - feesPaid);

  if (distributableCash === 0 && notes.every((n) => n.code !== "funding_shortfall")) {
    notes.push({
      code: "funding_shortfall",
      detail: "no cash remained after operating expenses, debt service, reserve funding and fees",
      amount: "0.00",
    });
  }

  return {
    cashRevenue,
    lessOpex: input.totalOpex,
    netOperatingIncome,
    lessDebtService: input.debtServiceDue,
    cashFlowAfterDebtService,
    lessReserveFunding,
    plusReserveDraws,
    lessFees: feesPaid,
    distributableCash,
    reserveMovements,
    fees,
    notes,
  };
}

/**
 * Fees in `priority` order.
 *
 * Rates on a *flow* basis (revenue, NOI, cash flow) apply directly to this
 * period's flow. A rate on the *stock* basis (assets under administration) is
 * an annual rate and is pro-rated by the period's day count — a 0.5% AUA
 * servicing fee is 0.5% a year, not 0.5% a month.
 */
function computeFees(
  input: PreWaterfallInput,
  flows: {
    cashRevenue: Cents;
    netOperatingIncome: Cents;
    cashFlowAfterDebtService: Cents;
    notes: PreWaterfallNote[];
  },
): FeeCharge[] {
  const ordered = [...input.feeSchedule].sort((a, b) =>
    a.priority === b.priority ? (a.code < b.code ? -1 : 1) : a.priority - b.priority,
  );

  return ordered.map((fee) => {
    let amount: Cents;

    switch (fee.basis) {
      case FeeBasis.FIXED:
        amount = parseCents(fee.amount ?? "0");
        break;
      case FeeBasis.GROSS_REVENUE:
        amount = applyMicroPercent(flows.cashRevenue, parseMicroPercent(fee.rate_pct!));
        break;
      case FeeBasis.NET_OPERATING_INCOME:
        amount = applyMicroPercent(Math.max(0, flows.netOperatingIncome), parseMicroPercent(fee.rate_pct!));
        break;
      case FeeBasis.CASH_FLOW_AFTER_DEBT_SERVICE:
        amount = applyMicroPercent(
          Math.max(0, flows.cashFlowAfterDebtService),
          parseMicroPercent(fee.rate_pct!),
        );
        break;
      case FeeBasis.ASSETS_UNDER_ADMINISTRATION:
        amount = applyMicroPercentProrated(
          input.assetsUnderAdministration,
          parseMicroPercent(fee.rate_pct!),
          input.daysInPeriod,
          DAY_COUNT_DENOMINATOR,
        );
        break;
      default:
        throw new Error(`fee ${fee.code}: unknown basis "${fee.basis}"`);
    }

    let capped = false;
    if (fee.cap !== undefined) {
      const cap = parseCents(fee.cap);
      if (amount > cap) {
        flows.notes.push({
          code: "fee_capped",
          detail: `fee "${fee.code}" computed ${formatCents(amount)}, capped at ${formatCents(cap)}`,
          amount: formatCents(amount - cap),
        });
        amount = cap;
        capped = true;
      }
    }

    return { code: fee.code, name: fee.name, amount: Math.max(0, amount), capped };
  });
}
