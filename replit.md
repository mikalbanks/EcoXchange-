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
- **Investor Portal**: Functionality to browse approved offerings with filters, view detailed offering information, submit investment commitments, and track personal investments. Currently shows 2 approved projects (Sunfield Solar I and Colorado Sun CdTe I) and 1 submitted project (Desert Sun Community Solar).
- **Admin Panel**: Dashboard for platform KPIs, a review queue for projects, full project review capabilities with score override, export packet generation, and user management including KYC/AML status.
- **Identity Verification**: Integrates Persona for KYC/AML verification for issuers and investors, with backend gating to enforce completion before critical actions.
- **Readiness Scoring Engine**: A dynamic scoring system for projects based on various criteria (e.g., site control, interconnection, permitting, offtaker), yielding a GREEN, YELLOW, or RED rating.
- **Energy-to-Yield Pipeline**: SCADA data ingestion → energy production tracking → PPA-based revenue computation (15% opex deduction) → distribution calculation (0.75% platform fee) → investor yield dashboard. Data model: ppas, energyProduction, revenueRecords, distributions tables. API: GET /api/projects/:id/yield. UI: YieldDashboard component integrated into deal-room, project-detail, and project-review pages.
- **Colorado Sun CdTe I (PVDAQ-backed)**: A real 4.7MW CdTe project listing with returns derived from actual NREL PVDAQ telemetry data (system 9068, 6+ years, ~7,861 MWh/yr avg). PPA: $85/MWh with Xcel Energy, 1.5% escalation. Seeded with 12 months of production/revenue/distribution data computed from PVDAQ monthly averages. Stage: COD. Status: APPROVED.
- **PVDAQ Telemetry Dashboard**: Real NREL PVDAQ data (system 9068, 4.7 MW CdTe, Colorado) ingested into PostgreSQL. Seasonal forecast model with configurable PPA rate and degradation. API: GET /api/pvdaq/systems/:systemId/{monthly,kpis,forecast}. UI: /telemetry page with KPI cards, monthly generation/revenue charts, 12-month forecast with editable assumptions. Data: pv_systems, pv_monthly_metrics, pv_daily_metrics tables. ETL: server/etl/load-pvdaq.ts. Forecast logic: server/lib/yieldForecast.ts. DB connection: server/db.ts.

### System Design Choices
The architecture is compliance-first, designed to be forward-compatible with future regulated secondary trading requirements (ATS). It emphasizes vertical specialization for renewable energy securities, with a unique "energy-to-yield pipeline" that calculates production-based yield from SCADA data and automates distributions. The platform uses per-project Delaware LLCs as Special Purpose Vehicles (SPVs) for tokenizing membership interests. The initial phase operates under Reg D 506(c) for accredited investors, with plans to incorporate Reg CF for non-accredited investors in Phase 2.

## External Dependencies

- **Persona**: Used for identity verification (KYC/AML) for both issuers and investors.
- **Broker-Dealer Partnership**: Planned integration with an existing broker-dealer for regulatory compliance in securities offerings.
- **Transfer Agent**: Integration with a transfer agent (e.g., Securitize, KoreConX) for managing security token ownership and transfers.
- **Qualified Custodian**: Planned integration for secure holding of digital assets.
- **Plaid**: Potentially used for financial data connectivity (though Persona is primary for KYC).
- **SCADA Systems**: Integration with SCADA (Supervisory Control and Data Acquisition) and other project monitoring systems for revenue ingestion and yield calculation.