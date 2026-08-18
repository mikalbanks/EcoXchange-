# Release 1 — Pilot Readiness Gate

Date: 2026-08-18

## Release objective

Make the investor demonstration safe to present by separating measured production evidence from simulated financial workflows.

## Locked scenario contract

| Scenario | Production evidence | Transaction data | Allowed consequence |
| --- | --- | --- | --- |
| Measured comparison | NREL PVDAQ 9068 inverter telemetry; NASA POWER model; derived utility proxy | None | `No transaction attached` |
| Simulated stress | Static Savannah production fixture | Static Savannah offering, wallet, ownership, and distribution fixtures | Simulated only; consequence follows the engine status |
| Supabase record | Connected verification record with unconfirmed per-leg basis | None until authoritative offering/account sources are connected | `No transaction attached` |

The active project ID is part of the gate. Selecting the Savannah scenario does not unlock finance on a stale PVDAQ deep link.

## Release-blocking invariants

- The default investor project is PVDAQ 9068.
- The PVDAQ public adapter has zero PPA, revenue, investment, ownership, yield, and distribution values.
- A derived utility proxy is never labeled as an independent utility measurement.
- Every determination exposes a name and basis for inverter, utility, and expected-generation legs.
- Offering, investment, ownership, yield, distribution, wallet, chain-record, and LOI routes fail closed outside the Savannah simulation.
- The unrelated eight-project fixture is outside the Release 1 path.
- Superseded pricing, underwriting, and turnaround claims are prohibited by a source-level regression test.

## Verification completed in this workspace

- Dashboard TypeScript: `npm run check`
- Dashboard tests: 20 files, 152 tests passed
- Dashboard production build: `npm run build`
- Release claim and route-gate tests: 5 passed
- Production preview smoke: `/`, `/investor`, the PVDAQ project route, `/investor/distributions`, and `/developer/loi` returned HTTP 200
- Changed root-app TSX files: syntax-transpile check passed

## Required before publication

1. Run the root application install, full test suite, typecheck, and production build in an environment with root dependencies installed.
2. Obtain product/legal approval for the pilot privacy notice and any partner-facing terms. The existing privacy policy was not rewritten as legal advice in this release.
3. Deploy as compliance mode `demo`; do not enable `preview` or `live` without their documented approvals.
4. Verify the measured scenario first, then explicitly select **Simulated stress** before opening any transaction workflow.
5. Confirm the deployed domain shows no wallet, investment amount, distribution amount, or offering CTA in the measured scenario.

Persistent pilot operations, authoritative account/offering data, and encoded per-leg provenance for database records remain Release 2 work.
