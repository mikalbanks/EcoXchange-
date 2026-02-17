# EcoXchange - Digital Securities Platform for Renewable Energy

## Overview
EcoXchange is a digital securities platform for renewable energy assets. The platform digitizes renewable energy project securities, issues yield-generating security tokens, enables compliant primary offerings, and plans for secondary trading (Phase 3). The long-term vision is not just capital formation but issuance, yield distribution, and secondary liquidity.

**Internal Strategy Reference**: See `docs/NORTH_STAR_v4.md` for the full North Star document including origin story, founder profile, 90-day action plan, and detailed competitive analysis.

## Current State
- **Status**: MVP / Phase 1 (Accredited investors, private offerings, simulated liquidity)
- **Stack**: Express backend + React frontend (Vite/wouter routing)
- **Storage**: In-memory (MemStorage) - no database persistence for pilot
- **Auth**: Session-based with express-session + memorystore

## North Star Vision
EcoXchange becomes the infrastructure layer for issuing, distributing yield from, and eventually trading renewable energy digital securities. Not just capital formation — but issuance, yield distribution, and secondary liquidity.

### The Financial Product
- **Asset Type**: Digitized renewable energy securities
- **Structure**: Security token representing SPV membership interest (equity, revenue-share, or structured yield claim)
- **Backing**: Real-world renewable energy projects held in project-level SPVs (Delaware LLCs)
- **Yield Source**: Energy production revenue, Power Purchase Agreements (PPAs), structured project cash flows
- **Deal Size**: $1M – $5M per project offering (Phase 1)
- **Minimum Investment**: TBD — targeting $10K–$25K
- **Core Characteristics**: Income-generating, asset-backed, transparent, programmable distribution logic, compliant, tradable (Phase 3 via ATS)

### SPV Structure
Each renewable energy project is held within a dedicated Special Purpose Vehicle (Delaware LLC). EcoXchange facilitates the tokenization of membership interests in these SPVs. The SPV isolates the project legally, gives investors a clean security to hold, and separates the developer's other assets. Revenue flows from energy production through the PPA into the SPV, and is then distributed pro rata to token holders after operating expenses, debt service, and reserves.

### Five Product Pillars
1. **Digital Securities Issuance** - Tokenized renewable energy securities (SPV membership interests), offering management workflows, cap table tracking, compliance gating (KYC -> accreditation -> subscription -> issuance)
2. **Yield Infrastructure** (Key Differentiator) - Revenue ingestion from project monitoring/SCADA systems, production-based yield calculations (MWh -> PPA revenue -> net distributable income), automated pro-rata distribution logic, transparent reporting dashboards
3. **Investment Infrastructure** - Investor onboarding (KYC/AML, accreditation verification), project discovery, offering participation, investor dashboards (portfolio, yield history, documents)
4. **Compliance-First Architecture** - Broker-dealer partnership integration, transfer agent integration, securities transfer restrictions enforced programmatically, strong KYC/AML with ongoing monitoring, blue sky compliance
5. **Liquidity Layer** (Phase 3) - Compliant secondary trading via ATS, transfer restrictions enforced programmatically, holding period logic (Reg D 12-month lockup), regulatory-aware smart compliance engine

### Positioning Evolution
- **Phase 1 (Now)**: "Digital securities issuance and yield platform"
- **Phase 2**: "Integrated securities and yield distribution infrastructure"
- **Phase 3**: "Regulated marketplace for renewable energy securities" — earn the "marketplace" positioning

### Phased Execution
- **Phase 1 (Now)**: Accredited-only (Reg D 506(c)), private offerings 1-3 pilot projects ($1M-$5M each), yield simulation engine, investor onboarding with KYC/accreditation, cap table/token registry (database-first), no live secondary trading, BD partnership & transfer agent integration initiated, securities counsel retained and first PPM drafted
- **Phase 2**: Real yield distribution from operating projects, transfer agent fully integrated, custodian integration, structured SPV offerings at scale, Reg CF pathway opened (requires funding portal/BD), parallel offering structure (Reg D + Reg CF on same project)
- **Phase 3**: ATS integration or licensing for secondary trading, compliant secondary marketplace, non-accredited access via Reg CF/Reg A+, expanded asset types beyond solar

### Target Investors
- **Phase 1**: Accredited individuals, small family offices, climate funds, HNWIs seeking impact + yield (check size $25K-$100K per offering, need 15-30 investors per project)
- **Phase 2+**: Non-accredited investors via Reg CF, retail investors seeking climate-aligned yield, institutional allocators and climate funds

### Brand Tone
**Use**: digital securities, structured yield, compliant platform, regulated infrastructure, asset-backed tokens, private capital infrastructure
**Avoid**: crypto exchange, DeFi, permissionless, unregulated, democratizing finance, marketplace (until Phase 3)

## Revenue Model
Developer-pays-primary fee model. Developers bear primary cost; investor friction minimized during network-building phase.

### Phase 1 Fee Structure
| Fee Type | Rate | Paid By | Timing |
|----------|------|---------|--------|
| Issuance / Structuring Fee | 3–5% | Developer | One-time at close |
| Annual Servicing Fee | 50–75 bps | Developer | Annual, recurring |
| Investor Transaction Fee | 0.5–1% | Investor | Per investment |

### Revenue Illustration (Single $3M Project)
- Issuance Fee (4%): $120,000 (one-time)
- Annual Servicing (60 bps): $18,000/year (recurring)
- Investor Tx Fees (~0.75%): $22,500 (one-time)
- Year 1 Total: ~$160,500
- Year 2+ Recurring: ~$18,000/year per project

### Future Revenue Streams (Phase 2+)
- Secondary trading fees (1–2% per side) once ATS is integrated
- Yield distribution processing fee
- Technology licensing to other issuers or platforms
- Reg CF offering facilitation fees

## Legal Architecture
| Element | Detail |
|---------|--------|
| Entity | Delaware C-Corporation |
| Phase 1 Exemption | Reg D 506(c) — accredited only, general solicitation permitted |
| Phase 2 Exemption | Add Reg CF (up to $5M, non-accredited, requires funding portal/BD) |
| SPV Structure | Per-project Delaware LLC; tokenized membership interests |
| Securities Counsel | NOT YET RETAINED — #1 priority hire |

### Why 506(c) for Phase 1
Reg D 506(c) allows general solicitation — offerings can be publicly marketed. Tradeoff: every investor must be verified accredited (not self-certified). General solicitation is essential for building the demand side when starting cold.

## Regulatory Pathway
| Function | Phase 1 Strategy | Long-Term Path |
|----------|-----------------|----------------|
| Broker-Dealer | Partner with existing BD | Evaluate own BD registration |
| Transfer Agent | Integrate (Securitize, KoreConX, etc.) | Evaluate own TA registration |
| ATS | Deferred — no secondary trading | ATS registration or partnership |
| Custodian | Integrate with qualified custodian | Maintain integration model |
| KYC/AML | Technology integration (Persona, Plaid) | Enhance with ongoing monitoring |

**Architecture Principle**: MVP focuses on accredited investors, primary issuance, and simulated liquidity. All architecture decisions must assume future regulated secondary trading. Every data model, compliance check, and token design choice must be forward-compatible with ATS requirements.

## Competitive Positioning
- **Vertical specialization**: Purpose-built for energy securities, not a generic tokenization platform
- **Energy-to-yield pipeline**: Ingesting SCADA data, calculating production-based yield, automating distributions — core technical moat
- **Supply-side relationships**: Founder's BLM development experience provides warm paths into developer community
- **Regulatory credibility**: Founder pursuing SIE, Series 63, Digital Asset Certification
- **Market timing**: First-mover in post-Solar for All funding gap

## Critical Dependencies (Pre-First-Offering)
- Securities counsel retained and PPM drafted
- BD partnership in place
- Transfer agent integration
- KYC/AML provider in production (sandbox complete)
- At least one project developer with signed LOI
- Trademark clearance or rename decision
- Custom domain and professional hosting

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecoxchange.demo | Admin123! |
| Issuer (Developer) | developer@ecoxchange.demo | Developer123! |
| Investor | investor@ecoxchange.demo | Investor123! |

## Key Features

### Multi-Role Authentication
- **ADMIN**: Review queue, score override, export packets, user management
- **DEVELOPER (Issuer)**: Project tokenization wizard, data room management, investment commitment inbox
- **INVESTOR**: Browse offerings, offering detail, invest in digital securities

### Issuer Portal (Developer)
- 5-step project tokenization wizard (Basics, Status, Financials, Documents, Review)
- Automated readiness scoring (0-100 with GREEN/YELLOW/RED rating)
- Data room checklist with document upload tracking
- Capital stack computation
- Investment commitment inbox with accept/decline actions

### Investor Portal
- Browse approved offerings with filters (state, MW, stage, rating, offtaker)
- Terms acceptance gate on offering detail
- Full offering view: project details, readiness score, capital stack, data room
- Investment commitment form (amount, structure, timeline, message)
- Digital security attributes: target raise, min investment, expected yield, yield basis, distribution frequency, security type

### Admin Panel
- Dashboard with KPIs (projects by status, avg score, total commitments)
- Review queue with status and rating filters
- Full project review with score override capability
- Approve/Reject/Request Changes actions with notes
- Export packet generation for printing
- User management table with KYC/AML status column

### Identity Verification (Persona KYC)
- Persona-powered identity verification for issuers and investors
- Admins are exempt from verification requirements
- Issuers must verify before submitting projects (wizard allows filling but blocks submit)
- Investors must verify before investing in digital securities
- Backend gating returns 403 if personaStatus !== "completed"
- Frontend shows IdentityVerificationCard component on issuer/investor dashboards
- Verification status polling every 10s when pending
- Webhook endpoint (POST /api/persona/webhook) for async status updates with HMAC validation
- Environment variables: PERSONA_API_KEY, PERSONA_TEMPLATE_ID, PERSONA_WEBHOOK_SECRET

### Readiness Scoring Engine
Score starts at 100, deductions applied:
- Site control: NONE (-25), LOI (-15), OPTION (-8)
- Interconnection: UNKNOWN (-20), APPLIED (-15), STUDY (-10), IA_EXECUTED (-3)
- Permitting: UNKNOWN (-15), IN_PROGRESS (-10), SUBMITTED (-5)
- Offtaker: MERCHANT (-12), COMMUNITY_SOLAR (-6), C_AND_I (-4), UTILITY (-2)
- Missing required documents: up to -24 (3 per doc)
- Tax credits: missing estimate (-8), not transferable (-6)
- FEOC: not attested (-8)
- Rating: GREEN >= 75 (no fatal flags), RED < 50 or fatal flags, else YELLOW

## Project Architecture

### Frontend (`client/src/`)
- `/pages/` - Page components organized by role
  - `/auth/` - Login, Signup (with accreditation gating)
  - `/developer/` - Dashboard, Project Wizard (Tokenization), Project Detail
  - `/investor/` - Dashboard, Offerings Browse, Offering Detail
  - `/admin/` - Dashboard, Projects Queue, Project Review, Export Packet, Users
- `/components/` - Reusable components
  - `dashboard-layout.tsx` - Sidebar navigation (shadcn Sidebar)
  - `header.tsx` - Public header with platform nav
  - `status-badge.tsx` - Status indicators (readiness, project, interest, checklist types)
  - `stats-card.tsx` - Metric cards
  - `empty-state.tsx` - Empty state with icon
- `/lib/` - Utilities
  - `auth.tsx` - AuthContext with login/signup/logout

### Backend (`server/`)
- `routes.ts` - All API endpoints with role middleware
- `storage.ts` - MemStorage + computeReadiness + generateChecklist + computeCapitalStack

### Shared (`shared/`)
- `schema.ts` - 8 data models + 6 Zod validation schemas

### Docs (`docs/`)
- `NORTH_STAR_v4.md` - Full North Star strategy document (v4.0, Feb 2026)

## Data Models
1. **User** - id, email, passwordHash, role (ADMIN|DEVELOPER|INVESTOR), name, orgName
2. **Project** - Full project details with technology, stage, location, status, permitting fields
3. **CapitalStack** - totalCapex, taxCreditType, taxCreditEstimated, equityNeeded
4. **ReadinessScore** - score (0-100), rating (GREEN|YELLOW|RED), reasons/flags as JSON text
5. **Document** - Metadata for uploaded files
6. **DataRoomChecklistItem** - key, label, required, status (MISSING|UPLOADED|VERIFIED)
7. **InvestorInterest** - amountIntent, structurePreference, timeline, message, status
8. **ProjectApprovalLog** - Action log for admin actions

## API Endpoints

### Auth
- `GET /api/auth/me` - Current user
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Register (DEVELOPER or INVESTOR)
- `POST /api/auth/logout` - Logout

### Developer (Issuer)
- `GET /api/developer/stats` - Dashboard stats
- `GET /api/developer/projects` - Project list with scores
- `POST /api/developer/projects` - Create project (wizard submit)
- `GET /api/developer/projects/:id` - Full project detail
- `POST /api/developer/projects/:id/documents` - Upload document
- `PATCH /api/developer/interests/:id` - Accept/decline commitment

### Investor
- `GET /api/investor/deals` - Browse approved offerings
- `GET /api/investor/deals/:id` - Offering detail
- `POST /api/investor/deals/:id/interest` - Submit investment commitment
- `GET /api/investor/interests` - My investments

### Admin
- `GET /api/admin/stats` - Platform KPIs
- `GET /api/admin/projects` - All projects with scores
- `GET /api/admin/projects/:id` - Full review detail
- `POST /api/admin/projects/:id/action` - Approve/Reject/Request Changes
- `POST /api/admin/projects/:id/override-score` - Override readiness score
- `GET /api/admin/projects/:id/export` - Export packet data
- `GET /api/admin/users` - User list

## Design & Theme
- Dark mode by default with eco-green brand colors
- Logo: `/client/public/brand/ecoxchange-logo.png`
- Primary: #73AC20 (Eco Green), Accent: #90C11B
- Background: near-black (#0B0F0C), Cards: #101712
- Tone: Institutional credibility, securities compliance awareness, climate infrastructure seriousness

## Seed Data
- 2 demo projects: "Sunfield Solar I" (GREEN, 95 score, APPROVED) and "Desert Sun Community Solar" (RED, 31 score, SUBMITTED)
- Sample investor commitment on the approved project
- Complete documents and checklists for both projects

## Important Notes
- Phase 1 MVP: accredited investors only, private offerings, simulated secondary liquidity
- In-memory storage resets on server restart
- Documents are metadata-only (no actual file upload)
- EcoXchange is pursuing broker-dealer/ATS partnerships, transfer agent and custodian integrations
- Until integrations are live, secondary trading is simulated
- Securities are asset-backed and yield-generating
- All offerings comply with relevant exemptions (Reg D 506(c) initially, then Reg CF/Reg A+)
- Phase 1 positioning: "Digital securities platform" — "marketplace" positioning earned in Phase 3
