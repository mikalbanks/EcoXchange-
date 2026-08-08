# EcoXchange Spec 18 — Polymath / Polymesh Integration
**Handoff document for Claude Code implementation**
**Owner:** Mikal Banks, Founder
**Date:** August 2026
**Depends on:** Spec 13 (Attribution), Spec 17 (Distribution engine — supplies the
ports-and-adapters pattern this spec's Layer C mirrors).
**Stack:** TypeScript. Chain reads in `ecoxchange-reconciliation-engine`, HTTP surface
and PCP adapter in the Express app, UI in `ecoxchange-dashboard`.
**Supersedes:** Blocker #5 in Product Spec v2 Part 8; Spec 08 (Smart Contract Explorer)
for anything Polymesh; Spec 10's custom Solidity distribution path.

---

## § 0. Correction of record

`github.com/PolymathNetwork/polymath-developer-portal` is obsolete and must not be
used. Last content commit **22 August 2019**; it documents Ethereum-era `polymath-core`
Solidity contracts (`TickerRegistry`, `SecurityTokenRegistry`, `USDTieredSTO`,
`PolyToken`, Oraclize) predating Polymesh mainnet. It has no relationship to the
Polymath Capital Platform, ST-20 on Polymesh, or anything here. Any agent given that
repo as context will produce Solidity for a chain EcoXchange does not use.

Do not clone it. Do not reference it. Do not let it into a context window.

---

## § 1. Two surfaces, three layers

Polymath exposes two technical surfaces that are frequently conflated. They do not
share an access model and do not become available at the same time.

**Surface 1 — Polymesh blockchain (public).** The settlement ledger: asset records,
holder balances, transfers, distributions, on-chain identity and CDD status. Read
access is public and permissionless. No Polymath relationship required.

**Surface 2 — Capital Platform API (gated).** The business layer at
`admin.polymath.market`: offering creation, investor management, KYC workflow,
subscription agreements, cap table, and distribution execution. Endpoint documentation
is not public.

*Evidence the API exists, inferred and unconfirmed:* `PolymathNetwork/auth-jwks`
(pushed 2026-03-25) publishes JSON Web Key Sets for five environments — `dev`,
`dev-luna`, `sandbox`, `staging`, `prod`. Published JWKS implies JWT-based
programmatic auth and, critically, a sandbox. `pcp-signing-managers` is a Polymesh SDK
signing manager for Capital Platform–managed keys. **This is inference from repository
artifacts, not documentation from Polymath.** Treat it as a strong lead, not a fact.

| Layer | What it does | Surface | Status |
|---|---|---|---|
| **A** | Chain reads — asset, holders, distributions | Polymesh (public) | Built; gated on validation |
| **B** | Investor-facing marketplace surface | PCP marketplace | Open — needs `docs/pcp-admin-inventory.md` |
| **C** | Verification engine → distribution trigger | PCP API | Built against a mock; transport blocked on credentials |

The governing principle: **nothing in the build sequence waits on Polymath's response.**

---

## § 2. Layer A — Polymesh chain reads

### 2.1 Endpoints

| Purpose | Environment | Endpoint |
|---|---|---|
| GraphQL middleware (SubQuery) | Mainnet | `https://mainnet-graphqlnative.polymath.network/` |
| GraphQL middleware (SubQuery) | Testnet | `https://testnet-graphqlnative.polymath.network/` |

### 2.2 Architecture decision: middleware directly, not `polymesh-rest-api`

`PolymeshAssociation/polymesh-rest-api` is **self-hosted** — a NestJS service needing
its own node WebSocket and middleware URLs. For a read-only integration that is
unjustified overhead; the middleware is already a public HTTP endpoint. Queried
directly from `ecoxchange-reconciliation-engine/src/polymesh/`.

Revisit only if a write path becomes necessary. Signing requires the TypeScript SDK or
`pcp-signing-managers`, and is out of scope — writes go through Polymath (Layer C),
not directly to chain.

### 2.3 Schema discovery is a build step

`docs/polymesh-middleware-schema.graphql` holds the schema the queries were written
against (`polymesh-subquery` v19.6.0, taken from the indexer's own source rather than a
live introspection, because the build environment could not reach `*.polymath.network`).
`scripts/introspect-polymesh.sh` performs the live check. **Run it and diff before
mainnet.** See `docs/polymesh-reference-asset.md` for why this is a hard gate.

Schema facts that contradict earlier assumptions:

| Assumed | Actual |
|---|---|
| `currency` is a string | `Distribution.currency` is an **Asset reference** |
| distributions carry an extrinsic hash | Only `DistributionPayment` does, via `createdEvent`; block hash is stored instead |
| assets expose `decimals` | No such field; the chain is fixed 6-decimal |
| `paymentAt` is a date | BigInt **milliseconds** |
| `issuer_did` is a field | Derived from `Asset.owner` (an `Identity`) |

### 2.4 Data model

Migration `012_polymesh.sql`: `polymesh_assets`, `polymesh_holders`,
`polymesh_distributions`, `polymesh_sync_runs`. Additive only.

**Amounts are stored twice.** Every chain quantity keeps its unscaled integer verbatim
in a `*_raw TEXT` column — the source of truth — alongside a derived `NUMERIC` for
display and aggregation. Polymesh is 6-decimal fixed point; pushing those values through
a float, or through the 2-decimal `Cents` type used on the submission side, loses
precision on the one surface whose selling point is that figures are checkable against a
public ledger. `descaleToString` does string math only.

**`polymesh_holders` is append-only.** Snapshots, not upserts — cap-table-over-time is
required for investor reporting and any secondary-market analysis. Do not optimise this
into an upsert.

**`polymesh_distributions.verification_record_id` is the point of Layer A.** It is the
join that lets EcoXchange state, verifiably, that a payment corresponds to a specific
month of verified production. Every other column supports it.

### 2.5 Reconciliation — what may set that column

**Only a `pcp_submissions` row.**

| Evidence | Result |
|---|---|
| Submission links distribution → VERIFIED record, amounts agree, real (non-mock) | `matched` |
| Submission exists but period FLAGGED/PENDING, amounts drift, or mock mode | `discrepancy` |
| No submission link | `unmatched` — always |

Date proximity is **not** a matching strategy. A payment on day 3 of month N+1 settles
month N, and date arithmetic cannot distinguish that from coincidence. Proximity may
name a candidate period in `reconciliation_notes` for a human to confirm; it never
populates `verification_record_id` and never yields `matched`. A green badge asserting a
linkage derived from a date guess is a public claim that cannot be defended, which is
strictly worse than showing nothing.

**Unverified assumption:** the join key is
`pcp_submissions.pcp_distribution_id == Distribution.id` (`"<assetId>/<localId>"`). No
real PCP response has been seen, so this is inference. `reconcileAsset` reports orphaned
submissions rather than failing silently. Until Layer C is live, **every distribution
reconciling as `unmatched` is the expected state.**

### 2.6 Endpoints

`GET /api/polymesh/assets`, `/assets/:projectId`, `/assets/:projectId/holders`,
`/assets/:projectId/distributions`, `/sync/runs`, `/health`; `POST /api/polymesh/sync`
(ADMIN). Reads are public — the data mirrors a public ledger and the transparency claim
depends on anyone being able to check it.

### 2.7 Cadence

Daily 06:00 ET plus on-demand, in `server/jobs/scheduler.ts`. Distributions are monthly
and holder changes rare pre-secondary-market, so daily is sufficient and keeps request
volume against a free public endpoint respectful.

### 2.8 Frontend — supersedes Spec 08

Route `/investor/project/:id/chain` in `ecoxchange-dashboard`. `LegacyProjectRedirect`
already rewrites the `/project/:id/chain` path named by the original spec.

Components: `AssetSummaryCard`, `HolderDistributionChart`, `DistributionHistoryTable`,
and `VerificationLinkBadge`. The badge is the differentiator — for each distribution it
shows the linked verification record, verdict, and three-source deviations, in
`matched` / `unmatched` / `discrepancy` states.

**Release gate.** `VITE_CHAIN_VIEW_ENABLED` defaults false, and when false the route is
not registered at all. `ecoxchange-demo` builds from this app, so merging is equivalent
to publishing. Do not enable until `docs/polymesh-reference-asset.md` is satisfied.

---

## § 3. Layer C — Capital Platform adapter

**Principle:** define the interface now, implement a mock now, add the HTTP transport
when credentials arrive. Everything upstream is built and tested against the interface,
not the transport. Mirrors `server/services/distribution/ports.ts`, whose
`DistributionSubmitter` is the port a real PCP client eventually satisfies.

`server/services/pcp/` — `interface.ts`, `mock-client.ts`, `http-client.ts`,
`config.ts`, `guards.ts`, `submissions.ts`, `trigger.ts`.

**`idempotency_key` is non-negotiable.** Deterministic on `(project_id, period_start)`,
enforced locally by a unique constraint on `pcp_submissions` before every call —
regardless of whether Polymath supports an idempotency header. A distributions API
without idempotency is a double-payment incident waiting to happen.

**A FLAGGED or PENDING record must never produce a submission.** Enforced at the
interface boundary in `guards.ts` by assertion, not only in calling code, so it holds
for every transport including ones written later.

**`client_mode` is stored on every row.** Without it, mock and real submissions are
indistinguishable in the audit trail and no auditor could tell which payments happened.

**Audit row is written before the transport call.** A process dying mid-call must not
leave a payment with no record that it happened.

### Flow

```
Day 1  Verification engine writes verification_records.
Day 1  Trigger: status == 'verified' AND no prior submission for the period.
Day 2  PCPClient.submitDistribution(request)   ← mock today, HTTP later
Day 2  Log submission + response to pcp_submissions.
Day 3  Poll getDistributionStatus until terminal.
Day 3  Polymesh sync (Layer A) observes the on-chain event independently.
Day 3  reconcile.ts confirms the two agree. Badge turns green.
```

Layer C submits; Layer A observes on the public ledger; reconciliation confirms they
agree. EcoXchange never takes Polymath's word that a payment happened. Preserve that
property deliberately.

---

## § 4. Layer B — marketplace surface (open)

Requires inspecting the admin console. Record findings in
`docs/pcp-admin-inventory.md`; Layer B gets specified from that document. Provisional
recommendation is **Mirror** — offering pages native on ecoxchange.net, handing off to
PCP only to transact — as the only option consistent with the Model C boundary.

---

## § 5. Build sequence

Three PRs, ordered by how much unvalidated inference each carries.

1. **Layer C adapter** — mock-backed, no chain dependency, no `projects` FK. Safe now.
2. **Layer A chain reads** — gated on the reference asset (§ 2.3) *and* on resolving
   the duplicate `projects` table (§ 6).
3. **Chain UI** — gated on Layer A validating against live testnet.

---

## § 6. Risks

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | PCP API requires a paid tier at unknown cost | High | § 6 questions in `docs/pcp-admin-inventory.md` |
| 2 | Distributions are manual-only | **High** | If so, the "72-hour automated distribution" claim is unsupported and must be revised before any general solicitation |
| 3 | No idempotency support | High | Enforced locally via the unique key; recorded as a known limitation |
| 4 | Queries never validated against a live chain | **High** | `docs/polymesh-reference-asset.md` — hard gate on Phase 1 |
| 5 | Two incompatible `projects` tables, one targeted by new FKs, with `drizzle-kit push --force` in Render's build | **High** | Resolve before applying `012_polymesh.sql`. Layer C is unaffected — it has no `projects` FK |
| 6 | PCP↔chain join key unverified | Medium | Orphaned submissions logged, not swallowed |
| 7 | Public middleware rate-limits or goes down | Medium | Daily cadence, backoff, cache in Supabase |
| 8 | Chain upgrade breaks queries | Medium | Pinned snapshot; re-run introspection |
| 9 | `auth-jwks` inference wrong; no issuer API exists | Medium | Cost is a mock and an interface, not a rewrite |

---

## § 7. Impact on existing documents

| Document | Change |
|---|---|
| Product Spec v2, Part 8 | Blocker #5 partially resolved — interface designed; restate as "PCP API credentials — blocked on Polymath response" |
| Product Spec v2, Part 5 | Add the Polymesh public read path as an EcoXchange-owned integration. The stack table currently implies all chain interaction runs through Polymath. It does not. |
| Spec 08 | Superseded by § 2.8 for Polymesh. The Base Sepolia explorer stays working and is left untouched |
| Spec 10 | Custom Solidity is not the distribution path; the PCP adapter is |
| Reconciliation Engine Spec v2 | Downstream consumers can name `PCPClient.submitDistribution` |
| Polymath Pivot Changelog | **Requires correction.** Broker-dealer, transfer agent and custody are excluded from Polymath's cost calculator and return to the blocker list as independent vendor relationships |
