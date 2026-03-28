# Changelog

All notable changes to Eryxon Flow are documented here.

## [Unreleased]

### Fixed

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

### Added

- Automated API test suite (54 tests)
- Architecture documentation with Mermaid graphs
- API catalog, route map, hook map, conventions, glossary, troubleshooting docs
- ADRs (5 Architecture Decision Records)
- Dependency graph via madge
- MCP server support (CodeGraphContext, RepoMapper, Repomix)
- Agent discovery via `.agents/` directory convention

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
