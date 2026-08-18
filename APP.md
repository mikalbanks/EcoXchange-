# EcoXchange

**Independent Production Verification for Solar Assets**

---

## Positioning rule — read before writing any user-facing copy

Every surface communicates the business in this order. This is not a style
preference; it is what the product actually is, and the public site, the demo
and the investor dashboard are all built to it.

1. **Verification leads.** EcoXchange independently verifies monthly solar
   production using inverter telemetry, utility meter data, and
   satellite-modeled expected generation.
2. **The determination drives action.** Each project receives a verified,
   flagged, or pending determination. Investor distributions are gated by that
   determination.
3. **Securities are the first application.** EcoXchange administers private
   placements of interests in individual solar-project entities for verified
   accredited investors under Reg D 506(c).
4. **Tokenization is plumbing.** Permissioned digital records may support
   ownership administration and distribution workflows, but they are not the
   product and not the investment.

Do not lead with `digital securities`, `tokens`, `blockchain`, `wallet`,
`USDC`, or chain telemetry. Do not describe EcoXchange as a
`regulated platform` unless counsel has approved that exact claim.

---

## What is EcoXchange?

EcoXchange is building a source-aware production-verification workflow for solar projects. The engine compares available inverter telemetry, utility data, and modeled generation, labels each leg as measured, modeled, derived, or simulated, and issues a verified, flagged, or pending engine determination for each project-month.

The current public pilot demo is verification-only: it does not host an open offering, accept investments, or execute distributions. After pilot validation and the required legal, compliance, and operating approvals, EcoXchange intends to apply those determinations to project-level capital-formation and distribution workflows.

### Planned Financial Product (Not Currently Offered)

| Element | Detail |
|---------|--------|
| What is evaluated | Monthly project-level production with source-level provenance; independence must be established for each input |
| Determination | Verified · flagged · pending — intended to gate future distribution processing |
| Asset Type | Equity interest in a single project entity, governed by the offering documents |
| Structure | SPV membership interest (equity, revenue-share, or structured yield claim) |
| Backing | Real-world renewable energy projects held in project-level SPVs (Delaware LLCs) |
| Distribution Source | Energy production revenue, PPAs, structured project cash flows |
| Deal Size | $1M – $5M per project offering (Phase 1) |
| Target Segment | Permitted 1–20 MW U.S. solar projects |
| Minimum Investment | TBD — targeting $10K–$25K |

### Target Characteristics

- **Source-aware**: measured, modeled, derived, and simulated inputs are disclosed separately
- **Distribution-gated**: the planned payment workflow proceeds only after the period's determination is verified
- **Income-linked design**: any future distributions would derive from documented project cash flows
- **Project-specific design**: any future interest would be governed by its project entity and offering documents
- **Transparent**: production provenance leads; future revenue and distribution records require authoritative sources
- **Approval-dependent**: any issuance requires the applicable legal, compliance, and operating approvals
- **No liquidity claim**: secondary-market functionality is outside the current pilot

### SPV Structure

Each renewable energy project is held within a dedicated Special Purpose Vehicle (Delaware LLC). Investors hold membership interests in these SPVs. Revenue flows from energy production through the PPA into the SPV, and is distributed pro rata to project-interest holders after operating expenses, debt service, and reserves. A permissioned digital record may support ownership administration; the investment itself is the interest described in the subscription and operating documents.

---

## Positioning Evolution

| Phase | Positioning |
|-------|-------------|
| **Phase 1** (Current) | Independent production verification, applied to project-level capital formation |
| **Phase 2** | Verification-gated distribution infrastructure at scale |
| **Phase 3** | Capital-formation and production-verification platform with secondary liquidity |

### Brand Language

**Use:** independent production verification, monthly determination, verified/flagged/pending, distribution gate, three-source reconciliation, project interest, private placement, capital-formation and production-verification platform

**Avoid:** crypto exchange, DeFi, permissionless, unregulated, democratizing finance, marketplace (until Phase 3)

**Do not lead with:** digital securities, tokens, tokenized, blockchain, wallet, USDC, chain telemetry — these describe administration plumbing, not the product. They may appear in technical surfaces (`/explorer`, ownership-record detail) but never in a hero, a primary heading, or a first-row dashboard metric.

**Never claim without counsel sign-off:** `regulated platform`.

### Terminology

| Do not write | Write |
|---|---|
| Digital securities for renewable energy | Independent production verification for solar assets |
| Regulated digital-securities platform | Capital-formation and production-verification platform |
| Token holders | Project-interest holders, or investors |
| ESN holdings | Project interest / ownership interest |
| Monthly yield | Latest distribution, or estimated monthly distribution |
| Verified yield | Production-verified distribution data |
| Distribution contract | Distribution workflow |
| Cash out to wallet | Receive distribution |
| Reinvest / auto-buy tokens | Reinvestment preference, if legally supported |
| On-chain result | Tamper-evident verification record (technical detail secondary) |
| One ledger | One auditable monthly determination |
| Mean deviation (when the figure is absolute) | Mean absolute deviation |

---

## Five Product Pillars

| Pillar | Description |
|--------|-------------|
| **Production Verification** (Key Differentiator) | Three-source monthly reconciliation — inverter telemetry, utility meter, satellite-modeled generation — producing a verified/flagged/pending determination per project-month, benchmarked against EIA-923 reported generation |
| **Distribution Infrastructure** | Revenue ingestion from SCADA systems, production-based distribution calculations (MWh -> PPA revenue -> net distributable income), automated pro-rata logic gated on the determination, transparent reporting dashboards |
| **Capital Formation** | Private placements of project-entity interests, offering management workflows, cap table tracking, compliance gating |
| **Investment Infrastructure** | Investor onboarding (KYC/AML, accreditation verification), project discovery, offering participation, investor dashboards |
| **Compliance-First Architecture** | Broker-dealer partnership integration, transfer agent integration, securities transfer restrictions, KYC/AML with ongoing monitoring, blue sky compliance |
| **Liquidity Layer** (Phase 3) | Compliant secondary trading via ATS, transfer restrictions enforced programmatically, holding period logic (Reg D 12-month lockup) |

---

## Phased Execution Strategy

| Phase | Status | Key Capabilities |
|-------|--------|-----------------|
| **Phase 1** | Current | Accredited investors only (Reg D 506(c)), private offerings 1-3 pilot projects ($1M-$5M), yield simulation engine, investor onboarding with KYC/accreditation, cap table/token registry, BD partnership & transfer agent integration initiated, no live secondary trading |
| **Phase 2** | Upcoming | Real yield distribution from operating projects, transfer agent fully integrated, custodian integration, structured SPV offerings at scale, Reg CF pathway (parallel offering structure) |
| **Phase 3** | Future | ATS integration or licensing for secondary trading, compliant secondary marketplace, non-accredited access via Reg CF / Reg A+, expanded asset types beyond solar |

---

## Revenue Model

Developer-pays-primary fee model. Developers bear primary cost of accessing capital; investor friction minimized during network-building phase.

### Phase 1 Fee Structure

| Fee Type | Rate | Paid By | Timing |
|----------|------|---------|--------|
| Issuance / Structuring Fee | 3–5% | Developer | One-time at close |
| Annual Servicing Fee | 50–75 bps | Developer | Annual, recurring |
| Investor Transaction Fee | 0.5–1% | Investor | Per investment |

### Revenue Illustration (Single $3M Project)

| Revenue Line | Amount |
|-------------|--------|
| Issuance Fee (4%) | $120,000 (one-time) |
| Annual Servicing (60 bps) | $18,000/year (recurring) |
| Investor Tx Fees (~0.75%) | $22,500 (one-time) |
| **Year 1 Total** | **~$160,500** |
| Year 2+ Recurring | ~$18,000/year per project |

### Future Revenue Streams (Phase 2+)

- Secondary trading fees (1–2% per side) once ATS integrated
- Yield distribution processing fee
- Technology licensing to other issuers or platforms
- Reg CF offering facilitation fees

---

## Legal Architecture

| Element | Detail |
|---------|--------|
| Entity | Delaware C-Corporation |
| Phase 1 Exemption | Reg D 506(c) — accredited only, general solicitation permitted |
| Phase 2 Exemption | Add Reg CF (up to $5M, non-accredited, requires funding portal/BD) |
| SPV Structure | Per-project Delaware LLC; tokenized membership interests |
| Securities Counsel | NOT YET RETAINED — #1 priority hire |

### Why 506(c) for Phase 1

Reg D 506(c) allows general solicitation — offerings can be publicly marketed. Every investor must be verified accredited (not self-certified). General solicitation is essential for building the demand side when starting without an investor network.

---

## Regulatory Pathway

| Function | Phase 1 Strategy | Long-Term Path |
|----------|-----------------|----------------|
| Broker-Dealer | Partner with existing BD | Evaluate own BD registration |
| Transfer Agent | Polymath Capital Platform | Evaluate own TA registration |
| ATS | Deferred — no secondary trading | ATS registration or partnership |
| Custodian | Integrate with qualified custodian | Maintain integration model |
| KYC/AML | Technology integration (Persona, Plaid) | Enhance with ongoing monitoring |

---

## Target Customers

### Investor Side (Demand)

| Dimension | Detail |
|-----------|--------|
| Phase 1 | Accredited individuals, small family offices |
| Motivation | Impact + yield combined |
| Current Allocation | Public ESG equities, green bonds, ESG ETFs |
| What They Lack | Direct access to real asset yield from energy infrastructure |
| Check Size | $25K–$100K per offering |
| Volume Needed | 15–30 investors per project for $1M–$5M raises |
| Phase 2+ | Non-accredited investors via Reg CF, retail investors, institutional allocators |

### Developer Side (Supply)

| Dimension | Detail |
|-----------|--------|
| Developer Type | Solar developers (community, commercial, utility-scale) |
| Project Stage | Shovel-ready: permitted, ready to build, needs capital |
| Project Size | $1M–$5M |
| Pain Point | Too small for institutional project finance, too complex for individual investors |
| Acute Pain (2025) | Federal funding cuts (Solar for All) left permitted projects stranded |

---

## Competitive Positioning & Defensibility

EcoXchange's competitive positioning is not "we built tokenization infrastructure" but "we built the only platform purpose-built for renewable energy securities with integrated energy-to-yield infrastructure."

- **Vertical specialization**: Purpose-built for energy securities, not generic tokenization
- **Energy-to-yield pipeline**: SCADA data ingestion, production-based yield calculation, automated distributions — core technical moat
- **Supply-side relationships**: Founder's BLM development experience provides warm paths into developer community
- **Regulatory credibility**: Founder pursuing SIE, Series 63, Digital Asset Certification
- **Market timing**: First-mover in post-Solar for All funding gap

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + Wouter routing |
| Backend | Express.js |
| Styling | Tailwind CSS + shadcn/ui |
| Storage | In-memory (resets on restart) |
| Auth | Session-based (express-session + memorystore) |

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecoxchange.demo | Admin123! |
| Issuer | developer@ecoxchange.demo | Developer123! |
| Investor | investor@ecoxchange.demo | Investor123! |

---

## Features

### Multi-Role Authentication

Users sign up as either an Investor or Issuer (project developer). Admins are pre-seeded. Each role sees a different dashboard and feature set.

### Issuer Portal

- **5-Step Project Tokenization Wizard** -- Register, complete issuer profile and KYC/AML, tokenize renewable energy project and create security terms, run compliance checks and obtain readiness score, list offering for investors.
- **Automated Readiness Scoring** -- Each project receives a score from 0 to 100 with a GREEN / YELLOW / RED rating.
- **Data Room Checklist** -- Track required documents with upload status (Missing, Uploaded, Verified).
- **Capital Stack** -- Automatic computation of equity needed based on project financials.
- **Investment Commitment Inbox** -- View and accept or decline commitments from investors.

### Investor Portal

- **Browse Offerings** -- Filter approved offerings by state, MW capacity, development stage, readiness rating, and offtaker type.
- **Terms Acceptance Gate** -- Agree to terms before accessing offering details.
- **Offering Detail View** -- Full project details including target raise, minimum investment, expected yield (IRR), yield basis, distribution frequency, security type, readiness score, capital stack, and data room documents.
- **Investment Commitment** -- Submit investment commitment with amount, structure preference, timeline, and a message.
- **Accreditation Gating** -- Investors indicate accreditation status during signup; non-accredited investors see information about forthcoming opportunities in Phase 2/3.

### Admin Panel

- **Dashboard** -- KPIs including project counts by status, average readiness score, and total commitments received.
- **Review Queue** -- Filter projects by status and rating.
- **Project Review** -- View full project details with the ability to override readiness scores.
- **Actions** -- Approve, Reject, or Request Changes on submitted projects, with notes.
- **Export Packets** -- Generate printable export summaries for any project.
- **User Management** -- View all users with KYC/AML verification status.

### Identity Verification (Persona KYC/AML)

- Powered by Persona for issuer and investor identity verification.
- Issuers must verify before submitting projects.
- Investors must verify before investing in digital securities.
- Admins are exempt from verification requirements.
- All participants must undergo KYC/AML; offerings comply with relevant exemptions (Reg D 506(c) initially, then Reg CF/Reg A+).

---

## Readiness Scoring Engine

Each project starts at a score of 100. Deductions are applied based on:

| Factor | Condition | Deduction |
|--------|-----------|-----------|
| Site Control | None | -25 |
| Site Control | LOI | -15 |
| Site Control | Option | -8 |
| Interconnection | Unknown | -20 |
| Interconnection | Applied | -15 |
| Interconnection | Study | -10 |
| Interconnection | IA Executed | -3 |
| Permitting | Unknown | -15 |
| Permitting | In Progress | -10 |
| Permitting | Submitted | -5 |
| Offtaker | Merchant | -12 |
| Offtaker | Community Solar | -6 |
| Offtaker | C&I | -4 |
| Offtaker | Utility | -2 |
| Missing Documents | Per document | -3 (up to -24) |
| Tax Credits | Missing estimate | -8 |
| Tax Credits | Not transferable | -6 |
| FEOC | Not attested | -8 |

**Rating thresholds:**
- **GREEN**: Score >= 75 with no fatal flags
- **RED**: Score < 50 or has fatal flags
- **YELLOW**: Everything else

---

## Data Models

| Model | Description |
|-------|-------------|
| **User** | Email, password, role (Admin/Developer/Investor), name, organization |
| **Project** | Full project details -- technology, stage, location, status, permitting |
| **Capital Stack** | Total capex, tax credit type, estimated credits, equity needed |
| **Readiness Score** | Score (0-100), rating (GREEN/YELLOW/RED), reasons and flags |
| **Document** | Metadata for uploaded files |
| **Data Room Checklist Item** | Key, label, required flag, status (Missing/Uploaded/Verified) |
| **Investor Interest** | Amount, structure preference, timeline, message, status |
| **Project Approval Log** | Admin action history for each project |

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/signup` | Register (Issuer or Investor) |
| POST | `/api/auth/logout` | Log out |

### Issuer (Developer)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/developer/stats` | Dashboard statistics |
| GET | `/api/developer/projects` | List projects with scores |
| POST | `/api/developer/projects` | Create project (tokenization wizard) |
| GET | `/api/developer/projects/:id` | Full project detail |
| POST | `/api/developer/projects/:id/documents` | Upload document metadata |
| PATCH | `/api/developer/interests/:id` | Accept or decline commitment |

### Investor
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investor/deals` | Browse approved offerings |
| GET | `/api/investor/deals/:id` | Offering detail |
| POST | `/api/investor/deals/:id/interest` | Submit investment commitment |
| GET | `/api/investor/interests` | View my investments |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Platform KPIs |
| GET | `/api/admin/projects` | All projects with scores |
| GET | `/api/admin/projects/:id` | Full review detail |
| POST | `/api/admin/projects/:id/action` | Approve / Reject / Request Changes |
| POST | `/api/admin/projects/:id/override-score` | Override readiness score |
| GET | `/api/admin/projects/:id/export` | Export packet data |
| GET | `/api/admin/users` | User list |

---

## Seed Data

1. **Sunfield Solar I** -- GREEN rating, 95 readiness score, APPROVED status
2. **Desert Sun Community Solar** -- RED rating, 31 readiness score, SUBMITTED status

Both projects include complete documents and checklists. The approved project has a sample investor commitment record.

---

## Design & Brand Tone

- Dark mode by default with eco-green brand colors
- Primary color: #73AC20 (Eco Green)
- Accent color: #90C11B
- Background: near-black (#0B0F0C)
- Card backgrounds: #101712
- Tone: Institutional credibility, securities compliance awareness, climate infrastructure seriousness
- Copy vocabulary: see **Brand Language** and **Terminology** above — that is the single source of truth, and it leads with verification, not with securities or tokens

---

## Regulatory & Compliance Notes

- EcoXchange is pursuing broker-dealer/ATS partnerships, transfer agent and custodian integrations
- Securities transfer restrictions will be enforced programmatically
- Until integrations are live, secondary trading is simulated and only accredited investors may participate
- All offerings comply with relevant exemptions (Reg D 506(c) initially, then Reg CF/Reg A+)
- Phase 1 MVP: accredited investors only, private offerings, simulated secondary liquidity
- In-memory storage resets when the server restarts
- Documents are metadata-only (no actual file uploads)

---

## Internal Reference

Full North Star strategy document: `docs/NORTH_STAR_v4.md`
