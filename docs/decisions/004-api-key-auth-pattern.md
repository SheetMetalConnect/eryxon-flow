# ADR-004: API Key Authentication with Prefix Lookup

**Status:** Accepted
**Date:** 2025-02-20
**Context:** API Security

## Decision

API keys use a `ery_live_` / `ery_test_` prefix format. Authentication uses a 12-character prefix lookup to find candidate keys, then SHA-256 hash comparison (constant-time) to verify.

## Context

ERP integrations need API key auth (not OAuth/JWT). Keys must be fast to verify, secure to store, and support per-tenant rate limiting based on subscription plan.

## Consequences

**Positive:**
- O(1) lookup via prefix index — no full-table scan of hashed keys
- Keys are never stored in plaintext — only SHA-256 hash + prefix
- Constant-time comparison prevents timing attacks
- `last_used_at` updated asynchronously (non-blocking)
- Rate limiting is plan-aware (free/pro/premium/enterprise)

**Negative:**
- Key rotation requires generating new key (no in-place rotation)
- Prefix collision is theoretically possible (12 chars = 36^12 space, negligible risk)

## Alternatives Considered

1. **JWT tokens** — rejected, ERP systems prefer static API keys
2. **OAuth2 client credentials** — rejected, too complex for the integration use case
3. **Full-table hash scan** — rejected, doesn't scale with many tenants
