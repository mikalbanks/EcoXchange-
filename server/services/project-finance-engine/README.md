# EcoXchange Project Finance Engine — Domain Boundary

The Project Finance Engine domain is pure TypeScript. It performs deterministic annual project-finance arithmetic without persistence, authentication, HTTP, frontend, network, market-data, or AI dependencies.

Key conventions:

- Percentages and rates are decimals: `0.30 = 30%`, `0.065 = 6.5%`.
- Monetary values are numeric USD amounts, never formatted strings such as `$8.0M`.
- Required financing assumptions must be supplied explicitly. This layer does not insert hidden defaults for DSCR, LTC, ITC, interest rate, DSRA, or transfer price.
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

Ticket 03 does not calculate debt service, DSCR-sized debt, ITC, sponsor equity, IRR, NPV, downside/P90 economics, or underwriting conclusions.

The reusable 5 MW input fixture is `fixtures/reference-solar-5mw-input.ts`. Ticket 03 validates the precise Year-1 operating benchmark of 10,512 MWh generation, $578,160 contracted revenue, $150,000 Opex and $428,160 CFADS. Broader golden outputs remain owned by Ticket 07.

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

Ticket 04 intentionally does not calculate DSRA, lender fees, ITC, sponsor equity, IRR/NPV, downside cash sweeps, underwriting conclusions, persistence, APIs, frontend behavior, or AI.
