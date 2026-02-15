# EcoXchange

**Renewable Energy Deal Packaging Platform**

---

## What is EcoXchange?

EcoXchange is a deal packaging platform for renewable energy projects. It connects three types of users:

- **Developers** submit solar and solar+storage projects through a guided wizard, receive automated readiness scoring, and manage data room checklists.
- **Investors** browse approved deals, review project details, and express interest in projects they want to fund.
- **Admins** review submitted projects, override scores, approve or reject deals, and generate export packets.

> This is a pilot MVP. Interest expressions are non-binding, and the platform is informational only (not a broker-dealer).

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
| Developer | developer@ecoxchange.demo | Developer123! |
| Investor | investor@ecoxchange.demo | Investor123! |

---

## Features

### Multi-Role Authentication

Users sign up as either a Developer or Investor. Admins are pre-seeded. Each role sees a different dashboard and set of features.

### Developer Portal

- **5-Step Project Wizard** -- Submit projects through a guided flow: Basics, Status, Financials, Documents, and Review.
- **Automated Readiness Scoring** -- Each project receives a score from 0 to 100 with a GREEN / YELLOW / RED rating based on site control, interconnection status, permitting, offtaker type, documents, and tax credit details.
- **Data Room Checklist** -- Track required documents with upload status (Missing, Uploaded, Verified).
- **Capital Stack** -- Automatic computation of equity needed based on project financials.
- **Investor Interest Inbox** -- View and accept or decline interest from investors.

### Investor Portal

- **Browse Approved Deals** -- Filter by state, MW capacity, development stage, readiness rating, and offtaker type.
- **Terms Acceptance Gate** -- Agree to terms before accessing a deal room.
- **Deal Room View** -- Full project details including readiness score, capital stack, and data room documents.
- **Interest Commitment** -- Submit interest with amount, structure preference, timeline, and a message.

### Admin Panel

- **Dashboard** -- KPIs including project counts by status, average readiness score, and total interest received.
- **Review Queue** -- Filter projects by status and rating.
- **Project Review** -- View full project details with the ability to override readiness scores.
- **Actions** -- Approve, Reject, or Request Changes on submitted projects, with notes.
- **Export Packets** -- Generate printable export summaries for any project.
- **User Management** -- View all users with KYC verification status.

### Identity Verification (Persona KYC)

- Powered by Persona for developer and investor identity verification.
- Developers must verify before submitting projects.
- Investors must verify before committing interest.
- Admins are exempt from verification requirements.

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
| POST | `/api/auth/signup` | Register (Developer or Investor) |
| POST | `/api/auth/logout` | Log out |

### Developer
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/developer/stats` | Dashboard statistics |
| GET | `/api/developer/projects` | List projects with scores |
| POST | `/api/developer/projects` | Create project (wizard submit) |
| GET | `/api/developer/projects/:id` | Full project detail |
| POST | `/api/developer/projects/:id/documents` | Upload document metadata |
| PATCH | `/api/developer/interests/:id` | Accept or decline interest |

### Investor
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/investor/deals` | Browse approved deals |
| GET | `/api/investor/deals/:id` | Deal room detail |
| POST | `/api/investor/deals/:id/interest` | Submit interest |
| GET | `/api/investor/interests` | View my interests |

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

The app starts with pre-loaded demo data:

1. **Sunfield Solar I** -- GREEN rating, 95 readiness score, APPROVED status
2. **Desert Sun Community Solar** -- RED rating, 31 readiness score, SUBMITTED status

Both projects include complete documents and checklists. The approved project has a sample investor interest record.

---

## Design

- Dark mode by default with eco-green brand colors
- Primary color: #73AC20 (Eco Green)
- Accent color: #90C11B
- Background: near-black (#0B0F0C)
- Card backgrounds: #101712

---

## Important Notes

- In-memory storage resets when the server restarts
- Documents are metadata-only (no actual file uploads)
- This is an informational platform, not a broker-dealer
- All interest expressions are non-binding
