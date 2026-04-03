# EcoXchange - Digital Securities Platform for Renewable Energy

## Overview
EcoXchange is a digital securities platform designed for the renewable energy sector. Its primary purpose is to digitize renewable energy project securities, facilitate the compliant issuance of yield-generating security tokens, and manage primary offerings. The long-term vision extends to establishing an infrastructure for issuance, yield distribution, and secondary liquidity for these assets. The platform aims to be the leading infrastructure layer for renewable energy digital securities, offering income-generating, asset-backed, transparent, and compliant investment opportunities. EcoXchange targets accredited investors in its initial phase, with plans to expand to non-accredited investors and a regulated secondary marketplace in future phases.

## User Preferences
I prefer clear, concise communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural or design decisions, please ask for my approval before proceeding. Ensure that the codebase remains clean, well-documented, and adheres to best practices.

## System Architecture

### UI/UX Decisions
The platform features a dark mode by default, utilizing an eco-green brand color scheme (#73AC20 primary, #90C11B accent) against near-black backgrounds (#0B0F0C) and card elements (#101712). The design emphasizes institutional credibility and seriousness appropriate for a securities compliance and climate infrastructure platform. The logo is `ecoxchange-logo.png`.

### Technical Implementations
The application is built with an Express.js backend and a React frontend (Vite with wouter routing). Authentication is session-based using `express-session` and `memorystore` with bcrypt password hashing (12 rounds) and rate limiting (10 req/15min) on auth endpoints. Currently, data persistence is handled by in-memory storage (`MemStorage`), meaning data resets on server restarts. The system supports multi-role authentication (Admin, Developer/Issuer, Investor), with specific dashboards and functionalities tailored to each role.

### Feature Specifications
- **Multi-Role Authentication**: Differentiated access for Admin, Developer (Issuer), and Investor roles.
- **Issuer Portal**: A 5-step project tokenization wizard, data room management, automated readiness scoring (0-100), and an investment commitment inbox.
- **Investor Portal**: Functionality to browse approved offerings with filters, view detailed offering information, submit investment commitments, and track personal investments. Currently shows 2 approved projects (Imperial Valley Solar I and Lancaster Sun Ranch) and 1 submitted project (Pecos Flat Solar Farm).
- **Admin Panel**: Dashboard for platform KPIs, a review queue for projects, full project review capabilities with score override, export packet generation, and user management including KYC/AML status.
- **Identity Verification**: Integrates Persona for KYC/AML verification for issuers and investors, with backend gating to enforce completion before critical actions. Demo mode: when Persona API is unavailable or fails, verification auto-completes instantly (falls back gracefully).
- **Readiness Scoring Engine**: A dynamic scoring system for projects based on various criteria (e.g., site control, interconnection, permitting, offtaker), yielding a GREEN, YELLOW, or RED rating.
- **Energy-to-Yield Pipeline**: SCADA data ingestion → energy production tracking → PPA-based revenue computation (15% opex deduction) → distribution calculation (0.75% platform fee) → investor yield dashboard. Data model: ppas, energyProduction, revenueRecords, distributions tables. API: GET /api/projects/:id/yield. UI: YieldDashboard component integrated into deal-room, project-detail, and project-review pages.
- **Lancaster Sun Ranch (SGT-verified)**: A 25MW single-axis tracking solar facility in Lancaster, CA with verified SCADA production history. PPA: $72/MWh with Southern California Edison, 1.5% escalation. Seeded with 12 months of production/revenue/distribution data computed from Solcast Sky Oracle satellite estimates. Stage: COD. Status: APPROVED.
- **SCADA Backend Domain Layer**: Generalized project-level SCADA service wrapping production/revenue data into a unified API. Models: ScadaDataSource (per-project data source records with sourceType, quality, sync status) and ScadaConnector (connector placeholders for AlsoEnergy, Enphase, SolarEdge, Solcast Sky Oracle, Power Factors). Service: server/lib/scada-service.ts with methods for summary, monthly history, forecast, health checks, ingestion status, and revenue bridge waterfall. API routes under /api/projects/:id/scada/{summary,monthly,forecast,health,ingestion,revenue-bridge,data-sources} and /api/scada/connectors. Auth-gated routes + public read-only routes at /api/public/projects/:id/scada/* (restricted to featured project IDs). Seeded data: proj3 (Lancaster Sun Ranch) = SGT_VERIFIED/HIGH quality, proj1 (Imperial Valley) = MANUAL/MEDIUM, proj2 (Pecos Flat) = CSV_UPLOAD/PENDING. Every response includes a provenance object tracking data source type, quality, verification status, and last sync time.
- **SCADA UI Component Library**: Reusable React components in client/src/components/scada/: ScadaSummaryCards (6-metric summary), ProductionChart (recharts bar chart), ForecastChart (recharts area chart with 12-month forecast), RevenueBridgeWaterfall (horizontal waterfall chart), HealthBadge (tooltip-enabled health status indicator), ProvenancePanel (data provenance display with source, verification, sync time, records). All components accept projectId and optional usePublicApi prop for public/auth-gated API access. Barrel export via index.ts.
- **Performance Page**: Public /performance route showing full SCADA story for Lancaster Sun Ranch (proj3) — summary cards, production chart, forecast chart, revenue bridge, provenance panel. Uses public API endpoints.
- **Navigation Restructure**: Header nav simplified to Home, Marketplace, Performance, Yield Simulator, Sign In. Mobile menu mirrors desktop. /performance route added to public page detection.
- **SCADA Operations Page**: Admin/Developer-accessible /operations route with tabbed interface for SCADA data management. Five tabs: Data Sources, CSV Upload, Connectors, Reconciliation Log, SGT Pipeline. The SGT Pipeline tab shows real-time pipeline status for all projects with 5-stage indicators (Sky Oracle → Utility Shadow → SGT Handshake → Waterfall Engine → Securitize Bridge) and Handshake/Settle action buttons. Reconciliation log entries reference all pipeline stages (SGT Handshake, Utility Shadow, Waterfall Engine, Sky Oracle). API: GET /api/public/sgt-pipeline-status (public), POST /api/projects/:id/sgt-handshake (ADMIN), POST /api/projects/:id/settle (ADMIN).
- **AI Financial Prediction**: OpenAI-powered (gpt-5-mini via Replit AI Integrations) ROI analysis for projects. Takes project financial data (capex, PPA, production history, revenue) and returns structured JSON with IRR, payback period, 5/10-year returns, risk factors, strengths, and recommendation. API: POST /api/projects/:id/ai-prediction (auth + role-gated). UI: AIPredictionCard component in investor deal room. Files: server/lib/ai-predictions.ts, client/src/components/ai-prediction.tsx.

- **Progressive Web App (PWA)**: Full PWA support via `vite-plugin-pwa`. Includes web app manifest, service worker with Workbox caching (static assets, Google Fonts cached with CacheFirst, API responses cached with NetworkFirst), and auto-update prompts. Users can install EcoXchange to their desktop/home screen from the browser. Icons: `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` in `client/public/`. Config: `vite.config.ts` (VitePWA plugin). Registration: `client/src/main.tsx`.

### System Design Choices
The architecture is compliance-first, designed to be forward-compatible with future regulated secondary trading requirements (ATS). It emphasizes vertical specialization for renewable energy securities, with a unique "energy-to-yield pipeline" that calculates production-based yield from SCADA data and automates distributions. The platform uses per-project Delaware LLCs as Special Purpose Vehicles (SPVs) for tokenizing membership interests. The initial phase operates under Reg D 506(c) for accredited investors, with plans to incorporate Reg CF for non-accredited investors in Phase 2.

## Solcast Sky Oracle

### Overview
Satellite-derived telemetry service providing 'Estimated Actuals' for SGT verification. Connects to Solcast Advanced PV Power API with a dual-mode safety switch.

### Dual-Mode Operation
- **Trial Active** (`IS_TRIAL_ACTIVE=true`): Uses real project GPS coordinates for actual site data
- **Sandbox Mode** (default): Uses Fort Peck, MT (48.3078, -105.1017) — a free unmetered SURFRAD node for zero-cost development

### Key Files
- `server/services/solcast.ts` — Core service: `getSatellitePowerEstimate(capacityKw, lat?, lon?)`
- `scripts/test-oracle.ts` — Test script for verifying API connectivity (50 MW test)

### Environment Variables
- `SOLCAST_API_KEY` — Solcast API key (required)
- `IS_TRIAL_ACTIVE` — Set to `true` to use real GPS coordinates (default: false/sandbox)

### Capacity Range
Supports projects from 1 MW to 70 MW via the `capacity` parameter passed to Solcast's Advanced PV endpoint.

## External Dependencies

- **Persona**: Used for identity verification (KYC/AML) for both issuers and investors.
- **Broker-Dealer Partnership**: Planned integration with an existing broker-dealer for regulatory compliance in securities offerings.
- **Transfer Agent**: Integration with a transfer agent (e.g., Securitize, KoreConX) for managing security token ownership and transfers.
- **Qualified Custodian**: Planned integration for secure holding of digital assets.
- **Plaid**: Potentially used for financial data connectivity (though Persona is primary for KYC).
- **SCADA Systems**: Integration with SCADA (Supervisory Control and Data Acquisition) and other project monitoring systems for revenue ingestion and yield calculation.
- **Securitize Bridge (Mock)**: Mock integration with Securitize RWA Protocol for institutional yield distribution via Base (Ethereum L2). Server: server/services/securitize-bridge.ts. Mock mode controlled by USE_MOCK_SECURITIZE env var.

## SGT Waterfall Engine

### Overview
The Synthetic Gross Telemetry (SGT) layer processes 15-minute interval meter data through an institutional revenue waterfall to generate double-entry ledger postings and trigger Securitize yield distributions.

### Data Flow
1. **Intervals** (sgt_intervals): 15-min telemetry with syntheticGrossWh from net meter + satellite irradiance
2. **Daily Aggregation**: Intervals grouped by date for ledger transactions (not per-interval)
3. **Revenue Calculation**: Daily syntheticGrossWh → kWh → USD via project's ppaRate
4. **Waterfall**: Debt Service → OpEx → Reserves (%) → Platform Fee (1.5%) → Investor Yield (remainder)
5. **Ledger**: One transaction per day with 5 postings (one per waterfall tier), all within a SQL transaction
6. **Distribution**: Securitize bridge distributes investor yield, updates transaction status (PENDING → COMPLETED/FAILED)

### Key Files
- `server/services/waterfall-engine.ts` — Core engine: interval query, daily aggregation, waterfall math, atomic ledger posting
- `server/services/settle-project.ts` — Orchestrator: waterfall engine + Securitize bridge + status updates
- `server/services/securitize-bridge.ts` — Mock Securitize RWA Protocol
- `server/seed-sgt.ts` — Seeds 1 MW project (Centennial Logistics Hub) with 30 days of intervals + partial settlement

### API
- `POST /api/projects/:id/settle` — ADMIN only, triggers settlement with optional fromDate/toDate
- `GET /api/projects/:id/waterfall-summary` — Authenticated, returns account balances and recent transactions

### Schema Additions (Task #6)
- `sgt_intervals.settled_at` — Timestamp marking when an interval was settled (prevents double-settlement)
- `transactions.status` — PENDING | COMPLETED | FAILED (distribution state tracking)
- `TransactionStatus` constant in shared/schema.ts

## SGT Backtest Report

### Overview
Formal SGT validation engine that backtests our Solcast Sky Oracle against NREL PVDAQ Site 9068 (Greeley, CO). Produces an investor-grade validation report with statistical metrics and interactive charts for due diligence.

### Site Under Test
- **PVDAQ Site 9068**: Latitude 40.3864, Longitude -104.5512, Capacity 4738 kW, horizontal single-axis tracker
- **Validation Period**: June 2023 (30 days, high-production summer month)
- **Total Intervals**: 2,880 (30 days × 96 intervals/day at 15-min granularity)

### Backtest Engine (`server/services/backtest-engine.ts`)
- Generates realistic synthetic PVDAQ production data using solar geometry (declination, airmass, elevation), cloud patterns, temperature derating, soiling, and clipping
- Generates corresponding satellite estimates with calibrated bias and noise
- Calculates per-interval handshake math: delta, deltaPct, clearance at 2% and 5% tolerance
- Statistics: MAE, RMSE, SGT Pass Rate @2%/@5%, Confidence Score, error buckets, peak hour, total energy
- Deterministic via seeded PRNG for reproducible results
- Server-side caching with manual clear for re-runs

### API
- `GET /api/public/backtest/report` — Public, returns sampled intervals + full statistics
- `POST /api/backtest/run` — ADMIN only, triggers fresh backtest with console summary output

### Report UI (`/backtest-report`)
- Professional, printable investor report page at public route
- Confidence Score gauge (SVG arc), validation summary with badges
- Daily production comparison bar chart (Satellite vs. Meter in MWh)
- Error distribution bar chart (≤1%, 1-2%, 2-5%, >5% buckets)
- Handshake clearance rate pie chart (Pass @2%, Pass @5% only, Fail)
- Interval detail line chart (satellite vs. meter kW time series)
- Technical summary with methodology and findings sections
- Print media queries for white background / clean layout