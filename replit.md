# EcoXchange - Renewable Energy Deal Packaging Platform

## Overview
EcoXchange is a deal packaging platform for renewable energy projects. Developers submit solar and solar+storage projects through a guided wizard, receive automated readiness scoring, manage data room checklists, and connect with investors who can express interest in approved deals. Admins review projects, override scores, and generate export packets.

## Current State
- **Status**: MVP Complete
- **Stack**: Express backend + React frontend (Vite/wouter routing)
- **Storage**: In-memory (MemStorage) - no database persistence for pilot
- **Auth**: Session-based with express-session + memorystore

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecoxchange.demo | Admin123! |
| Developer | developer@ecoxchange.demo | Developer123! |
| Investor | investor@ecoxchange.demo | Investor123! |

## Key Features

### Multi-Role Authentication
- **ADMIN**: Review queue, score override, export packets, user management
- **DEVELOPER**: Project wizard, data room management, interest inbox
- **INVESTOR**: Browse approved deals, deal room detail, commit interest

### Developer Portal
- 5-step project wizard (Basics, Status, Financials, Documents, Review)
- Automated readiness scoring (0-100 with GREEN/YELLOW/RED rating)
- Data room checklist with document upload tracking
- Capital stack computation
- Investor interest inbox with accept/decline actions

### Investor Portal
- Browse approved deals with filters (state, MW, stage, rating, offtaker)
- Terms acceptance gate on deal rooms
- Full deal room view: project details, readiness score, capital stack, data room
- Interest commitment form (amount, structure, timeline, message)

### Admin Panel
- Dashboard with KPIs (projects by status, avg score, total interest)
- Review queue with status and rating filters
- Full project review with score override capability
- Approve/Reject/Request Changes actions with notes
- Export packet generation for printing
- User management table with KYC status column

### Identity Verification (Persona KYC)
- Persona-powered identity verification for developers and investors
- Admins are exempt from verification requirements
- Developers must verify before submitting projects (wizard allows filling but blocks submit)
- Investors must verify before committing interest in deals
- Backend gating returns 403 if personaStatus !== "completed"
- Frontend shows IdentityVerificationCard component on developer/investor dashboards
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
  - `/auth/` - Login, Signup
  - `/developer/` - Dashboard, Project Wizard, Project Detail
  - `/investor/` - Dashboard, Deals Browse, Deal Room
  - `/admin/` - Dashboard, Projects Queue, Project Review, Export Packet, Users
- `/components/` - Reusable components
  - `dashboard-layout.tsx` - Sidebar navigation (shadcn Sidebar)
  - `header.tsx` - Public header
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

### Developer
- `GET /api/developer/stats` - Dashboard stats
- `GET /api/developer/projects` - Project list with scores
- `POST /api/developer/projects` - Create project (wizard submit)
- `GET /api/developer/projects/:id` - Full project detail
- `POST /api/developer/projects/:id/documents` - Upload document
- `PATCH /api/developer/interests/:id` - Accept/decline interest

### Investor
- `GET /api/investor/deals` - Browse approved deals
- `GET /api/investor/deals/:id` - Deal room detail
- `POST /api/investor/deals/:id/interest` - Submit interest
- `GET /api/investor/interests` - My interests

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

## Seed Data
- 2 demo projects: "Sunfield Solar I" (GREEN, 95 score, APPROVED) and "Desert Sun Community Solar" (RED, 31 score, SUBMITTED)
- Sample investor interest on the approved project
- Complete documents and checklists for both projects

## Important Notes
- This is a pilot MVP - non-binding interest expressions only
- In-memory storage resets on server restart
- Documents are metadata-only (no actual file upload)
- Disclaimer: informational platform, not a broker-dealer
