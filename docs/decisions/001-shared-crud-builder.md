# ADR-001: Shared CRUD Builder Pattern

**Status:** Accepted
**Date:** 2025-01-27
**Context:** Edge Functions

## Decision

All standard REST API endpoints use a shared `crud-builder.ts` module that generates CRUD handlers from a configuration object (table name, fields, filters, validators).

## Context

With 22+ API endpoints, each doing similar pagination, filtering, searching, and soft-delete logic, duplicating this across every function created maintenance burden and inconsistency.

## Consequences

**Positive:**
- New endpoints require ~20 lines of config instead of ~200 lines of handler code
- Pagination, search, sort, soft-delete behavior is consistent across all endpoints
- ERP sync (upsert by `external_id`) is built-in via `enableSync: true`
- Custom handlers can override any HTTP method while reusing the rest

**Negative:**
- Non-standard endpoints (lifecycle transitions, file uploads) still need custom handlers
- The `queryModifier` escape hatch can mask complex logic inside what looks like simple config
- Debugging requires understanding the builder chain, not just the endpoint file

## Alternatives Considered

1. **Copy-paste per endpoint** — rejected, maintenance nightmare at 22+ endpoints
2. **Generic REST framework (e.g., PostgREST direct)** — rejected, need custom auth/rate-limiting/plan-limits layer
3. **Code generation** — rejected, config-driven is simpler and changes are immediate
