---
title: "Changelog"
description: "Full release history for Eryxon Flow."
---

All notable changes to Eryxon Flow are documented on this page.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

Changes merged after `0.3.3` should be added here until the next tagged release.

### Fixed — Edge Functions (critical, 2026-03-27)

Complete overhaul of the Supabase Edge Function runtime layer after comprehensive API deep dive testing revealed all 15+ API endpoints were returning 502 errors.

- **Runtime migration**: Replaced legacy `serve()` from `deno.land/std@0.168.0` with `Deno.serve()` across all functions — the old pattern is broken on the current Supabase Edge Runtime
- **Auth module rewrite**: Replaced deprecated `hexEncode`, fixed missing FK join for tenant plan lookup, fixed `supabase.rpc().catch()` incompatibility with supabase-js v2
- **Schema alignment**: Fixed 10+ edge functions referencing non-existent columns (`priority`, `updated_at`, `event_type`, `name`, etc.) — all `selectFields` now match actual database schema
- **CRUD builder fixes**: Added `skipTenantFilter` for tables without `tenant_id`, fixed Promise-wrapped `queryModifier`, added `.range()` fallback for pagination
- **Plan limits**: Fixed column name mismatch (`current_month_parts` vs actual `current_parts_this_month`)
- **Validators**: Fixed `IssueValidator` enum values to match database (`pending/approved/rejected/closed`)
- **Parts/Operations**: Rewrote with inline validation — the heavy `fkValidator`/`PartValidator` import chain crashed the Deno runtime silently
- **Upload whitelist**: Added STEP, DXF, Excel content types to `security.ts`
- **Per-function `deno.json`**: Added import map to every function directory for proper `@shared/` resolution
- **Database migrations**: Added lifecycle columns (`started_at`, `paused_at`, `completed_at`, `resumed_at`, `actual_duration`) to `jobs` and `operations`, added missing FK constraints (`substeps→operations`, `api_keys→tenants`), added `expired` enum value to `subscription_status`

### Added — AI-Native Repo Indexing (2026-03-27)

Complete overhaul of repository documentation and tooling for AI agent effectiveness.

- **Architecture documentation**: `docs/ARCHITECTURE.md` with 6 Mermaid dependency graphs (system, frontend, backend, data flow, multi-tenant, domain model)
- **API catalog**: `docs/API_CATALOG.md` — all 22 endpoints with CRUD configs, methods, filters
- **Route map**: `docs/ROUTE_MAP.md` — all 41 routes with guards and lazy-loading
- **Hook map**: `docs/HOOK_MAP.md` — hook→table→queryKey dependency map + real-time subscriptions
- **Code conventions**: `docs/CONVENTIONS.md` — naming, templates for new files
- **Domain glossary**: `docs/GLOSSARY.md` — MES vocabulary for AI agents
- **Troubleshooting**: `docs/TROUBLESHOOTING.md` — common agent pitfalls
- **ADRs**: 5 Architecture Decision Records in `docs/decisions/` + template
- **Dependency graph**: `docs/dependency-graph.json` via madge (`npm run deps:graph`)
- **MCP servers**: CodeGraphContext (graph DB), RepoMapper (structural maps), Repomix (context packing) — `docs/AI_AGENT_SETUP.md`
- **Agent discovery**: `AGENTS.md` symlink, `.cursorrules`, `.github/copilot-instructions.md`
- **Repo tooling**: `Makefile`, `.editorconfig`, `.github/CODEOWNERS`, issue/PR templates

### Added

- **Automated API test suite** (`scripts/test-api-automated.sh`): 54 tests covering auth (4), GET endpoints (15), search/filter (3), POST create (13), PATCH update (4), DELETE (2), job lifecycle (4), operation lifecycle (4), ERP sync (1), file upload (1), validation (3)
- **Flow column**: Fixed `useMultipleJobsRouting` — PostgREST `.in()` on joined tables silently fails; rewrote with two-step query (parts → operations)
- **File enrichment**: All 20 parts in the demo tenant now have PDF + STEP files uploaded to `parts-cad` storage bucket with correct path format
- **Agent instructions**: Consolidated into `.agents/README.md` as single source of truth for all AI coding tools (Claude, Codex, Gemini, Cursor, Copilot)
- **README redesign**: Added badges, architecture diagram, API examples, and AI agent support table

### Changed

- Removed `CLAUDE.md`, `GEMINI.md`, `CODEX.md` from repository — agent instructions now live exclusively in `.agents/`
- Cleaned up 12 stale local branches
- Expired 28 non-paying trial tenants in production database

### Fixed (other)

- Made consolidated post-schema migration (`20260127230000`) fully idempotent so it can be re-run safely against existing databases
- React error #185: Added defensive type guards at DB→React boundary for Supabase `SELECT *` columns leaking JSON objects into JSX
- CSP: Added `fonts.googleapis.com` to `style-src`, switched PDF worker from `unpkg.com` to `cdn.jsdelivr.net`

## [0.3.3] - 2026-03-09

### Focus: Release Packaging, Dependency Maintenance, and Documentation Alignment

This patch release finalizes the integrated branch for production by aligning dependency versions, consolidating the final documentation sweep, and packaging the repository under one release number.

**Release classification:** `PATCH`

### Changed

- Updated non-breaking app dependencies across the React, Supabase, testing, linting, and docs tooling stacks
- Updated the documentation site dependencies for Astro, Starlight, Tailwind, and related build tooling
- Aligned repository, app, and docs package metadata to release `0.3.3`
- Refreshed the architecture and operations docs so security, API auth, release guidance, and the 3D viewer runtime model match the current codebase

### Fixed

- Cleared website dependency audit findings that were addressable without forced major-version changes
- Resolved the docs-site release packaging mismatch that had left Cloudflare deployments on an older docs state
- Removed contradictory documentation around API key hashing, API authentication headers, and viewer capabilities

### Documentation

- Added a dedicated security architecture reference
- Updated release notes, self-hosting guidance, quick start notes, and landing-page copy to reflect the current release
- Consolidated the repository cleanup, docs migration, and final architecture refresh into the tagged release history

### Changed

- Aligned package metadata with the product name by renaming the npm package to `eryxon-flow`
- Standardized self-hosting documentation references across the repo and in-app upgrade CTAs around the website docs structure
- Clarified the root README so public docs, developer docs, and architecture references point to their current source-of-truth locations
- Moved operational markdown into the website documentation tree so the main repository keeps only the top-level README
- Refreshed architecture documentation for security boundaries, API authentication, and the current 3D viewer runtime model

### Fixed

- Removed broken links to deleted root documentation files
- Removed tracked root artifacts (`test_output.txt`, `temp_rules.json`, and committed `*.tsbuildinfo` caches)

## Versioning Policy

- `MAJOR` for breaking API contracts, incompatible database or deployment changes, or architectural resets.
- `MINOR` for backward-compatible features, new modules, significant UI/workflow additions, and integration expansions.
- `PATCH` for backward-compatible fixes, security hardening, documentation-only updates, and release stabilization.
- Pre-release tags should use `-beta.N` or `-rc.N` when a branch is being validated before a stable tag.

## [0.3.2] - 2026-03-09

### Focus: Security Hardening, API Coverage, and Integrated Viewer Planning

This release combines the parallel work from PRs `#434` through `#438` into a single testable integration branch. It prioritizes the strongest overlapping implementations across security, route structure, API documentation, E2E testing, and 3D viewer planning.

**Release classification:** `MINOR`

### ⚠️ Migration Required for Existing Environments

**Apply database changes before validating signup flows or admin notifications:**

```bash
# Link to the target Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Apply schema changes
supabase db push

# Deploy updated edge functions
supabase functions deploy

# Verify the new migration is present
supabase migration list
```

**New migration in this release:**

1. **20260202200000_fix_signup_notification_trigger.sql** ⚠️ **IMPORTANT**
   - Removes the tenant-level signup notification trigger that caused duplicate emails
   - Removes any hardcoded profile-level webhook implementation
   - Prevents duplicate signup emails
   - Requires explicit environment-level webhook configuration for `notify-new-signup`

### Added

- API reference expansion in the website API reference and payload reference pages
- End-to-end API validation tooling:
  - `scripts/api-test-utils.ts`
  - `scripts/test-api-e2e.sh`
  - `tsconfig.scripts.json`
- Implementation plan and measurement UI scaffolding for interactive STEP viewer measurements
- Integrated rollout guidance into the website deployment and release documentation

### Changed

- Refactored route definitions and component composition around the `#436` architecture
- Consolidated realtime hook patterns across issue-related hooks
- Tightened tenant scoping in scheduler, CAD processing, issue queries, and auth-adjacent data access
- Strengthened invitation acceptance and password validation flows
- Standardized logger-driven error handling in places that previously mixed logging styles

### Fixed

- Security audit findings covering authentication, CORS, validation, XSS prevention, and edge-function hardening
- Type safety issues and unsafe query patterns surfaced in parallel code review
- Signup notification trigger behavior that previously produced duplicate emails
- Merge regressions in hook tests and realtime cleanup behavior

### Documentation

- Added a deployment-ready combined changelog and verification guide for PRs `#434`-`#438`
- Added 3D viewer measurement implementation planning
- Expanded API payload and E2E testing documentation for backend validation

## [0.3.1] - 2026-01-28

### Focus: MCP Server Modernization & Code Quality

This release modernizes the MCP (Model Context Protocol) server with production-grade patterns, comprehensive testing, and critical bug fixes discovered during code review.

### ⚠️ Migration Required for Production Databases

**If you're upgrading an existing production database, you MUST apply these migrations:**

```bash
# Link to your production Supabase project
supabase link --project-ref YOUR_PRODUCTION_PROJECT_ID

# Apply all new migrations (idempotent - safe to run multiple times)
supabase db push

# Deploy Edge Functions (fixes 502 errors and improves performance)
supabase functions deploy

# Verify migrations applied successfully
supabase migration list
```

**New migrations in this release:**

1. **20260127232000_add_missing_auth_trigger.sql** ⚠️ **CRITICAL**
   - Creates auth trigger for automatic user profile and tenant creation on signup
   - **Without this, new user signups will fail** (users won't get profiles/tenants)

2. **20260127230000_apply_seed.sql** ⚠️ **IMPORTANT**
   - Creates storage buckets (parts-images, issues, parts-cad, batch-images)
   - Sets up RLS policies for file uploads
   - Schedules pg_cron jobs (monthly resets, attendance cleanup, invitation expiry, MQTT logs)

3. **20260127235000_enhance_batch_management.sql**
   - Adds 'blocked' status to batch_status enum
   - Adds parent_batch_id for nested batches
   - Adds nesting_image_url and layout_image_url columns

4. **20260128000000_create_batch_requirements.sql**
   - Creates batch_requirements table for material tracking within batches
   - Sets up RLS policies for multi-tenant isolation

**All migrations are idempotent.** If your production database already has storage buckets or other resources, they will be safely skipped (ON CONFLICT DO NOTHING).

**Edge Functions:** Deploy is required to get 502 error fixes and performance improvements from the import_map.json refactoring.

### Added

- **Comprehensive test suite** for MCP server utilities (90 tests, 100% passing)
  - `validation.test.ts` (17 tests) - Zod schema validation
  - `errors.test.ts` (15 tests) - Structured error types
  - `response.test.ts` (13 tests) - Pagination and responses
- **Zod runtime validation** for all tool inputs with TypeScript inference
- **Tool factory pattern** to eliminate code duplication
  - `createFetchTool` - Standardized pagination and filtering
  - `createUpdateTool` - CRUD update operations
  - `createStatusTransitionTool` - State machine transitions
- **Structured error handling** with ErrorCode enum and context
- **Pagination support** with metadata (offset, limit, total, has_more)

### Changed

- **Migrated 9 tool modules** to modern validation and factory patterns:
  - `jobs.ts` (7 tools) - 68% line reduction (318→211 lines)
  - `parts.ts` (2 tools) - 68% reduction (126→40 lines)
  - `tasks.ts` (2 tools) - 68% reduction (121→38 lines)
  - `operations.ts` (5 tools) - 68% reduction (251→80 lines)
  - `substeps.ts` (5 tools) - 23% reduction (246→189 lines)
  - `issues.ts` (8 tools) - 30% reduction (639→448 lines)
  - `scrap.ts` (7 tools) - Modernized with validation
  - `dashboard.ts` (3 tools) - Modernized with validation
  - `agent-batch.ts` (16 tools) - Added validation to all handlers
- **Total impact**: 544 lines removed through DRY principles
- **TypeScript strict mode** compliance with ESM imports (.js extensions)

### Fixed

**Critical CodeRabbit Issues:**
- **Enum inconsistencies**: Priority enum mismatch between create/update schemas ('normal' vs 'medium')
- **Status enum divergence**: Replaced hardcoded enums with centralized schemas
- **Tool naming collisions**: Added explicit `toolName` to StatusTransitionConfig
- **Race condition (TOCTOU)**: State transitions now atomic with conditional updates
- **RPC missing function name**: API client now sends function identifier in POST body
- **Agent-batch validation**: Added `validateArgs` calls to all 16 handlers (was imported but never used!)
- **Handler map mismatches**: Aligned tool names with handler map keys

**Additional Fixes:**
- Missing 'cancelled' status support in job filters
- Soft-delete awareness in fetch queries (deleted_at IS NULL)
- Proper error handling for state transition lookups

### Removed

- OpenAI integration references (bloatware removal)
- Temporary documentation files (MIGRATION_SUMMARY.md, etc.)
- Unused ERP sync code from MCP server

### Technical Improvements

- **Code reuse**: ~60% duplication eliminated via factories
- **Type safety**: Full Zod validation with automatic TypeScript inference
- **Error context**: Structured errors with operation details
- **Maintainability**: Centralized validation schemas
- **Production-ready**: Clean TypeScript compilation, all tests passing

### Infrastructure & Deployment

**Edge Functions Modernization:**
- Added `import_map.json` for `@shared/*` path aliases across all Edge Functions
- Refactored all 27 Edge Functions to use consolidated imports
- Fixed 502 errors caused by deep module resolution and circular dependencies
- Improved cold start performance through better module organization
- Functions now use standardized handler patterns from `@shared/handler.ts`

**Self-Hosting Improvements:**
- Added automated setup script (`automate_self_hosting.sh`) for one-command deployment
- Created migration `20260127230000_apply_seed.sql` for storage buckets and cron jobs
- Created migration `20260127232000_add_missing_auth_trigger.sql` for new user signup
- Fixed hardcoded Supabase URLs in event-dispatch.ts, mqtt-publishers.ts, webhooks.ts, ApiKeys.tsx
- Fixed template literal syntax (backticks vs quotes) for dynamic URL construction
- Added global Supabase CLI installation to automation script
- Comprehensive troubleshooting documentation for Edge Functions timeouts and 502 errors

**Database & Storage:**
- Idempotent storage bucket creation with ON CONFLICT handling
- Storage RLS policies for parts-images, issues, parts-cad, batch-images
- pg_cron job scheduling for monthly resets, attendance, invitations, MQTT logs
- Auth trigger ensures all new users get profiles and tenants

### Documentation

- **Self-Hosting Guide** - Completely rewritten with Quick Start, Docker, Cloudflare Pages
  - Added Edge Functions troubleshooting (502 errors, timeouts, import map)
  - Documented critical configuration points (environment variables, migrations, storage)
  - Added security checklist and performance tips
  - Consolidated three scattered docs into single comprehensive guide
- **MCP Setup Guide** - New 515-line guide covering local and cloud deployment
  - Railway, Fly.io, and Docker deployment instructions
  - Claude Desktop configuration examples
  - All 55 tools documented across 9 modules
- **Navigation & Cross-linking** - Enhanced documentation discoverability
  - Created "API & Integration" navigation section
  - Added wikilinks throughout introduction, connectivity, quick-start guides
  - Reorganized sidebar for better integration guide discovery
- **MCP README** - Cleaned up (removed marketing bloat)
- **MCP Demo Guide** - Updated with current tool counts and setup callouts
- **API Documentation** - Added both Bearer token and X-API-Key authentication methods
- Removed temporary refactoring documentation during repository guideline cleanup

---

## [0.3.0] - 2026-01-28

### Focus: Enhanced Batch Management

Major improvements to batch operations, time tracking, and production workflow efficiency.

### Added

- **Batch nesting and grouping** - Organize batches hierarchically
- **Image support** for batch documentation
- **Enhanced editing capabilities** for batch operations
- **Batch time tracking** with stapelscannen time distribution
- **Improved batch management UI** with better workflows

### Changed

- Enhanced batch operation workflows in MCP server
- Improved batch data models and relationships
- Better tenant scoping for batch operations

### Fixed

- Batch time tracking review feedback addressed
- Critical code review issues in batch management
- Tenant scoping consistency

---

## [0.2.0] - 2026-01-21

### Focus: Core Production Tracking & Scalability

This release represents a major refactoring focused on solidifying the core platform. We've temporarily removed advanced features to concentrate on what matters most: reliable, real-time production tracking.

### Added
- **Fuzzy search filtering** across Jobs, Parts, and Operations API endpoints
- **Shared CRUD builder pattern** for edge functions
- **Enhanced API documentation** with improved examples
- **Security improvements** with dependency upgrades (fixed HIGH severity vulnerabilities)
- **Modular TypeScript architecture** for better maintainability

### Changed
- **Database migrations**: Now at 87 total migrations
- **Edge Functions**: Refactored 15 functions using shared CRUD builder pattern
- **API responses**: Improved error handling and validation across all endpoints
- **Type system**: Modular Supabase types architecture for better code organization

### Removed (Temporarily)

These features have been removed to focus development effort on core capabilities. They may return in future releases.

- ❌ **Advanced Analytics Dashboards**
  - OEE Analytics (`/admin/analytics/oee`)
  - QRM Dashboard (`/admin/analytics/qrm`)
  - Quality Analytics (`/admin/analytics/quality`)
  - Reliability Analytics (`/admin/analytics/reliability`)
  - Jobs Analytics (`/admin/analytics/jobs`)
  - _Reason_: Basic production stats remain on main dashboard; advanced metrics added complexity without proven ROI

- ❌ **Shipping & Logistics Module**
  - Shipments management (`/admin/shipments`)
  - Postal code grouping
  - Delivery tracking
  - Shipment lifecycle (draft → planned → loading → in transit → delivered)
  - _Reason_: Focus is on production tracking, not post-production logistics

- ❌ **Integrations Marketplace**
  - Integration browsing and installation UI (`/admin/integrations`)
  - Integration catalog and reviews
  - _Reason_: Direct API/webhook integration provides more flexibility; marketplace added unnecessary abstraction

- ❌ **3D Backend Service** (`services/eryxon3d/`)
  - Python STEP file parser service
  - PMI extraction backend
  - Server-side STEP processing
  - _Reason_: Replaced with client-side 3D viewer (occt-import-js + Three.js) - no backend needed

### Fixed
- **CRITICAL**: Missing `await` in validation for `api-parts` and `api-operations`
- **CRITICAL**: Bulk-sync crash and partial success ghosting in CRUD builder
- **CRITICAL**: PATCH validation and response format issues
- Security vulnerabilities in `react-router-dom` (HIGH severity)
- Mixed package manager issues (removed `bun.lockb`, standardized on npm)
- CORS issues with STEP file viewing (now uses blob URLs)

### Technical Improvements
- **Shared CRUD builder**: Eliminated redundant code across edge functions
- **Test coverage**: Added `.env.test.local` for Vitest stability
- **Migration to serveApi pattern**: `api-erp-sync` and `send-invitation`
- **Validation improvements**: Consistent error handling across all CRUD operations

### Developer Experience
- Updated ESLint configuration for better code quality
- Improved TypeScript types with modular architecture
- Better hook patterns and memory leak prevention
- Enhanced the engineering coding patterns documentation

---

## [0.1.x] - 2025-2026

Initial development releases with full feature set including analytics, shipping, and integrations marketplace.

---

## Upcoming

Features under consideration for future releases:

- **Analytics Dashboard v2**: Streamlined, performance-focused metrics
- **Capacity Planning**: QRM-based visual planning tools
- **Mobile App**: Native iOS/Android operator terminals
- **API v2**: GraphQL endpoint for advanced integrations
- **Reporting Engine**: Configurable report builder

---

## Notes

### Why Remove Features?

We believe in **doing fewer things better**. The removed features added maintenance burden and complexity without being core to production tracking. By focusing on the essentials, we can:

1. **Improve reliability** - Fewer moving parts means fewer bugs
2. **Increase performance** - Leaner codebase, faster responses
3. **Better developer experience** - Easier to understand and contribute
4. **Faster iteration** - Ship improvements to core features more quickly

### Migration Guide

If you were using removed features:

- **Analytics**: Use the API/MCP server to export data to your BI tool (PowerBI, Tableau, etc.)
- **Shipping**: Track delivery status via custom fields in Jobs table or use external logistics software
- **Integrations Marketplace**: Build integrations directly using REST API and webhooks (see `/api-docs`)

### Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/SheetMetalConnect/eryxon-flow/issues)
- **Documentation**: See `/docs` folder or website documentation
- **Commercial Support**: office@sheetmetalconnect.com
