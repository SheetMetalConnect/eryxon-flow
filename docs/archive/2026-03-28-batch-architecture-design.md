# Batch Handling Architecture — Design Spec

## Core Model

A **batch** is a set of operations (from potentially different jobs) that are processed together as one physical unit. Examples: a laser nesting sheet with parts from 5 jobs, a tube batch cut in one saw run.

**Time tracking:** One timer per batch. When stopped, total time is divided across operations automatically (weighted by `estimated_time` when available, equal split as fallback).

**Input channels:**
- **Terminal UI** — Operator selects/scans batch, starts/stops timer
- **REST API** — ERP systems create batches, update status via edge functions
- **CADCAM interfaces** — Nesting software reports batch creation and completion via API + webhooks

---

## 1. API Layer (Edge Function)

**New:** `supabase/functions/api-batches/index.ts`

Built on the existing `crud-builder.ts` pattern. Supports full CRUD + lifecycle actions.

### Endpoints

| Method | Path | Action |
|--------|------|--------|
| GET | `/api-batches` | List batches (paginated, filterable by status/type/cell/date) |
| GET | `/api-batches/:id` | Get batch detail with operations, requirements |
| POST | `/api-batches` | Create batch + assign operations in one call |
| PATCH | `/api-batches/:id` | Update batch fields |
| DELETE | `/api-batches/:id` | Delete batch (cascades batch_operations) |
| POST | `/api-batches/:id/start` | Start batch → creates time entries, sets in_progress |
| POST | `/api-batches/:id/stop` | Stop batch → distributes time, sets completed |
| POST | `/api-batches/:id/operations` | Add operations to existing batch |
| DELETE | `/api-batches/:id/operations/:opId` | Remove operation from batch |

### Create Payload (POST)

```json
{
  "batch_number": "NEST-20260328-A1B2",
  "batch_type": "laser_nesting",
  "cell_id": "uuid",
  "material": "S235",
  "thickness_mm": 3.0,
  "operation_ids": ["uuid1", "uuid2", "uuid3"],
  "parent_batch_id": "uuid-or-null",
  "nesting_metadata": { "cutting_technology": "fiber_laser", "gas": "nitrogen" },
  "notes": "Optional notes"
}
```

### Start/Stop Payloads

```json
// POST /api-batches/:id/start
{ "operator_id": "uuid" }

// POST /api-batches/:id/stop
{ "operator_id": "uuid" }
// Returns: { "total_minutes": 45, "operations": [{ "id": "...", "allocated_minutes": 15 }, ...] }
```

---

## 2. Webhook Events

Extend the existing webhook system (`api-webhooks/`) with batch events.

| Event | Trigger | Payload |
|-------|---------|---------|
| `batch.created` | POST /api-batches | Batch + operation IDs |
| `batch.started` | POST /api-batches/:id/start | Batch + operator + timestamp |
| `batch.completed` | POST /api-batches/:id/stop | Batch + time distribution per op |
| `batch.status_changed` | Any status transition | Batch + old_status + new_status |
| `batch.operations_changed` | Add/remove ops | Batch + added/removed op IDs |

CADCAM systems subscribe to `batch.completed` to know when a nesting sheet is done.
ERP systems subscribe to `batch.created` and `batch.completed` for production tracking.

---

## 3. Terminal Integration

### Operator Batch View

Add batch awareness to the operator terminal. Two modes:

**A) Batch List (new tab/section in operator view)**
- Shows batches assigned to the operator's cell
- Status badge, operation count, material info
- "Start" button → starts batch timer for all ops
- "Stop" button → stops timer, auto-distributes time
- Tap batch to see operations inside it

**B) Operation-level (existing behavior)**
- Operations that belong to a batch show a batch badge
- Tapping an operation that's part of a batch shows batch context
- Individual timing still works for non-batched operations

### Batch Selection Flow (Terminal)

```
Operator opens terminal
  → Sees cell selector (existing)
  → Below work queue: "Batches" section
  → Lists batches for selected cell (status: draft, ready, in_progress)
  → Tap batch → expand to see operations
  → "Start Batch" → timer starts, all ops go in_progress
  → "Stop Batch" → timer stops, time distributed, batch completed
```

### Data Requirements

`useOperatorTerminal.ts` needs to also fetch batches for the selected cell:

```ts
const { data: batches } = useQuery({
  queryKey: ['operator', 'batches', cellId],
  queryFn: () => supabase
    .from('operation_batches')
    .select('*, batch_ops:batch_operations(operation_id)')
    .eq('cell_id', cellId)
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'ready', 'in_progress'])
    .order('created_at', { ascending: false }),
  enabled: !!cellId && !!tenantId,
});
```

---

## 4. Time Distribution Algorithm

Current: equal split (`total / opCount`, remainder to first ops).

**Proposed: weighted by estimated_time** (falls back to equal if no estimates).

```ts
function distributeTime(totalMinutes: number, operations: { id: string; estimated_time: number | null }[]) {
  const withEstimates = operations.filter(op => op.estimated_time && op.estimated_time > 0);

  if (withEstimates.length === operations.length) {
    // All ops have estimates → weighted distribution
    const totalEstimated = operations.reduce((sum, op) => sum + (op.estimated_time ?? 0), 0);
    return operations.map(op => ({
      id: op.id,
      allocated_minutes: Math.round((op.estimated_time! / totalEstimated) * totalMinutes),
    }));
  }

  // Fallback: equal split
  const base = Math.floor(totalMinutes / operations.length);
  const remainder = totalMinutes - base * operations.length;
  return operations.map((op, i) => ({
    id: op.id,
    allocated_minutes: base + (i < remainder ? 1 : 0),
  }));
}
```

---

## 5. Fix: Edit Operations After Creation

Currently disabled in UI. Enable it:

1. **BatchDetail** — "Add Operations" button opens a dialog
2. Dialog shows available operations (same cell, not in another batch)
3. Uses existing `useAddOperationsToBatch()` hook
4. "Remove" button on each operation row in BatchOperationsTable
5. Uses existing `useRemoveOperationFromBatch()` hook
6. Only allowed when batch status is `draft` or `ready`

---

## 6. Export Integration

Add `operation_batches`, `batch_operations`, `batch_requirements` to `api-export` edge function.

---

## 7. Implementation Phases

### Phase 1: Fix Core (immediate)
- Fix React #185 crash (done)
- Fix CapacityMatrix 400 (done)
- Enable "Add/Remove operations" UI in BatchDetail
- Fix edit mode in BatchCreate

### Phase 2: API Layer
- Create `api-batches` edge function with full CRUD + lifecycle
- Add batch webhook events
- Add batch tables to api-export
- Update API test suite

### Phase 3: Terminal Integration
- Add batch section to operator view
- Batch start/stop from terminal
- Batch badge on operations that belong to a batch

### Phase 4: CADCAM Integration
- Webhook subscriptions for CADCAM systems
- Nesting metadata round-trip (CADCAM creates batch with metadata → operator processes → CADCAM gets completion webhook)
- Weighted time distribution

---

## File Map

| New/Modify | File | Purpose |
|------------|------|---------|
| Create | `supabase/functions/api-batches/index.ts` | Batch CRUD + lifecycle API |
| Create | `supabase/functions/api-batches/deno.json` | Import map |
| Modify | `supabase/functions/api-webhooks/index.ts` | Add batch event types |
| Modify | `supabase/functions/api-export/index.ts` | Add batch tables |
| Modify | `src/pages/admin/BatchDetail.tsx` | Enable add/remove operations |
| Create | `src/components/batch/AddOperationsDialog.tsx` | Dialog for adding ops to batch |
| Modify | `src/components/batch/BatchOperationsTable.tsx` | Add remove button |
| Create | `src/components/operator/OperatorBatchSection.tsx` | Batch list in terminal |
| Modify | `src/hooks/useOperatorTerminal.ts` | Fetch batches for cell |
| Modify | `src/pages/operator/OperatorView.tsx` | Include batch section |
| Modify | `src/lib/database.ts` | Weighted time distribution |
| Modify | `scripts/test-api-automated.sh` | Batch API tests |
