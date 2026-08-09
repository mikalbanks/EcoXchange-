# Polymesh Reference Asset — Gate A for Spec 18 Phase 1

**Status: OPEN. Phase 1 must not be applied or enabled until this document is filled in.**

## Why this exists

EcoXchange has **zero issued Polymesh assets**. Nothing has been tokenised yet.

That has a consequence nobody stated during the first pass of Spec 18: the chain
read path was written against a schema file, not against a chain. `runPolymeshSync`
over an empty `polymesh_assets` table returns `SKIPPED`, `GET /api/polymesh/assets`
returns `[]`, and **every GraphQL query in `src/polymesh/queries.ts` has never
received a real response.** Code that typechecks and passes unit tests against
hand-built inputs is not an integration.

Two assumptions in particular are load-bearing and unverified. Neither appears in
`docs/polymesh-middleware-schema.graphql` — both come from how SubQuery's code
generator *usually* shapes its API:

1. **Connection wrapper.** Queries assume collections return
   `{ totalCount, nodes[] }`. If the deployed middleware returns bare lists,
   `fetchAllPages` breaks.
2. **Derived filter column.** Queries assume the `asset: Asset!` relation yields a
   scalar `assetId` usable as `filter: { assetId: { equalTo: $assetId } }`, and
   sort enums of the form `AMOUNT_DESC` / `PAYMENT_AT_DESC`. If the generator named
   these differently, every query 400s.

A live asset with real distribution history is the only thing that settles both.

## What to record here

| Field | Value |
|---|---|
| Network | mainnet |
| Ticker / `Asset.id` | _TBD_ |
| Issuer DID | _TBD_ |
| Distributions observed | _TBD_ |
| Why this asset | _TBD_ |
| Verified on (date) | _TBD_ |
| Verified by | _TBD_ |

**Mainnet, not testnet.** Testnet distribution history is likely sparse or absent,
and the whole point is to exercise `Distribution` / `DistributionPayment` against
real data. Reads are public and permissionless, so no Polymath relationship is
needed for this. Testnet remains the target for sync/write rehearsal once the
queries are known-good.

## Procedure

```bash
# 1. Confirm the deployed schema matches the committed snapshot.
scripts/introspect-polymesh.sh mainnet
#    Diff the output against docs/polymesh-middleware-schema.graphql.
#    Pay attention to Asset, AssetHolder, Distribution, DistributionPayment.

# 2. Find a candidate: an asset with at least one distribution.
#    (Requires egress to *.polymath.network — blocked in the CI/cloud
#    environment this was written in, so run it somewhere with network access.)

# 3. Capture real responses for all three queries, verbatim.
#    Save to ecoxchange-reconciliation-engine/src/polymesh/__tests__/fixtures/
#      asset.json
#      holders.json
#      distributions.json
```

Fixtures must be **captured, never hand-written** (Spec 18 § 2.5). A hand-written
fixture only proves the code agrees with its author's assumptions, which is the
failure this gate exists to prevent.

## Acceptance criteria

Phase 1 is validated when all of these hold:

- [ ] Introspection diffs clean against the committed schema, or the deltas are
      reflected in `queries.ts` and `models.ts`.
- [ ] All three queries return HTTP 200 with non-empty data for the reference asset.
- [ ] Captured fixtures are committed and drive the `normalize*` tests.
- [ ] `POST /api/polymesh/sync` completes end-to-end against testnet with a
      `polymesh_sync_runs` row written.
- [ ] This document is filled in and dated.

Only then may `VITE_CHAIN_VIEW_ENABLED=true` be set for any deployed environment
(see `ecoxchange-dashboard/src/config/chain-view.ts`).

## A note on what "validated" will look like

Even with the queries proven, expect **every distribution to reconcile as
`unmatched`**. `matched` requires a `pcp_submissions` row, and Layer C cannot
produce real ones until Polymath supplies credentials (Spec 18 § 6). A board of
yellow badges is the correct and expected state at that point — not a bug, and not
something to "fix" by loosening the matching rule. See `src/polymesh/reconcile.ts`.
