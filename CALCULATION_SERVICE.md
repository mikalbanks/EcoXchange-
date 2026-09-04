# EcoXchange Calculation Service

## Purpose

Ticket 11 is the authoritative persisted execution boundary for Project Finance V0. It orchestrates the already-defined Scenario Resolver and deterministic finance engine. It does not contain finance formulas, underwriting rules, frontend behavior, AI, or external market-data calls.

## Execution flow

`authorized organization context -> project/scenario/policy load -> ScenarioResolver -> Ticket 02 validation -> immutable RUNNING calculation_run -> finance engine -> reconciliation gate -> normalized result mapping -> one PostgreSQL transaction -> SUCCESS`

Known resolver/domain failures occur before a calculation run is created. Once a complete valid `ProjectFinanceInput` exists, a RUNNING calculation record is created before engine execution so an engine failure can retain the exact input snapshot that caused it.

## Authorization and tenancy

The service receives server-derived `organizationId` and `actorUserId`. Repository queries include the organization key and set transaction-local `app.organization_id` / `app.user_id` values for the project-finance RLS helpers. Project/scenario ownership is rechecked before privileged writes. A client-supplied organization ID is never an authorization source.

## Immutable input snapshot

The exact Ticket 10 snapshot is stored before finance execution. It contains:

- clean `finance_input`;
- field provenance;
- policy id/code/version;
- resolver version.

Historical reproduction never re-resolves current facts or current policy.

## Versions and hashes

- calculation engine version: `CALCULATION_ENGINE_VERSION` from the finance engine (`0.2.0` on this ticket lineage);
- resolver version: `SCENARIO_RESOLVER_VERSION` (`0.1.0`);
- `input_hash`: Ticket 10 SHA-256 over canonical calculation-affecting finance input only;
- `result_hash`: SHA-256 over canonical deterministic finance output: annual cash flows, debt schedule, financing summary, tax result, capital stack, returns, downside, reconciliations, warnings, and metric traces.

Database ids, timestamps, users, project ids, scenario ids, and persistence metadata are excluded from the result hash.

## Transaction boundary

`PostgresCalculationRepository.persistSuccessfulRunAtomic` obtains a tenant-scoped RUNNING row using `FOR UPDATE`, then writes all normalized result rows inside one node-postgres transaction. It inserts annual cash flows, annual debt rows, financing, tax credit, capital stack, return, downside, downside sweep, reconciliation, warnings, and metric traces; then and only then it updates the run to `SUCCESS`, updates the scenario's latest successful run pointer/status, and appends `CALCULATION_COMPLETED`.

Any error rolls back that entire success transaction. A separate failure transition may then mark the still-RUNNING run `FAILED`. A persistence failure can therefore never be returned as authoritative success.

## Reconciliation gate

Before persistence the application service requires:

- debt reconciliation = true;
- sources/uses reconciliation = true;
- exactly `project_life_years` operating rows;
- unique annual year values.

The service does not recalculate any reconciliation arithmetic.

## Failure semantics

- incomplete/missing resolver input: return domain error, create no calculation run;
- invalid resolved input: return domain error, create no calculation run;
- engine failure after valid snapshot: retain FAILED run with sanitized failure metadata;
- reconciliation failure: retain FAILED run and never persist SUCCESS results;
- transactional persistence failure: rollback child results, never return SUCCESS, then attempt FAILED transition.

A RUNNING record left by an infrastructure failure is non-authoritative and cannot be mistaken for SUCCESS.

## Idempotency and cache behavior

The existing Ticket 08 unique index scopes `idempotency_key` by organization. For the same key, the service requires identical project, scenario, policy id/version, and input hash. A materially different request returns `IDEMPOTENCY_KEY_CONFLICT`. If the matching prior run is retrievable, the same logical result is returned.

Calculation-result caching by input hash + engine version remains deferred. Correctness does not depend on cache reuse.

## Immutability

Ticket 08 database triggers prevent updates/deletes to successful calculation runs and prevent mutation or late insertion of normalized children after the parent reaches SUCCESS. The repository intentionally exposes no general successful-result update operation.

## Reproduction procedure

1. Load the historical calculation run under the authorized tenant.
2. Read its immutable `input_snapshot_json`.
3. Verify `calculation_engine_version` and `resolver_version`.
4. Extract and validate `finance_input` without consulting current project facts.
5. Re-run the deterministic engine version identified by the run.
6. Canonicalize the deterministic result using the Ticket 11 result-hash contract.
7. Compare the new SHA-256 result hash to the persisted `result_hash`.

A later PPA fact, policy version, or scenario edit cannot alter the old snapshot.

## Narrow schema correction

Migration `0029_calculation_service_run_metadata.sql` adds `calculation_runs.resolver_version`, adds explicit `policy_overrides.policy_version` binding required by Ticket 10/11 reproducibility, and permits NULL downside source provenance where the finance contract itself does not supply a source classification. It does not alter financial formulas or credit policy.

## Validation status

The repository currently has no functioning GitHub Actions runner and the Ticket 08+ migrations have not yet been executed in an isolated PostgreSQL/Supabase validation environment. Unit/integration tests are authored, but execution must not be claimed until a runner or isolated database is available.
