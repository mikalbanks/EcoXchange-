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
