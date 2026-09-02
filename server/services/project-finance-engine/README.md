# EcoXchange Project Finance Engine — Domain Boundary

The Project Finance Engine domain is pure TypeScript. It performs deterministic annual project-finance arithmetic without persistence, authentication, HTTP, frontend, network, market-data, or AI dependencies.

Key conventions:

- Percentages and rates are decimals: `0.30 = 30%`, `0.065 = 6.5%`.
- Monetary values are numeric USD amounts, never formatted strings such as `$8.0M`.
- Required financing assumptions must be supplied explicitly. This layer does not insert hidden defaults for DSCR, LTC, ITC, interest rate, DSRA, lender fee, closing costs, transfer price, tax appetite, or discount rate.
- Mathematical finance remains separate from underwriting policy.
- The domain entrypoint is `server/services/project-finance-engine/index.ts`.

## Ticket 03 operating model

- `GENERATION_YEAR1_V1`: `Generation_1 = Capacity_MW × 8,760 × CapacityFactor`.
- `GENERATION_DEGRADATION_V1`: `Generation_t = Generation_1 × (1-d)^(t-1)`.
- `GENERATION_OVERRIDE_V1`: a validated full annual series is used exactly as supplied.
- `PPA_ESCALATION_V1`: contracted price escalates only through the PPA term; post-PPA contracted revenue is zero.
- `REVENUE_CONTRACTED_V1`: `Revenue_t = Generation_t × PPA_t`.
- `OPEX_ESCALATION_V1`: `Opex_t = Opex_1 × (1+g)^(t-1)`.
- `CFADS_V1`: `CFADS_t = Revenue_t - Opex_t`.

## Ticket 04 debt model

- `ALLOWABLE_DEBT_SERVICE_V1`: raw support is `CFADS / target DSCR`; usable sizing service cannot be negative.
- `DSCR_DEBT_CAPACITY_V1`: annual end-of-period PV of usable allowable debt service.
- `LTC_LIMIT_V1`: `ProjectCapex × max LTC`.
- `PERMANENT_DEBT_V1`: minimum applicable feasible constraint.
- `DEBT_SCULPT_V1`: opening-balance interest, nonnegative principal, proportional LTC scaling, deterministic negative-amortization limiting.
- `ANNUAL_DSCR_V1`: `CFADS / scheduled debt service` where service is positive.
- `BALLOON_BALANCE_V1`: maturity-year ending balance when legal maturity is shorter than economic amortization.
- `DEBT_RECONCILIATION_V1`: opening debt less total principal less final balance reconciles within $1.

## Ticket 05 tax credit and closing capital stack

- `ITC_ELIGIBLE_BASIS_V1`: `EligibleBasis = ProjectCapex × ITCEligibleBasisPct`.
- `ITC_FACE_VALUE_V1`: `ITCFace = EligibleBasis × ITCRate`.
- `ITC_TRANSFER_PROCEEDS_V1`: `GrossITC = ITCFace × TransferPrice`.
- `NET_ITC_TRANSFER_PROCEEDS_V1`: `NetITC = max(0, GrossITC - ITCTransactionCosts)`.
- `DSRA_V1`: V0 `YEAR_ONE` method: `DSRA = Year1ScheduledDebtService × DSRAMonths / 12`.
- `LENDER_FEE_V1`: `LenderFee = PermanentDebt × LenderFeeRate`.
- `TOTAL_CLOSING_USES_V1`: `Capex + ClosingCosts + LenderFee + DSRA + OtherFinancingUses`.
- `SPONSOR_EQUITY_V1`: residual permanent source after debt, net ITC and other permanent sources.
- `SOURCES_USES_RECONCILIATION_V1`: sources and uses reconcile within $1, with excess permanent sources surfaced explicitly.

## Ticket 06 returns, downside and sensitivities

- `SPONSOR_OPERATING_CASH_FLOW_V1`: `SponsorCF_t = CFADS_t - ScheduledDebtService_t`.
- Year 0 levered sponsor cash flow is exactly negative Ticket 05 sponsor initial equity.
- `SPONSOR_CASH_IRR_V1`: solves `Σ CF_t/(1+r)^t = 0` using deterministic bracketing and bisection; no-sign-change, multiple-root risk and solver failure remain explicit states.
- `PROJECT_UNLEVERED_CASH_IRR_V1`: project capex at Year 0 versus annual CFADS; no debt, ITC or sponsor tax value.
- `NPV_V1`: calculated only when an explicit discount rate is supplied.
- `DEPRECIABLE_BASIS_V1`: `EligibleBasis - 0.5 × ITCFace`.
- `BONUS_DEPRECIATION_V1`: `DepreciableBasis × explicit BonusDepreciationPct`.
- `IMMEDIATE_TAX_SHIELD_V1`: `BonusDepreciation × FederalTaxRate × SponsorTaxAppetitePct`; this is sponsor-level assumed tax value, not ProjectCo cash.
- Cash-only sponsor IRR always remains separate from simplified after-tax sponsor IRR.
- `DOWNSIDE_GENERATION_V1`: multiplier downside applies to the base annual generation profile; explicit downside generation is used exactly as supplied.
- `DOWNSIDE_CFADS_V1`: downside revenue less base Opex. Opex is not reduced because generation falls.
- `DOWNSIDE_DSCR_V1`: downside CFADS divided by the original base scheduled debt service. **Downside debt is never resized.**
- `DOWNSIDE_CASH_SWEEP_V1`: starts with base permanent debt and applies nonnegative downside CFADS 100% to interest first and then principal. Unpaid interest is never capitalized.
- Multiplier-based downside is explicitly labeled illustrative and is never represented as an independent-engineer lender-grade P90.
- Mini-perm sponsor return is not invented: if a material balloon remains and no refinance assumption exists, sponsor IRR is withheld and the unmodeled refinancing requirement is surfaced.
- Sensitivities for PPA price, interest rate, capex, capacity factor and ITC rate rerun the complete deterministic core in requested order; the base input remains immutable.
- Capacity-factor sensitivity is rejected when an explicit annual generation series is authoritative.

The reusable 5 MW input fixture remains `fixtures/reference-solar-5mw-input.ts`. Its explicit closing-cost input is $400,000, so source-return variance driven by the report's implied lower closing allowance must be reconciled transparently in Ticket 07 rather than tuned away here.
