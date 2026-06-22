# Agent Instructions — Eryxon Flow

> Universal context for all AI coding agents (Claude, Codex, Gemini, Cursor, Copilot, Windsurf, Cline, Aider).

## Project

Manufacturing Execution System (MES) for job shops. Tracks jobs, parts, operations through production. React + TypeScript frontend, Supabase backend.

## Commands

```bash
npm install && npm run dev   # Dev server at localhost:8080
npm run build                # MUST pass before any commit
npm run test:run             # Vitest test suite
```

## Architecture

```
React 18 + Vite + Tailwind + shadcn/ui
    → Supabase Client
    → PostgreSQL + Auth + RLS + Realtime + Storage
    → Edge Functions (Deno) — 30+ REST API endpoints (incl. api-batches, api-batch-lifecycle)
    → Webhooks + MQTT + MCP Server
```

## Edge Functions — Critical Rules

All API endpoints live in `supabase/functions/api-*/`. Shared code in `_shared/`.

1. **`Deno.serve()` only** — never `import { serve } from "https://deno.land/std/..."` (broken on current runtime)
2. **No `export default`** on `serveApi()` — it returns void, conflicts with Deno.serve
3. **Each function needs `deno.json`** with `@shared/` import map
4. **Verify column names** against actual DB before writing queries — hallucinated columns cause 502s
5. **FK hints required** (`!column_name`) for tables with multiple FKs to same target
6. **No heavy validator imports** in function index files — `fkValidator.ts` and `PartValidator.ts` crash the Deno runtime silently (use inline validation instead)
7. **PostgREST `.in()` on joined tables silently fails** — always query the join table first, then filter by IDs
8. **Deploy**: `supabase functions deploy <name> --project-ref <ref> --no-verify-jwt`
9. **Test**: `./scripts/test-api-automated.sh` — 54 tests, must all pass

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

## Code Quality Bar (required)

High code quality is non-negotiable on this repo. Apply these on every change:

- **Minimal, lazy-correct solutions.** Stdlib/native before dependencies, one line before fifty, delete before add. No speculative abstractions, no boilerplate "for later". Shortest correct diff wins. (Claude Code: `/ponytail:ponytail`.)
- **De-slop before committing.** Strip AI slop from the diff: needless comments, defensive try/catch on trusted paths, `any` casts that hide type problems, deep nesting that should be early returns, anything inconsistent with the surrounding file. (Claude Code: `/deslop`.)
- **Review before merging.** Read the diff for correctness bugs and simplification/reuse wins; fix findings. (Claude Code: `/code-review`, `/simplify`.)
- **Root cause before fixes.** Don't patch symptoms; find why it breaks first. Test-first for features and bugfixes. Verify with real command output before claiming done.
- **No hardcoded config in source** — no vendor domains, URLs, secrets, or env-specific values in this open-source code. Use env vars (e.g. `ALLOWED_ORIGIN`) and keep hosted vs self-hosted modes cleanly separated.

## Safety

- Never commit `.env` or secrets
- `npm run build` must pass before committing
- Always verify DB column names before writing edge function queries
- Test edge function deploys with curl
- Multi-tenant — always consider tenant isolation

## Refactoring Rules

- **Before adding to a large file:** Check line count. If over the limit (see `docs/CONVENTIONS.md` Module Boundaries), extract first.
- **Before changing a shared hook:** Check import count with grep. If >30 importers, add a focused selector hook instead of modifying the original.
- **Prefer composition over modification:** Extract new sub-components rather than adding more logic to existing ones.
- **Test before and after:** Run `npm run test:run` before starting and after every commit.
- **Use focused hooks:** Import `useProfile`, `useTenant`, `useSession` instead of `useAuth` for new code. Only use `useAuth` when you need multiple concerns (e.g., both profile and tenant).

## Knowledge Graph (OpenTrace)

This codebase is indexed into a queryable knowledge graph via [OpenTrace](https://github.com/opentrace/opentrace). The current local index reports 1,019 functions, 45 classes, 822 files, 144 directories, 143 packages, and 3,341 graph edges (CALLS, IMPORTS, DEFINED_IN, DEPENDS_ON).

**Re-index after structural changes:**
```bash
opentraceai index .    # ~3 seconds, writes to .opentrace/index.db
```

**How agents should use it:**
- Prefer graph queries over `Glob`/`Grep` for structural and relationship questions
- Always trace 2nd and 3rd order effects before answering "is it safe to change X?"
- Use `traverse_graph` with incoming direction to map blast radius of any change
- The MCP server exposes 5 tools: `get_stats`, `search_graph`, `list_nodes`, `get_node`, `traverse_graph`

**Codex skills:**
- `$explore-code` — general codebase exploration
- `$source-command-explore <name>` — quick exploration of any component
- `$source-command-graph-status` — overview of what's indexed
- `$source-command-interrogate <question>` — read-only codebase Q&A

**Codex subagents:**
- `opentrace` — general-purpose (default catch-all)
- `code-explorer` — browse files, directories, structure
- `dependency-analyzer` — blast radius and impact analysis
- `find-usages` — caller/reference lookups
- `explain-service` — top-down service walkthroughs

## Documentation Index

| Document | Purpose |
|----------|---------|
| [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) | System architecture with Mermaid dependency graphs |
| [`docs/API_CATALOG.md`](../docs/API_CATALOG.md) | All 24 API endpoints — tables, methods, CRUD config |
| [`docs/ROUTE_MAP.md`](../docs/ROUTE_MAP.md) | All 41 frontend routes with guards and lazy-loading |
| [`docs/HOOK_MAP.md`](../docs/HOOK_MAP.md) | Hook → table → queryKey dependency map |
| [`docs/CONVENTIONS.md`](../docs/CONVENTIONS.md) | Code patterns, naming, templates for new files |
| [`docs/LOCATION_MODULE.md`](../docs/LOCATION_MODULE.md) | Location/placement module — drop-off slot grid, capacity, placement flow |
| [`docs/GLOSSARY.md`](../docs/GLOSSARY.md) | MES domain vocabulary for AI agents |
| [`docs/TROUBLESHOOTING.md`](../docs/TROUBLESHOOTING.md) | Common agent pitfalls and fixes |
| [`docs/decisions/`](../docs/decisions/) | Architecture Decision Records (ADRs) — why things are the way they are |
| [`docs/DATABASE_DIAGRAM.dbml`](../docs/DATABASE_DIAGRAM.dbml) | Full database schema (dbdiagram.io compatible) |
| [`docs/dependency-graph.json`](../docs/dependency-graph.json) | Frontend import map (regenerate: `npm run deps:graph`) |

## Sub-Agents

- [supabase-db.md](supabase-db.md) — Migrations, RLS, Edge Functions, schema
- [tech-stack.md](tech-stack.md) — Dependencies, build config, architecture
- [repo-ops.md](repo-ops.md) — Issues, PRs, branches, releases
