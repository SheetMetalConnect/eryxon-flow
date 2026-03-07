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
| Medium | 8 |
| Low | 6 |
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

### M6: No Content Security Policy (CSP) Header

**Severity:** MEDIUM
**OWASP:** A05:2021 - Security Misconfiguration
**Location:** `index.html`, Vite configuration

**Description:** The application has no Content Security Policy header or meta tag configured. CSP is a critical defense-in-depth mechanism that limits the impact of XSS vulnerabilities by restricting what scripts can execute, where resources can be loaded from, and what inline code is allowed.

**Impact:** If any XSS vulnerability is discovered (e.g., through SVG uploads or future code changes), there is no CSP to limit the attacker's capabilities.

**Remediation:** Add a CSP header via the hosting platform or a `<meta>` tag in `index.html`:
```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co;">
```

---

### M7: MQTT Broker Password Stored in Plaintext

**Severity:** MEDIUM
**OWASP:** A02:2021 - Cryptographic Failures
**Location:** `src/pages/admin/config/MqttPublishers.tsx:81,202`

**Description:** MQTT broker passwords are stored as plaintext in React component state and written directly to the database without server-side encryption. The password field in the MQTT publishers form has no masking/visibility toggle. Additionally, `supabase/functions/mqtt-publish/index.ts:250` selects the password in plaintext from the database for use in broker authentication.

**Impact:** MQTT broker credentials are exposed in the database, in transit via Supabase queries, and in browser DevTools memory inspection.

**Remediation:**
- Encrypt MQTT passwords at rest using a server-side encryption key
- Use a Supabase vault or encrypted column for password storage
- Add a password visibility toggle on the input field
- Never return the password in API responses; only use it server-side in edge functions

---

### M8: MCP Server Direct Mode Has No Tenant Scoping

**Severity:** MEDIUM
**OWASP:** A01:2021 - Broken Access Control
**Location:** `mcp-server/src/clients/supabase-client.ts`

**Description:** In "direct" mode, the MCP server uses a service role key and performs queries without any tenant_id filtering. The `select`, `insert`, `update`, `delete` methods operate across all tenants. While this is intended for single-tenant self-hosted deployments, if misconfigured in a multi-tenant environment, it exposes all tenant data.

**Impact:** Cross-tenant data access if direct mode is used in a multi-tenant deployment.

**Remediation:** Add documentation warnings and optionally a `TENANT_ID` env var that gets enforced in direct mode.

---

## Low Findings

### L1: Frontend Queries Missing Explicit tenant_id Filtering (Defense-in-Depth)

**Severity:** LOW (mitigated by RLS)
**OWASP:** A01:2021 - Broken Access Control
**Locations:**
- `src/pages/admin/Jobs.tsx:91-96` - Jobs query has no `.eq("tenant_id", ...)`
- `src/components/scheduler/AutoScheduleButton.tsx:67-84` - Jobs, operations, cells, and factory_calendar queries all lack tenant_id
- `src/pages/admin/config/ScrapReasons.tsx:65` - Scrap reasons query lacks tenant_id
- `src/components/admin/JobDetailModal.tsx:48-61` - Job lookup by ID only, no tenant_id
- `src/components/admin/DueDateOverrideModal.tsx:36-40` - Same pattern
- `src/lib/database.ts:317-337` - Helper functions query operations/jobs without tenant_id
- `src/hooks/usePartImages.ts:20-24` - Parts lookup by ID only
- `src/hooks/useCADProcessing.ts:428-432` - Parts query lacks tenant_id

**Description:** Multiple frontend Supabase queries rely solely on Supabase Row-Level Security (RLS) for tenant isolation without adding explicit `.eq("tenant_id", tenantId)` filters. While RLS policies should prevent cross-tenant data access at the database level, defense-in-depth principles recommend frontend filtering as a secondary safeguard.

**Note:** Other queries in the codebase (e.g., `Materials.tsx`, `Users.tsx`, `searchService.ts`, `FactoryCalendar.tsx`) correctly include tenant_id filtering - the pattern is inconsistent.

**Impact:** If RLS policies are ever misconfigured or temporarily disabled for maintenance, these queries would expose cross-tenant data. Practically LOW risk since RLS is properly configured.

**Remediation:** Add `.eq("tenant_id", profile.tenant_id)` to all queries listed above for consistent defense-in-depth. Prioritize `Jobs.tsx` and `AutoScheduleButton.tsx` as they fetch the most data.

---

### L2: `constantTimeCompare` Leaks Length Information

**Severity:** LOW
**OWASP:** A02:2021 - Cryptographic Failures
**Location:** `supabase/functions/_shared/security.ts:256-258`

**Description:** The `constantTimeCompare` function returns `false` immediately when lengths differ (line 257-258), leaking whether the strings are the same length. For SHA-256 hashes this is not exploitable (they're always 64 chars), but the function could be used elsewhere unsafely.

**Remediation:** Pad the shorter string or always iterate over the longer string's length.

---

### L3: SSRF Protection Incomplete for IPv6

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

### L4: API Key Entropy Could Be Higher

**Severity:** LOW
**OWASP:** A02:2021 - Cryptographic Failures
**Location:** `supabase/functions/api-key-generate/index.ts:157-161`

**Description:** API keys are generated using `crypto.getRandomValues` (good) but then converted via `.toString(36)` and truncated to 32 chars. The `toString(36)` conversion loses entropy compared to hex encoding. Effective entropy is approximately 124 bits vs 128+ bits with hex.

**Impact:** Minimal practical impact - the key space is still very large.

**Remediation:** Use hex encoding for the random portion to preserve full entropy from `crypto.getRandomValues`.

---

### L5: No Request Body Size Limits

**Severity:** LOW
**OWASP:** A04:2021 - Insecure Design
**Locations:** All edge functions that parse `req.json()`

**Description:** Edge functions call `req.json()` without checking `Content-Length` first. While Supabase Edge Functions have their own limits, explicitly validating body size provides defense in depth.

**Remediation:** Add body size checks before parsing JSON.

---

### L6: Operator Session in localStorage

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

| Priority | Finding | Effort | Status |
|----------|---------|--------|--------|
| 1 | C1: Webhook dispatch authentication | Medium | FIXED |
| 2 | H1: MQTT publish authentication | Medium | FIXED |
| 3 | H2: Wildcard CORS | Low | FIXED |
| 4 | H4: Error message leakage | Low | FIXED (5 endpoints) |
| 5 | H3: Timing-safe comparison | Low | FIXED |
| 6 | M1: Upload content-type validation | Low | FIXED |
| 7 | M3: Email HTML injection | Low | FIXED |
| 8 | M4: PATCH validation | Medium | FIXED (partial validation support) |
| 9 | M2: SVG content type | Low | FIXED (removed from whitelist) |
| 10 | M5: Bulk sync limits | Low | FIXED (1000-item cap) |
| 11 | M6: Add Content Security Policy | Low | FIXED |
| 12 | M7: Encrypt MQTT broker passwords | Medium | DEFERRED (requires DB migration) |
| 13 | M8: MCP direct mode scoping | Low | FIXED (TENANT_ID env var) |
| 14 | L1: Frontend tenant_id filtering | Low | FIXED (8 files, 12 queries) |
| 15 | L2: constantTimeCompare length leak | Low | FIXED |
| 16 | L3: SSRF IPv6 incomplete | Low | FIXED |
| 17 | L4: API key entropy | Low | FIXED (hex encoding) |
| 18 | L5: Request body size limits | Low | SKIPPED (platform handles) |
| 19 | L6: Operator session localStorage | Low | FIXED (sessionStorage) |

**Remediation Summary:** 17 of 19 actionable findings fixed. 1 deferred (M7: requires DB migration), 1 skipped (L5: platform-level).

---

*Report generated by automated security audit. Findings should be validated by the development team. This audit covers code-level review only; infrastructure configuration, Supabase RLS policies, and database-level security are outside scope.*
