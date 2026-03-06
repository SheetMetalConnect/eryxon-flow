# Eryxon MES - Refactoring & Professionalization Plan

Based on a thorough audit of the codebase (~86,400 lines across 324 TS/TSX files), here is a prioritized plan to make the app more professional, maintainable, and production-ready.

---

## 1. CRITICAL: Break Down Monolithic Components

**Problem:** Several page components are far too large, mixing data fetching, business logic, and UI rendering in single files. This hurts readability, testability, and reusability.

**Worst offenders (lines):**
| File | Lines | Issue |
|------|-------|-------|
| `pages/admin/config/Users.tsx` | 1,282 | Full CRUD + roles + invitation logic in one file |
| `components/admin/PartDetailModal.tsx` | 1,249 | Massive modal with multiple tabs/sections |
| `components/STEPViewer.tsx` | 1,871 | 3D viewer with all processing inline |
| `pages/common/ApiDocs.tsx` | 848 | All API docs hardcoded in JSX |
| `pages/admin/DataImport.tsx` | 844 | File parsing + validation + import in one |
| `pages/admin/config/MqttPublishers.tsx` | 832 | Full MQTT config + test panel |
| `pages/admin/Assignments.tsx` | 824 | Complex assignment matrix logic |
| `pages/admin/Dashboard.tsx` | 818 | Multiple stat cards + charts inline |
| `pages/admin/JobCreate.tsx` | 784 | Multi-step form in single component |
| `pages/admin/config/Stages.tsx` | 783 | Stage CRUD + ordering |
| `pages/operator/OperatorView.tsx` | 755 | Operator terminal with all states |
| `lib/mockDataGenerator.ts` | 2,250 | Massive demo data generator |

**Action items:**
- [ ] Extract `Users.tsx` into: `UsersList`, `UserInviteDialog`, `UserEditDialog`, `useUsers` hook
- [ ] Split `PartDetailModal.tsx` into tab-specific sub-components
- [ ] Extract `Dashboard.tsx` stat cards into individual widget components
- [ ] Split `JobCreate.tsx` into multi-step form components
- [ ] Split `OperatorView.tsx` into view-specific panels
- [ ] Extract `DataImport.tsx` into parser, validator, and importer modules
- [ ] Break `mockDataGenerator.ts` into per-entity generators

---

## 2. HIGH: Clean Up Console Statements

**Problem:** 317 `console.log/warn/error` statements scattered across production code. This is unprofessional and leaks internal details.

**Key locations:**
- `Users.tsx` - debugging operator creation
- `MqttPublishers.tsx` - topic/event logging
- `ActivityMonitor.tsx` - realtime updates
- `OperatorView.tsx` - file path debugging (5+ statements)

**Action items:**
- [ ] Remove all debug `console.log` statements from production code
- [ ] Replace necessary logging with a proper logging utility (e.g., `src/lib/logger.ts`) that:
  - Can be disabled in production
  - Has log levels (debug, info, warn, error)
  - Includes context (component name, user action)
- [ ] Keep `console.error` only in error boundaries and critical error handlers

---

## 3. HIGH: Eliminate `any` Types

**Problem:** 201 instances of `: any` across the codebase, undermining TypeScript's value.

**Action items:**
- [ ] Audit and replace all `any` types with proper interfaces
- [ ] Focus on hook return types and event handler parameters first
- [ ] Add strict `noImplicitAny` to `tsconfig.json` once cleaned up
- [ ] Use `unknown` + type guards where the type genuinely isn't known

---

## 4. HIGH: Standardize Query Keys

**Problem:** Mix of ad-hoc string query keys and the `QueryKeys` factory. Inconsistency leads to cache misses and hard-to-debug stale data.

**Examples of inconsistency:**
```typescript
// Good - using factory
QueryKeys.jobs.all(tenantId)

// Bad - ad-hoc strings
queryKey: ["admin-jobs-all"]
queryKey: ["batches"]
queryKey: ["cells-active"]
queryKey: ["pending-issues-count"]
```

**Action items:**
- [ ] Extend `QueryKeys` factory in `src/lib/queryClient.ts` to cover ALL entities
- [ ] Replace all ad-hoc query key strings with factory calls
- [ ] Ensure ALL query keys include `tenantId` for multi-tenant safety
- [ ] Add lint rule or code review checklist item for query key consistency

---

## 5. HIGH: Remove Inline Styles

**Problem:** 70 instances of `style={{...}}` inline styles across components, bypassing the design system.

**Action items:**
- [ ] Audit all inline styles and replace with design system classes or CSS variables
- [ ] Add design system utility classes for any missing patterns
- [ ] Consider adding an ESLint rule to flag `style={{` in JSX

---

## 6. MEDIUM: Increase Test Coverage

**Problem:** Only 26 test files for 324 source files (~8% file coverage). Critical business logic is untested.

**Current test coverage:**
- A few hooks (`useDebounce`, `useInfiniteScroll`, etc.)
- Some UI components (`button`, `PageStatsRow`, `AdminPageHeader`)
- Auth context
- Validation utilities
- Scheduler logic

**Missing tests for:**
- Data fetching hooks (jobs, parts, operations, batches)
- Mutation flows (create, update, delete)
- Complex business logic (scheduler, routing, time tracking)
- Page-level integration tests
- Multi-tenant isolation

**Action items:**
- [ ] Set up testing infrastructure (vitest + testing-library if not complete)
- [ ] Add tests for critical hooks: `useBatches`, `usePMI`, `useCADProcessing`
- [ ] Add tests for `src/lib/database.ts` query functions
- [ ] Add tests for `src/lib/cacheInvalidation.ts` cascade logic
- [ ] Add integration tests for key user flows (job creation, operator workflow)
- [ ] Target 40%+ coverage for business logic files

---

## 7. MEDIUM: Standardize Error Handling in Mutations

**Problem:** Two different error handling patterns coexist:

```typescript
// Pattern A: Relies on try/catch (misses Supabase errors)
try {
  await supabase.from("table").update({...});
  toast.success("Done");
} catch (error) {
  toast.error("Failed");
}

// Pattern B: Checks response (correct)
const { data, error } = await supabase.from("table").update({...});
if (error) throw error;
```

**Action items:**
- [ ] Standardize on Pattern B across all mutations (~15-20 locations)
- [ ] Create a `useSafeMutation` wrapper or utility that enforces consistent error handling
- [ ] Ensure all toast messages use i18n keys (not hardcoded strings)

---

## 8. MEDIUM: Add Missing Tenant ID Filtering

**Problem:** Some queries lack explicit `tenant_id` filtering, relying solely on RLS.

**Key locations:**
- `usePendingIssuesCount.ts` - no tenant filter in query or query key
- Some dashboard initial stat loads

**Action items:**
- [ ] Audit all Supabase queries for missing `tenant_id` filters
- [ ] Add tenant_id to query keys where missing
- [ ] Create a linting helper or shared query builder that enforces tenant scoping

---

## 9. MEDIUM: Improve App.tsx Organization

**Problem:** `App.tsx` is 755 lines with 42 lazy imports and all route definitions inline.

**Action items:**
- [ ] Extract route definitions into `src/routes/` directory with separate files per role:
  - `adminRoutes.tsx`
  - `operatorRoutes.tsx`
  - `commonRoutes.tsx`
  - `authRoutes.tsx`
- [ ] Keep `App.tsx` as a thin shell that composes route groups
- [ ] Move route guards (`ProtectedRoute`, `PublicRoute`) to `src/routes/guards.tsx`

---

## 10. MEDIUM: Implement Optimistic Updates

**Problem:** All mutations wait for server confirmation before updating UI, causing perceived lag.

**Action items:**
- [ ] Add optimistic updates for common actions:
  - Status changes (job status, operation status)
  - Toggle operations (enable/disable)
  - Delete operations (remove from list immediately)
- [ ] Use React Query's `onMutate`/`onError`/`onSettled` pattern

---

## 11. LOW: Activate Prefetching Strategy

**Problem:** `prefetchCommonData()` exists in `cacheInvalidation.ts` but is never called.

**Action items:**
- [ ] Call `prefetchCommonData` after successful login in AuthContext
- [ ] Prefetch sidebar navigation data (counts, alerts)
- [ ] Add route-based prefetching for likely next pages

---

## 12. LOW: Standardize Realtime Subscription Patterns

**Problem:** Two cleanup patterns coexist:
```typescript
subscription.unsubscribe();  // Pattern A
supabase.removeChannel(channel);  // Pattern B
```

**Action items:**
- [ ] Standardize on `removeChannel` pattern
- [ ] Document the Supabase single-filter limitation in realtime subscriptions
- [ ] Fix the `useRealtimeSubscription` filter overwrite issue where `additionalFilter` replaces `tenant_id` filter

---

## 13. LOW: Remove Hardcoded Test UUID

**Problem:** `mockDataGenerator.ts` has a hardcoded UUID that bypasses demo checks:
```typescript
const skipDemoCheck = tenantId === "11111111-1111-1111-1111-111111111111";
```

**Action items:**
- [ ] Move test UUID to environment variable
- [ ] Add production guard to prevent demo data generation
- [ ] Add audit logging for demo data generation events

---

## 14. LOW: Clean Up Unused Exports & Dead Code

**Action items:**
- [ ] Run `knip` or similar tool to find unused exports, dependencies, and files
- [ ] Remove dead code paths and commented-out code
- [ ] Clean up barrel export files to only export what's used

---

## 15. LOW: Improve Bundle Analysis & Performance

**Action items:**
- [ ] Add `rollup-plugin-visualizer` to analyze bundle size
- [ ] Ensure large dependencies (3D viewer, charts) are properly code-split
- [ ] Consider dynamic imports for heavy components within pages
- [ ] Add performance monitoring (Web Vitals) for production

---

## Priority Summary

| Priority | Item | Impact |
|----------|------|--------|
| CRITICAL | Break down monolithic components (1) | Maintainability |
| HIGH | Clean up console statements (2) | Professionalism |
| HIGH | Eliminate `any` types (3) | Type safety |
| HIGH | Standardize query keys (4) | Data integrity |
| HIGH | Remove inline styles (5) | Design consistency |
| MEDIUM | Increase test coverage (6) | Reliability |
| MEDIUM | Standardize mutation error handling (7) | Bug prevention |
| MEDIUM | Add missing tenant filtering (8) | Security |
| MEDIUM | Improve App.tsx organization (9) | Maintainability |
| MEDIUM | Implement optimistic updates (10) | UX |
| LOW | Activate prefetching (11) | Performance |
| LOW | Standardize realtime patterns (12) | Consistency |
| LOW | Remove hardcoded test UUID (13) | Security |
| LOW | Clean up dead code (14) | Cleanliness |
| LOW | Bundle analysis (15) | Performance |
| HIGH | Fix i18n translation gaps & sync languages (16) | Localization |
| MEDIUM | Fix hardcoded UI strings (17) | Localization |
| MEDIUM | Enable TypeScript strict mode (18) | Type safety |
| MEDIUM | Fix event listener memory leaks (19) | Stability |
| MEDIUM | Merge duplicate OperationDetailModal (20) | Maintainability |

---

## Recommended Execution Order

1. **Phase 1 - Hygiene** (items 2, 3, 5, 13, 14, 16): Quick wins that immediately improve code quality
2. **Phase 2 - Architecture** (items 1, 9): Break down large components and reorganize routing
3. **Phase 3 - Data Layer** (items 4, 7, 8, 12): Standardize all data access patterns
4. **Phase 4 - Quality** (items 6, 10, 11, 15): Add tests, optimistic updates, and performance monitoring
5. **Phase 5 - Localization** (items 16, 17): Fix translation gaps and sync all languages

---

## 16. HIGH: Fix i18n Translation Gaps & Sync Languages

**Problem:** The i18n system has critical consistency issues across the 3 supported languages.

**Issues found:**

1. **149 fallback values in t() calls** - Developers added inline fallbacks like `t("parts.totalParts", "Total Parts")` indicating keys are missing from namespace files
2. **German (de) missing ~30+ keys** vs English in `jobs.json` alone (e.g., `issues.category.*`, `jobs.details`, `jobs.dueThisWeek`, `jobs.overdue`, etc.)
3. **Missing namespace files** documented in CLAUDE.md but never created:
   - `analytics.json` (for QRM, OEE, quality, reliability, capacity)
   - `shipping.json` (for shipping module)
4. **Monolithic `translation.json` duplication** - Each language has both namespace files AND a large `translation.json` that overlaps, creating sync risk
5. **Missing imports in `i18n/index.ts`** - analytics, shipping, and quality namespaces not imported

**Action items:**
- [ ] Create missing namespace files: `analytics.json` and `shipping.json` for all 3 languages
- [ ] Run a diff across en/nl/de for every namespace to find all missing keys
- [ ] Add missing keys to nl and de (translate properly, don't just copy English)
- [ ] Remove the 149 inline fallback values once keys are properly in namespace files
- [ ] Update `src/i18n/index.ts` to import new namespace files
- [ ] Decide whether to keep or deprecate the monolithic `translation.json` files

---

## 17. MEDIUM: Fix Hardcoded UI Strings

**Problem:** Despite good overall i18n adoption, some components still have hardcoded English strings.

**Key locations found:**
- `AcceptInvitation.tsx` - "Invalid Invitation", "Invited by", "Organization", "Email", "Role"
- `NotFound.tsx` - "Oops! Page not found"
- `CapacityMatrix.tsx` - "Closed", "Weekend", "Operations:"
- `McpKeys.tsx` - "MCP Keys", "Key Name", "Description"

**Action items:**
- [ ] Grep for remaining hardcoded strings in JSX (title=, placeholder=, aria-label= attributes)
- [ ] Add translation keys to appropriate namespace files for all 3 languages
- [ ] Replace hardcoded strings with t() calls

---

## 18. MEDIUM: Enable TypeScript Strict Mode

**Problem:** `tsconfig.json` has `strict: false`, `noImplicitAny: false`, `strictNullChecks: false`. This undermines TypeScript's entire value proposition and allows bugs to slip through.

**Action items:**
- [ ] First fix all `any` types (item 3)
- [ ] Enable `noImplicitAny: true` and fix resulting errors
- [ ] Enable `strictNullChecks: true` and fix resulting errors
- [ ] Enable `strict: true` as the final step
- [ ] Add strict mode to CI/CD pipeline to prevent regressions

---

## 19. MEDIUM: Fix Event Listener Memory Leaks

**Problem:** Some components add window/document event listeners without proper cleanup.

**Key locations:**
- `OperatorView.tsx` - adds `mousemove`, `mouseup`, `touchmove`, `touchend` listeners without cleanup
- `PinKeypad.tsx` - adds `keydown` listener without cleanup

**Action items:**
- [ ] Audit all `addEventListener` calls for missing `removeEventListener` in cleanup
- [ ] Move event listeners into useEffect with proper return cleanup functions
- [ ] Consider using a `useEventListener` hook for consistency

---

## 20. CANCELLED: Merge Duplicate OperationDetailModal

**Investigation result:** After diffing the two files, they are fundamentally different:
- **Admin version:** Uses React Query to fetch operation data by ID, has admin editing UI (status changes, resource assignment, tabs)
- **Operator version:** Receives operation as a prop, has start/stop/complete workflow actions, issue reporting, substeps manager

These share component naming but serve entirely different use cases. Merging would increase complexity.

**Decision:** Keep as separate components - they are not duplicates, just similarly named.
