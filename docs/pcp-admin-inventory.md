# Polymath Capital Platform — Admin Console Inventory

**Status: OPEN.** Spec 18 Layer B (the marketplace surface) is deliberately
unspecified until this document exists. Fill it in by walking
`admin.polymath.market/en/marketplace/`, which is behind login.

Layer B's recommendation — **Mirror** — is provisional and pending this
inspection. It is the only option consistent with the Model C boundary:
EcoXchange owns discovery, verification history and production data; Polymath
owns the transaction. Redirect surrenders the surface where the differentiator
lives; Full API is unjustified spend before a signed LOI.

---

## 1. Offering creation form

Every field, and whether it is required. This determines what a mirrored offering
page must store in Supabase.

| Field | Type | Required | Notes |
|---|---|---|---|
| _TBD_ | | | |

## 2. Settings → API / Developers / Webhooks

**This section resolves Layer C immediately.** Presence or absence of a
developer/API section is the answer to whether `HttpPCPClient` is buildable at all.

- API section present? _TBD_
- Credential issuance self-serve, or support ticket? _TBD_
- Webhooks available? Which events? _TBD_
- Any documentation link exposed in-console? _TBD_

## 3. Distributions module

**Spec 18 risk #2 lives here — and it is the highest-stakes question in this
document.**

- Does it accept programmatic input, or is it upload/manual only? _TBD_
- If file upload: what format, what columns? _TBD_
- Does it support an idempotency key or client reference? _TBD_
- What identifier does it return for a submitted distribution? _TBD_

> The last question is not incidental. `polymesh_distributions.verification_record_id`
> is joined via `pcp_submissions.pcp_distribution_id == Distribution.id`, where
> Polymesh's id is `"<assetId>/<localId>"`. Whether PCP returns that same string is
> currently an assumption with no evidence behind it. Record the real format here.

> **If distributions are manual-only:** the "72-hour automated distribution" claim
> in the product spec, the go-to-market claims table (Claim #10) and the investor
> dashboard design is unsupported and must be revised before any material carrying
> it goes out under general solicitation. That is a copy and compliance action, not
> just an engineering one.

## 4. Marketplace listing configuration

- External URLs accepted? _TBD_ (determines whether the mirror can deep-link back)
- Custom copy? _TBD_
- Images? Dimensions/limits? _TBD_

## 5. Custom domain setup

- DNS requirements: _TBD_
- Certificate handling: _TBD_
- Subdomain constraints (e.g. `invest.ecoxchange.net`): _TBD_
- Confirmed cost: _TBD_ (spec assumed +$100/mo)

## 6. Investor-facing preview

What a subscriber actually sees at handoff. **This will be judged as EcoXchange's
experience regardless of who built it**, so capture screenshots.

- _TBD_

---

## Commercial questions (Spec 18 § 6)

Track answers alongside the console walk:

1. Is API documentation available? _TBD_
2. Can we get sandbox credentials? _TBD_
3. Is programmatic access in Start-Me-Up, or a paid tier — at what price? _TBD_
4. Does the distributions module accept programmatic submission with idempotency? _TBD_

Also outstanding, from the Polymath Pivot Changelog correction: broker-dealer,
transfer agent and custody are **excluded** from Polymath's cost calculator. They
return to the blocker list as independent vendor relationships with independent
costs.
