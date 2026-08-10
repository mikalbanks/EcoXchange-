# Polymath Capital Platform — Admin Console Inventory

**Status: PARTIAL.** First walkthrough recorded 2026-08-10 from a 47-second screen
capture of `admin.polymath.market/en/marketplace/theecoxchange/`. Enough to settle
Spec 18 risk #2 and to constrain Layer B. Sections still marked _TBD_ need a second
pass with the relevant screens actually opened.

**Everything below is read off screenshots.** Nothing here was verified by using the
platform, and no dropdown was expanded. Where a value is inferred rather than seen,
it says so.

---

## 0. What already exists

The tenant is **already provisioned** — this is not a fresh signup.

- Marketplace slug: `theecoxchange`; display name `ecoxchange`.
- Console nav: Dashboard, Companies, Offerings, Investor CRM, Orders, Trade,
  Distributions, Documents, Settings, Marketplace teams.
- Access granted by Brad Hofman (Head of Customer Success) on 2026-06-29, with
  **$1000 of platform credit**. What the credit covers is unknown — see § 7.

Every counter is zero: 0 offerings, 0 orders, 0 distributions, 0 active listings,
0 trading volume. **No asset has been issued**, so Gate A in
`docs/polymesh-reference-asset.md` is untouched by this walkthrough.

## 1. Offering creation form

_TBD_ — the Offerings list was opened but the create form was not. Still needed
before a mirrored offering page can be specified.

| Field | Type | Required | Notes |
|---|---|---|---|
| _TBD_ | | | |

## 2. Settings → API / Developers / Webhooks

**No API section exists.** The complete Settings menu is:

`General · Domains · Emails · Payments · Compliance · Portfolios · Book a call · Customization · Trade`

- API section present? **No** — nothing named API, Developers, Keys or Webhooks.
- Credential issuance self-serve? **No self-serve path visible.**
- Webhooks available? **None exposed in the console.**
- Documentation link in-console? **None seen.**

**Consequence for Layer C.** `HttpPCPClient` has no visible way to obtain
credentials, and there may be no HTTP API to build against at all. This does not
invalidate the ports-and-adapters decision — it vindicates it, since nothing
upstream is coupled to a transport that may never exist. But it does mean the
planned "add the HTTP transport when credentials arrive" step now has a real chance
of resolving to **"there is no transport."**

The absence is not proof: an API could exist and be documented off-console, or be
gated to a tier this tenant is not on. That is question 1 in the outstanding list
below and in the drafted email to Brad.

**If there is no API, the adapter needs a third client mode.** Today
`client_mode` is `mock | live`. A `manual` mode — recording what a human entered
into the console, written to `pcp_submissions` with the same deterministic
`idempotency_key` — preserves the audit trail and the reconciliation join without a
transport. Reconciliation would still work end to end, because Layer A observes the
chain independently of how the distribution got there. Not yet implemented.

## 3. Distributions module

`/marketplace/theecoxchange/distribution-schedules`

The module is real, and it is **console-driven, not file-upload**. Header copy:
*"Create and manage investor distributions for your tokenized assets. Set payout
amounts, choose calculation methods, and review snapshots before confirming your
distribution."*

Create flow at `/distribution-schedules/create`:

| Section | Control | Options seen |
|---|---|---|
| Type of the distribution | `Distribution type` dropdown | not expanded — _TBD_ |
| Calculation method | `Calculation method` dropdown | described as: by total distribution amount, fixed amount per token, or percentage yield per token |
| Distribution configuration | `Distribution asset` dropdown | fiat **or** tokens |

Actions: **Save draft** and **Schedule distribution** (the latter disabled until the
form is valid). "Schedule" implies future-dating; whether it also implies recurrence
is _TBD_.

### The finding that matters

> **"For fiat currency, payment must be processed manually off-platform. Ensure the
> transaction is confirmed."**

Verbatim from the create form. **This confirms Spec 18 risk #2 for the fiat path.**
If EcoXchange distributes in USD, Polymath does not move money — it records an
intent and someone wires the funds by hand. The "72-hour automated distribution"
claim is **unsupported on the fiat path** and must be revised before any material
carrying it goes out under general solicitation. That is a copy and compliance
action, not an engineering one.

### The escape hatch

Settings → Payments exposes three rails: **Paper checks**, **Wire transfers**, and
**Crypto payments → USDC**. A USDC distribution is a token transfer, so it is
plausibly on-chain and automatable in a way the fiat path explicitly is not.

That makes the fiat-vs-USDC choice a **product decision, not a technical one**:

- **Fiat** — familiar to investors, no wallet needed, but distribution is manual and
  the automation claim has to be rewritten.
- **USDC** — the automation claim survives and reconciliation gets a real on-chain
  event to match, but every investor needs a wallet and USDC, which is a material
  onboarding cost for the retail audience the product targets.

Unresolved either way:

- Idempotency key or client reference? **Not visible in the form.** _TBD_ whether
  one exists under the unexpanded dropdowns.
- What identifier is returned for a submitted distribution? **_TBD_ — still the
  single most important unknown for the reconciliation join.**

> `polymesh_distributions.verification_record_id` is joined via
> `pcp_submissions.pcp_distribution_id == Distribution.id`, where Polymesh's id is
> `"<assetId>/<localId>"`. Whether PCP returns that same string remains an
> assumption with no evidence behind it. One real distribution — even a testnet one
> — settles it.

## 4. Marketplace listing configuration

_TBD_ — Offerings list seen, listing configuration not opened.

## 5. Custom domain setup

Settings → **Domains** exists, and Settings → **Customization** offers Logotype +
favicon, Sign up/log in images, Footer, Support and Emails. Emails can be sent from
a custom domain.

So the platform supports meaningful white-labelling. **This weakens the case for
Mirror somewhat** — a branded Polymath surface may be closer to acceptable than the
spec assumed. It does not eliminate it: white-labelling changes the chrome, not who
owns the page where the verification history and production data would live.

- DNS requirements: _TBD_
- Certificate handling: _TBD_
- Subdomain constraints (e.g. `invest.ecoxchange.net`): _TBD_
- Confirmed cost: _TBD_ (spec assumed +$100/mo)

## 6. Investor-facing preview

_TBD_ — no investor-side screen was captured. Still needed; this will be judged as
EcoXchange's experience regardless of who built it.

## 7. Other modules seen

- **Trade** (`/secondary-trading`) — secondary market with Listings and Orders;
  columns Listing ID, Seller, Security token, Available, Token price, Payments.
  Requires a **Set up** step; currently unconfigured.
- **Compliance** — "Internal accreditation", configurable accreditation packages and
  required signatures by investor type and jurisdiction. Requires **Set up**.
- **General** — two toggles, both currently **off**: "Restrict Offerings to
  KYC-Approved Users" and "Require Investment Request Approval". Both should be
  reviewed before anything goes live.
- **Investor CRM**, **Companies**, **Portfolios**, **Documents**, **Marketplace
  teams** — present, not opened.

---

## Outstanding questions

Drafted as a reply to Brad Hofman on the "Explore Polymath's Platform" thread
(2026-06-29); not yet sent at time of writing.

1. Is there a programmatic API for submitting distributions at all, given no API
   section appears in Settings? If so, how are credentials issued and is it
   tier-gated?
2. Does the distribution endpoint or form accept an idempotency key / client
   reference?
3. What identifier is returned for a submitted distribution — the Polymesh
   `Distribution.id` as `<assetId>/<localId>`, or a Polymath-internal id?
4. Are webhooks available, and for which events?
5. **Can we issue a test asset on testnet, and does the $1000 credit cover
   issuance?** This is the question that unblocks Gate A, and it was not in the
   original spec's list.

Also outstanding, from the Polymath Pivot Changelog correction: broker-dealer,
transfer agent and custody are **excluded** from Polymath's cost calculator. They
return to the blocker list as independent vendor relationships with independent
costs.
