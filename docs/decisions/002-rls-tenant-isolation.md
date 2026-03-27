# ADR-002: Row-Level Security for Multi-Tenant Isolation

**Status:** Accepted
**Date:** 2025-01-21
**Context:** Database, Security

## Decision

Every table has a `tenant_id` column with RLS policies enforcing tenant isolation. API requests call `set_active_tenant(tenant_id)` RPC to set the session context before any query.

## Context

Eryxon Flow is a multi-tenant SaaS. Tenant data must be completely isolated — a bug in application code should never leak data across tenants.

## Consequences

**Positive:**
- Defense in depth: even if application code forgets a `WHERE tenant_id = ...`, RLS blocks cross-tenant access
- Works for both frontend (Supabase Auth JWT) and API (Edge Function service role + `set_active_tenant`)
- No separate database per tenant — simpler ops, single migration path

**Negative:**
- Every new table needs RLS policies (migration checklist item)
- Service-role queries (Edge Functions) must always call `set_active_tenant` first
- Cross-tenant admin queries require disabling RLS explicitly (rare, admin-only)

## Alternatives Considered

1. **Database-per-tenant** — rejected, migration and connection management overhead
2. **Application-level filtering only** — rejected, one missed WHERE clause = data leak
3. **Schema-per-tenant** — rejected, doesn't scale with 100+ tenants
