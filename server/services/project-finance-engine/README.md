# EcoXchange Project Finance Engine — Domain Boundary

The Project Finance Engine domain is pure TypeScript. It performs deterministic annual project-finance arithmetic without persistence, authentication, HTTP, frontend, network, market-data, or AI dependencies.

Key conventions:

- Percentages and rates are decimals: `0.30 = 30%`, `0.065 = 6.5%`.
- Monetary values are numeric USD amounts, never formatted strings such as `$8.0M`.
- Required financing assumptions must be supplied explicitly. This layer does not insert hidden defaults for DSCR, LTC, ITC, interest rate, DSRA, lender fee, closing costs, or transfer price.
- The finance domain accepts mathematically valid assumptions even when those assumptions would fail EcoXchange underwriting policy. Credit-policy enforcement occurs outside this module.
- Provenance is optional metadata. Numeric calculations do not depend on provenance classifications.
- The domain entrypoint is `server/services/project-finance-engine/index.ts`.

## Ticket 03 operating model

V0 uses a fixed `HOURS_PER_YEAR = 8,760` annual convention.

Implemented formulas:

- `GENERATION_YEAR1_V1`: `Generation_1 = Capacity_MW × 8,760 × CapacityFactor`
- `GENERATION_DEGRADATION_V1`: `Generation_t = Generation_1 × (1-d)^(t-1)`
- `GENERATION_OVERRIDE_V1`: a validated full annual generation array is used exactly as supplied, with no additional degradation
- `PPA_ESCALATION_V1`: `PPA_t = PPA_1 × (1+e)^(t-1)` during the contracted PPA term; price and contracted revenue are zero after expiration
- `REVENUE_CONTRACTED_V1`: `Revenue_t = Generation_t × PPA_t`
- `OPEX_ESCALATION_V1`: `Opex_t = Opex_1 × (1+g)^(t-1)`
- `CFADS_V1`: `CFADS_t = Revenue_t - Opex_t`

## Ticket 04 debt model

Ticket 04 consumes Ticket 03 annual CFADS rows. It does not recalculate generation, revenue, Opex, or CFADS.

Debt conventions:

- `ALLOWABLE_DEBT_SERVICE_V1`: raw annual support is `CFADS / target DSCR`; usable lender debt service is floored at zero for sizing while the original negative CFADS remains in the operating model.
- `DSCR_DEBT_CAPACITY_V1`: DSCR-sized opening debt is the annual end-of-period present value of usable allowable debt service over the amortization term.
- `LTC_LIMIT_V1`: `ProjectCapex × max LTC`.
- `PERMANENT_DEBT_V1`: minimum of feasible DSCR-sized debt and the LTC limit.
- `DEBT_SCULPT_V1`: interest is calculated on opening balance; principal equals scheduled debt service less interest and may never be negative.
- When LTC binds, the maximum allowable debt-service profile is scaled proportionally by `PermanentDebt / DSCRSizedDebt` so the cash-flow shape is preserved.
- If the PV candidate would require negative amortization, a deterministic bisection solver reduces opening debt until the schedule is feasible; unpaid interest is never capitalized.
- `ANNUAL_DSCR_V1`: `CFADS / debt service` only when debt service is positive; otherwise DSCR is null.
- `BALLOON_BALANCE_V1`: when maturity is shorter than economic amortization, the ending balance after the maturity-year scheduled payment is reported as the balloon.
- `DEBT_RECONCILIATION_V1`: opening debt less total principal less final balance must reconcile within $1 or the calculation fails.

## Ticket 05 tax credit and closing capital stack

Ticket 05 consumes Ticket 04's final permanent debt and debt schedule. It does not resize debt when ITC or closing-cost assumptions change.

- `ITC_ELIGIBLE_BASIS_V1`: `EligibleBasis = ProjectCapex × ITCEligibleBasisPct`.
- `ITC_FACE_VALUE_V1`: `ITCFace = EligibleBasis × ITCRate`.
- `ITC_TRANSFER_PROCEEDS_V1`: `GrossITC = ITCFace × TransferPrice`.
- `NET_ITC_TRANSFER_PROCEEDS_V1`: `NetITC = max(0, GrossITC - ITCTransactionCosts)`. If transaction costs exceed gross proceeds, the engine returns an explicit warning rather than a negative financing source.
- `DSRA_V1`: V0 implements only `YEAR_ONE`: `DSRA = Year1ScheduledDebtService × DSRAMonths / 12`.
- `LENDER_FEE_V1`: `LenderFee = PermanentDebt × LenderFeeRate`.
- `TOTAL_CLOSING_USES_V1`: `TotalUses = Capex + ClosingCosts + LenderFee + DSRA + OtherFinancingUses`.
- `PRE_SPONSOR_SOURCES_V1`: `PreSponsorSources = PermanentDebt + NetITC + OtherPermanentSources`.
- `SPONSOR_EQUITY_V1`: `SponsorEquity = max(0, TotalUses - PreSponsorSources)`.
- `TOTAL_SOURCES_V1`: permanent debt + net ITC + other permanent sources + sponsor equity.
- `CAPITAL_STACK_PERCENTAGES_V1`: each permanent source divided by total closing uses; debt-to-capex remains the Ticket 04 metric and is not confused with debt/total-uses.
- `SOURCES_USES_RECONCILIATION_V1`: ordinary sources and uses must reconcile within $1. If pre-sponsor sources exceed uses, sponsor equity is floored at zero and `SOURCES_EXCEED_USES` plus `excess_sources` makes the structural overfunding explicit.

Ticket 05 applies explicit ITC assumptions only; it does not determine legal tax-credit eligibility, calculate depreciation, construction/ITC bridge debt, sponsor returns, downside/P90 economics, underwriting conclusions, persistence, APIs, frontend behavior, or AI.

The reusable 5 MW input fixture remains `fixtures/reference-solar-5mw-input.ts`. Its explicit closing-cost input is $400,000. The source report's roughly $2.995M sponsor-equity presentation is consistent with a lower closing allowance near $250K; Ticket 05 does not alter the explicit fixture or introduce a hidden closing-cost assumption to force that result. Exact source reconciliation remains Ticket 07's job.
