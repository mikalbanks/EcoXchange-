# Scenario Resolution

## Purpose

Ticket 10 defines the deterministic boundary between stored project/scenario/policy data and the Ticket 02 `ProjectFinanceInput` contract. The resolver performs no finance calculations and no underwriting evaluation.

## Canonical precedence

For each finance field, the resolver uses exactly this precedence:

1. registered policy override;
2. explicit scenario assumption;
3. current VERIFIED project fact;
4. other current project/document/user fact;
5. applicable policy value classified `CALCULATION_DEFAULT`;
6. missing.

Scenario values intentionally outrank verified facts because a scenario is allowed to model a hypothetical case. Scenario values never become project facts.

## Field registry

`FIELD_DEFINITIONS` in `server/services/project-finance-engine/scenario-resolver.ts` is the static typed registry. It identifies finance path, expected unit, required/optional status, whether facts/scenarios are allowed, and the policy-default key where one exists.

Policy-controlled fields include DSCR, LTC, debt rate/amortization/maturity defaults, lender fee, DSRA, ITC rate and transfer price. A scenario that changes an applicable policy-controlled value without a registered override is rejected as `UNREGISTERED_POLICY_OVERRIDE`.

No arbitrary database expression is executable by the resolver.

## Policy applicability

Capacity is resolved first because policy defaults use independent capacity bands. Each policy value carries its own applicability expression. The resolver never assumes that LTC, interest-rate, amortization, project-size, or other bands share boundaries.

Zero applicable values leaves the field unresolved. More than one applicable calculation default returns `POLICY_CONFIGURATION_ERROR`; there is no nearest-band or timestamp fallback.

Migration `0028_policy_value_classification_and_resolver_defaults.sql` narrowly adds `value_classification` to policy values and supplies calculation-default metadata omitted by the Ticket 09 seed. Only `CALCULATION_DEFAULT` values may automatically enter a finance input.

## Facts and provenance

Only current, non-superseded facts are considered. More than one current fact for the same field returns `DUPLICATE_CURRENT_FACT`. A disputed fact is not silently used; if no higher-priority value exists the field remains missing. An unverified/user-asserted modeling value may be used but is explicitly labeled and emits an audit warning.

Every resolved field retains the value, resolution source, source record ID/type, verification/source strength where applicable, policy-default use, and override metadata.

## Overrides

A policy override must identify the policy/version it modifies and preserve original value, override value, reason, actor and timestamp. If the override is bound to another policy version, or its recorded original value no longer equals the loaded policy value, resolution fails with `STALE_POLICY_OVERRIDE`.

An invalid override never falls back to a more favorable fact/default.

## Missing and conditional fields

Missing finance-critical values are returned in deterministic Ticket 02 field order as `missing_fields`; they are not infrastructure exceptions and `calculation_ready=false`.

Conditional requirements include tax inputs when `tax_module_enabled=true`, an illustrative downside multiplier for `ILLUSTRATIVE_MULTIPLIER`, and an explicit annual downside array for `EXPLICIT_GENERATION`. Ticket 02 validation is the final authority after assembly; invalid scenario/override values are reported rather than silently replaced by lower-precedence data.

## Calculation vs underwriting facts

A value may be sufficient for mathematical modeling while remaining unverified for underwriting. For example, a scenario may model `itc_rate=0.30` while `ITC eligibility=UNKNOWN`. The resolver assembles the calculation assumption; Ticket 09 determines what its evidence means for underwriting.

## Scope protection

The V0 resolver refuses to finalize calculation-ready inputs for unsupported technology or revenue structure. Current supported input scope is fully contracted `SOLAR_PV`; battery, merchant and partially contracted cases return `OUT_OF_SCOPE_FOR_CALCULATION` before finance execution.

## Snapshot

The serialization-ready snapshot is:

```json
{
  "finance_input": {},
  "provenance": {},
  "policy_context": {
    "policy_id": "...",
    "policy_code": "ECOXCHANGE_SOLAR_BASE",
    "policy_version": "0.1.0"
  },
  "resolution": {
    "resolver_version": "0.1.0"
  }
}
```

Values are stored in the snapshot, not references only. Historical calculation snapshots therefore remain reproducible after facts, scenarios or policies change.

## Hashing

`input_hash` is SHA-256 of a recursively key-sorted JSON serialization of the clean validated `ProjectFinanceInput`. Project/scenario IDs, timestamps, actor names, and provenance are excluded from the math hash. Therefore two scenarios with numerically identical finance inputs can share an input hash while retaining different provenance snapshots.

Array order is preserved because annual arrays are calculation-significant. Object insertion/query order cannot change the hash.

## Versioning

Resolver behavior is independently versioned with `SCENARIO_RESOLVER_VERSION = 0.1.0`. It is distinct from calculation-engine version and policy version.
