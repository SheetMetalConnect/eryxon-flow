# Agent Instructions — Eryxon Flow

> Universal context for all AI coding agents (Claude, Codex, Gemini, Cursor, Copilot, Windsurf, Cline, Aider).

## Project

Manufacturing Execution System (MES) for job shops. Tracks jobs, parts, operations through production. React + TypeScript frontend, Supabase backend.

## Commands

```bash
npm install && npm run dev   # Dev server at localhost:5173
npm run build                # MUST pass before any commit
npm run test:run             # Vitest test suite
```

## Architecture

```
React 18 + Vite + Tailwind + shadcn/ui
    → Supabase Client
    → PostgreSQL + Auth + RLS + Realtime + Storage
    → Edge Functions (Deno) — 30+ REST API endpoints
    → Webhooks + MQTT + MCP Server
```

## Edge Functions — Critical Rules

All API endpoints live in `supabase/functions/api-*/`. Shared code in `_shared/`.

1. **`Deno.serve()` only** — never `import { serve } from "https://deno.land/std/..."` (broken on current runtime)
2. **No `export default`** on `serveApi()` — it returns void, conflicts with Deno.serve
3. **Each function needs `deno.json`** with `@shared/` import map
4. **Verify column names** against actual DB before writing queries — hallucinated columns cause 502s
5. **FK hints required** (`!column_name`) for tables with multiple FKs to same target
6. **Deploy**: `supabase functions deploy <name> --project-ref <ref> --no-verify-jwt`

## Shared Modules (`supabase/functions/_shared/`)

| Module | Purpose |
|--------|---------|
| `handler.ts` | API handler factory (Deno.serve, CORS, auth) |
| `crud-builder.ts` | Generic CRUD with pagination, filters, search, sync |
| `auth.ts` | API key auth (SHA-256, prefix lookup, rate limiting) |
| `plan-limits.ts` | Subscription quota enforcement |
| `security.ts` | Upload validation, content types |

## Code Conventions

- TypeScript strict, `@/` path aliases
- shadcn/ui components, Tailwind CSS only
- i18n keys for all UI text (EN, NL, DE) — never hardcode
- Sonner for toasts, Supabase client for API calls
- RLS on every table — multi-tenant via `tenant_id`
- Conventional commits: `feat:`, `fix:`, `deps:`, `docs:`

## Safety

- Never commit `.env` or secrets
- `npm run build` must pass before committing
- Always verify DB column names before writing edge function queries
- Test edge function deploys with curl
- Multi-tenant — always consider tenant isolation

## Documentation Index

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) | System architecture with Mermaid dependency graphs |
| [`docs/API_CATALOG.md`](../docs/API_CATALOG.md) | All 22 API endpoints — tables, methods, CRUD config |
| [`docs/ROUTE_MAP.md`](../docs/ROUTE_MAP.md) | All 41 frontend routes with guards and lazy-loading |
| [`docs/HOOK_MAP.md`](../docs/HOOK_MAP.md) | Hook → table → queryKey dependency map |
| [`docs/CONVENTIONS.md`](../docs/CONVENTIONS.md) | Code patterns, naming, templates for new files |
| [`docs/GLOSSARY.md`](../docs/GLOSSARY.md) | MES domain vocabulary for AI agents |
| [`docs/TROUBLESHOOTING.md`](../docs/TROUBLESHOOTING.md) | Common agent pitfalls and fixes |
| [`docs/decisions/`](../docs/decisions/) | Architecture Decision Records (ADRs) — why things are the way they are |
| [`docs/DATABASE_DIAGRAM.dbml`](../docs/DATABASE_DIAGRAM.dbml) | Full database schema (dbdiagram.io compatible) |
| [`docs/dependency-graph.json`](../docs/dependency-graph.json) | Frontend import map (regenerate: `npm run deps:graph`) |

## Sub-Agents

- [supabase-db.md](supabase-db.md) — Migrations, RLS, Edge Functions, schema
- [tech-stack.md](tech-stack.md) — Dependencies, build config, architecture
- [repo-ops.md](repo-ops.md) — Issues, PRs, branches, releases
