# Security Audit Report - Eryxon MES

**Date:** 2026-03-06
**Scope:** Full codebase security review (frontend, edge functions, MCP server)
**Methodology:** Manual code review covering OWASP Top 10

---

## Executive Summary

The Eryxon MES codebase demonstrates **good security awareness overall** with proper patterns for multi-tenancy (RLS + tenant_id filtering), API key hashing (SHA-256), rate limiting, SSRF protection on webhooks, filename sanitization, and input validation frameworks. However, several issues of varying severity were identified that should be addressed.

**Finding Summary:**
| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 4 |
| Medium | 6 |
| Low | 5 |
| Informational | 4 |

---

## Critical Findings

### C1: Webhook Dispatch Has No Authentication

**Severity:** CRITICAL
**OWASP:** A01:2021 - Broken Access Control
**Location:** `supabase/functions/webhook-dispatch/index.ts:79-93`

**Description:** The webhook-dispatch function accepts arbitrary `tenant_id`, `event_type`, and `data` from any caller with no authentication. The comment on line 91 acknowledges this: "In production, you might want to add an internal authentication mechanism." An attacker who discovers this endpoint can trigger webhooks for any tenant.

**Impact:** An attacker can:
- Trigger fake webhook events for any tenant
- Cause webhook endpoints to receive fabricated data
- Potentially trigger downstream business logic (e.g., ERP integrations) with false data

**Remediation:**
- Add authentication: either require a service-to-service secret token, or restrict the function to only be callable from database triggers/internal sources
- At minimum, verify the caller is authorized for the specified `tenant_id`

---

## High Findings

### H1: MQTT Publish Has No Authentication

**Severity:** HIGH
**OWASP:** A01:2021 - Broken Access Control
**Location:** `supabase/functions/mqtt-publish/index.ts:224-236`

**Description:** Similar to webhook-dispatch, the mqtt-publish function accepts `tenant_id` from the request body without verifying the caller is authorized. Any unauthenticated caller can publish MQTT messages on behalf of any tenant.

**Impact:** Fabricated MQTT messages to manufacturing systems, potentially affecting production equipment.

**Remediation:** Add authentication matching webhook-dispatch remediation.

---

### H2: Wildcard CORS on All Edge Functions

**Severity:** HIGH
**OWASP:** A05:2021 - Security Misconfiguration
**Location:** `supabase/functions/_shared/cors.ts:5-8`

**Description:** All edge functions use `Access-Control-Allow-Origin: '*'`. While the `_shared/security.ts` has a `getCorsHeaders()` that reads from `ALLOWED_ORIGIN` env var, the actual `cors.ts` used by all functions hardcodes `'*'`. This means any website can make authenticated requests to the API if the user has a valid session.

**Impact:** Enables cross-origin attacks. A malicious website could make API calls using a logged-in user's credentials.

**Remediation:**
- Set `Access-Control-Allow-Origin` to the specific application domain(s)
- Use the existing `getCorsHeaders()` from `security.ts` across all functions
- Configure `ALLOWED_ORIGIN` environment variable in production

---

### H3: Timing Attack on API Key Comparison

**Severity:** HIGH
**OWASP:** A02:2021 - Cryptographic Failures
**Location:** `supabase/functions/_shared/auth.ts:106`

**Description:** API key hash comparison uses `===` (line 106: `if (providedKeyHash === key.key_hash)`). While SHA-256 hashes are compared (which provides some protection), standard string comparison leaks timing information. The codebase has `constantTimeCompare()` in `security.ts` but does not use it here.

**Impact:** Theoretical timing side-channel that could allow hash recovery over many requests, though exploitation difficulty is high given SHA-256.

**Remediation:**
```typescript
// In auth.ts, replace:
if (providedKeyHash === key.key_hash) {
// With:
import { constantTimeCompare } from "./security.ts";
if (constantTimeCompare(providedKeyHash, key.key_hash)) {
```

---

### H4: Error Messages Leak Internal Details

**Severity:** HIGH
**OWASP:** A04:2021 - Insecure Design
**Locations:**
- `supabase/functions/api-key-generate/index.ts:204` - Exposes raw `error.message`
- `supabase/functions/mqtt-publish/index.ts:344` - Exposes raw `error.message`
- `supabase/functions/webhook-dispatch/index.ts:175` - Exposes raw `error.message`
- `supabase/functions/notify-new-signup/index.ts:200` - Exposes `err.message`
- `supabase/functions/send-invitation/index.ts:410` - Exposes `error.message`

**Description:** Several edge functions return raw `error.message` to the client in 500 responses. These can leak database schema details, internal paths, or configuration information. The codebase has `sanitizeError()` in `security.ts` but many functions don't use it.

**Impact:** Information disclosure that aids attackers in understanding system internals.

**Remediation:** Use `sanitizeError()` from `_shared/security.ts` consistently across all functions instead of exposing raw error messages.

---

## Medium Findings

### M1: Upload Endpoint Missing Content-Type Validation

**Severity:** MEDIUM
**OWASP:** A04:2021 - Insecure Design
**Location:** `supabase/functions/api-upload-url/index.ts`

**Description:** The upload URL endpoint accepts `content_type` from the request body but never validates it. The `security.ts` module has `validateContentType()` which restricts to safe types, but it's not called. This allows generating signed upload URLs for any content type including `text/html` or `application/javascript`.

**Impact:** Stored XSS through uploaded HTML/SVG files if the storage bucket serves files directly.

**Remediation:**
```typescript
import { validateContentType } from "@shared/security.ts";
const contentTypeCheck = validateContentType(content_type);
if (!contentTypeCheck.valid) {
  throw new BadRequestError(contentTypeCheck.error!);
}
```

---

### M2: SVG Allowed in Content Type Whitelist

**Severity:** MEDIUM
**OWASP:** A03:2021 - Injection
**Location:** `supabase/functions/_shared/security.ts:85`

**Description:** `image/svg+xml` is in the allowed content types list. SVG files can contain embedded JavaScript via `<script>` tags, `onload` handlers, and other event attributes. If SVGs are served from the same origin, this is a stored XSS vector.

**Impact:** Stored XSS if SVG files are served inline from the application domain.

**Remediation:** Either remove `image/svg+xml` from the whitelist, or ensure SVGs are served with `Content-Disposition: attachment` and `Content-Type: image/svg+xml` with a CSP that blocks script execution.

---

### M3: Email HTML Template Injection

**Severity:** MEDIUM
**OWASP:** A03:2021 - Injection
**Locations:**
- `supabase/functions/send-invitation/index.ts:231-317`
- `supabase/functions/notify-new-signup/index.ts:83-166`

**Description:** User-controlled values (`organizationName`, `inviterName`, `companyName`, `profile.full_name`, `profile.email`) are interpolated directly into HTML email templates using template literals without HTML encoding. If a user sets their company name to `<script>alert('xss')</script>` or uses HTML entities, these will be rendered in the email.

**Impact:** Email-based XSS/HTML injection. While most email clients strip scripts, HTML injection can alter email layout for phishing.

**Remediation:** HTML-encode all user-supplied values before interpolating into email templates:
```typescript
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

---

### M4: PATCH Requests Skip Validation

**Severity:** MEDIUM
**OWASP:** A04:2021 - Insecure Design
**Location:** `supabase/functions/_shared/crud-builder.ts:357-362`

**Description:** The `handlePatch` function explicitly skips validation (comment on line 357-360: "Skip full validation for PATCH requests"). While partial updates shouldn't enforce required fields, field-level validation (type checking, length limits, enum constraints) should still apply to provided values.

**Impact:** Malformed data can be written to the database via PATCH, bypassing all validation rules.

**Remediation:** Implement a "partial validation" mode that validates only the fields present in the request body, without enforcing required field constraints.

---

### M5: Bulk Sync Has No Item Count Limit in CRUD Builder

**Severity:** MEDIUM
**OWASP:** A04:2021 - Insecure Design
**Location:** `supabase/functions/_shared/crud-builder.ts:537-661`

**Description:** The `handleBulkSync` function processes all items in the request without a maximum count limit. While `erp-sync.ts` has `validateBulkSyncBody` with a 1000-item limit, the generic CRUD builder's bulk-sync endpoint does not enforce any limit.

**Impact:** Denial of service through extremely large bulk payloads that consume edge function compute time and database resources.

**Remediation:** Add an item count limit:
```typescript
if (items.length > 1000) {
  throw new BadRequestError('Maximum 1000 items per bulk-sync request');
}
```

---

### M6: MCP Server Direct Mode Has No Tenant Scoping

**Severity:** MEDIUM
**OWASP:** A01:2021 - Broken Access Control
**Location:** `mcp-server/src/clients/supabase-client.ts`

**Description:** In "direct" mode, the MCP server uses a service role key and performs queries without any tenant_id filtering. The `select`, `insert`, `update`, `delete` methods operate across all tenants. While this is intended for single-tenant self-hosted deployments, if misconfigured in a multi-tenant environment, it exposes all tenant data.

**Impact:** Cross-tenant data access if direct mode is used in a multi-tenant deployment.

**Remediation:** Add documentation warnings and optionally a `TENANT_ID` env var that gets enforced in direct mode.

---

## Low Findings

### L1: `constantTimeCompare` Leaks Length Information

**Severity:** LOW
**OWASP:** A02:2021 - Cryptographic Failures
**Location:** `supabase/functions/_shared/security.ts:256-258`

**Description:** The `constantTimeCompare` function returns `false` immediately when lengths differ (line 257-258), leaking whether the strings are the same length. For SHA-256 hashes this is not exploitable (they're always 64 chars), but the function could be used elsewhere unsafely.

**Remediation:** Pad the shorter string or always iterate over the longer string's length.

---

### L2: SSRF Protection Incomplete for IPv6

**Severity:** LOW
**OWASP:** A10:2021 - Server-Side Request Forgery
**Location:** `supabase/functions/_shared/security.ts:102-157`

**Description:** The webhook URL validation blocks IPv4 private ranges but doesn't cover IPv6 private ranges (`fc00::/7`, `fe80::/10`), IPv4-mapped IPv6 addresses (`::ffff:127.0.0.1`), or DNS rebinding attacks. The `169.254.x.x` link-local range is only checked for `169.254.169.254`.

**Remediation:**
- Block `fc00::/7` and `fe80::/10` IPv6 ranges
- Block `::ffff:` prefixed addresses
- Block `0.0.0.0`
- Consider DNS resolution validation to prevent rebinding attacks

---

### L3: API Key Entropy Could Be Higher

**Severity:** LOW
**OWASP:** A02:2021 - Cryptographic Failures
**Location:** `supabase/functions/api-key-generate/index.ts:157-161`

**Description:** API keys are generated using `crypto.getRandomValues` (good) but then converted via `.toString(36)` and truncated to 32 chars. The `toString(36)` conversion loses entropy compared to hex encoding. Effective entropy is approximately 124 bits vs 128+ bits with hex.

**Impact:** Minimal practical impact - the key space is still very large.

**Remediation:** Use hex encoding for the random portion to preserve full entropy from `crypto.getRandomValues`.

---

### L4: No Request Body Size Limits

**Severity:** LOW
**OWASP:** A04:2021 - Insecure Design
**Locations:** All edge functions that parse `req.json()`

**Description:** Edge functions call `req.json()` without checking `Content-Length` first. While Supabase Edge Functions have their own limits, explicitly validating body size provides defense in depth.

**Remediation:** Add body size checks before parsing JSON.

---

### L5: Operator Session in localStorage

**Severity:** LOW
**OWASP:** A07:2021 - Identification and Authentication Failures
**Location:** `src/contexts/OperatorContext.tsx:123`

**Description:** The active operator's session data is stored in `localStorage`. This data persists across browser tabs and survives page refreshes, meaning an operator who walks away from a shared terminal could have their session used by someone else.

**Impact:** In a manufacturing environment with shared terminals, this could allow unauthorized actions under another operator's identity.

**Remediation:** Consider using `sessionStorage` instead, or add an automatic session timeout for operator terminals.

---

## Informational Findings

### I1: `dangerouslySetInnerHTML` Usage (Safe)

**Location:** `src/components/ui/chart.tsx:70`

**Description:** Found one instance of `dangerouslySetInnerHTML` in the chart component, but it's used for CSS theme variable injection with hardcoded values, not user input. This is safe.

**Status:** No action required.

---

### I2: `window.__ENV__` Pattern for Runtime Config

**Location:** `src/integrations/supabase/client.ts:5-6`

**Description:** The Supabase client reads from `window.__ENV__` for runtime configuration. This is a valid pattern for Docker deployments but the `__ENV__` object should only be set by the hosting server, never by client-side code.

**Status:** Ensure `__ENV__` injection is done server-side only.

---

### I3: Good Security Patterns Already Present

The codebase demonstrates several strong security patterns:
- **API key hashing with SHA-256** (`_shared/auth.ts`)
- **Rate limiting with plan-based tiers** (`_shared/rate-limiter.ts`)
- **SSRF protection on webhook URLs** (`_shared/security.ts`)
- **Filename sanitization for uploads** (`_shared/security.ts`, `api-upload-url/index.ts`)
- **Path traversal prevention** (blocks `..`, `/`, `\` in filenames)
- **Dangerous file extension blocking** (`.exe`, `.sh`, `.php`, etc.)
- **Input length/range validation** (`_shared/security.ts`)
- **Pagination limits** (capped at 1000 with `capPaginationLimit`)
- **Soft delete protection** (queries filter `deleted_at IS NULL`)
- **Tenant_id enforcement in CRUD operations** (`_shared/crud-builder.ts`)
- **Cross-tenant invitation prevention** (`send-invitation/index.ts:140-157`)
- **Security headers** (X-Content-Type-Options, X-Frame-Options, HSTS in `getCorsHeaders`)
- **HMAC webhook signatures** (`webhook-dispatch/index.ts:26`)
- **Webhook delivery timeouts** (10 second abort signal)
- **API key exclusion from data export** (`api-export/index.ts:80-81`)
- **Error sanitization utility** (`_shared/security.ts:sanitizeError`)
- **.gitignore covers secrets** (`.env`, `*.pem`, `*.key`, `secrets/`)

---

### I4: SQL Injection Risk Assessment

**Status:** LOW RISK

The codebase uses the Supabase JavaScript client exclusively, which uses parameterized queries through PostgREST. No raw SQL string concatenation was found. All `.rpc()` calls use named parameters. The `.ilike()` and `.or()` filters in `crud-builder.ts` (lines 238, 250-251) interpolate user search input into PostgREST filter syntax, but PostgREST handles escaping.

---

## Remediation Priority

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | C1: Webhook dispatch authentication | Medium |
| 2 | H1: MQTT publish authentication | Medium |
| 3 | H2: Wildcard CORS | Low |
| 4 | H4: Error message leakage | Low |
| 5 | H3: Timing-safe comparison | Low |
| 6 | M1: Upload content-type validation | Low |
| 7 | M3: Email HTML injection | Low |
| 8 | M4: PATCH validation | Medium |
| 9 | M2: SVG content type | Low |
| 10 | M5: Bulk sync limits | Low |
| 11 | M6: MCP direct mode scoping | Low |
| 12 | L1-L5: Low findings | Low |

---

*Report generated by automated security audit. Findings should be validated by the development team. This audit covers code-level review only; infrastructure configuration, Supabase RLS policies, and database-level security are outside scope.*
