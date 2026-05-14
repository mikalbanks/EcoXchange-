# EcoXchange — Agent Instructions

Read this file before doing work. Applies to any agent: OpenAI Codex, Cursor, Factory Droid, generic. Claude Code agents should also read `CLAUDE.md`.

## Project context

EcoXchange is a digital securities platform for renewable energy — tokenized SPV membership interests under Reg D 506(c). See `APP.md` for the product overview and `replit.md` for stack and deployment notes.

Current state of note:
- Persistence is in-memory (`server/storage.ts` `MemStorage`). Supabase scaffolding exists but is not yet wired through.
- SCADA, backtest, SGT waterfall, and yield distribution modules are working — extend them rather than re-implementing.
- Public routes: `/performance`, `/backtest-report`, and `/api/public/backtest/*`. Treat these as the demo golden path.

## Branch and commit policy

- Develop on the assigned feature branch. Never push to `main` without explicit user approval.
- Create new commits, do not amend published ones.
- Do not bypass hooks (`--no-verify`) or skip signing.
- Never commit `.env`, credentials, or generated bundles. The repo `.gitignore` is the source of truth.

## gstack Skills

This repo vendors [gstack](https://github.com/garrytan/gstack) as a git submodule at `.claude/skills/gstack`. After cloning:

```
git submodule update --init --recursive
```

Each skill lives at `.claude/skills/gstack/<name>/SKILL.md`. **Read the `SKILL.md` file before performing the action — it is the procedure.** Do not improvise.

### Skill registry

| Skill | Use it when | Path |
|-------|-------------|------|
| `office-hours` | User has an idea, wants to brainstorm, "is this worth building" | `.claude/skills/gstack/office-hours/SKILL.md` |
| `plan-eng-review` | About to start coding from a plan or design doc | `.claude/skills/gstack/plan-eng-review/SKILL.md` |
| `plan-ceo-review` | Strategic review of a plan | `.claude/skills/gstack/plan-ceo-review/SKILL.md` |
| `plan-design-review` | Design review of a plan | `.claude/skills/gstack/plan-design-review/SKILL.md` |
| `plan-devex-review` | DevEx review of a plan | `.claude/skills/gstack/plan-devex-review/SKILL.md` |
| `design`, `design-html`, `design-review`, `design-consultation`, `design-shotgun` | UI / visual / mock work | `.claude/skills/gstack/design*/SKILL.md` |
| `investigate` | Debugging, errors, "why is this broken", root-cause analysis | `.claude/skills/gstack/investigate/SKILL.md` |
| `qa`, `qa-only` | Test a web app, find bugs, "does this work?" | `.claude/skills/gstack/qa/SKILL.md` |
| `review` | Pre-merge PR / diff review | `.claude/skills/gstack/review/SKILL.md` |
| `cso` | Security audit, threat model, OWASP, supply chain | `.claude/skills/gstack/cso/SKILL.md` |
| `health` | Code quality dashboard / composite score | `.claude/skills/gstack/health/SKILL.md` |
| `devex-review` | Developer-experience review | `.claude/skills/gstack/devex-review/SKILL.md` |
| `ship` | Tests, version bump, commit, push, PR | `.claude/skills/gstack/ship/SKILL.md` |
| `land-and-deploy` | Land branch and deploy | `.claude/skills/gstack/land-and-deploy/SKILL.md` |
| `document-release` | Release notes / docs | `.claude/skills/gstack/document-release/SKILL.md` |
| `landing-report` | Post-landing report | `.claude/skills/gstack/landing-report/SKILL.md` |
| `retro` | Retrospective | `.claude/skills/gstack/retro/SKILL.md` |
| `learn` | Project learnings — review, prune, export | `.claude/skills/gstack/learn/SKILL.md` |
| `context-save`, `context-restore` | Save / restore working context across sessions | `.claude/skills/gstack/context-*/SKILL.md` |
| `freeze`, `unfreeze` | Restrict edits to one directory | `.claude/skills/gstack/freeze/SKILL.md` |
| `browse`, `pair-agent`, `connect-chrome`, `setup-browser-cookies`, `open-gstack-browser` | Browser automation / pair another agent | `.claude/skills/gstack/browse/SKILL.md` |
| `make-pdf` | Generate a PDF | `.claude/skills/gstack/make-pdf/SKILL.md` |
| `agents`, `codex`, `autoplan`, `benchmark`, `benchmark-models`, `canary`, `careful`, `guard`, `gstack-upgrade`, `plan-tune`, `setup-deploy`, `setup-gbrain`, `health` | Misc agent / infra | `.claude/skills/gstack/<name>/SKILL.md` |

Discover the full list with `ls .claude/skills/gstack/`. The submodule pin is the source of truth — do not edit skill files in this repo; update the submodule instead.

## EcoXchange-specific guardrails for skills

- `ship` / `land-and-deploy`: respect the branch policy above. Confirm before pushing to `main`.
- `cso`: focus areas — Persona KYC keys, OpenAI API key, Solcast API key, Securitize bridge mock/real boundary, public `/api/public/backtest/*` surface.
- `qa` / `health`: run against `npm run dev`; exercise `/performance` and `/backtest-report` as the demo golden path; do not regress the SCADA CSV upload at `/operations`.
- `investigate`: the SCADA, backtest, and SGT modules have heavy domain logic — read the linked services in `server/services/` before forming a hypothesis.

## Cursor Cloud specific instructions

### Overview

EcoXchange is a single-package full-stack TypeScript application (Express.js backend + React/Vite frontend). A single `npm run dev` command starts both the API and the Vite dev server on port **5000**.

### Required Services

| Service | How to start | Notes |
|---------|-------------|-------|
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | Must be running before the dev server |
| Dev server | `npm run dev` | Serves API + Vite frontend on port 5000 |

### Environment Variables

The following must be set before running the dev server:

```bash
export DATABASE_URL="postgresql://ecoxchange:ecoxchange@localhost:5432/ecoxchange"
export AI_INTEGRATIONS_OPENAI_API_KEY="sk-dummy-not-real"  # prevents crash at module init; AI features fail gracefully
```

The `AI_INTEGRATIONS_OPENAI_API_KEY` env var is required at startup because the OpenAI client initializes at module scope in `server/lib/ai-predictions.ts` and throws without any key. A dummy value is sufficient for non-AI development.

### Key Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Type check | `npm run check` |
| Build | `npm run build` |
| Push DB schema | `npx drizzle-kit push --force` |

### Gotchas

- **TypeScript check (`npm run check`)** has pre-existing errors in `server/replit_integrations/` and `server/services/backtest-engine.ts`. These do not affect dev server startup.
- The app uses **`MemStorage`** (in-memory) by default (see `server/storage.ts` line 1359). Data resets on server restart. PostgreSQL is still needed for SGT ledger routes that query `db` directly.
- **Demo accounts** are seeded in memory on startup — see `APP.md` for credentials (admin, issuer, investor).
- Port 5000 is the only port served. The `PORT` env var can override it.
