# EcoXchange - Renewable Infrastructure Digital Securities Platform

## Overview
EcoXchange is a compliant renewable infrastructure digital securities issuance platform. It enables issuers to list solar, wind, and hydrogen projects as Reg D securities offerings, while verified accredited investors can browse and invest through a simulated USDC rail.

## Current State
- **Status**: MVP Complete
- **Stack**: Express backend + React frontend (Vite/wouter routing)
- **Storage**: In-memory (MemStorage) - no database persistence for MVP
- **Auth**: Session-based with express-session

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ecoxchange.demo | Admin123! |
| Issuer | issuer@ecoxchange.demo | Issuer123! |
| Investor | investor@ecoxchange.demo | Investor123! |

## Key Features

### Multi-Role Authentication
- **ADMIN**: KYC/accreditation approvals, platform overview
- **ISSUER**: Project management, offering creation, tokenization
- **INVESTOR**: Browse marketplace, invest, view portfolio/wallet

### Issuer Dashboard
- Create and manage renewable energy projects (Solar, Wind, Hydrogen)
- Structure Reg D compliant securities offerings
- Publish offerings to marketplace
- Close offerings and mint tokens (ERC-3643 simulated)
- Track investor commitments

### Investor Portal
- Browse open offerings in marketplace
- KYC verification flow (admin approval)
- Accreditation verification
- Submit investment commitments
- View portfolio (commitments, tokens, distributions)
- Simulated USDC wallet with ledger entries

### Admin Panel
- User management (KYC approvals, accreditation)
- Platform-wide offering overview
- Statistics dashboard

## Project Architecture

### Frontend (`client/src/`)
- `/pages/` - All page components organized by role
  - `/auth/` - Login, Signup
  - `/issuer/` - Dashboard, Projects, Offerings
  - `/investor/` - Dashboard, Marketplace, Portfolio, Wallet
  - `/admin/` - Dashboard, Users, Offerings
- `/components/` - Reusable components
  - `dashboard-layout.tsx` - Sidebar navigation for authenticated users
  - `header.tsx` - Public header
  - `status-badge.tsx` - Status indicators
  - `stats-card.tsx` - Metric cards
- `/lib/` - Utilities
  - `auth.tsx` - AuthContext and useAuth hook

### Backend (`server/`)
- `routes.ts` - All API endpoints
- `storage.ts` - MemStorage implementation with IStorage interface

### Shared (`shared/`)
- `schema.ts` - All data models and Zod validation schemas

## Data Models
1. **User** - Core user with role (ADMIN, ISSUER, INVESTOR)
2. **InvestorProfile** - KYC status, accreditation
3. **IssuerProfile** - Company info
4. **Project** - Renewable energy projects
5. **Offering** - Securities offerings linked to projects
6. **Commitment** - Investment commitments
7. **Tokenization** - ERC-3643 simulated tokens
8. **TokenAllocation** - Token distribution to investors
9. **Distribution** - Quarterly distributions
10. **DistributionPayout** - Individual payouts
11. **LedgerAccount** - USDC demo wallet
12. **LedgerEntry** - Transaction history

## Design Theme
- Institutional fintech aesthetic (not crypto neon)
- Primary: Emerald green (#16A34A)
- Accent: Lime (#A3E635)
- Dark mode by default with gradient backgrounds
- Deep green sidebar (#0B3D2E)

## API Endpoints

### Auth
- `GET /api/auth/me` - Current user
- `POST /api/auth/login` - Login
- `POST /api/auth/signup` - Register
- `POST /api/auth/logout` - Logout

### Issuer
- `GET /api/issuer/stats` - Dashboard stats
- `GET/POST /api/issuer/projects` - List/Create projects
- `GET /api/issuer/projects/:id` - Project detail
- `GET/POST /api/issuer/offerings` - List/Create offerings
- `POST /api/issuer/offerings/:id/publish` - Publish offering
- `POST /api/issuer/offerings/:id/close` - Close offering
- `POST /api/issuer/offerings/:id/mint` - Mint tokens

### Investor
- `GET /api/investor/stats` - Dashboard stats
- `GET /api/investor/status` - KYC/accreditation status
- `GET /api/investor/commitments` - Investment history
- `GET /api/investor/tokens` - Token holdings
- `GET /api/investor/payouts` - Distribution payouts
- `GET /api/investor/wallet/*` - Wallet endpoints
- `POST /api/investor/offerings/:id/invest` - Submit investment

### Marketplace
- `GET /api/offerings/marketplace` - Open offerings
- `GET /api/offerings/:id` - Offering detail

### Admin
- `GET /api/admin/stats` - Platform stats
- `GET /api/admin/investors` - All investors
- `GET /api/admin/offerings` - All offerings
- `POST /api/admin/users/:id/approve-kyc` - Approve KYC
- `POST /api/admin/users/:id/reject-kyc` - Reject KYC
- `POST /api/admin/users/:id/set-accredited` - Set accreditation

## User Preferences
- Dark mode enabled by default
- Clean institutional fintech design
- Simulated USDC rail (DEMO_STABLECOIN=true mode)

## Important Notes
- This is a demo MVP - no real securities or payments
- In-memory storage resets on server restart
- KYC/accreditation is manually approved by admin
- Token minting is simulated (ERC-3643 compliance)
