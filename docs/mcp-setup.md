# Cursor MCP Setup (GitHub + Supabase + Postgres)

This project includes a repo-level Cursor MCP config at:

- `.cursor/mcp.json`

It defines three MCP servers:

- `github` via `@modelcontextprotocol/server-github`
- `supabase` via `@supabase/mcp-server-supabase`
- `postgres` via `@modelcontextprotocol/server-postgres`

---

## 1) Required environment variables

Set these in the environment where Cursor launches MCP servers:

- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_URL`

Quick-start template:

- Copy `.env.mcp.example` and fill your real values.

> No secrets are committed in this repo. `.cursor/mcp.json` uses env placeholders only.

---

## 2) GitHub token (PAT)

1. Go to GitHub **Settings → Developer settings → Personal access tokens**.
2. Create a token (fine-grained preferred).
3. Grant access to the repo(s) you want MCP to use.
4. Add the token as:
   - `GITHUB_PERSONAL_ACCESS_TOKEN=<your_token>`

If you need broader org/repo reads, ensure the token has at least appropriate repository read permissions.

---

## 3) Supabase access token

1. In Supabase dashboard, open **Account / Access Tokens**.
2. Create a personal access token.
3. Add:
   - `SUPABASE_ACCESS_TOKEN=<your_supabase_pat>`

---

## 4) Supabase project ref

Get this from the project URL or project settings:

- Project URL format: `https://<project-ref>.supabase.co`
- The `<project-ref>` part is `SUPABASE_PROJECT_REF`

Set:

- `SUPABASE_PROJECT_REF=<project-ref>`

---

## 5) Supabase Postgres connection string

1. In Supabase project, open **Settings → Database**.
2. Copy the **connection string** (URI form).
3. Set:
   - `SUPABASE_DB_URL=postgresql://...`

The `postgres` MCP server in `.cursor/mcp.json` reads this through:

- `POSTGRES_CONNECTION_STRING=${SUPABASE_DB_URL}`

---

## 6) Verify in Cursor

1. Restart Cursor (or reload MCP servers).
2. Open MCP settings/tools panel.
3. Confirm `github`, `supabase`, and `postgres` appear without auth errors.

If a server fails to start:

- Re-check variable names exactly.
- Re-check token scopes/permissions.
- Ensure DB URL is full URI (includes host/user/password/db/ssl options if required).

