# Eryxon MES - Comprehensive Code Review

**Date:** 2026-03-06
**Scope:** Full codebase (~25,000 lines across src/)
**Reviewer:** Claude Code (Automated Analysis)

---

## Overall Rating: 6.5 / 10

### Justification

**Strengths:** Strong TypeScript adoption, good use of React Query for data fetching, well-structured translation system with modular namespaces, centralized design system, proper use of Supabase RLS for multi-tenancy, and clean project organization with barrel exports.

**Weaknesses:** Several high-severity security concerns around invitation tokens and client-side auth, critical race conditions in time tracking and batch operations, significant code duplication in database.ts, excessive use of `any`/`as unknown as` type casts that undermine TypeScript safety, silent error swallowing in multiple hooks, and unbounded data fetching in search and batch operations.

---

## Table of Contents

1. [Security Vulnerabilities](#1-security-vulnerabilities)
2. [Performance Bottlenecks](#2-performance-bottlenecks)
3. [Code Smell Detection](#3-code-smell-detection)
4. [Best Practice Violations](#4-best-practice-violations)
5. [Refactoring Suggestions](#5-refactoring-suggestions)
6. [Summary & Action Items](#6-summary--action-items)

---

## 1. Security Vulnerabilities

### CRITICAL: Insecure Invitation Token Handling
**Files:** `src/hooks/useInvitations.ts:132-148`, `src/pages/admin/config/Users.tsx:1057`

Invitation tokens are exposed in URLs, browser history, referrer headers, and logs:
```typescript
const url = `${window.location.origin}/accept-invitation/${invitation.token}`;
```

The token validation RPC (`get_invitation_by_token`) requires no authentication, meaning anyone with a token can accept an invitation. There is no evidence of one-time-use enforcement or short expiration windows.

**Recommendations:**
- Hash tokens server-side; never store plain tokens
- Enforce one-time-use with a `used_at` timestamp
- Set short expiration (15-30 minutes)
- Add rate limiting on token acceptance endpoints

---

### HIGH: Race Condition in Invitation Acceptance
**File:** `src/pages/auth/AcceptInvitation.tsx:74-91`

User signup and invitation acceptance happen sequentially without transactional guarantees:
```typescript
const { error: signUpError, data: signUpData } = await signUp(...);
if (signUpData?.user) {
  await acceptInvitation(token, signUpData.user.id);
}
```

If signup succeeds but acceptance fails, the user is created but not properly assigned to the tenant.

**Recommendation:** Wrap both operations in a server-side RPC transaction.

---

### HIGH: Weak Password Validation
**File:** `src/pages/auth/AcceptInvitation.tsx:60-62`

```typescript
if (password.length < 6) {
  setError('Password must be at least 6 characters');
}
```

A 6-character minimum is well below industry standards (NIST recommends 8+, most modern apps require 12+). No complexity requirements are enforced.

**Recommendation:** Increase to 12+ characters, add complexity checks, consider breach database lookups.

---

### MEDIUM: Sensitive Data in Console Logs
**Files:** `src/contexts/OperatorContext.tsx:95,136`

PIN verification errors are logged to the browser console in production:
```typescript
console.error("PIN verification error:", error);
```

**Recommendation:** Gate detailed error logging behind `import.meta.env.DEV`.

---

### MEDIUM: localStorage Used for Session Data
**Files:** `src/contexts/OperatorContext.tsx:49,123`, `src/integrations/supabase/client.ts:17`

Operator session data and Supabase tokens are stored in localStorage, which is accessible to any script on the domain (XSS attack surface). Data persists across browser sessions.

**Recommendation:** Use sessionStorage for operator data; consider memory-based storage for sensitive tokens.

---

### MEDIUM: Template Literal Bug Exposes Project Structure
**Files:** `src/lib/webhooks.ts:54`, `src/lib/event-dispatch.ts:197,245`, `src/lib/mqtt-publishers.ts:55`

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ||
  'https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co';
```

Single quotes prevent template literal interpolation. This is a bug AND an information disclosure risk (project ID pattern is predictable).

**Recommendation:** Use backticks for the fallback string. Better yet, require `VITE_SUPABASE_URL` and throw on missing config.

---

### MEDIUM: Client-Side Only Route Protection
**File:** `src/App.tsx:99`

```typescript
if (adminOnly && profile.role !== "admin") {
  return <Navigate to="/operator/work-queue" replace />;
}
```

Route protection is client-side only. While RLS provides backend enforcement, an attacker can bypass frontend guards via DevTools.

**Status:** Partially mitigated by RLS. Document this explicitly in code comments.

---

### LOW: Unsafe JSON.parse Without Schema Validation
**Files:** `src/hooks/useInvitations.ts:83-85`, `src/contexts/OperatorContext.tsx:52-53`

```typescript
const parsed = JSON.parse(stored);
if (parsed.tenant_id === tenant.id) { ... }
```

Parsed data is used without schema validation. Corrupted or tampered localStorage could cause unexpected behavior.

**Recommendation:** Use Zod or similar for runtime validation of parsed data.

---

## 2. Performance Bottlenecks

### CRITICAL: Race Condition in startTimeTracking
**File:** `src/lib/database.ts:243-253`

The "double-check" pattern for preventing duplicate time entries has a TOCTOU (time-of-check-to-time-of-use) race:
```typescript
const { data: doubleCheck } = await supabase
  .from("time_entries")
  .select("id")
  .eq("operation_id", operationId)
  .is("end_time", null);

if (doubleCheck?.length > 0) return; // Gap between check and insert

const { error } = await supabase.from("time_entries").insert({...});
```

Two concurrent requests can both pass the check and both insert.

**Recommendation:** Add a database unique constraint: `UNIQUE(operation_id, operator_id) WHERE end_time IS NULL`.

---

### HIGH: N+1 Queries in Database Operations
**File:** `src/lib/database.ts:175-358`

`startTimeTracking()` executes 4+ sequential queries before inserting, then 5+ more for cascading status updates. Each job status recalculation triggers additional queries for parts and operations.

**Recommendation:** Consolidate into a single server-side RPC that handles the full transaction atomically.

---

### HIGH: Unbounded Batch Processing
**File:** `src/lib/database.ts:1046-1095`

```typescript
const { data: batchOps } = await supabase
  .from("batch_operations")
  .select("operation_id")
  .eq("batch_id", batchId);
// No .limit() - could load 10,000+ operations
```

**Recommendation:** Add pagination or a reasonable limit. Process in chunks if needed.

---

### HIGH: Unbounded Search Results
**File:** `src/lib/searchService.ts:338-362`

`searchAll()` runs 5 entity searches in parallel via `Promise.all`, each returning up to the default limit. With no aggregate cap, this can return 250+ results with no pagination.

**Recommendation:** Add a global result limit and implement cursor-based pagination.

---

### MEDIUM: Inefficient Scheduler Traversal
**File:** `src/lib/scheduler.ts:299-370`

Triple-nested loop (jobs -> operations -> allocations) where `getAvailableCapacity()` recalculates cell capacity per day on every call.

**Recommendation:** Cache cell capacities per date in a Map to avoid redundant computation.

---

### MEDIUM: N+1 in Assembly Tree Fetching
**File:** `src/lib/scheduler.ts:953-988`

BFS traversal with one query per level, plus `queue.shift()` which is O(n).

**Recommendation:** Collect all IDs per level, batch query with `.in()`, use index-based queue traversal.

---

### MEDIUM: Multiple Passes Over Same Data
**File:** `src/hooks/useQualityMetrics.ts:61-199`

Quality metrics computation iterates over the same dataset 4+ times (reduce, forEach for maps, forEach for scrap reasons, another reduce for issue counts).

**Recommendation:** Consolidate into a single-pass aggregation.

---

### LOW: Missing Search Debouncing
**File:** `src/lib/searchService.ts`

`searchAll()` has no built-in debounce. If called on every keystroke, it triggers 5 parallel queries per keystroke.

**Recommendation:** Add debouncing at the call site or within the service.

---

## 3. Code Smell Detection

### God Function: startTimeTracking
**File:** `src/lib/database.ts:175-358`

This single function spans ~180 lines and handles 8+ responsibilities: validation, fetching operation details, fetching operator details, creating time entries, updating operation status, updating part status, updating job status, and dispatching webhooks.

**Impact:** Extremely difficult to test, debug, or modify safely.

---

### Massive Code Duplication: stop vs adminStop
**Files:** `src/lib/database.ts` - `stopTimeTracking()` (lines 360-454) vs `adminStopTimeTracking()` (lines 460-535)

~60+ lines of nearly identical code duplicated between these two functions.

**Impact:** Bug fixes must be applied in two places.

---

### Duplicate Validation Logic
**File:** `src/hooks/usePMI.ts:293-297, 369-377`

File extension validation code is duplicated between `extractPMIAsync` and `extractPMI`:
```typescript
const ext = fileName.toLowerCase().split('.').pop();
if (!['step', 'stp'].includes(ext || '')) { ... }
```

---

### Duplicate Subscription Patterns
**Files:** `src/hooks/usePartIssues.ts` vs `src/hooks/useOperationIssues.ts`

Both implement nearly identical Supabase realtime subscription and fetching patterns.

**Recommendation:** Extract a common `useRealtimeQuery` hook.

---

### Empty String Bug in Validators
**File:** `src/lib/validation/EntityValidators.ts:30,69,94,149,260,349`

Required field checks only test for falsy values. Empty strings `""` pass validation because they're falsy in a different way than `null`/`undefined` in some check patterns, creating inconsistent behavior.

---

### Repetitive Validator Boilerplate
**File:** `src/lib/validation/EntityValidators.ts`

Every validator follows the exact same pattern:
```typescript
const requiredError = this.validateRequired(cell, "tenant_id", index);
if (requiredError) errors.push(requiredError);
```

This is repeated dozens of times across all validator classes.

---

### Excessive `any` and Unsafe Type Casts
**Files:** Multiple

| File | Lines | Issue |
|------|-------|-------|
| `src/lib/validation/DataValidator.ts` | 27, 152, 174 | `any` type parameters |
| `src/lib/validation/EntityValidators.ts` | 14, 20, 84+ | All validators use `any` for entity |
| `src/hooks/useExceptions.ts` | 68-69, 207-208 | `as unknown as Type` |
| `src/hooks/useBatches.ts` | 115, 119, 154, 158 | `as any` casts and `!` assertions |
| `src/hooks/usePMI.ts` | 194, 446 | Type assertions without narrowing |

---

### Non-Null Assertions Without Guards
**File:** `src/hooks/useBatches.ts:115,154,179,214`

```typescript
profile!.tenant_id  // Crashes if profile is undefined
```

Despite `enabled` guards on queries, the mutation functions that reference `profile!` can be called independently.

---

## 4. Best Practice Violations

### Silent Error Swallowing
**Files:**
- `src/hooks/usePartIssues.ts:47-53` - Catch block returns zero counts, no user notification
- `src/hooks/useOperationIssues.ts:16-26` - No error handling at all on Supabase response
- `src/lib/searchService.ts:74-96` - Logs to console, returns empty array silently

**Impact:** Users see empty/zero states with no indication that data loading failed.

---

### Fire-and-Forget Webhook Dispatch
**File:** `src/lib/database.ts:273-287`

```typescript
dispatchOperationStarted(tenantId, {...}).then(result => {
  if (!result.success) {
    console.error('Failed to dispatch event:', result.errors);
  }
});
```

Mixing async/await with `.then()`. Webhook failures are only logged, never retried or reported to users.

---

### Hardcoded Magic Numbers
**Files:**
- `src/lib/database.ts:9` - `MAX_SCHEDULING_DAYS = 365`
- `src/lib/database.ts:12` - `DEFAULT_OPERATION_DURATION_MINUTES = 60`
- `src/hooks/useInfiniteScroll.ts:29` - `threshold = 100` (pixels)
- `src/hooks/useInfiniteScroll.ts:157` - `.scrollHeight - 10` (magic buffer)
- `src/hooks/useFileUpload.ts:188,216` - `1048576` (bytes per MB, repeated)

---

### String Literals Instead of Enums for Status
**File:** `src/lib/database.ts` (throughout)

```typescript
operation.status === "not_started"  // Repeated 10+ times
operation.status === "in_progress"
job.status === "completed"
```

**Recommendation:** Use TypeScript const objects or enums from `src/integrations/supabase/types/enums.ts`.

---

### Non-Atomic Sequence Assignment
**File:** `src/hooks/useBatches.ts:281-286, 398-403`

```typescript
const startSequence = (existing?.[0]?.sequence_in_batch || 0) + 1;
// Window for concurrent request collision
```

**Recommendation:** Use a database sequence or `INSERT ... SELECT MAX(sequence) + 1` atomically.

---

### Quota Race Condition
**File:** `src/hooks/useFileUpload.ts:227-239`

Quota is checked once before upload starts. Multiple concurrent uploads can each pass the check and collectively exceed the quota.

**Recommendation:** Implement server-side quota enforcement with atomic decrement.

---

### MockDataGenerator in Production Code
**Files:** `src/lib/mockDataGenerator.ts`, `src/lib/seed.ts`

Testing/demo utilities live alongside production code. Should be isolated in `src/test/` or `scripts/`.

---

## 5. Refactoring Suggestions

### Priority 1: Extract Time Tracking Service
**Current:** `src/lib/database.ts` (lines 175-635)
**Target:** `src/lib/timeTrackingService.ts`

Split the 450+ line time tracking block into focused functions:
- `validateTimeEntry()` - Check for existing entries
- `createTimeEntry()` - Insert the time entry record
- `cascadeStatusUpdates()` - Update operation/part/job status
- `dispatchTimeEvents()` - Handle webhook notifications

Deduplicate `stopTimeTracking()` and `adminStopTimeTracking()` into a shared `closeTimeEntry()`.

---

### Priority 2: Add Database Constraints for Data Integrity
- Add partial unique index: `UNIQUE(operation_id, operator_id) WHERE end_time IS NULL`
- Add unique constraint on `batch_operations(batch_id, sequence_in_batch)`
- Move job/part status calculations to database triggers or materialized views

---

### Priority 3: Centralize Error Handling in Hooks
Create a `useSupabaseQuery` wrapper that standardizes:
- Error toast notifications
- Loading states
- Retry logic
- Logging (dev only)

Extract `useRealtimeQuery` from duplicate subscription patterns in `usePartIssues` and `useOperationIssues`.

---

### Priority 4: Strengthen Type Safety in Validators
Replace `any` with proper generics:
```typescript
// Before
export class CellValidator extends BaseValidator<any>

// After
export class CellValidator extends BaseValidator<Tables<'cells'>>
```

Create a validation helper to reduce boilerplate:
```typescript
function validateFields(entity: T, fields: (keyof T)[], index?: number) {
  return fields.flatMap(f => validateRequired(entity, f, index) ?? []);
}
```

---

### Priority 5: Add Pagination to Search
- Add global result cap to `searchAll()`
- Implement cursor-based pagination
- Add debouncing at the service level or provide a `useSearch` hook with built-in debounce

---

### Priority 6: Repository Abstraction
Extract Supabase calls from business logic into repository modules:
```
src/repositories/
  timeEntryRepository.ts
  operationRepository.ts
  jobRepository.ts
  batchRepository.ts
```

This decouples business logic from the data layer and makes testing significantly easier.

---

## 6. Summary & Action Items

### By Severity

| Priority | Category | Count | Key Items |
|----------|----------|-------|-----------|
| Critical | Security | 2 | Invitation tokens, time entry race condition |
| High | Security + Perf | 5 | Weak passwords, N+1 queries, unbounded fetches |
| Medium | All categories | 12 | Console logs, localStorage, type casts, duplication |
| Low | Maintainability | 8 | Magic numbers, debouncing, enum usage |

### Top 10 Action Items (Ordered by Impact)

1. **Add DB constraint** for unique active time entries per operation/operator
2. **Secure invitation tokens** - hash, expire, one-time-use
3. **Increase password minimum** to 12+ characters with complexity requirements
4. **Extract time tracking service** from database.ts god functions
5. **Add error notifications** to hooks that silently swallow errors
6. **Add pagination/limits** to search and batch operations
7. **Replace `any` types** with proper generics in validators
8. **Deduplicate** stop/adminStop time tracking code
9. **Gate console.error** behind dev-mode checks
10. **Move mock data generator** out of production source tree

### What's Working Well

- Modular translation namespace system (en/nl/de)
- Centralized design system with CSS variables
- Strong Supabase RLS for multi-tenant isolation
- React Query for server state management
- Clean barrel export pattern for pages
- Comprehensive type definitions for database schema
- Proper realtime subscription cleanup patterns
- Captcha integration (Cloudflare Turnstile) for auth
