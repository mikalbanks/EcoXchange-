# Site Consistency Audit — www.ecoxchange.net vs demo.ecoxchange.net

**Audited:** 2026-07-27
**Method:** Both sites rendered headlessly (Chromium/Playwright) and every reachable
route captured, then every claim cross-checked against the source data files in this repo.

**Scope:** 6 public pages on `www` (`/`, `/market`, `/develop`, `/method`, `/faq`, plus 23
marketplace listings) and 19 routes on `demo`.

---

## 0. Which code builds which site

Worth stating first, because it caused confusion during the audit:

| Domain | Built from | Config |
|---|---|---|
| `www.ecoxchange.net` | `client/` | root `wrangler.jsonc` (worker `ecoxchange1`) |
| `demo.ecoxchange.net` | **`ecoxchange-dashboard/`** | `ecoxchange-dashboard/wrangler.jsonc` |

**A-1 — `ecoxchange-demo/` claims the demo domain but is not what is deployed.**
`ecoxchange-demo/wrangler.jsonc` contains:

```jsonc
"routes": [{ "pattern": "demo.ecoxchange.net", "custom_domain": true }]
```

…while `ecoxchange-dashboard/wrangler.jsonc` has its `routes` block commented out and only
suggests `app.ecoxchange.net`. The live site's routes (`/investor/*`, `/developer/*`,
`/explorer`, `/benchmark`, `/distribute`) match `ecoxchange-dashboard/src/App.tsx`, not
`ecoxchange-demo/src/App.tsx` (which has `/portfolio`, `/methodology`, `/rias`,
`/developers`). A `wrangler deploy` from `ecoxchange-demo/` would silently overwrite the
live demo with the stale app. This is the highest-risk item in the audit even though it is
not user-visible today.

---

## 1. Cross-site contradictions (both sites are public — these conflict with each other)

### B-1 — Advertised return band vs. what the demo actually shows

| Source | Claim |
|---|---|
| `www` /faq | "6–8% cash distribution per year… net IRR of 10–14%" |
| `demo` /investor/marketplace | Yield **7.0%**, IRR **12.0%** ✅ in band |
| `demo` /distribute | Annual cash yield **8.5%**, net IRR (w/ ITC) **13.4%** ❌ above the 6–8% band |
| `demo` /projects | Yields **7.4 – 8.5%**; four of six exceed 8% |

The demo repeatedly shows yields above the ceiling the landing page advertises.

### B-2 — `www` marketplace IRRs are far below the advertised target return

`www` /faq promises a **net IRR of 10–14%**. Every listing on `www` /market shows an "IRR
proxy" of **1.2% – 8.3%** — not one reaches the advertised floor. A prospective investor
comparing the two pages sees the product underperform its own headline by 2–10 points.

### B-3 — Headline accuracy metric is different on each site — RESOLVED

- `www` home: **"99.74%"** — "Verification confidence on satellite-reconciled production data" (`landing.tsx:7`), repeated in the hero figure as `OBS. 04 · 99.74% CONFIDENCE · N = 8,760 HRS`.
- `demo` /benchmark and /reference: **"±9.8% mean deviation"**, "66.3% within ±10%", full fleet ±13.0%, across 5,065 plants.

These are the two sites' central credibility numbers and they are not reconcilable. The
99.74% figure appears nowhere in the codebase's benchmark data and carries no source note,
while the ±9.8% figure is backed by `ecoxchange-dashboard/src/data/benchmark-results.json`.

**Resolved.** The 99.74% "confidence" figure is gone from `www`. The artifact moved to
`shared/benchmark/benchmark-results.json` and both sites now read it through
`shared/benchmark/index.ts` — the homepage proof strip, the benchmark module, the
`SunPathDiagram` caption, `/benchmark` and the exported PDF all resolve from the same
object, so they cannot diverge again. `shared/benchmark/benchmark.test.ts` guards the
cohort labels and the target-segment values under the root `npm test`.

### B-4 — Two-source vs. three-source verification story — RESOLVED

- `www` home §II: "cross-references satellite irradiance **against utility net-meter data**" — two sources. Footer strapline reinforces it: `SATELLITE × UTILITY METER · AUDITABLE · HARDWARE-FREE`. Also described as a "**double-entry** reconciliation engine".
- `www` /method: "**Three sources**, one ledger" / "3 Independent production sources" (inverter API, utility meter, satellite).
- `www` /faq: "reconciles **three** independent measurements".
- `demo`: "**three-source** reconciliation engine", "3-source verified".

The home page is the only place describing it as two sources — and it is the page most
visitors see first.

**Resolved.** The homepage hero, the §II verification section and the footer strapline
(`Inverter × Utility Meter × Satellite Model`) now all describe three sources, matching
`/verification`, `/faq` and the demo.

### B-5 — Developer cost comparison: different totals on each site

| Line item | `www` /develop | `demo` /onboard ($2.5M raise) |
|---|---|---|
| Securities counsel | $12,000–$30,000 | $20,000 ✅ in range |
| Placement fee | 4–8% | 6% → $150,000 ✅ in range |
| Setup / marketing | $35K + 6–8% | $40,000 |
| Distribution admin | $10K–$25K/yr | $15,000 ✅ in range |
| Production audit | $5K–$15K/yr | $10,000 ✅ in range |
| **Traditional total** | **$325K–$500K** | **$235,000** ❌ below the stated range |
| **EcoXchange total** | **~$125K–$175K** | **$90,000** ❌ below the stated range |
| **Saving** | ~55–65% | 62% ✅ |

Individual line items agree, but both totals on the demo fall outside the ranges `www`
publishes. Note also that `www`'s "~$125K–$175K" is inconsistent with EcoXchange's *own*
published fee schedule: at 3% + $15K fixed, a $1M raise costs $45K and a $5M raise costs
$165K — so the true range across the advertised $1–5M band is **$45K–$165K**, not
$125K–$175K.

### B-6 — Time-to-capital quoted three different ways

- `www` /develop hero: "Target intake-to-live offering timeline: **2–4 weeks**" and stat card "**2–4 wks**"
- `www` /develop cost table (`develop.tsx:12`): "Time to capital → Target **2–6 weeks**"
- `demo` /onboard: "Plus: **4–6 week** close vs. 3–9 months traditional"

Two of these are on the same page. ("3–9 months" for traditional is consistent across both sites. ✅)

### B-7 — Investor onboarding flow defined differently

| `www` /market (5 steps) | `demo` /investor/onboard (5 steps) |
|---|---|
| 1. Accreditation | 1. Create Account |
| 2. KYC / AML | 2. Verify Accreditation |
| 3. Wallet | 3. KYC / AML Check |
| 4. Subscription | 4. Create Wallet |
| 5. Funding | 5. Fund & Subscribe |

Same step count, different flow. `www` also names "**Parallel Markets or VerifyInvestor**"
as the accreditation vendor; the demo names **Parallel Markets** only (both on
/investor/onboard and as `KYC PROVIDER` on /explorer).

### B-8 — Developer intake length differs

`www` /develop intake says **"STEP 1 OF 8"**; `demo` /onboard developer onboarding says
**"Step 1 of 4"**. (Separately, `demo` /onboarding — the *investor* suitability quiz — is
"Step 1 of 8", which makes the collision more confusing.)

### B-9 — Brand inconsistencies across the two sites

- **Theme colour:** `www` `<meta name="theme-color" content="#004d1a">` vs `demo` `#1B4D35`. Two different brand greens.
- **Strapline:** `www` masthead "CLEAN ENERGY MARKET" vs `demo` "Digital securities for renewable energy" / "Demonstration Platform".
- **Demo discoverability:** the only link from `www` to the demo is on the home page (`landing.tsx:113` and `:136`). Every other `www` page uses the shared `Header`, which has no demo link at all — it shows "Log in" instead. A visitor who lands on /method or /faq has no path to the demo.

---

## 2. `www.ecoxchange.net` — internal inconsistencies

### C-1 — Marketplace listings contradict the entire stated thesis (high visibility)

The positioning is explicit and repeated: "$1–5M target deal size", "the **$1M–$5M**
permitted solar project has no institutional capital path", "permitted **1–20 MW** U.S.
solar projects". The demo's /benchmark page agrees: "EcoXchange's Target Segment: 1–20 MW".

But **16 of the 23 listings on /market are above 20 MW** — including 200 MW, 150 MW,
128 MW, 110 MW and 95 MW, with annual revenues up to $28.2M. The marketplace showcases
precisely the deal size the pitch says nobody else will serve *because EcoXchange serves
the other end*.

### C-2 — Placeholder text shipped to production

Three listings show **"Demo, Kansas"**, **"Demo, North Carolina"** and **"Demo, California"**
in the county field (Plains Wind & Solar Hybrid, Piedmont Queue Solar, Kern Sunfield South).
The literal string `Demo` is rendering as the county name on the public marketplace.

### C-3 — Three incompatible revenue models shown in one sorted list

Deriving implied capacity factor from the displayed revenue ÷ PPA price:

| Cohort | Revenue / MW / yr | Implied CF | Verdict |
|---|---|---|---|
| Queue listings | ~$188,300 | **33.3%** | **Physically impossible** for fixed solar PV in Kansas or North Carolina (US range ≈ 15–25%) |
| Curated, $0.0742/kWh | ~$84,457 | 13.0% | Low but plausible |
| Curated, $0.0645/kWh | ~$73,441 | 13.0% | Low but plausible |
| "Known" (Lancaster, Imperial Valley) | ~$50,000 | **7.7%** | Implausibly low |

Because the three cohorts are interleaved in one capacity-sorted list, smaller projects
appear more profitable than larger ones: **Plains Wind & Solar (150 MW) shows $28.2M
revenue while Lone Star West (200 MW) shows $16.9M**, and two 55 MW projects
(Piedmont Queue vs Piedmont Tracking Array) differ by 2.2× on identical capacity.

### C-4 — IRR proxy is a function of PPA price only

Every listing at $0.0742/kWh shows exactly **4.4%**; every listing at $0.0645/kWh shows
exactly **3.5%**; every queue listing shows exactly **8.3%** — regardless of capacity,
stage, or revenue. The figure is labelled "IRR proxy · Estimated" but is not
project-specific in any way.

### C-5 — /method: 72 hours vs a timeline that ends on day 3–4

The page's stat card says "**72 hrs** — Target receipt after month-end confirmation" and the
body repeats "within **72 hours** of month-end". The step timeline immediately above runs
Day 1 → Day 1 → Day 2 → Day 3 → **Day 3–4** (`method.tsx:30-31`), i.e. up to 96 hours.

### C-6 — Mislabelled project type

"Plains Wind & Solar **Hybrid**" is tagged `Solar PV` / `SOLAR` with a solar-only PPA price.

### C-7 — Grammar

`faq.tsx:51` — "**Who custody my tokens?**" → "Who has custody of my tokens?"

### C-8 — Every page shares one `<title>`

All six `www` pages render `EcoXchange — Production-verified yield for accredited investors.`
No per-page titles, which hurts SEO and browser-tab/bookmark usability.

---

## 3. `demo.ecoxchange.net` — internal inconsistencies

### D-1 — The investor portfolio contradicts its own holdings widget on a single screen

`/investor` shows both of these, side by side:

| Portfolio summary (`demo-portfolio.json`) | Holdings widget (`demo-distributions.json`) |
|---|---|
| Total invested **$50,000** | 100 tokens · **$10,000** invested |
| Monthly yield **$354** | Monthly distribution **~$58.33** |
| Lifetime yield **$4,248** | Total received **$699.96** |

Both are internally coherent (each is 12 × its monthly figure) but they describe two
different investors. `$58.33` is the correct one: $58.33 × 12 ÷ $10,000 = **7.0%**, matching
the offering's `target_annual_yield: 0.07`. The `$354` track implies **8.5%** on $50,000 —
which is where the B-1 yield discrepancy originates.

### D-2 — Token supply: 5,000 vs 25,000

`demo-offering.json` defines `total_tokens: 25000`, `token_price: 100`, `target_raise: 2500000`
(internally consistent: 25,000 × $100 = $2.5M).

`explorer-contracts.ts:36` hard-codes `Total Supply: "5,000 ESN"` — and even documents the
divergence in a comment at line 2: *"Stats echo the demo world: 5,000 ESN at $100 (the demo
investor's 100 ESN = 2.0%)"*. At $100/token, 5,000 tokens is a **$500,000** raise, but
/investor/marketplace on the same site shows **"$750K / $2.5M"** funded.

Every ownership percentage inherits the error: "100 ESN = 2.0% share" is only true at 5,000
supply; against the real 25,000 it is 0.4%.

### D-3 — 500 ESN labelled as 2.0% ownership

`/distribute` yield calculator: "**500 ESN** — Tokens Received · **2.0% ownership**".
500 ÷ 5,000 = 10%, and 500 ÷ 25,000 = 2%. The token count and the percentage are computed
against different supplies.

### D-4 — Distribution size contradicts itself across three pages

| Page | Claim |
|---|---|
| `/distribute` | One distribution = **$17,700.00 USDC** to 12 holders; your 2.0% share = $354.00 |
| `/explorer` | Distribution Contract **Total Distributed: $4,248 USDC**; distribution count **12**; avg monthly **$354** |
| `/explorer` activity feed | A single distribution event of **4,248.00 USDC → 12 verified holders** |

If a distribution is $17,700 and there have been 12 of them, total distributed is
**$212,400**, not $4,248. And $4,248 is simultaneously presented as *one investor's lifetime
yield* (/investor) and *the contract's all-time total across all 12 holders* (/explorer).

Sanity check: at the correct $58.33/100 tokens, a full 5,000-token distribution is
**$2,915** — so the $17,700 figure is ~6× too high.

### D-5 — Savannah project has three different yields and two different production figures

The same asset, across `demo-projects.ts` and `demo-offering.json`:

| Field | `/projects` | `/investor/marketplace` | `/distribute` |
|---|---|---|---|
| Yield | **7.8%** | **7.0%** | **8.5%** |

| Field | `demo-projects.ts` | `demo-offering.json` / `/investor` |
|---|---|---|
| Annual production | **8,520 MWh** | **8,102.8 MWh** |
| Capacity factor | **19.4%** | **18.5%** (per /developer/demo) |
| Verified months | **11 verified + 1 flagged** | **12 verified**, status VERIFIED |
| Investor count | **47** | **12 holders** (/explorer, /investor) |

`8,102.8 MWh` is the defensible number — 5,000 kW × 8,760 h × 18.5% = 8,103 MWh, and it
matches `cumulative_kwh_verified: 8102755`.

### D-6 — Four names for one project

"Savannah Solar I ESN" (offering) · "Savannah Community Solar 5MW" (portfolio, distribute) ·
"Savannah Community Solar" (projects) · "ESN-SAV-5MW" (token symbol). No page explains they
are the same asset.

### D-7 — Impact figures don't match the ownership share

`/investor/impact` reports **6,830 kWh verified production** attributed to the investor. At
the stated 2.0% share of 8,102,755 kWh that should be **162,055 kWh** — a 24× gap. The
downstream equivalencies (2,671 kg CO₂ = 6,830 × 0.391 eGRID SRSO ✅) are arithmetically
correct but built on the wrong base, so every impact number on the page is understated.

### D-8 — Platform total invested: $45,000 vs $50,000

`/projects` header shows "**AS INVESTOR: $45,000**" while `/investor` shows "TOTAL INVESTED
**$50,000**".

### D-9 — Timeline is 20 months stale

Distribution history runs **Jan–Dec 2024** and the latest verified period is **December 2024**,
yet `/investor/distributions` announces "Next Distribution: ~$58.33 on **August 3, 2026**"
("in 7 days" — correct relative to today). That implies a 20-month gap with no
distributions, while the UI simultaneously claims 12 consecutive verified months.

`/explorer` compounds it: "LAST VERIFIED **Jun 28, 2026**", "LAST WRITE **Jun 30, 2026**",
12 oracle writes — but `/distribute`'s pending verification run is for **December 2024**.

### D-10 — Configuration error message shown to end users

`/reference` renders, in the page body:

> Reference Library requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to be set so the
> dashboard can read from Supabase.

An internal env-var diagnostic is the entire user-facing content of a public route. The page
is effectively broken in production.

### D-11 — Dead navigation and wrong page titles

- Investor sidebar ships two permanently disabled items: **Performance (SOON)** and **Documents (SOON)**.
- Every demo route — including `/developer/loi`, `/onboard` and `/benchmark` — sets
  `<title>EcoXchange — Investor Dashboard</title>`.

### D-12 — Minor

- `/benchmark` size table lists "**< 1 MW → 0 plants**", yet `/investor/catalog` still offers "< 1 MW" as a filter that can only ever return nothing.
- Billerica (2 MW): `/projects` says 2,950 MWh (16.8% CF), `/developer/demo` says 16.6% CF (2,908 MWh). Phoenix (1 MW): 1,920 MWh (21.9%) vs 22.1%. Small, but the same asset described twice.

---

## 4. What is consistent (verified, no action needed)

- **Minimum investment $10,000** — agrees across `www` /faq, `www` /market, `demo` marketplace, `demo` /explorer.
- **Fee schedule 3% origination + $15,000 setup + 1.25% AUA, borne by the SPV** — agrees across `www` home §IV, `www` /faq, `www` /develop, and the `demo` /onboard line items.
- **Reg D 506(c) / accredited-only / ERC-3643 on Base / USDC monthly / K-1 pass-through / Privy wallets** — consistent everywhere.
- **Benchmark internals** — `/benchmark` arithmetic checks out: cohort sizes sum to 3,882 (0 + 2,094 + 1,190 + 398 + 200); 66.3% of 3,882 ≈ 2,572 plants ✅; `/investor/catalog` header stats (±9.8% / ±7.0% / ±2.8% / 13.5%) match `eia-catalog.json` exactly.
- **`/projects` aggregates** — investor counts sum to 216 ✅; verification rate 53/55 = 96.4% ✅; average of the six quoted yields = 7.9% ✅; "8 states" ✅.
- **Traditional-process benchmarks** — "3–9 months" time to capital agrees on both sites.
- **Savannah PPA $0.085/kWh with 2% escalator** — agrees between `/developer/demo` and `/distribute`.
- **Dec 2024 verification run** — 501,618 kWh agrees between `/distribute` and the `/explorer` oracle-write entry.
- **Risk/disclaimer furniture** — the †/‡ footnotes, demonstration-mode banner and no-offering language are applied uniformly across every demo route.

---

## 5. Suggested fix order

**Tier 1 — publicly visible and factually wrong**
1. C-2 "Demo, Kansas/North Carolina/California" placeholder counties on `www` /market.
2. D-10 Supabase env-var error rendering as page content on `demo` /reference.
3. D-1 / D-4 / D-2 the $50,000-vs-$10,000 portfolio fork, the $17,700-vs-$4,248 distribution, and the 5,000-vs-25,000 token supply — one root cause, three symptoms. Pick $10,000 / $58.33 / 25,000 tokens and propagate.
4. C-3 queue-listing revenues implying a 33% solar capacity factor.

**Tier 2 — contradicts the pitch**
5. C-1 marketplace listings vs the stated 1–20 MW / $1–5M thesis.
6. B-2 marketplace IRR proxies (1.2–8.3%) vs the advertised 10–14% net IRR.
7. B-3 "99.74% confidence" vs "±9.8% mean deviation" — pick one credibility metric, source it.
8. B-4 the home page's two-source description vs three-source everywhere else.
9. D-5 Savannah's three yields, two production figures, and 47-vs-12 investor count.

**Tier 3 — numeric tidy-up**
10. B-6 time-to-capital (2–4 / 2–6 / 4–6 weeks) and C-5 the 72-hour vs Day 3–4 timeline.
11. B-5 developer cost totals, including recomputing `www`'s "$125K–$175K" from the actual fee schedule.
12. B-7 / B-8 onboarding step definitions; D-8 $45,000 vs $50,000; D-7 impact base; D-9 the 2024/2026 date drift.

**Tier 4 — polish and hygiene**
13. A-1 remove or correct the `demo.ecoxchange.net` route in `ecoxchange-demo/wrangler.jsonc` (deploy hazard).
14. B-9 theme colour, strapline, and demo link missing from the shared `www` header.
15. C-7 FAQ grammar; C-8 and D-11 per-page titles; D-6 project naming; D-11 dead nav items.

---

## Appendix — reproducing this audit

Both sites are client-rendered SPAs, so `curl` returns only the app shell. They were captured
with headless Chromium. Note that in this environment Chromium's TLS 1.3 ClientHello is reset
by the egress proxy; launching with `--ssl-version-max=tls1.2` resolves it (certificate
verification stays enabled).

```
node crawl.mjs https://www.ecoxchange.net/ landing.json 40
```

Demo routes are role-gated behind the landing role-picker and were enumerated from the
deployed bundle (`/assets/index-*.js`, `grep -o 'path:"/[^"]*"'`) rather than from
`App.tsx`, which does not match production — see item A-1.
