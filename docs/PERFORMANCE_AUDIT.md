# Performance Audit Report

**Date:** 2026-01-16
**Auditor:** Claude Code Performance Analysis

---

## Executive Summary

This document details performance anti-patterns, N+1 queries, unnecessary re-renders, and inefficient algorithms found in the Eryxon MES codebase. The issues are categorized by severity and include specific file locations and recommended fixes.

### Overall Assessment

| Category | Status |
|----------|--------|
| Code Splitting | ✅ Good - All pages lazy-loaded |
| React Query Caching | ✅ Good - Well-configured stale/cache times |
| Realtime Subscriptions | ✅ Good - Proper cleanup with debouncing |
| N+1 Query Patterns | ⚠️ Issues Found - 5 critical patterns |
| Component Re-renders | ⚠️ Issues Found - Large components lack memoization |
| Client-side Processing | ⚠️ Issues Found - Heavy aggregations in hooks |
| Console Statements | ❌ Bad - 323 occurrences in production code |

---

## 1. N+1 Query Patterns

### 1.1 CRITICAL: `useAllCellsQRMMetrics` - N+1 RPC Calls

**File:** `src/hooks/useQRMMetrics.ts:590-701`

**Problem:** Fetches all cells, then makes a separate RPC call for EACH cell.

```typescript
// Current: N+1 pattern
const { data: cells } = await supabase.from("cells").select("id")...
const metricsPromises = (cells || []).map(async (cell) => {
  const { data } = await supabase.rpc("get_cell_qrm_metrics", {
    cell_id_param: cell.id,
    tenant_id_param: tenantId,
  });
  return { cellId: cell.id, data };
});
```

**Impact:** If there are 10 cells, this makes 11 queries (1 for cells + 10 for metrics).

**Fix:** Create a batch RPC function `get_all_cells_qrm_metrics` that returns metrics for all cells in a single call.

---

### 1.2 HIGH: `useJobProductionMetrics` - Sequential Queries

**File:** `src/hooks/useProductionMetrics.ts:165-286`

**Problem:** Makes 3 sequential queries that could be 1 joined query.

```typescript
// Current: 3 sequential queries
const { data: parts } = await supabase.from("parts").select("id").eq("job_id", jobId);
const { data: operations } = await supabase.from("operations").select("id").in("part_id", partIds);
const { data: quantities } = await supabase.from("operation_quantities").select(...).in("operation_id", operationIds);
```

**Fix:** Use a single query with joins:
```typescript
const { data } = await supabase
  .from("operation_quantities")
  .select(`
    quantity_produced, quantity_good, quantity_scrap, quantity_rework,
    operation:operations!inner(
      id,
      part:parts!inner(
        job_id
      )
    )
  `)
  .eq("operation.part.job_id", jobId);
```

---

### 1.3 HIGH: `useJobQualityMetrics` - Same Pattern

**File:** `src/hooks/useQualityMetrics.ts:261-335`

**Problem:** Same 3-query sequential pattern as `useJobProductionMetrics`.

---

### 1.4 MEDIUM: `useGroupableOperations` - Two Separate Queries

**File:** `src/hooks/useBatches.ts:332-431`

**Problem:** Fetches operations, then separately fetches batch_operations to filter.

```typescript
const { data: operations } = await supabase.from("operations").select(...)
const { data: batchedOps } = await supabase.from("batch_operations").select("operation_id, batch_id");
```

**Fix:** Use a LEFT JOIN to get batch info in a single query:
```typescript
const { data: operations } = await supabase
  .from("operations")
  .select(`
    ...,
    batch_operations(batch_id)
  `)
  .is("deleted_at", null);
```

---

### 1.5 MEDIUM: `usePartRouting` - Could Use Joined Query

**File:** `src/hooks/useQRMMetrics.ts:202-319`

**Problem:** Calls RPC then processes results client-side.

**Fix:** The RPC `get_part_routing` should return pre-aggregated data.

---

## 2. Unnecessary Re-renders

### 2.1 HIGH: `PartDetailModal` - Excessive State and No Memoization

**File:** `src/components/admin/PartDetailModal.tsx` (1,358 lines)

**Problems:**
- 16+ `useState` hooks causing frequent re-renders
- 7 `useQuery` calls triggered on mount
- No `useMemo` or `useCallback` for computed values
- Inline event handlers recreated every render

**Affected Lines:**
- Lines 54-84: 16 useState declarations
- Lines 560-562: Computed values not memoized
- Lines 675-696: Inline onChange handlers

**Fix:**
1. Split into smaller sub-components with `React.memo`
2. Use `useMemo` for computed values:
```typescript
const operationsCount = useMemo(() => operations?.length || 0, [operations]);
const completedOps = useMemo(() =>
  operations?.filter((op) => op.status === "completed").length || 0,
  [operations]
);
```
3. Use `useCallback` for event handlers

---

### 2.2 HIGH: `AdminLayout` - Inline SidebarContent Function

**File:** `src/components/AdminLayout.tsx:371-815`

**Problem:** `SidebarContent` is defined as an inline function, recreated on every render.

```typescript
const SidebarContent = () => (
  // 440+ lines of JSX
);
```

**Fix:** Extract `SidebarContent` as a separate memoized component:
```typescript
const SidebarContent = React.memo(({
  collapsed,
  mobileOpen,
  setMobileOpen,
  // ... other props
}) => { ... });
```

---

### 2.3 MEDIUM: `Dashboard` - Multiple Inline Components

**File:** `src/pages/admin/Dashboard.tsx` (700 lines)

**Problems:**
- 11 `useState` hooks
- `SectionHeader` and `MetricCard` defined inside file
- Realtime subscription triggers immediate refetch without debounce

**Fix:**
1. Extract `SectionHeader` and `MetricCard` to separate files with `React.memo`
2. Add debounce to realtime subscription handler:
```typescript
const debouncedLoadData = useDebouncedCallback(loadData, 100);
// Use debouncedLoadData in subscription handler
```

---

### 2.4 MEDIUM: Route Matching Functions Not Memoized

**File:** `src/components/AdminLayout.tsx:87-88`

```typescript
const isActive = (path: string) => location.pathname === path;
const isActiveGroup = (...paths: string[]) => paths.some(path => location.pathname.startsWith(path));
```

**Fix:** Use `useCallback`:
```typescript
const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);
```

---

## 3. Inefficient Algorithms

### 3.1 HIGH: `useQRMDashboardMetrics` - Heavy Client-side Processing

**File:** `src/hooks/useQRMDashboardMetrics.ts` (350 lines)

**Problem:** Fetches raw data and performs 300+ lines of aggregations client-side:
- MCT trend calculation with Map operations
- OTP trend calculation with Map operations
- Queue time aggregation
- Cycle time percentile calculations
- WIP age bucketing
- Throughput calculations
- Reliability heatmap generation

**Impact:** With large datasets (thousands of operations), this causes UI freezes.

**Fix:** Move aggregations to database:
1. Create `get_qrm_dashboard_metrics` RPC that returns pre-computed metrics
2. Use PostgreSQL window functions for trend calculations
3. Use `percentile_cont` for cycle time percentiles

---

### 3.2 MEDIUM: Multiple Array Iterations

**File:** `src/hooks/useQualityMetrics.ts:315-318`

**Problem:** Four separate `reduce` calls on the same array:
```typescript
const totalProduced = quantities?.reduce((sum, q) => sum + (q.quantity_produced || 0), 0);
const totalGood = quantities?.reduce((sum, q) => sum + (q.quantity_good || 0), 0);
const totalScrap = quantities?.reduce((sum, q) => sum + (q.quantity_scrap || 0), 0);
const totalRework = quantities?.reduce((sum, q) => sum + (q.quantity_rework || 0), 0);
```

**Note:** This was already fixed in `useQualityMetrics` (lines 95-104) but still exists in `useJobQualityMetrics` (lines 315-318).

---

### 3.3 LOW: JSON.stringify in useEffect Dependency

**File:** `src/hooks/useQRMMetrics.ts:577`

```typescript
}, [JSON.stringify(jobIds)]);
```

**Problem:** `JSON.stringify` is called on every render to compare arrays.

**Fix:** Use a custom hook for deep comparison or restructure to avoid array dependencies.

---

## 4. Console Statements in Production Code

**Total:** 323 occurrences across 82 files

### Top Offenders:
| File | Count |
|------|-------|
| `src/lib/mockDataGenerator.ts` | 74 |
| `src/components/STEPViewer.tsx` | 16 |
| `src/pages/admin/config/Users.tsx` | 11 |
| `src/lib/searchService.ts` | 11 |
| `src/lib/database.ts` | 10 |
| `src/components/operator/SubstepsManager.tsx` | 8 |
| `src/hooks/useGlobalSearch.ts` | 8 |

**Fix:**
1. Replace with structured logger (`src/lib/logger.ts`)
2. Add ESLint rule to prevent console statements:
```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```

---

## 5. Bundle Optimization Opportunities

### 5.1 No Manual Chunking Configuration

**File:** `vite.config.ts`

**Current:** Basic Vite config without optimization.

**Fix:** Add manual chunks for vendor code:
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', ...],
          'vendor-charts': ['recharts'],
          'vendor-three': ['three'],
        }
      }
    }
  }
});
```

### 5.2 No Bundle Analysis

**Fix:** Add bundle analyzer for monitoring:
```bash
npm install -D rollup-plugin-visualizer
```

---

## 6. Good Patterns Already Implemented

These patterns are working well and should be maintained:

### 6.1 Lazy Loading
All admin pages use `React.lazy()` in `App.tsx` (lines 27-89).

### 6.2 Query Client Configuration
Well-tuned stale/cache times in `src/lib/queryClient.ts`:
- `VERY_SHORT: 10s` for real-time data
- `SHORT: 30s` for frequently changing data
- `MEDIUM: 2min` for moderately changing data
- `LONG: 5min` for slowly changing data

### 6.3 Realtime Subscriptions
Proper cleanup and debouncing in `src/hooks/useRealtimeSubscription.ts`.

### 6.4 Single-pass Aggregations
Good example in `src/hooks/useQualityMetrics.ts:95-104`:
```typescript
const totals = quantities?.reduce(
  (acc, q) => ({
    produced: acc.produced + (q.quantity_produced || 0),
    good: acc.good + (q.quantity_good || 0),
    scrap: acc.scrap + (q.quantity_scrap || 0),
    rework: acc.rework + (q.quantity_rework || 0),
  }),
  { produced: 0, good: 0, scrap: 0, rework: 0 }
);
```

---

## 7. Priority Recommendations

### Immediate (High Impact, Low Effort)
1. Remove console statements from production code
2. Add `React.memo` to `SectionHeader` and `MetricCard` components
3. Extract `SidebarContent` to a memoized component

### Short-term (High Impact, Medium Effort)
4. Create batch RPC for `useAllCellsQRMMetrics`
5. Refactor sequential queries in `useJobProductionMetrics` and `useJobQualityMetrics`
6. Split `PartDetailModal` into smaller sub-components

### Medium-term (Medium Impact, Higher Effort)
7. Move QRM dashboard aggregations to database
8. Add manual chunking to Vite config
9. Implement bundle size monitoring

---

## 8. Performance Testing Checklist

Before deploying fixes, verify with:

- [ ] Lighthouse performance audit (target: 90+)
- [ ] React DevTools Profiler (verify reduced re-renders)
- [ ] Network tab analysis (verify reduced API calls)
- [ ] Bundle size comparison (target: < 500KB initial)
- [ ] Real-world testing with production data volume

---

*End of Performance Audit Report*
