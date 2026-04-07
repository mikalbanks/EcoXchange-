# AGENTS.md

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
