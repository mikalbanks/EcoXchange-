/**
 * Spec 17 § 4.1 / § 7.1 — waterfall terms, encoded.
 *
 * The operating agreement is *data*. Adding a deal with different terms must
 * never require a deploy (§ 2.3), so every structural knob lives in these JSONB
 * payloads on `waterfall_terms` rather than in engine code.
 *
 * Money and rates cross this boundary as **strings**, never numbers. The engine
 * parses them into integer cents / integer micro-percent (§ 2.8, § 7.4); a float
 * must never appear in the money path, and a JSON number is a float.
 */
import { z } from "zod";

// ─── Scalar string formats ───────────────────────────────────────────────────

/** Money, exactly 0-2 decimal places. `"1234.56"`, `"0"`, `"-98.10"`. */
export const decimalMoney = z
  .string()
  .regex(/^-?\d{1,16}(\.\d{1,2})?$/, "expected a money string like \"1234.56\"");

/** A percentage, up to 6 decimal places. `"7"`, `"7.0"`, `"12.375"`. */
export const percentString = z
  .string()
  .regex(/^\d{1,3}(\.\d{1,6})?$/, "expected a percent string like \"7.0\"");

/** Units, up to 6 decimal places — matches `NUMERIC(20,6)` in the schema. */
export const unitsString = z
  .string()
  .regex(/^\d{1,14}(\.\d{1,6})?$/, "expected a units string like \"1000.000000\"");

export type DecimalMoney = z.infer<typeof decimalMoney>;
export type PercentString = z.infer<typeof percentString>;
export type UnitsString = z.infer<typeof unitsString>;

// ─── § 7.1 Tiers ─────────────────────────────────────────────────────────────

export const TierType = {
  PREFERRED_RETURN: "preferred_return",
  RETURN_OF_CAPITAL: "return_of_capital",
  CATCH_UP: "catch_up",
  RESIDUAL_SPLIT: "residual_split",
  FIXED_AMOUNT: "fixed_amount",
  PRO_RATA: "pro_rata",
} as const;

export type TierTypeValue = (typeof TierType)[keyof typeof TierType];

/**
 * Simple vs compound diverge materially by year 10, so `compounding` is
 * required — the spec is explicit that it must not default silently.
 * Likewise `cumulative`: unpaid preferred either carries forward as a claim on
 * future cash or expires, and that is not a detail the engine may guess.
 */
const preferredReturnTier = z.object({
  seq: z.number().int().positive(),
  type: z.literal(TierType.PREFERRED_RETURN),
  class: z.string().min(1),
  rate_pct: percentString,
  compounding: z.enum(["simple", "compound"]),
  basis: z.enum(["unreturned_capital", "contributed_capital"]),
  cumulative: z.boolean(),
});

const returnOfCapitalTier = z.object({
  seq: z.number().int().positive(),
  type: z.literal(TierType.RETURN_OF_CAPITAL),
  class: z.string().min(1),
  target: z.literal("unreturned_capital"),
});

/** Pays one class until it has received `target_pct` of cumulative profit. */
const catchUpTier = z.object({
  seq: z.number().int().positive(),
  type: z.literal(TierType.CATCH_UP),
  class: z.string().min(1),
  target_pct: percentString,
});

const residualSplitTier = z.object({
  seq: z.number().int().positive(),
  type: z.literal(TierType.RESIDUAL_SPLIT),
  splits: z
    .array(z.object({ class: z.string().min(1), pct: percentString }))
    .min(1),
});

const fixedAmountTier = z.object({
  seq: z.number().int().positive(),
  type: z.literal(TierType.FIXED_AMOUNT),
  class: z.string().min(1),
  amount: decimalMoney,
});

/** Straight pro-rata across all units — the right default for a first offering. */
const proRataTier = z.object({
  seq: z.number().int().positive(),
  type: z.literal(TierType.PRO_RATA),
});

export const waterfallTier = z.discriminatedUnion("type", [
  preferredReturnTier,
  returnOfCapitalTier,
  catchUpTier,
  residualSplitTier,
  fixedAmountTier,
  proRataTier,
]);

export type WaterfallTier = z.infer<typeof waterfallTier>;
export type PreferredReturnTier = z.infer<typeof preferredReturnTier>;
export type ReturnOfCapitalTier = z.infer<typeof returnOfCapitalTier>;
export type CatchUpTier = z.infer<typeof catchUpTier>;
export type ResidualSplitTier = z.infer<typeof residualSplitTier>;
export type FixedAmountTier = z.infer<typeof fixedAmountTier>;
export type ProRataTier = z.infer<typeof proRataTier>;

/**
 * A residual split that does not sum to 100% either destroys cash or
 * over-allocates it, so it is rejected at the terms boundary rather than
 * discovered during a run.
 */
export const waterfallTiers = z
  .array(waterfallTier)
  .min(1)
  .superRefine((tiers, ctx) => {
    const seqs = tiers.map((t) => t.seq);
    if (new Set(seqs).size !== seqs.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "tier seq values must be unique" });
    }
    for (const tier of tiers) {
      if (tier.type !== TierType.RESIDUAL_SPLIT) continue;
      // Percent strings, summed exactly as integer micro-percent.
      const total = tier.splits.reduce((sum, s) => sum + parseMicroPercent(s.pct), 0);
      if (total !== ONE_HUNDRED_PERCENT_MICRO) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `residual_split tier ${tier.seq} splits sum to ${total / 1_000_000}%, expected 100%`,
        });
      }
    }
  });

// ─── § 4.1 Fee schedule ──────────────────────────────────────────────────────

export const FeeBasis = {
  GROSS_REVENUE: "gross_revenue",
  NET_OPERATING_INCOME: "net_operating_income",
  CASH_FLOW_AFTER_DEBT_SERVICE: "cash_flow_after_debt_service",
  ASSETS_UNDER_ADMINISTRATION: "assets_under_administration",
  FIXED: "fixed",
} as const;

export const feeScheduleItem = z
  .object({
    code: z.string().min(1),
    name: z.string().min(1),
    basis: z.enum([
      FeeBasis.GROSS_REVENUE,
      FeeBasis.NET_OPERATING_INCOME,
      FeeBasis.CASH_FLOW_AFTER_DEBT_SERVICE,
      FeeBasis.ASSETS_UNDER_ADMINISTRATION,
      FeeBasis.FIXED,
    ]),
    /** Required for every basis except `fixed`. */
    rate_pct: percentString.optional(),
    /** Required for `fixed`; optional elsewhere as a per-period floor. */
    amount: decimalMoney.optional(),
    /** Per-period ceiling on the computed fee. */
    cap: decimalMoney.optional(),
    priority: z.number().int().nonnegative(),
  })
  .superRefine((fee, ctx) => {
    if (fee.basis === FeeBasis.FIXED && fee.amount === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `fee ${fee.code}: 'fixed' basis requires 'amount'` });
    }
    if (fee.basis !== FeeBasis.FIXED && fee.rate_pct === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `fee ${fee.code}: '${fee.basis}' basis requires 'rate_pct'` });
    }
  });

export const feeSchedule = z.array(feeScheduleItem);
export type FeeScheduleItem = z.infer<typeof feeScheduleItem>;
export type FeeSchedule = z.infer<typeof feeSchedule>;

// ─── § 4.4 Reserve policy ────────────────────────────────────────────────────

export const ReserveTargetBasis = {
  FIXED: "fixed",
  MONTHS_OPEX: "months_opex",
  PCT_REVENUE: "pct_revenue",
  SCHEDULE: "schedule",
} as const;

/**
 * `draw_permitted_for` is the whitelist of reasons a draw may cite. An empty
 * list means the reserve funds but never releases — legitimate for a
 * decommissioning reserve, and the reason a draw carries a stated purpose.
 */
export const reservePolicyItem = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  target_basis: z.enum([
    ReserveTargetBasis.FIXED,
    ReserveTargetBasis.MONTHS_OPEX,
    ReserveTargetBasis.PCT_REVENUE,
    ReserveTargetBasis.SCHEDULE,
  ]),
  target_value: decimalMoney,
  funding_priority: z.number().int().nonnegative(),
  funding_cap_per_period: decimalMoney.optional(),
  draw_permitted_for: z.array(z.string().min(1)),
});

export const reservePolicy = z.array(reservePolicyItem);
export type ReservePolicyItem = z.infer<typeof reservePolicyItem>;
export type ReservePolicy = z.infer<typeof reservePolicy>;

// ─── § 4.1 Debt schedule ─────────────────────────────────────────────────────

/**
 * Explicit per-period P&I. A schedule is a table in the loan documents, not a
 * formula to re-derive, so it is stored as one — `null` when unlevered.
 */
export const debtSchedule = z.object({
  lender: z.string().min(1),
  payments: z
    .array(
      z.object({
        period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        principal: decimalMoney,
        interest: decimalMoney,
      }),
    )
    .min(1),
});

export type DebtSchedule = z.infer<typeof debtSchedule>;

// ─── § 4.1 Member classes ────────────────────────────────────────────────────

export const memberClass = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  units_authorized: unitsString,
  /** Informational; the operative rate lives on the preferred_return tier. */
  pref_rate_pct: percentString.optional(),
  /** Sponsor/GP classes receive the rounding residual under `to_sponsor`. */
  is_sponsor: z.boolean().default(false),
});

export const memberClasses = z
  .array(memberClass)
  .min(1)
  .superRefine((classes, ctx) => {
    const codes = classes.map((c) => c.code);
    if (new Set(codes).size !== codes.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "member class codes must be unique" });
    }
  });

export type MemberClass = z.infer<typeof memberClass>;
export type MemberClasses = z.infer<typeof memberClasses>;

// ─── § 4.1 Enumerations stored as plain columns ──────────────────────────────

export const TaxAllocationMethod = {
  TARGETED: "targeted",
  LAYER_CAKE: "layer_cake",
  PRO_RATA: "pro_rata",
} as const;

export const ItcTreatment = {
  ALLOCATED: "allocated",
  TRANSFERRED_6418: "transferred_6418",
  NONE: "none",
} as const;

export const RoundingResidualTreatment = {
  CARRY_FORWARD: "carry_forward",
  TO_SPONSOR: "to_sponsor",
} as const;

export const DistributionFrequency = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi_annual",
  ANNUAL: "annual",
} as const;

// ─── Cross-field validation of a complete terms row ──────────────────────────

/**
 * Every class referenced by a tier must exist. A tier pointing at a class that
 * was never authorized would silently allocate to nobody.
 */
export function validateTermsCoherence(input: {
  tiers: WaterfallTier[];
  classes: MemberClass[];
}): string[] {
  const errors: string[] = [];
  const known = new Set(input.classes.map((c) => c.code));

  for (const tier of input.tiers) {
    const referenced =
      tier.type === TierType.RESIDUAL_SPLIT
        ? tier.splits.map((s) => s.class)
        : tier.type === TierType.PRO_RATA
          ? []
          : [tier.class];

    for (const code of referenced) {
      if (!known.has(code)) {
        errors.push(`tier ${tier.seq} (${tier.type}) references unknown class "${code}"`);
      }
    }
  }

  return errors;
}

// ─── Percent parsing ─────────────────────────────────────────────────────────
//
// Kept here rather than in the engine's money module because the terms
// validators above need it, and `shared/` must not import from `server/`.

/** 1% expressed in micro-percent units. */
export const ONE_PERCENT_MICRO = 1_000_000;
export const ONE_HUNDRED_PERCENT_MICRO = 100 * ONE_PERCENT_MICRO;

/**
 * `"7.5"` → `7_500_000`. String-only arithmetic: a percent never becomes a
 * float on its way into the engine.
 */
export function parseMicroPercent(pct: PercentString): number {
  const match = /^(\d{1,3})(?:\.(\d{1,6}))?$/.exec(pct);
  if (!match) throw new Error(`invalid percent string: ${JSON.stringify(pct)}`);
  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(6, "0");
  return whole * ONE_PERCENT_MICRO + Number(fraction);
}
