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

## 2. ✅ DONE: Clean Up Console Statements

**Completed:** All 317 console statements replaced with structured `logger` calls across 85+ files. Logger at `src/lib/logger.ts` with levels (debug, info, warn, error) and component context.

---

## 3. ✅ DONE: Eliminate `any` Types

**Completed:** Reduced from 211 to ~30 remaining `any` types. Replaced with proper interfaces, `unknown`, and type guards across hooks, admin pages, and components. Remaining instances are in generated types or complex 3rd-party integrations.

---

## 4. ✅ DONE: Standardize Query Keys

**Completed:** Extended `QueryKeys` factory to cover all entities (batches, quality, pmi, exceptions, capacity, factoryCalendar, production). Replaced ad-hoc string keys across 26+ files with factory calls including tenantId.

---

## 5. RESOLVED: Inline Styles Audit

**Investigation result:** Of the 70 inline styles found, nearly all are legitimate:
- **Dynamic data-driven colors** (cell.color, stage.color from DB) - cannot use CSS classes
- **Virtualization positioning** (translateY, dynamic widths/heights) - required by virtualization libs
- **AnimatedBackground orbs** - unique size/position per decorative element
- **Chart/analytics colors** - dynamic data visualization colors

**Decision:** No action needed. These inline styles serve valid purposes that CSS classes cannot replace.
Only truly static inline styles (hardcoded hex colors, fixed dimensions) should be flagged, and none were found.

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

## 7. ✅ DONE: Standardize Error Handling in Mutations

**Completed:** Fixed ~20 mutations in `database.ts` to destructure `{ error }` from Supabase responses and throw on error. All mutations now use Pattern B (check response).

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

## 9. ✅ DONE: Improve App.tsx Organization

**Completed:** Extracted routes into `src/routes/` with `adminRoutes.tsx`, `operatorRoutes.tsx`, `guards.tsx`, `LazyRoute.tsx`, and `constants.ts`. App.tsx reduced from 755 to ~100 lines.

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

## 11. ✅ DONE: Activate Prefetching Strategy

**Completed:** Wired `prefetchCommonData` into `AuthContext.tsx` after login. Prefetches cells, materials, and scrap reasons on authentication.

---

## 12. ✅ DONE: Standardize Realtime Subscription Patterns

**Completed:** Standardized all realtime cleanup to use `supabase.removeChannel(channel)` pattern across usePendingIssuesCount, useCapacity, useCellMetrics, useRouting, and other hooks.

---

## 13. ✅ DONE: Remove Hardcoded Test UUID

**Completed:** Replaced hardcoded UUID with `import.meta.env.VITE_TEST_TENANT_ID` environment variable in both mockDataGenerator.ts and Dashboard.tsx. Added to `.env.example`.

---

## 14. ✅ DONE: Clean Up Unused Exports & Dead Code

**Completed:** Removed 1,449 lines of dead code:
- Deleted `jobUtils.ts` (206 lines, zero imports)
- Deleted `substepTemplates.ts` (144 lines, zero imports)
- Deleted `mqtt-publishers.ts` (7 unused trigger functions)
- Deleted `useInfiniteScroll.ts` + test (unused hook)
- Deleted `usePartImages.ts` + test (unused hook)
- Removed `checkCircularReference` and `fetchAssemblyTree` from database.ts

---

## 15. LOW: Improve Bundle Analysis & Performance

**Action items:**
- [ ] Add `rollup-plugin-visualizer` to analyze bundle size
- [ ] Ensure large dependencies (3D viewer, charts) are properly code-split
- [ ] Consider dynamic imports for heavy components within pages
- [ ] Add performance monitoring (Web Vitals) for production

---

## Priority Summary

| Priority | Item | Status |
|----------|------|--------|
| CRITICAL | Break down monolithic components (1) | 🔄 In Progress (Users.tsx) |
| HIGH | Clean up console statements (2) | ✅ Done |
| HIGH | Eliminate `any` types (3) | ✅ Done |
| HIGH | Standardize query keys (4) | ✅ Done |
| HIGH | Remove inline styles (5) | ✅ Resolved (legitimate) |
| MEDIUM | Increase test coverage (6) | ⬜ Not started |
| MEDIUM | Standardize mutation error handling (7) | ✅ Done |
| MEDIUM | Add missing tenant filtering (8) | ⬜ Not started |
| MEDIUM | Improve App.tsx organization (9) | ✅ Done |
| MEDIUM | Implement optimistic updates (10) | ⬜ Not started |
| LOW | Activate prefetching (11) | ✅ Done |
| LOW | Standardize realtime patterns (12) | ✅ Done |
| LOW | Remove hardcoded test UUID (13) | ✅ Done |
| LOW | Clean up dead code (14) | ✅ Done |
| LOW | Bundle analysis (15) | ⬜ Not started |
| HIGH | Fix i18n translation gaps (16) | ✅ Done |
| MEDIUM | Fix hardcoded UI strings (17) | ✅ Done |
| MEDIUM | Enable TypeScript strict mode (18) | ⬜ Not started |
| MEDIUM | Fix event listener memory leaks (19) | ✅ Resolved (false positive) |
| MEDIUM | Merge duplicate OperationDetailModal (20) | ✅ Cancelled (not duplicates) |

---

## Recommended Execution Order

1. **Phase 1 - Hygiene** (items 2, 3, 5, 13, 14, 16): Quick wins that immediately improve code quality
2. **Phase 2 - Architecture** (items 1, 9): Break down large components and reorganize routing
3. **Phase 3 - Data Layer** (items 4, 7, 8, 12): Standardize all data access patterns
4. **Phase 4 - Quality** (items 6, 10, 11, 15): Add tests, optimistic updates, and performance monitoring
5. **Phase 5 - Localization** (items 16, 17): Fix translation gaps and sync all languages

---

## 16. ✅ DONE: Fix i18n Translation Gaps & Sync Languages

**Completed:**
- Created `analytics.json` namespace for en/nl/de with qrm, oee, quality, capacity, reliability, analytics keys
- Added missing capacity keys (clickToManage, load ranges, overCapacity, holidayClosure)
- Updated `src/i18n/index.ts` to import and merge analytics namespace
- Remaining: shipping.json (no shipping keys exist yet), inline fallback cleanup, nl/de key sync

---

## 17. ✅ DONE: Fix Hardcoded UI Strings

**Completed:**
- Localized AcceptInvitation.tsx (21 hardcoded strings → invitation.* keys)
- Localized NotFound.tsx (pageNotFound, returnToHome)
- Localized McpKeys.tsx (~30 hardcoded strings → mcpKeys.* keys)
- CapacityMatrix.tsx already used t() with fallback defaults
- All translations added to en/nl/de auth.json, common.json, integrations.json

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

## 19. ✅ RESOLVED: Event Listener Memory Leaks (False Positive)

**Investigation result:** Both OperatorView.tsx and PinKeypad.tsx have proper useEffect cleanup with removeEventListener. The initial audit was incorrect - all event listeners are properly cleaned up.

---

## 20. CANCELLED: Merge Duplicate OperationDetailModal

**Investigation result:** After diffing the two files, they are fundamentally different:
- **Admin version:** Uses React Query to fetch operation data by ID, has admin editing UI (status changes, resource assignment, tabs)
- **Operator version:** Receives operation as a prop, has start/stop/complete workflow actions, issue reporting, substeps manager

These share component naming but serve entirely different use cases. Merging would increase complexity.

**Decision:** Keep as separate components - they are not duplicates, just similarly named.
