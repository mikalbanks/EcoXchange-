# EcoXchange - Digital Securities Platform for Renewable Energy

## Overview
EcoXchange is a digital securities platform for the renewable energy sector, focused on digitizing project securities, facilitating compliant issuance of yield-generating security tokens, and managing primary offerings. The platform aims to become the leading infrastructure layer for renewable energy digital securities, providing transparent, compliant, and asset-backed investment opportunities. Initially targeting accredited investors, EcoXchange plans to expand to non-accredited investors and a regulated secondary marketplace in future phases.

## User Preferences
I prefer clear, concise communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural or design decisions, please ask for my approval before proceeding. Ensure that the codebase remains clean, well-documented, and adheres to best practices.

## System Architecture

### UI/UX Decisions
The platform features a dark mode by default, using an eco-green brand color scheme (#73AC20 primary, #90C11B accent) against dark backgrounds (#0B0F0C) and card elements (#101712). The design emphasizes institutional credibility appropriate for a securities compliance and climate infrastructure platform. The logo is `ecoxchange-logo.png`.

### Technical Implementations
The application utilizes an Express.js backend and a React frontend (Vite with wouter routing). Authentication is session-based using `express-session` and `memorystore`, with bcrypt for password hashing and rate limiting on authentication endpoints. Data persistence is currently in-memory (`MemStorage`). The system supports multi-role authentication (Admin, Developer/Issuer, Investor). Full PWA support is included via `vite-plugin-pwa` for installability and offline capabilities.

### Feature Specifications
- **Multi-Role Authentication**: Differentiated access for Admin, Developer (Issuer), and Investor roles.
- **Issuer Portal**: A 5-step project tokenization wizard, data room management, automated readiness scoring (0-100), and an investment commitment inbox.
- **Investor Portal**: Allows browsing of approved offerings, viewing detailed information, submitting investment commitments, and tracking personal investments.
- **Admin Panel**: Provides platform KPIs, a project review queue, full project review capabilities, export packet generation, and user management including KYC/AML status.
- **Identity Verification**: Integrates Persona for KYC/AML verification for issuers and investors, with a graceful fallback to a demo mode if the API is unavailable.
- **Readiness Scoring Engine**: Dynamically scores projects based on various criteria (e.g., site control, permitting), yielding a GREEN, YELLOW, or RED rating.
- **Energy-to-Yield Pipeline**: Processes SCADA data to track energy production, compute PPA-based revenue (after 15% opex deduction), calculate distributions (after 0.75% platform fee), and display investor yield.
- **SCADA Backend Domain Layer**: A generalized project-level SCADA service wrapping production/revenue data into a unified API, supporting various data sources and connectors.
- **SCADA UI Component Library**: Reusable React components for displaying SCADA data summaries, production charts, forecast charts, revenue waterfalls, health indicators, and data provenance.
- **Performance Page**: A public route demonstrating full SCADA details for featured projects (e.g., Lancaster Sun Ranch).
- **SCADA Operations Page**: An Admin/Developer-accessible interface for SCADA data management, including data sources, CSV upload (real file ingestion via FormData + multer), connectors, reconciliation log, and an SGT Pipeline status with real-time indicators and action buttons.
- **CSV SCADA Ingestion**: Real CSV upload pipeline via `scada-connector.ts` (CsvConnector) — parses CSV files with auto-detected date/production columns, normalizes kWh↔MWh, detects duplicates/gaps, computes daily/monthly granularity. Backend routes: preview (dry-run parse) and ingest (store to energy_production + upsert ScadaDataSource). Frontend: live field mapping preview, validation stats, project targeting, cache invalidation post-ingest.
- **Real-Data Backtest Mode**: Backtest engine supports `meterDataSource: "stored"` to load real production data from energy_production table (filtered to backtest window) instead of synthetic PVDAQ. Route `/api/public/backtest/run` accepts `projectId` + `meterDataSource` params. Auto-detects stored production data and defaults to stored mode when available. Both proj1 (12MW) and proj3 (25MW) are seeded with 8760 hourly SCADA production records, revenue records, and ACTIVE/HIGH SCADA data sources. Frontend defaults `useRealData` toggle to true and auto-sets per project. Report copy for SYNTHETIC_FALLBACK satellite source is professional and caveat-minimized when real meter data is present. Endpoint `/api/public/backtest/has-stored-data?projectId=X` checks stored data availability.
- **SGT Handshake Real-Meter Integration**: SGT Handshake checks for active SCADA data sources with fresh data (90-day freshness threshold). Uses real meter readings when available, sets `qualityFlag: "METERED"` for real data vs `"SYNTHETIC_FALLBACK"` for simulated.
- **AI Financial Prediction**: Utilizes OpenAI (gpt-5-mini) for ROI analysis, providing structured JSON output including IRR, payback period, returns, risk factors, and recommendations for projects.
- **SGT Waterfall Engine**: Processes 15-minute interval meter data through an institutional revenue waterfall to generate double-entry ledger postings and trigger Securitize yield distributions.
- **SGT Backtest Report**: A formal SGT validation engine that backtests Solcast Sky Oracle data against NREL PVDAQ, generating an investor-grade report with statistical metrics and interactive charts. Includes one-click PDF export (auto-download via html2canvas + jsPDF) with white-background rendering, multi-page support, and proper chart capture.

### System Design Choices
The architecture is compliance-first, designed for future regulatory requirements. It emphasizes vertical specialization for renewable energy securities with a unique "energy-to-yield pipeline" that calculates production-based yield from SCADA data and automates distributions. The platform uses per-project Delaware LLCs as Special Purpose Vehicles (SPVs) for tokenizing membership interests. Initial operations are under Reg D 506(c) for accredited investors, with future plans for Reg CF.

## External Dependencies

- **Persona**: Used for identity verification (KYC/AML).
- **Solcast Sky Oracle**: Satellite-derived telemetry service for 'Estimated Actuals' used in SGT verification.
- **Broker-Dealer Partnership**: Planned integration for regulatory compliance in securities offerings.
- **Transfer Agent**: Integration with a transfer agent (e.g., Securitize, KoreConX) for managing security token ownership.
- **Qualified Custodian**: Planned integration for secure holding of digital assets.
- **SCADA Systems**: Integration with various SCADA and project monitoring systems for revenue ingestion.
- **Securitize Bridge (Mock)**: Mock integration with Securitize RWA Protocol for institutional yield distribution.
- **OpenAI**: Used for AI Financial Predictions.

## Agent tooling

- **gstack** ([garrytan/gstack](https://github.com/garrytan/gstack)): vendored as a git submodule at `.claude/skills/gstack`. Run `git submodule update --init --recursive` after cloning. See `CLAUDE.md`, `AGENTS.md`, and `.cursor/rules/gstack.mdc` for the skill registry and invocation rules.