# Performance Audit Report

**Date:** 2025-12-23
**Auditor:** Claude Code Performance Analysis

---

## Executive Summary

This audit identifies performance anti-patterns in the Eryxon MES codebase. Issues are categorized by severity and impact, with recommended solutions.

---

## Critical Issues

### 1. O(n^2) Algorithm in useOEEMetrics

**File:** `src/hooks/useOEEMetrics.ts:188-197`

```typescript
// PROBLEM: .find() inside .forEach() creates O(n²) complexity
quantities?.forEach(q => {
  const op = operations?.find(o => o.id === q.operation_id);  // O(n) per iteration
  if (op?.cells?.name) {
    const current = cellMap.get(op.cells.name);
    if (current) {
      current.produced += q.quantity_produced || 0;
      current.good += q.quantity_good || 0;
    }
  }
});
```

**Impact:** With 1,000 quantities and 100 operations, this runs 100,000 comparisons instead of 1,000.

**Solution:** Pre-build an operation lookup Map:
```typescript
// Build O(1) lookup map first
const operationMap = new Map(operations?.map(o => [o.id, o]) || []);

quantities?.forEach(q => {
  const op = operationMap.get(q.operation_id);  // O(1) lookup
  // ...rest of logic
});
```

---

### 2. Unscoped Realtime Subscriptions

**Files:**
- `src/hooks/useJobIssues.ts:62-75`
- `src/hooks/usePartIssues.ts` (similar pattern)

```typescript
const subscription = supabase
  .channel(`job-issues-${jobId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'issues',
    // NO FILTER! Listens to ALL issues changes
  })
```

**Impact:** Every issue change in the entire tenant triggers a callback, even when viewing a single job.

**Solution:** Add a filter (note: requires database relationship):
```typescript
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'issues',
  filter: `job_id=eq.${jobId}`,  // Scope to specific job
})
```

---

### 3. Sequential Queries (N+1 Pattern)

**File:** `src/pages/admin/Parts.tsx:90-138`

```typescript
queryFn: async () => {
  // Query 1: Fetch all parts
  const { data, error } = await query;

  // Query 2: Separate query to check children
  const { data: allChildRelations } = await supabase
    .from("parts")
    .select("parent_part_id")
    .not("parent_part_id", "is", null);
```

**Impact:** Two database round-trips where one would suffice.

**Solution:** Use a subquery or add a computed `has_children` field to the database.

---

## Moderate Issues

### 4. Multiple RPC Calls per Cell

**File:** `src/hooks/useQRMMetrics.ts:617-625`

```typescript
const metricsPromises = (cells || []).map(async (cell) => {
  const { data } = await supabase.rpc("get_cell_qrm_metrics", {
    cell_id_param: cell.id,
    tenant_id_param: tenantId,
  });
  return { cellId: cell.id, data };
});
```

**Impact:** 50 cells = 50 separate RPC calls, significant network overhead.

**Solution:** Create a batch RPC function that accepts an array of cell IDs:
```sql
CREATE FUNCTION get_all_cells_qrm_metrics(tenant_id_param uuid)
RETURNS TABLE(cell_id uuid, ...)
```

---

### 5. Overly Broad SELECT Statements

**Multiple files use `select("*")` when only a few columns are needed:**

| File | Line | Issue |
|------|------|-------|
| `src/hooks/usePendingIssuesCount.ts` | 13 | Uses `select('*')` for count query |
| `src/pages/operator/WorkQueue.tsx` | 75 | Selects all columns |
| `src/hooks/useNotifications.ts` | 38 | Selects all columns |
| `src/components/scheduler/AutoScheduleButton.tsx` | 26-38 | Multiple `select("*")` calls |
| `src/hooks/useExpectations.ts` | 39, 242 | Selects all columns |

**Impact:** Unnecessary data transfer, increased payload size.

**Solution:** Specify only required columns:
```typescript
// Instead of
.select('*', { count: 'exact', head: true })

// Use
.select('id', { count: 'exact', head: true })
```

---

### 6. Potential Memory Leak in Realtime Cleanup

**File:** `src/hooks/useRealtimeSubscription.ts:189`

```typescript
return () => {
  channel.unsubscribe();  // May not fully clean up
};
```

**Solution:** Use `supabase.removeChannel()` for complete cleanup:
```typescript
return () => {
  supabase.removeChannel(channel);
};
```

---

## Minor Issues

### 7. Date Formatting in Loops

**File:** `src/hooks/useOEEMetrics.ts:137-143`

```typescript
.map(date => {
  const dayStr = format(date, "yyyy-MM-dd");
  const dayOps = completedOps.filter(o =>
    o.completed_at && format(new Date(o.completed_at), "yyyy-MM-dd") === dayStr
  );
```

**Impact:** `format()` called inside nested loops. For 30 days with 100 operations, that's 3,000+ format calls.

**Solution:** Pre-format dates outside the loop:
```typescript
const completedOpsWithDay = completedOps.map(o => ({
  ...o,
  dayStr: o.completed_at ? format(new Date(o.completed_at), "yyyy-MM-dd") : null
}));
```

---

### 8. Unused Columns in Queries

**File:** `src/hooks/useOEEMetrics.ts:53-67`

```typescript
.select(`
  id,
  ...
  cells(name, capacity_hours_per_day)  // capacity_hours_per_day not used
`)
```

---

## Recommendations Priority

### Phase 1 - High Impact (Do First)
1. Fix O(n^2) algorithm in `useOEEMetrics.ts` - use Map for lookups
2. Add filters to realtime subscriptions in `useJobIssues.ts` and `usePartIssues.ts`
3. Combine sequential queries in `Parts.tsx`

### Phase 2 - Medium Priority
4. Create batch RPC for `useAllCellsQRMMetrics`
5. Replace `select("*")` with specific column lists
6. Fix realtime channel cleanup pattern

### Phase 3 - Low Priority
7. Optimize date formatting in loops
8. Remove unused columns from SELECT statements

---

## Estimated Impact

| Issue | Severity | Performance Gain |
|-------|----------|------------------|
| O(n^2) algorithm fix | Critical | 10-100x faster for large datasets |
| Scoped realtime | Critical | Reduces callback frequency 90%+ |
| Batch RPC | Moderate | Reduces network calls by N-1 |
| Specific SELECTs | Minor | 10-30% payload reduction |

---

## Verification Steps

After implementing fixes:
1. Profile with React DevTools to verify reduced re-renders
2. Monitor Supabase realtime connections in dashboard
3. Check network tab for reduced query count
4. Benchmark large dataset operations before/after
