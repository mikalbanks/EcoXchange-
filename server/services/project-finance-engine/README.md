# EcoXchange Project Finance Engine — Domain Boundary

The Ticket 02 domain layer defines the shape and mathematical validity of project-finance inputs and outputs. It does not perform financial calculations, underwriting-policy evaluation, persistence, API work, frontend logic, or AI operations.

Key conventions:

- Percentages and rates are decimals: `0.30 = 30%`, `0.065 = 6.5%`.
- Monetary values are numeric USD amounts, never formatted strings such as `$8.0M`.
- Required financing assumptions must be supplied explicitly. This layer does not insert hidden defaults for DSCR, LTC, ITC, interest rate, DSRA, or transfer price.
- The finance domain accepts mathematically valid assumptions even when those assumptions would fail EcoXchange underwriting policy. Credit-policy enforcement occurs outside this module.
- Provenance is optional metadata. The numeric calculation layer must not depend on provenance classifications to perform arithmetic.
- The domain entrypoint is `server/services/project-finance-engine/index.ts`; importing it must not initialize persistence, authentication, HTTP, frontend, network, or AI clients.

The reusable 5 MW Ticket 02 input fixture is `fixtures/reference-solar-5mw-input.ts`. Golden calculated outputs remain owned by Ticket 07.
