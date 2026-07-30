/**
 * Spec 17 § 13 — the distribution engine's HTTP surface.
 *
 * Paths follow the specification verbatim (`/api/v1/spv/{id}/...`), which makes
 * this the first versioned prefix in the repository — everything else is flat
 * `/api/...`. That is deliberate: this is a new, self-contained, formally
 * specified surface, and the spec names the paths.
 *
 * Every mutating route is ADMIN-only and every one of them is audited. Reads
 * are ADMIN-only too, except a member's own capital account.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  CapTableDrift,
  DebtServiceHalt,
  GateNotSatisfied,
  PeriodBlocked,
  ReserveDrawNotPermitted,
  computeDistributionRun,
  ENGINE_VERSION,
} from "../services/distribution";
import {
  approveRun,
  assertNoUnresolvedSettlement,
  reverseRun,
  submitRun,
} from "../services/distribution/execution";
import * as repo from "../services/distribution/repository";
import { isConnectionError } from "../db";
import { defaultDeps, defaultSubmitter } from "../services/distribution/default-deps";
import { checkCloseGates, splitExpenses } from "../services/distribution/period-close";
import { reconcileCapTable, type LocalHolding } from "../services/distribution/cap-table";
import { computeSpvExposure } from "../services/distribution/itc";
import {
  assertBalancesMatchLedger,
  recomputeBalances,
} from "../services/distribution/capital-accounts";
import { formatCents, parseCents } from "../services/distribution/money";
import { unitsOutstandingOn, type PositionSlice } from "../services/distribution/weighting";

type RequireRole = (...roles: string[]) => (req: any, res: any, next: any) => void;
type RequireAuth = (req: any, res: any, next: any) => void;

const BASE = "/api/v1/spv/:spvId";

/**
 * Map the engine's refusals onto status codes.
 *
 * Each of these is the engine correctly declining to proceed, not a crash, so
 * they are 409 Conflict rather than 500 — and the message is the operator's
 * instruction for what to fix.
 */
function handleError(error: unknown, res: Response, context: string): void {
  if (
    error instanceof PeriodBlocked ||
    error instanceof CapTableDrift ||
    error instanceof GateNotSatisfied ||
    error instanceof DebtServiceHalt
  ) {
    res.status(409).json({
      message: (error as Error).message,
      kind: (error as Error).name,
      ...(error instanceof PeriodBlocked ? { gate: error.gate } : {}),
      ...(error instanceof GateNotSatisfied ? { gate: error.gate } : {}),
      ...(error instanceof CapTableDrift ? { discrepancies: error.discrepancies } : {}),
    });
    return;
  }

  if (error instanceof ReserveDrawNotPermitted) {
    res.status(400).json({ message: error.message, kind: error.name });
    return;
  }

  // The waterfall engine is the one admin surface that genuinely needs Postgres
  // (everything else reads MemStorage). Say so plainly instead of a bare 500, so
  // the UI can distinguish "no data yet" from "database is down".
  if (isConnectionError(error)) {
    console.error(`[Spec 17] ${context}: database unavailable`);
    res.status(503).json({
      message:
        "The distribution engine needs the database, which is currently unreachable.",
      kind: "DATABASE_UNAVAILABLE",
    });
    return;
  }

  console.error(`[Spec 17] ${context}:`, error);
  res.status(500).json({ message: `${context} failed` });
}

/** `2026-01` or `2026-01-01` → the UTC first instant of that period. */
function parsePeriod(value: string): Date {
  const monthly = /^(\d{4})-(\d{2})$/.exec(value);
  if (monthly) {
    return new Date(Date.UTC(Number(monthly[1]), Number(monthly[2]) - 1, 1));
  }
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (daily) {
    return new Date(Date.UTC(Number(daily[1]), Number(daily[2]) - 1, Number(daily[3])));
  }
  throw new GateNotSatisfied("period", `unrecognised period "${value}"; expected YYYY-MM or YYYY-MM-DD`);
}

const closeSchema = z.object({
  bankReconciledBy: z.string().min(1, "name the human who reconciled the bank"),
  bankReconciledAt: z.string().datetime().optional(),
});

const approveSchema = z.object({
  approvedBy: z.string().min(1, "approval requires a named human").optional(),
});

const reverseSchema = z.object({
  reason: z.string().min(1, "a reversal must carry a stated reason"),
});

export function registerDistributionRoutes(
  app: Express,
  requireRole: RequireRole,
  requireAuth: RequireAuth,
): void {
  const admin = requireRole("ADMIN");

  // ─── SPVs ────────────────────────────────────────────────────────────────

  app.get("/api/v1/spvs", admin, async (_req, res) => {
    try {
      res.json(await repo.listSpvs());
    } catch (error) {
      handleError(error, res, "list SPVs");
    }
  });

  app.get(BASE, admin, async (req, res) => {
    try {
      const spv = await repo.getSpv(req.params.spvId);
      if (!spv) return res.status(404).json({ message: "SPV not found" });

      const [terms, periods, runs, projectRows] = await Promise.all([
        repo.getEffectiveTerms(req.params.spvId, new Date()),
        repo.listPeriods(req.params.spvId),
        repo.listRuns(req.params.spvId),
        repo.getProjectsOfSpv(req.params.spvId),
      ]);

      res.json({
        spv,
        terms: terms ?? null,
        counselConfirmed: terms?.counselConfirmedAt != null,
        periods,
        runs: runs.slice().reverse(),
        projects: projectRows.map((p) => ({ id: p.id, name: p.name, status: p.status })),
        engineVersion: ENGINE_VERSION,
      });
    } catch (error) {
      handleError(error, res, "load SPV");
    }
  });

  // ─── Periods ─────────────────────────────────────────────────────────────

  app.get(`${BASE}/periods/:period/financials`, admin, async (req, res) => {
    try {
      const period = await repo.getPeriod(req.params.spvId, parsePeriod(req.params.period));
      if (!period) return res.status(404).json({ message: "period not found" });

      const expenses = splitExpenses(period.expenses);
      res.json({
        period,
        cashOpex: formatCents(expenses.paid),
        accruedOpex: formatCents(expenses.accrued),
      });
    } catch (error) {
      handleError(error, res, "load period financials");
    }
  });

  app.post(`${BASE}/periods/:period/close`, admin, async (req: any, res) => {
    try {
      const body = closeSchema.parse(req.body ?? {});
      const periodStart = parsePeriod(req.params.period);

      const period = await repo.getPeriod(req.params.spvId, periodStart);
      if (!period) return res.status(404).json({ message: "period not found" });

      const gates = await checkCloseGates(
        {
          spvId: req.params.spvId,
          periodStart,
          periodEnd: period.periodEnd,
          closedBy: req.user.email,
          bankReconciledAt: body.bankReconciledAt
            ? new Date(body.bankReconciledAt)
            : (period.bankReconciledAt ?? new Date()),
          bankReconciledBy: body.bankReconciledBy,
        },
        defaultDeps(),
      );

      const closed = await repo.closePeriod(req.params.spvId, periodStart, {
        closedBy: req.user.email,
        verificationRecordIds: gates.verificationRecordIds,
        revenueReconciliationIds: gates.revenueReconciliationIds,
      });

      res.json({ period: closed, warnings: gates.warnings });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? "invalid request" });
      }
      handleError(error, res, "close period");
    }
  });

  // ─── Distribution runs ───────────────────────────────────────────────────

  app.get(`${BASE}/distributions`, admin, async (req, res) => {
    try {
      const runs = await repo.listRuns(req.params.spvId);
      res.json(runs.slice().reverse());
    } catch (error) {
      handleError(error, res, "list distribution runs");
    }
  });

  app.post(`${BASE}/distributions/compute`, admin, async (req, res) => {
    try {
      const periodStart = parsePeriod(String(req.body?.period ?? ""));

      // § 11.4 — an unresolved settlement exception blocks the next period.
      await assertNoUnresolvedSettlement(req.params.spvId);

      const result = await computeDistributionRun({
        spvId: req.params.spvId,
        periodStart,
        deps: defaultDeps(),
        allowReplay: req.body?.allowReplay === true,
      });

      res.status(201).json(result);
    } catch (error) {
      handleError(error, res, "compute distribution run");
    }
  });

  app.get(`${BASE}/distributions/:runId`, admin, async (req, res) => {
    try {
      const run = await repo.getRun(req.params.runId);
      if (!run || run.spvId !== req.params.spvId) {
        return res.status(404).json({ message: "distribution run not found" });
      }
      const allocations = await repo.listAllocations([run.id]);
      res.json({ run, allocations });
    } catch (error) {
      handleError(error, res, "load distribution run");
    }
  });

  /**
   * The investor transparency product: verified production → cash revenue →
   * expenses → reserves → fees → distributable → tier by tier → this member's
   * amount. Every step, one call.
   */
  app.get(`${BASE}/distributions/:runId/trace`, admin, async (req, res) => {
    try {
      const run = await repo.getRun(req.params.runId);
      if (!run || run.spvId !== req.params.spvId) {
        return res.status(404).json({ message: "distribution run not found" });
      }

      const [allocations, period, terms, members, movements] = await Promise.all([
        repo.listAllocations([run.id]),
        repo.getPeriod(run.spvId, run.periodStart),
        repo.getTermsById(run.waterfallTermsId),
        repo.listMembers(run.spvId),
        repo.listReserveMovements(run.spvId),
      ]);

      const memberById = new Map(members.map((m) => [m.id, m]));

      res.json({
        run: {
          id: run.id,
          periodStart: run.periodStart,
          periodEnd: run.periodEnd,
          status: run.status,
          engineVersion: run.engineVersion,
          computedAt: run.computedAt,
          approvedBy: run.approvedBy,
          approvedAt: run.approvedAt,
          settledAt: run.settledAt,
        },
        terms: terms
          ? {
              version: terms.version,
              sourceDocumentPath: terms.sourceDocumentPath,
              counselConfirmedAt: terms.counselConfirmedAt,
              counselConfirmedBy: terms.counselConfirmedBy,
              tiers: terms.tiers,
              classes: terms.classes,
            }
          : null,
        production: {
          verificationRecordIds: period?.verificationRecordIds ?? [],
          revenueReconciliationIds: period?.revenueReconciliationIds ?? [],
        },
        // § 6, in the order the stack runs.
        preWaterfall: [
          { label: "Cash revenue", amount: run.cashRevenue, sign: "+" },
          { label: "Operating expenses", amount: run.lessOpex, sign: "−" },
          { label: "Debt service", amount: run.lessDebtService, sign: "−" },
          { label: "Reserve funding", amount: run.lessReserveFunding, sign: "−" },
          { label: "Reserve draws", amount: run.plusReserveDraws, sign: "+" },
          { label: "Fees", amount: run.lessFees, sign: "−" },
          { label: "Distributable cash", amount: run.distributableCash, sign: "=" },
        ],
        notes: run.notes,
        reserveMovements: movements.filter((m) => m.distributionRunId === run.id),
        tiers: run.tierResults,
        allocations: allocations.map((allocation) => ({
          ...allocation,
          memberName: memberById.get(allocation.memberId)?.legalName ?? "(unknown)",
        })),
        totals: {
          totalDistributed: run.totalDistributed,
          roundingResidual: run.roundingResidual,
          carriedForward: run.carriedForward,
        },
      });
    } catch (error) {
      handleError(error, res, "build distribution trace");
    }
  });

  app.post(`${BASE}/distributions/:runId/approve`, admin, async (req: any, res) => {
    try {
      approveSchema.parse(req.body ?? {});
      const run = await repo.getRun(req.params.runId);
      if (!run || run.spvId !== req.params.spvId) {
        return res.status(404).json({ message: "distribution run not found" });
      }

      // The approver is the authenticated admin, never a value from the body —
      // "named human" means the person who actually clicked.
      const approved = await approveRun({ runId: run.id, approvedBy: req.user.email });

      await storage.createApprovalLog({
        projectId: run.spvId,
        adminId: req.user.id,
        action: "DISTRIBUTION_APPROVED",
        note: `Spec 17 run ${run.id} for period ${run.periodStart.toISOString().slice(0, 10)}: ${run.totalDistributed} approved`,
      } as any);

      res.json(approved);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? "invalid request" });
      }
      handleError(error, res, "approve distribution run");
    }
  });

  app.post(`${BASE}/distributions/:runId/submit`, admin, async (req: any, res) => {
    try {
      const run = await repo.getRun(req.params.runId);
      if (!run || run.spvId !== req.params.spvId) {
        return res.status(404).json({ message: "distribution run not found" });
      }

      const submitted = await submitRun({ runId: run.id, submitter: defaultSubmitter });

      await storage.createApprovalLog({
        projectId: run.spvId,
        adminId: req.user.id,
        action: "DISTRIBUTION_SUBMITTED",
        note: `Spec 17 run ${run.id} submitted to the transfer agent (${submitted.transferAgentBatchRef ?? "no batch ref"})`,
      } as any);

      res.json(submitted);
    } catch (error) {
      handleError(error, res, "submit distribution run");
    }
  });

  app.post(`${BASE}/distributions/:runId/reverse`, admin, async (req: any, res) => {
    try {
      const body = reverseSchema.parse(req.body ?? {});
      const run = await repo.getRun(req.params.runId);
      if (!run || run.spvId !== req.params.spvId) {
        return res.status(404).json({ message: "distribution run not found" });
      }

      const reversal = await reverseRun({
        runId: run.id,
        reason: body.reason,
        reversedBy: req.user.email,
      });

      await storage.createApprovalLog({
        projectId: run.spvId,
        adminId: req.user.id,
        action: "DISTRIBUTION_REVERSED",
        note: `Spec 17 run ${run.id} reversed by ${reversal.id}: ${body.reason}`,
      } as any);

      res.json(reversal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? "invalid request" });
      }
      handleError(error, res, "reverse distribution run");
    }
  });

  // ─── Capital accounts ────────────────────────────────────────────────────

  app.get(`${BASE}/capital-accounts/summary`, admin, async (req, res) => {
    try {
      const members = await repo.listMembers(req.params.spvId);
      const ledger = await repo.listLedger(req.params.spvId);

      const rows = members.map((member) => {
        const entries = ledger.filter((entry) => entry.memberId === member.id);
        // Invariant 1 of § 8, checked on every read as well as every write.
        assertBalancesMatchLedger(member.id, entries);
        const balances = recomputeBalances(entries);
        return {
          memberId: member.id,
          legalName: member.legalName,
          memberClass: member.memberClass,
          entryCount: entries.length,
          bookBalance: formatCents(balances.book),
          taxBalance: formatCents(balances.tax),
        };
      });

      const bookEquity = rows.reduce((sum, row) => sum + parseCents(row.bookBalance), 0);

      res.json({ members: rows, spvBookEquity: formatCents(bookEquity) });
    } catch (error) {
      handleError(error, res, "summarise capital accounts");
    }
  });

  app.get(`${BASE}/members/:memberId/capital-account`, requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      const members = await repo.listMembers(req.params.spvId);
      const member = members.find((m) => m.id === req.params.memberId);
      if (!member) return res.status(404).json({ message: "member not found" });

      // A member may read their own account; anyone else must be an admin.
      const isOwner = member.userId != null && member.userId === user?.id;
      if (!isOwner && user?.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const entries = await repo.listLedgerForMember(member.id);
      assertBalancesMatchLedger(member.id, entries);
      const balances = recomputeBalances(entries);

      res.json({
        member: {
          id: member.id,
          legalName: member.legalName,
          memberClass: member.memberClass,
          admittedOn: member.admittedOn,
        },
        entries,
        bookBalance: formatCents(balances.book),
        taxBalance: formatCents(balances.tax),
      });
    } catch (error) {
      handleError(error, res, "load capital account");
    }
  });

  // ─── Reserves ────────────────────────────────────────────────────────────

  app.get(`${BASE}/reserves`, admin, async (req, res) => {
    try {
      const [accounts, movements] = await Promise.all([
        repo.listReserves(req.params.spvId),
        repo.listReserveMovements(req.params.spvId),
      ]);
      res.json({ accounts, movements });
    } catch (error) {
      handleError(error, res, "load reserves");
    }
  });

  // ─── Cap table reconciliation ────────────────────────────────────────────

  app.get(`${BASE}/cap-table/reconciliation`, admin, async (req, res) => {
    try {
      const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
      const members = await repo.listMembers(req.params.spvId);
      const positions = await repo.listPositions(req.params.spvId);

      const slices: PositionSlice[] = positions.map((p) => ({
        memberId: p.memberId,
        effectiveFrom: p.effectiveFrom,
        effectiveTo: p.effectiveTo,
        units: p.units,
      }));
      const outstanding = unitsOutstandingOn(slices, asOf);

      const local: LocalHolding[] = members.map((member) => ({
        memberId: member.id,
        investorRef: member.transferAgentInvestorRef,
        units: outstanding.get(member.id) ?? 0n,
      }));

      const remote = await defaultDeps().capTable.getHoldings(req.params.spvId, asOf);
      res.json({ asOf, ...reconcileCapTable(local, remote) });
    } catch (error) {
      handleError(error, res, "reconcile cap table");
    }
  });

  // ─── Tax and ITC ─────────────────────────────────────────────────────────

  app.get(`${BASE}/tax/:year/allocations`, admin, async (req, res) => {
    try {
      const year = Number(req.params.year);
      if (!Number.isInteger(year)) {
        return res.status(400).json({ message: "tax year must be an integer" });
      }
      const allocations = await repo.listTaxAllocations(req.params.spvId, year);
      res.json({
        taxYear: year,
        allocations,
        // § 9 — no K-1 issues until every row is final with a recorded review.
        readyForK1:
          allocations.length > 0 &&
          allocations.every((a) => a.status === "final" && a.cpaReviewedAt !== null),
      });
    } catch (error) {
      handleError(error, res, "load tax allocations");
    }
  });

  app.get(`${BASE}/itc/positions`, admin, async (req, res) => {
    try {
      res.json(await repo.listItcPositions(req.params.spvId));
    } catch (error) {
      handleError(error, res, "load ITC positions");
    }
  });

  app.get(`${BASE}/itc/recapture-exposure`, admin, async (req, res) => {
    try {
      const asOf = req.query.asOf ? new Date(String(req.query.asOf)) : new Date();
      const positions = await repo.listItcPositions(req.params.spvId);

      const exposure = computeSpvExposure(
        positions.map((position) => ({
          id: position.id,
          spvId: position.spvId,
          memberId: position.memberId,
          placedInServiceDate: position.placedInServiceDate,
          vestingStart: position.vestingStart,
          creditAmount: position.creditAmount,
          treatment: position.treatment,
          recapturePeriodEnds: position.recapturePeriodEnds,
          recaptureEvents: position.recaptureEvents,
        })),
        asOf,
      );

      res.json({
        ...exposure,
        totalCreditAmount: formatCents(exposure.totalCreditAmount),
        totalUnvestedAmount: formatCents(exposure.totalUnvestedAmount),
        positions: exposure.positions.map((position) => ({
          ...position,
          creditAmount: formatCents(position.creditAmount),
          vestedAmount: formatCents(position.vestedAmount),
          unvestedAmount: formatCents(position.unvestedAmount),
        })),
      });
    } catch (error) {
      handleError(error, res, "compute recapture exposure");
    }
  });
}
