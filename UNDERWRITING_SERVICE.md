# EcoXchange Underwriting Service

Ticket 12 defines the authoritative underwriting transaction that sits on top of an immutable successful calculation run.

## Separation of concerns

A Calculation Run answers: **what do the project economics calculate to under one resolved input snapshot?**

An Underwriting Run answers: **what do those immutable economics plus a frozen set of underwriting/readiness facts mean under one explicit policy version?**

An underwriting run never changes the financial calculation it evaluates. The service loads persisted Ticket 11 results and never recalculates generation, CFADS, debt, ITC, sponsor equity, IRR, or downside economics.

A credit `FAIL` is a successfully completed underwriting assessment. It is not a service execution failure. `execution_status = SUCCESS` and `overall_status = FAIL` are intentionally valid together. The same applies to `INSUFFICIENT_INFORMATION` and `OUT_OF_SCOPE`.

## Execution flow

1. Authorize organization/project/scenario/calculation context.
2. Require an immutable `SUCCESS` calculation run with valid debt and sources/uses reconciliation.
3. Reject stale finance context before underwriting.
4. Select exactly one immutable underwriting policy version.
5. Load current underwriting-only/readiness facts in one set.
6. Freeze those facts, source identifiers, source types, and verification states into the underwriting input snapshot.
7. Verify that the calculation assumptions are compatible with the selected policy or a registered override.
8. Invoke the Ticket 09 deterministic credit-rules engine exactly once.
9. Validate rule uniqueness and summary counts.
10. Persist headline assessment plus rules, risks, conditions, missing information, generic lender fit, and recommendation codes in one transaction.
11. Set `status/execution_status = SUCCESS`, preserve the independent credit `overall_status`, update the scenario latest-underwriting pointer, and record the completion audit event.

## Snapshot semantics

`underwriting_input_snapshot_json` freezes:

- calculation run ID;
- calculation engine version;
- resolver version;
- calculation input/result hashes;
- persisted finance result used by credit rules;
- underwriting fact values and provenance;
- policy ID/code/version and effective policy values;
- registered policy overrides;
- underwriting engine version.

Snapshot values are stored in addition to source IDs so historical reproduction never depends on a fact still being current.

## Hashing

`underwriting_input_hash` is SHA-256 over deterministic canonical JSON for the immutable underwriting snapshot.

`underwriting_result_hash` is SHA-256 over canonical Ticket 09 output with stable ordering:

- rules by `rule_id`;
- risks by category/risk code;
- conditions by `condition_code`;
- missing information by `field_key`;
- lender fit by lender category;
- recommendations by recommendation code.

Database IDs, timestamps, and actors do not influence the result hash.

## Policy compatibility

A calculation may only be underwritten against a policy whose calculation-affecting requirements are consistent with the immutable calculation assumptions, unless the run contains the corresponding registered policy override.

Example: a calculation sized at 1.25x DSCR cannot be treated as authoritative under an unmodified 1.30x policy. The service returns `POLICY_CALCULATION_MISMATCH`; it does not silently rerun Ticket 11.

## Staleness and re-underwriting

Readiness-only fact changes may create a new underwriting run against an existing calculation. Examples include interconnection execution status, independent engineer status, insurance, or ITC verification where those items did not change the finance input.

Finance-affecting changes require recalculation first. Examples include PPA price, capex, generation assumptions, Opex, PPA term, ITC rate, debt sizing assumptions, or reserves. A scenario marked `STALE` is blocked from new underwriting against its old calculation.

Historical underwriting runs are never rewritten. A later readiness improvement creates a new run.

## Atomic persistence

The PostgreSQL repository writes all normalized underwriting children inside one transaction before finalizing the parent run as successful. A transaction failure rolls back the child set and does not expose a partial authoritative assessment.

The normalized persistence set includes:

- underwriting rule results;
- risks;
- conditions;
- missing information;
- generic lender-category fit;
- deterministic recommendation codes.

The Ticket 08 immutability trigger model protects successful underwriting history. Ticket 12 extends the same protection to lender-fit and recommendation rows.

## Idempotency

`idempotency_key` is scoped by organization. Repeating the same logical request with the same calculation, policy, and underwriting input hash returns the existing logical run. Reusing the key for a materially different request returns `IDEMPOTENCY_KEY_CONFLICT`.

## Historical reproduction

The intended audit procedure is:

1. Load the immutable underwriting run.
2. Load the referenced immutable calculation run.
3. Read the frozen underwriting input snapshot.
4. Verify the stored calculation/policy/underwriting-engine versions.
5. Invoke the deterministic Ticket 09 engine using the frozen finance result, facts, policy, and overrides.
6. Canonicalize the output.
7. Compare SHA-256 with the persisted underwriting result hash.

Current project facts and current active policy are not consulted to reproduce an old assessment.

## Boundaries

Ticket 12 contains no frontend behavior, API routes, AI calls, named-lender logic, web/market lookups, finance formulas, or new credit-rule thresholds. Generic lender categories and deterministic recommendations come only from Ticket 09 output.
