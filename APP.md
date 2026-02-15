# EcoXchange

**Regulated Digital Securities Marketplace for Renewable Energy**

---

## What is EcoXchange?

EcoXchange is a digital marketplace for renewable energy securities, enabling investors to earn yield backed by real-world energy production. The platform provides compliant digital issuance, yield distribution, and marketplace infrastructure for tokenized renewable energy securities.

### The Financial Product

- **Asset Type**: Digitized renewable energy securities
- **Structure**: Security token (equity, revenue-share, or structured yield claim) backed by real-world renewable energy projects
- **Yield Sources**: Energy production, Power Purchase Agreements (PPAs), structured project cash flows
- **Core Characteristics**: Income-generating, asset-backed, transparent, programmable distribution logic, tradable on compliant secondary market (future)

---

## Five Product Pillars

| Pillar | Description |
|--------|-------------|
| **Digital Securities Issuance** | Tokenized renewable energy securities, offering management workflows, cap table tracking, compliance gating |
| **Yield Infrastructure** | Revenue ingestion from projects, production-based yield calculations, automated distribution logic, transparent reporting dashboards |
| **Marketplace Infrastructure** | Project discovery, investor dashboards, offering participation, secondary trading rails (future) |
| **Compliance-First Architecture** | KYC/AML, broker-dealer/ATS pathway, transfer agent & custodian integrations, securities transfer restrictions |
| **Liquidity Layer** | Compliant secondary trading (future), transfer restrictions enforced programmatically, holding period logic |

---

## Phased Execution Strategy

| Phase | Status | Key Capabilities |
|-------|--------|-----------------|
| **Phase 1** | Now | Accredited investors only, private offerings, simulated liquidity, yield calculation engine, no live secondary trading |
| **Phase 2** | Upcoming | Real yield distribution, transfer agent integration, custodian integration, structured SPV offerings |
| **Phase 3** | Future | Reg CF / Reg A+ pathways, non-accredited investor access, ATS integration or licensing, real secondary marketplace |

---

## Target Investors

| Segment | Phase | Description |
|---------|-------|-------------|
| Accredited investors | Phase 1 | Primary audience today |
| Family offices | Phase 1 | Climate-focused family offices |
| Climate funds | Phase 1 | Institutional climate-aligned capital |
| High-net-worth individuals | Phase 1 | Qualified individual investors |
| Non-accredited investors | Phase 2+ | Subject to offering exemptions / compliance structure |
| Retail investors | Phase 2+ | Climate-aligned individuals seeking yield |

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
- **Investor Interest Inbox** -- View and accept or decline interest from investors.

### Investor Portal

- **Browse Offerings** -- Filter approved offerings by state, MW capacity, development stage, readiness rating, and offtaker type.
- **Terms Acceptance Gate** -- Agree to terms before accessing offering details.
- **Offering Detail View** -- Full project details including target raise, minimum investment, expected yield (IRR), yield basis, distribution frequency, security type, readiness score, capital stack, and data room documents.
- **Investment Commitment** -- Submit investment interest with amount, structure preference, timeline, and a message.
- **Accreditation Gating** -- Investors indicate accreditation status during signup; non-accredited investors see information about forthcoming opportunities in Phase 2/3.

### Admin Panel

- **Dashboard** -- KPIs including project counts by status, average readiness score, and total interest received.
- **Review Queue** -- Filter projects by status and rating.
- **Project Review** -- View full project details with the ability to override readiness scores.
- **Actions** -- Approve, Reject, or Request Changes on submitted projects, with notes.
- **Export Packets** -- Generate printable export summaries for any project.
- **User Management** -- View all users with KYC verification status.

### Identity Verification (Persona KYC/AML)

- Powered by Persona for issuer and investor identity verification.
- Issuers must verify before submitting projects.
- Investors must verify before investing in digital securities.
- Admins are exempt from verification requirements.
- All participants must undergo KYC/AML; offerings comply with relevant exemptions (Reg D initially, then Reg CF/Reg A+).

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
| PATCH | `/api/developer/interests/:id` | Accept or decline interest |

### Investor
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investor/deals` | Browse approved offerings |
| GET | `/api/investor/deals/:id` | Offering detail |
| POST | `/api/investor/deals/:id/interest` | Submit investment interest |
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

Both projects include complete documents and checklists. The approved project has a sample investor interest record.

---

## Design & Brand Tone

- Dark mode by default with eco-green brand colors
- Primary color: #73AC20 (Eco Green)
- Accent color: #90C11B
- Background: near-black (#0B0F0C)
- Card backgrounds: #101712
- Tone: Institutional credibility, securities compliance awareness, marketplace sophistication, climate infrastructure seriousness
- Use: Digital securities, structured yield, compliant marketplace, regulated infrastructure, asset-backed tokens
- Avoid: Crypto exchange, DeFi, permissionless, unregulated, democratizing finance

---

## Regulatory & Compliance Notes

- EcoXchange is pursuing broker-dealer/ATS partnerships, transfer agent and custodian integrations
- Securities transfer restrictions will be enforced programmatically
- Until integrations are live, secondary trading is simulated and only accredited investors may participate
- All offerings comply with relevant exemptions (Reg D initially, then Reg CF/Reg A+)
- Phase 1 MVP: accredited investors only, private offerings, simulated secondary liquidity
- In-memory storage resets when the server restarts
- Documents are metadata-only (no actual file uploads)
