# Changelog

All notable changes to Eryxon Flow are documented here.

## [0.5.0] - 2026-05-04

### Added

- Planning adapter interface (`src/lib/planning/`) with ISA-95 aligned vocabulary for integrating external planning/scheduling tools
- FrePPLe adapter: pull work orders + resources, push order start/completion, Basic Auth, pagination handling
- Odoo MRP adapter (scaffold): JSON-RPC authentication, pull work orders from `mrp.production`, push execution feedback
- Factory function `createPlanningAdapter(config)` for runtime adapter selection
- 20 tests covering FrePPLe adapter (connection, mapping, pagination, error handling, auth)
- MCP Server HTTP/SSE transport (`MCP_TRANSPORT=http`): StreamableHTTP transport for Docker/cloud deployment alongside existing stdio mode
- MCP Server Dockerfile + docker-compose.yml for self-hosted deployment with health checks
- MCP Server `/health` endpoint returning server status, version, mode, and tool count
- OEE metrics calculation (Availability x Performance x Quality) from real production data
- Reliability metrics: on-time %, delay tracking, weekly trends, per-cell breakdown
- MQTT client wrapper (`src/lib/mqtt-client.ts`) with exponential backoff retry (3 attempts), circuit breaker (5 failures / 30s cooldown), dead letter logging to `mqtt_logs`, and injectable transport for testability. 18 tests.
- Edge function test coverage: 113 tests for shared auth, security, and plan-limits modules
- Runtime env.js injection via Docker entrypoint (no rebuild needed for config changes)
- `.dockerignore` to reduce build context size
- `/health` endpoint now returns JSON (`{"status":"ok","service":"eryxon-flow"}`)
- OCI image labels for version tracking and metadata
- `src/config/env.ts` helper for runtime environment variable resolution
- Localized landing pages for DE, complete NL landing page parity
- German localization: landing page, guides, glossary, and language switcher
- Dutch localization: concepts, guides, glossary
- Language switcher in footer, browser auto-detect banner, and SEO hreflang tags
- Search and status sorting to tenant switcher
- Docs: Core Concepts guide, API query examples, capability comparison table

### Changed

- ESLint `no-explicit-any` rule enabled as warning
- `as any` casts reduced from 72 to 7 across codebase
- Supabase types regenerated with latest schema
- **Lazy-load mockDataGenerator** — 2,202-line mock data module now loads on demand via dynamic `import()`. Removes ~40KB from the production bundle for all non-demo users.
- **Split database.ts into domain modules** — 1,085-line monolith decomposed into `src/lib/db/` with 4 focused modules: operations, time-tracking, batches, assemblies. Original file preserved as thin re-export.
- **Decompose PartDetailModal** — 1,193-line component split into tab sub-components under `src/components/admin/part-detail/`: PartDetailsTab (140 lines), PartOperationsTab (459 lines), PartFilesTab (167 lines).
- **CORS fails closed** — edge functions no longer default to `Access-Control-Allow-Origin: *` when `ALLOWED_ORIGIN` env var is not set. Now defaults to `localhost` only (safe for dev). Production deployments must explicitly set `ALLOWED_ORIGIN`.
- Dockerfile bumped to `node:22-alpine` (builder stage)
- Consolidated `docker-compose.yml` as single production-ready file with `env_file` support (removed `docker-compose.prod.yml`)
- CI/CD hardening: lint + typecheck gates added to all workflows, fork PR deploy protection, Cloudflare action updated to v3
- Database migration cleanup: replaced stale TODO with documentation, added migrations README and archive README

### Fixed

- **SSRF: block IPv6 loopback in webhook URL validation** — `validateWebhookUrl` now correctly blocks `[::1]`, expanded IPv6 loopback forms, IPv4-mapped IPv6 loopback (`[::ffff:127.x.x.x]`), and IPv4-mapped private ranges. URL parser normalizes these to hex notation which the previous check missed.
- Vite security vulnerabilities patched (CVE path traversal, WebSocket read)
- CORS wildcard default — now fails closed when `ALLOWED_ORIGIN` not set
- Operator UI re-render bugs: 5 `setState`-in-`useEffect` violations fixed (`OperatorLayout.tsx`, `OperatorStatusBar.tsx`, `OperatorView.tsx`)
- Root admin tenant switching no longer violates unique constraint
- Removed unrecognized `browsing-topics` from Permissions-Policy header

### Improved

- Self-hosting: runtime env injection, .dockerignore, Node 22, health endpoint
- Component refactors: PartDetailModal split, database.ts modularized, mockDataGenerator lazy-loaded
- Database migration cleanup with READMEs
- MCP server working (v2.4.0, builds clean)
- Safe dependency updates (Supabase, TanStack Query, react-hook-form, MSW, Vitest)

## [0.4.1] - 2026-03-29

### Added

- **Batch API** — `api-batches` (CRUD) and `api-batch-lifecycle` (start/stop/add-operations) edge functions
- Weighted time distribution: batch stop divides time by estimated_time ratios when available
- Webhook events: `batch.started`, `batch.completed`
- Focused auth hooks: `useProfile`, `useTenant`, `useSession`, `useAuthActions` (split from god-hook `useAuth`)
- 98 new unit tests (519 → 617 total), 12 new test files
- Agent safety guardrails: module size limits and refactoring rules in docs
- Automated API test suite (54 tests)
- Architecture documentation with Mermaid graphs
- API catalog, route map, hook map, conventions, glossary, troubleshooting docs
- ADRs (5 Architecture Decision Records)
- Dependency graph via madge
- MCP server support (CodeGraphContext, RepoMapper, Repomix)
- Agent discovery via `.agents/` directory convention

### Changed

- **Architecture refactoring** — decomposed 6 hotspots for agent-safe development:
  - `AuthContext` (94 importers) → 4 focused selector hooks, 70 consumers migrated
  - `SchedulerService` (425 lines) → calendar, capacity, allocator modules
  - `STEPViewer` (1976 lines) → scene, controls, grid, pmi-overlay modules
  - `BatchDetail` (684 lines) → 9 focused sub-components (~90 line shell)
  - `OperatorView` (686 lines) → 5 focused sub-components (~120 line shell)
- API endpoint count: 22 → 24

### Fixed

- **BatchCreate React #185 crash** — PostgREST returns arrays for ambiguous FK joins; added `unwrapRelation()` helper
- **CapacityMatrix 400 error** — `customer_name` → `customer`, `parts(name)` → `parts(part_number)` (non-existent columns)
- Operations now editable after batch creation (was disabled in edit mode)
- OperatorView test updated to match refactored component structure
- Runtime migration from legacy `serve()` to `Deno.serve()` across all edge functions
- Auth module rewrite: fixed deprecated `hexEncode`, missing FK join for tenant plan lookup
- Schema alignment: fixed 10+ edge functions referencing non-existent columns
- CRUD builder: added `skipTenantFilter`, fixed Promise-wrapped `queryModifier`, added `.range()` fallback
- Plan limits: fixed column name mismatch (`current_month_parts` vs `current_parts_this_month`)
- Validators: fixed `IssueValidator` enum values to match database
- Parts/Operations: rewrote with inline validation (heavy import chain crashed Deno runtime)
- Upload whitelist: added STEP, DXF, Excel content types
- Per-function `deno.json` for proper `@shared/` resolution
- Database migrations: added lifecycle columns, missing FK constraints, `expired` enum value

## [0.3.3] - 2026-03-09

### Changed

- Updated app and docs dependencies
- Aligned package metadata to release 0.3.3
- Refreshed architecture and operations docs

### Fixed

- Cleared website dependency audit findings
- Resolved docs-site release packaging mismatch
- Removed contradictory API documentation

## [0.3.2] - 2026-03-09

### Added

- API reference expansion and payload reference pages
- E2E API validation tooling
- 3D viewer measurement implementation plan

### Changed

- Refactored route definitions and component composition
- Consolidated realtime hook patterns
- Tightened tenant scoping across scheduler, CAD, issues, and auth

### Fixed

- Security audit findings (auth, CORS, validation, XSS, edge functions)
- Signup notification trigger (duplicate emails)
- Type safety issues and unsafe query patterns

## [0.3.1] - 2026-01-28

### Added

- MCP server test suite (90 tests)
- Zod runtime validation for all tool inputs
- Tool factory pattern (createFetchTool, createUpdateTool, createStatusTransitionTool)
- Structured error handling with ErrorCode enum
- Pagination support with metadata

### Changed

- Migrated 9 tool modules to validation and factory patterns (544 lines removed)

### Fixed

- Enum inconsistencies between create/update schemas
- Race condition (TOCTOU) in state transitions
- Agent-batch validation (imported but never called)
- Missing 'cancelled' status in job filters
- Soft-delete awareness in fetch queries

### Infrastructure

- Added `import_map.json` for Edge Functions
- Fixed 502 errors from circular dependencies
- Automated self-hosting setup script
- Idempotent storage bucket creation and RLS policies
- Auth trigger for automatic profile/tenant creation on signup

## [0.3.0] - 2026-01-28

### Added

- Batch nesting and grouping
- Batch image support
- Batch time tracking with stapelscannen time distribution

## [0.2.0] - 2026-01-21

### Added

- Fuzzy search filtering across Jobs, Parts, Operations APIs
- Shared CRUD builder pattern for edge functions

### Changed

- 87 database migrations
- 15 edge functions refactored to shared CRUD builder

### Removed

- Advanced analytics dashboards (OEE, QRM, quality, reliability)
- Shipping and logistics module
- Integrations marketplace
- Python 3D backend service (replaced by client-side viewer)

### Fixed

- Missing `await` in validation for api-parts and api-operations
- Bulk-sync crash and partial success ghosting
- CORS issues with STEP file viewing
- Security vulnerabilities in react-router-dom

## [0.1.x] - 2025-2026

Initial development releases.
