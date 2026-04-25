# EcoXchange — Claude Code Instructions

EcoXchange is a digital securities platform for renewable energy. For the product overview see `APP.md`; for the stack and operational notes see `replit.md`.

## Working agreements

- Develop on the assigned feature branch. Do not push to `main` without explicit approval.
- Prefer editing existing files. The repo already has working modules for SCADA ingestion, backtest, SGT waterfall, and yield distribution — extend those rather than re-implementing.
- Persistence is currently `MemStorage` (`server/storage.ts`). Supabase scaffolding has landed but is not yet wired through. Treat any DB work as cross-cutting.
- Default model rule: do not commit secrets. `.env` and credential files stay untracked.

## gstack Skills

This repo vendors the [gstack](https://github.com/garrytan/gstack) skill pack as a git submodule at `.claude/skills/gstack`. After cloning, run:

```
git submodule update --init --recursive
```

Each skill below lives at `.claude/skills/gstack/<name>/SKILL.md`. Read the relevant `SKILL.md` before invoking the skill — they contain the procedure, gates, and outputs.

### When to use which skill

| Task | Skill | Path |
|------|-------|------|
| User has an idea or feature to think through | `office-hours` | `.claude/skills/gstack/office-hours/SKILL.md` |
| Lock in architecture before coding | `plan-eng-review` | `.claude/skills/gstack/plan-eng-review/SKILL.md` |
| Design or UI pass | `design`, `design-html`, `design-review` | `.claude/skills/gstack/design*/SKILL.md` |
| CEO-style strategic review of a plan | `plan-ceo-review` | `.claude/skills/gstack/plan-ceo-review/SKILL.md` |
| Debug an error or unexpected behavior | `investigate` | `.claude/skills/gstack/investigate/SKILL.md` |
| QA test the web app and fix bugs | `qa`, `qa-only` | `.claude/skills/gstack/qa/SKILL.md` |
| Pre-merge code review of the diff | `review` | `.claude/skills/gstack/review/SKILL.md` |
| Security audit (OWASP / STRIDE / supply chain) | `cso` | `.claude/skills/gstack/cso/SKILL.md` |
| Code quality + composite score | `health` | `.claude/skills/gstack/health/SKILL.md` |
| Ship — tests, version bump, push, PR | `ship` | `.claude/skills/gstack/ship/SKILL.md` |
| Land branch and deploy | `land-and-deploy` | `.claude/skills/gstack/land-and-deploy/SKILL.md` |
| DevEx review | `devex-review` | `.claude/skills/gstack/devex-review/SKILL.md` |
| Save / restore working context across sessions | `context-save`, `context-restore` | `.claude/skills/gstack/context-*/SKILL.md` |
| Restrict edits to one directory | `freeze` / `unfreeze` | `.claude/skills/gstack/freeze/SKILL.md` |
| Browser automation / pair another agent | `browse`, `pair-agent` | `.claude/skills/gstack/browse/SKILL.md`, `.claude/skills/gstack/pair-agent/SKILL.md` |
| Project learnings | `learn` | `.claude/skills/gstack/learn/SKILL.md` |
| Document a release | `document-release` | `.claude/skills/gstack/document-release/SKILL.md` |
| Retrospective | `retro` | `.claude/skills/gstack/retro/SKILL.md` |

Other skills present in the submodule: `agents`, `autoplan`, `benchmark`, `benchmark-models`, `canary`, `careful`, `codex`, `connect-chrome`, `design-consultation`, `design-shotgun`, `guard`, `make-pdf`, `gstack-upgrade`, `landing-report`, `plan-design-review`, `plan-devex-review`, `plan-tune`, `setup-browser-cookies`, `setup-deploy`, `setup-gbrain`, `open-gstack-browser`. Discover via `ls .claude/skills/gstack/`.

### Invocation

Locally, run `bash .claude/skills/gstack/setup` once to register the skills as native Claude Code slash commands (`/review`, `/qa`, `/ship`, etc.). In cloud sessions where setup has not run, invoke a skill by reading its `SKILL.md` and following the procedure verbatim — that is the contract.

## EcoXchange-specific guardrails for skills

- `ship` and `land-and-deploy` must respect the branch policy above. Never let them push to `main` without explicit user approval.
- `cso` should pay attention to: KYC/Persona handling, OpenAI API key, Solcast API key, Securitize bridge mock vs real boundary, and the public `/api/public/backtest/*` endpoints.
- `qa` and `health` should run against the existing dev server (`npm run dev`); the platform has a public Performance page and a public Backtest Report page that are good golden paths.
