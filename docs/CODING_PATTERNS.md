# Coding Patterns & Technical Reference

Technical patterns and code examples for Eryxon MES development. For high-level principles and guidelines, see [CLAUDE.md](../CLAUDE.md).

---

## Supabase Types Architecture

Types are organized in a modular structure under `src/integrations/supabase/types/`:

```
types/
├── base.ts           # Json type, InternalSupabaseConfig
├── enums.ts          # All database enums + EnumConstants
├── tables/           # Domain-grouped table definitions
│   ├── core.ts       # tenants, profiles, user_roles, invitations
│   ├── jobs.ts       # jobs, parts, operations, cells
│   ├── issues.ts     # issues, issue_categories, scrap_reasons
│   ├── time-tracking.ts  # time_entries, operation_quantities
│   └── ...           # billing, integrations, shipping, etc.
├── views.ts          # Database views
├── functions.ts      # RPC functions
├── helpers.ts        # Tables<>, TablesInsert<>, TablesUpdate<>
├── database.ts       # Main Database type combining all modules
└── index.ts          # Barrel export
```

**Import patterns:**
```tsx
// Import helper types for database operations
import type { Tables, TablesInsert } from '@/integrations/supabase/types'

// Use with table operations
type Job = Tables<'jobs'>
type JobInsert = TablesInsert<'jobs'>
```

---

## Supabase Realtime Subscriptions

**CRITICAL: Always return the cleanup function from useEffect to prevent memory leaks.**

```tsx
// CORRECT - cleanup is returned
useEffect(() => {
  if (!profile?.tenant_id) return;
  loadData();
  return setupRealtime(); // Returns cleanup function
}, [profile?.tenant_id]);

const setupRealtime = () => {
  const channel = supabase
    .channel("my-channel")
    .on("postgres_changes", { event: "*", schema: "public", table: "my_table" }, () => loadData())
    .subscribe();

  return () => supabase.removeChannel(channel); // Cleanup function
};

// INCORRECT - memory leak!
useEffect(() => {
  if (profile?.tenant_id) {
    loadData();
    setupRealtime(); // Cleanup function not returned - channels accumulate!
  }
}, [profile?.tenant_id]);
```

---

## Data Fetching Patterns

### Standard Query with React Query

```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useJobs(tenantId: string) {
  return useQuery({
    queryKey: ['jobs', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          parts (
            id,
            part_number,
            operations (*)
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId
  });
}
```

### Mutation Pattern

```tsx
const mutation = useMutation({
  mutationFn: async (newData) => {
    const { data, error } = await supabase
      .from('table_name')
      .insert(newData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['entity-name'] });
  }
});
```

---

## Admin Page Layout

Use standardized components for consistent UI:

```tsx
import { useTranslation } from 'react-i18next';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { PageStatsRow } from '@/components/admin/PageStatsRow';
import { DataTable } from '@/components/ui/data-table/DataTable';
import { Plus, Briefcase, PlayCircle, CheckCircle2 } from 'lucide-react';

export default function NewPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyDataHook();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <AdminPageHeader
        title={t('newFeature.title')}
        description={t('newFeature.description')}
        action={{
          label: t('newFeature.create'),
          onClick: () => navigate('/admin/new'),
          icon: Plus,
        }}
      />

      {/* Stats Row - 3-4 key metrics */}
      <PageStatsRow
        stats={[
          { label: t('newFeature.total'), value: data?.length || 0, icon: Briefcase, color: 'primary' },
          { label: t('newFeature.active'), value: activeCount, icon: PlayCircle, color: 'warning' },
          { label: t('newFeature.completed'), value: completedCount, icon: CheckCircle2, color: 'success' },
        ]}
      />

      {/* Content */}
      <div className="glass-card p-4">
        <DataTable
          columns={columns}
          data={data || []}
          filterableColumns={filterableColumns}
          searchPlaceholder={t('newFeature.search')}
          emptyMessage={t('newFeature.noResults')}
          loading={isLoading}
          onRowClick={(row) => setSelectedId(row.id)}
        />
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <DetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
```

**UX Best Practices:**
- **Row click** = Opens detail modal (primary action)
- **Three-dot menu** = Additional actions (edit, delete) - only when needed
- Never add redundant "View" action column

---

## Toast Notifications

```tsx
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();

  const handleSuccess = () => {
    toast.success(t('jobs.createSuccess'));
  };

  const handleError = (error: Error) => {
    toast.error(t('common.error'), {
      description: error.message
    });
  };
}
```

---

## Error Handling

Always handle loading, error, and empty states:

```tsx
const { data, error, isLoading } = useQuery({...});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={t('common.error')} />;
if (!data?.length) return <EmptyState message={t('jobs.noJobsFound')} />;
```

---

## TypeScript Patterns

### Interface Definitions

```tsx
interface Job {
  id: string;
  job_number: string;
  customer: string;
  status: 'active' | 'completed' | 'on_hold';
}
```

### Component Props

```tsx
interface JobCardProps {
  job: Job;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function JobCard({ job, onEdit, onDelete }: JobCardProps) {
  // ...
}
```

---

## Import Patterns

Use barrel exports for cleaner imports:

```tsx
// Good - use barrel exports
import { Auth, AcceptInvitation } from "./pages/auth";
import { ApiKeys, Materials, Users } from "./pages/admin/config";
import { MyPlan, Pricing, Help } from "./pages/common";

// Avoid - direct file imports (unless not in barrel)
import Auth from "./pages/auth/Auth";
```

---

## Error Handling with AppError

Use the centralized error utilities for consistent error handling:

```tsx
import { AppError, ErrorCode, getErrorMessage, fromSupabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Convert Supabase errors to AppError
const { data, error } = await supabase.from('jobs').select('*');
if (error) {
  throw fromSupabaseError(error, { operation: 'fetchJobs' });
}

// Safe error message extraction
try {
  await someOperation();
} catch (error) {
  const message = getErrorMessage(error); // Always returns string
  logger.error('Operation failed', error, { operation: 'myOperation' });
  toast.error(message);
}

// User-friendly error messages
const appError = fromSupabaseError(error);
toast.error(appError.toUserMessage()); // "The requested resource was not found."
```

For detailed error handling patterns, see [docs/ERROR_HANDLING.md](./ERROR_HANDLING.md).

---

## Structured Logging

Use the logger for consistent, context-aware logging:

```tsx
import { logger, createScopedLogger } from '@/lib/logger';

// Basic logging with context
logger.info('Job created', {
  operation: 'createJob',
  entityType: 'job',
  entityId: jobId,
  tenantId,
});

logger.error('Failed to update operation', error, {
  operation: 'updateOperation',
  entityId: operationId,
});

// Scoped logger for hooks/components
const log = createScopedLogger({
  operation: 'useJobOperations',
  entityType: 'job',
});

log.info('Fetching job data');
log.error('Failed to fetch', error);

// Performance timing
const data = await logger.timedAsync('fetchMetrics', async () => {
  return await fetchAllMetrics();
});
```

---

## Realtime Subscriptions with Filtering

**Always filter subscriptions to reduce scope and prevent cascade refetches:**

```tsx
import { useDebouncedCallback } from '@/hooks/useDebounce';

// GOOD - filtered by tenant_id with debouncing
useEffect(() => {
  if (!tenantId) return;

  const debouncedFetch = useDebouncedCallback(fetchData, 200);

  const channel = supabase
    .channel(`operations-${tenantId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'operations',
      filter: `tenant_id=eq.${tenantId}`, // Filter to reduce scope
    }, () => {
      debouncedFetch(); // Debounce to prevent cascade
    })
    .subscribe();

  return () => channel.unsubscribe();
}, [tenantId]);

// BAD - no filter, triggers on ALL operations across all tenants
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'operations',
  // No filter - will trigger on every operation change!
}, () => fetchData())
```

**Or use the reusable subscription hook:**

```tsx
import { useRealtimeSubscription, useTenantSubscription } from '@/hooks/useRealtimeSubscription';

// Tenant-scoped subscription
useTenantSubscription(
  'operations',
  tenantId,
  () => refetch(),
  { debounceMs: 200 }
);

// Multiple tables
useRealtimeSubscription({
  channelName: 'production-updates',
  tables: [
    { table: 'operations', filter: `cell_id=eq.${cellId}` },
    { table: 'time_entries', filter: `tenant_id=eq.${tenantId}` },
  ],
  onDataChange: handleUpdate,
  debounceMs: 300,
});
```

---

## QueryKeys and Cache Management

Use the QueryKeys factory for consistent cache keys:

```tsx
import { QueryKeys, StaleTime, CacheTime } from '@/lib/queryClient';
import { invalidateOperationCaches } from '@/lib/cacheInvalidation';

// Query with standard key
const { data } = useQuery({
  queryKey: QueryKeys.jobs.all(tenantId),
  queryFn: fetchJobs,
  staleTime: StaleTime.SHORT, // 30 seconds
});

// Invalidate related caches on mutation
const mutation = useMutation({
  mutationFn: updateOperation,
  onSuccess: () => {
    invalidateOperationCaches(queryClient, tenantId, operationId, cellId);
  },
});
```

**Stale time presets:**
- `StaleTime.VERY_SHORT` - 10s (active operations, work queue)
- `StaleTime.SHORT` - 30s (job lists, default)
- `StaleTime.MEDIUM` - 2min (cell configurations)
- `StaleTime.LONG` - 5min (user profiles)
- `StaleTime.VERY_LONG` - 15min (app settings)

---

## Modal & Dialog Design Philosophy

### Core Principle: Modals Must Always Be Completable

Every modal in the app must fit within the viewport with action buttons always reachable. Inspired by Linear, Pipedrive, and Asana -- modals use a **fixed header + scrollable body + sticky footer** pattern.

### Two-Tier System

The modal system has two layers of protection:

**Layer 1: Base Safety Net (`dialog.tsx`)**

The base `DialogContent` component enforces viewport constraints on ALL modals automatically:

```tsx
// Mobile: bottom-sheet style
"max-h-[calc(100vh-1rem)] overflow-y-auto"

// Desktop: centered with max height
"sm:max-h-[85vh]"
```

This means even simple modals with no explicit flex layout will never overflow the viewport.

**Layer 2: Premium Flex Pattern (individual modals)**

Complex modals with many fields use the full flex layout for sticky footers:

```tsx
<DialogContent className="glass-card sm:max-w-lg overflow-hidden flex flex-col">
  {/* Fixed header - never scrolls */}
  <DialogHeader className="shrink-0">
    <DialogTitle>{title}</DialogTitle>
  </DialogHeader>

  {/* Scrollable body - takes remaining space */}
  <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
    {/* Form fields, content, etc. */}
  </div>

  {/* Sticky footer - always visible */}
  <div className="shrink-0 flex justify-end gap-2 border-t pt-4">
    <Button variant="outline" onClick={onClose}>Cancel</Button>
    <Button onClick={onSave}>Save</Button>
  </div>
</DialogContent>
```

### When to Use Which Pattern

| Modal Type | Pattern | Example |
|------------|---------|---------|
| **Simple** (1-3 fields) | Base safety net only | ApiKeys, ProductionQuantity, Assignments |
| **Medium** (4-8 fields) | Full flex layout | Webhooks, Materials, ScrapReasons |
| **Complex** (many fields/sections) | Full flex layout | Stages, Resources, MqttPublishers |
| **With forms** | Flex + form wrapper | Stages, Resources, Materials |
| **With tabs** | Flex + tabbed content | IntegrationDetailModal |
| **Read-only detail** | Flex (no footer needed) | MyIssues, IssueQueue detail view |
| **Confirm dialogs** | None (always compact) | ConfirmDialog |

### The Flex Layout Pattern Explained

```
┌─ DialogContent (overflow-hidden flex flex-col) ──┐
│                                                   │
│  ┌─ Header (shrink-0) ────────────────────────┐  │
│  │  Title, Description                         │  │
│  └─────────────────────────────────────────────┘  │
│  ── border-t ──────────────────────────────────── │
│  ┌─ Body (flex-1 overflow-y-auto min-h-0) ────┐  │
│  │                                             │  │
│  │  Form fields, content...                    │  │
│  │  This area scrolls when content overflows   │  │
│  │                                             │  │
│  └─────────────────────────────────────────────┘  │
│  ── border-t ──────────────────────────────────── │
│  ┌─ Footer (shrink-0) ────────────────────────┐  │
│  │  [Cancel]  [Save]                           │  │
│  └─────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

**Critical CSS classes:**
- `overflow-hidden` on container: Prevents the container itself from scrolling (overrides base `overflow-y-auto` via tailwind-merge)
- `flex flex-col` on container: Enables the flex layout
- `shrink-0` on header/footer: Prevents them from collapsing
- `flex-1` on body: Takes all remaining vertical space
- `overflow-y-auto` on body: Enables scrolling within the body only
- `min-h-0` on body: Critical -- allows flex child to shrink below content size

### Form Dialogs: Wrapping with `<form>`

When a dialog contains a form, wrap the body + footer inside the `<form>` tag:

```tsx
<DialogContent className="glass-card sm:max-w-lg overflow-hidden flex flex-col">
  <DialogHeader className="shrink-0">
    <DialogTitle>{title}</DialogTitle>
  </DialogHeader>

  <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
    <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
      {/* Form fields */}
    </div>

    <div className="shrink-0 border-t pt-4 mt-4 flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit">Save</Button>
    </div>
  </form>
</DialogContent>
```

The `<form>` gets `flex-1 flex flex-col min-h-0` so it acts as a nested flex container.

### Using the `ModalDialog` / `FormDialog` Wrappers

For new modals, prefer using the pre-built wrappers from `modal-dialog.tsx`:

```tsx
import { ModalDialog } from '@/components/ui/modal-dialog';

// Simple modal with the pattern built-in
<ModalDialog
  open={isOpen}
  onClose={onClose}
  title="My Modal"
  description="Optional description"
  size="md"  // sm | md | lg | xl | full
  actions={
    <>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={onSave}>Save</Button>
    </>
  }
>
  {/* Content goes here - automatically scrollable */}
</ModalDialog>
```

```tsx
import { FormDialog } from '@/components/ui/modal-dialog';

// Form modal with submit handling built-in
<FormDialog
  open={isOpen}
  onClose={onClose}
  onSubmit={handleSubmit}
  title="Create Resource"
  submitText="Create"
  size="lg"
>
  {/* Form fields - automatically scrollable */}
</FormDialog>
```

### Scrollbar Styling

Premium thin scrollbars are applied globally to all dialogs via `design-system.css`:

```css
[role="dialog"] ::-webkit-scrollbar { width: 6px; }
[role="dialog"] ::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.25);
  border-radius: 3px;
}
[role="dialog"] * { scrollbar-width: thin; }
```

### Checklist for New Modals

Before completing any modal:

- [ ] `DialogContent` has `overflow-hidden flex flex-col` (if using flex pattern)
- [ ] Header has `shrink-0`
- [ ] Body has `flex-1 overflow-y-auto min-h-0`
- [ ] Footer/action buttons have `shrink-0` and are OUTSIDE the scrollable body
- [ ] Footer has `border-t pt-4` for visual separation
- [ ] Action buttons are always reachable regardless of content height
- [ ] Modal works on mobile (bottom-sheet) and desktop (centered)
- [ ] Select/dropdown menus render in portals (Radix default) and aren't clipped

### Common Mistakes to Avoid

```tsx
// BAD - Action buttons inside scrollable area (scroll away on long content)
<div className="flex-1 overflow-y-auto min-h-0">
  {/* content */}
  <Button>Save</Button>  {/* This scrolls away! */}
</div>

// BAD - Missing min-h-0 (body won't shrink, breaks scroll)
<div className="flex-1 overflow-y-auto">  {/* Missing min-h-0! */}

// BAD - Using max-h + overflow-y-auto on DialogContent directly
<DialogContent className="max-h-[80vh] overflow-y-auto">
  {/* Entire modal scrolls including footer - buttons scroll away */}

// BAD - Hardcoded height instead of flex
<DialogContent className="h-[600px]">  {/* Breaks on small screens */}
```

---

## Quick Reference Commands

```bash
# Start development
npm run dev

# Type checking
npm run typecheck

# Build
npm run build

# Add shadcn component
npx shadcn@latest add [component-name]
```

---

## KISS & SOLID Principles

This section documents patterns identified during code review, with guidance on maintaining clean, maintainable code following KISS (Keep It Simple, Stupid) and SOLID principles.

### Avoid Code Duplication (DRY Principle)

**Problem Found:** Two separate files (`webhooks.ts` and `event-dispatch.ts`) both defined the same event types and similar dispatch functions.

```tsx
// BAD - Duplicated event types in two files
// webhooks.ts
export type WebhookEvent = 'job.created' | 'operation.started' | ...;

// event-dispatch.ts
export type EventType = 'job.created' | 'operation.started' | ...;
```

**Solution:** Consolidate into a single unified module that handles all dispatch targets.

```tsx
// GOOD - Single source of truth in event-dispatch.ts
export type EventType =
  | 'job.created'
  | 'operation.started'
  | 'operation.completed'
  // ... all event types in one place

export async function dispatchEvent(tenantId: string, eventType: EventType, data: EventPayload) {
  // Dispatches to BOTH webhooks AND MQTT
  await dispatchToWebhooks(tenantId, eventType, data);
  await dispatchToMqtt(tenantId, eventType, data);
}
```

**SOLID Principle:** Single Responsibility - One module handles event dispatch to all targets.

---

### Strong TypeScript Typing (No `any` Casts)

**Problem Found:** Multiple `any` type casts in database query results.

```tsx
// BAD - Using 'any' loses type safety
const operationData: any = operation;
const earliestCell = operations.reduce((earliest, o: any) => ...);
```

**Solution:** Define explicit interfaces for query results.

```tsx
// GOOD - Proper TypeScript interfaces
interface OperationQueryResult {
  status: string;
  part_id: string;
  cell_id: string;
  operation_name: string;
  part: {
    id: string;
    part_number: string;
    job: {
      id: string;
      job_number: string;
    };
  };
}

// Cast once with proper type
const operationData = operation as OperationQueryResult;
```

**Benefits:**
- IDE autocompletion works correctly
- Compile-time error detection
- Self-documenting code
- Refactoring safety

**SOLID Principle:** Dependency Inversion - Depend on abstractions (interfaces), not concretions (any).

---

### Test Mocking Best Practices

**Problem Found:** Tests failing because modules were imported before mocks were set up, or mock state leaked between tests.

```tsx
// BAD - Module imports before mock, mock state leaks
import { searchAll } from './searchService';  // Imports real supabase client!

vi.mock('@/integrations/supabase/client', () => ({...}));  // Too late!

it('test 1', async () => {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }});
  // This mock state persists to next test!
});

it('test 2', async () => {
  // Still has null session from previous test
});
```

**Solution:** Mock before imports and reset in beforeEach.

```tsx
// GOOD - Mock defined at module level, resets in beforeEach
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create controllable mock function
const mockGetSession = vi.fn();

// Mock BEFORE any imports that use supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
  },
}));

describe('myModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default authenticated state
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    });
  });

  it('handles unauthenticated state', async () => {
    // Override for this specific test
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { myFunction } = await import('./myModule');
    // Test unauthenticated behavior
  });

  it('handles authenticated state', async () => {
    // Uses default authenticated mock from beforeEach
    const { myFunction } = await import('./myModule');
    // Test authenticated behavior
  });
});
```

**Key Rules:**
1. Define mocks at module level, before imports
2. Use controllable mock functions (not inline implementations)
3. Reset mocks in `beforeEach`
4. Use dynamic `import()` for modules that depend on mocked dependencies

**KISS Principle:** Simple, predictable test setup that's easy to understand.

---

### Event Dispatch for All Key Actions

**Problem Found:** Job creation didn't dispatch events, making it invisible to webhooks and MQTT integrations.

```tsx
// BAD - Creating data without dispatching events
const { data: job } = await supabase.from('jobs').insert({...}).select().single();
return job;  // No event dispatched!
```

**Solution:** Dispatch events for all business-significant actions.

```tsx
// GOOD - Dispatch events after successful operations
const { data: job } = await supabase.from('jobs').insert({...}).select().single();

// Dispatch event (non-blocking)
dispatchJobCreated(tenantId, {
  job_id: job.id,
  job_number: job.job_number,
  customer: job.customer || '',
  parts_count: parts.length,
  operations_count: totalOperations,
  created_at: job.created_at,
}).catch(error => {
  console.error('Failed to dispatch job.created event:', error);
  // Don't fail the operation if event dispatch fails
});

return job;
```

**Key Events to Always Dispatch:**
- `job.created`, `job.completed`
- `operation.started`, `operation.completed`, `operation.paused`, `operation.resumed`
- `issue.created`
- `production.quantity_reported`, `production.scrap_recorded`

**SOLID Principle:** Open/Closed - System is open for extension (new integrations) without modifying core logic.

---

### Interface Segregation for Query Results

**Problem Found:** Large, monolithic query results make it hard to know what fields are available.

```tsx
// BAD - Unclear what fields are returned
const { data: operation } = await supabase
  .from('operations')
  .select('*, part:parts!inner(*, job:jobs!inner(*))')
  .eq('id', operationId)
  .single();

// What fields does 'operation' have? No way to know without checking query.
```

**Solution:** Define focused interfaces for specific query patterns.

```tsx
// GOOD - Interfaces match query shapes
interface OperationWithPart {
  id: string;
  operation_name: string;
  status: string;
  part: {
    id: string;
    part_number: string;
    job: {
      id: string;
      job_number: string;
    };
  };
}

// Query with explicit select
const { data } = await supabase
  .from('operations')
  .select(`
    id,
    operation_name,
    status,
    part:parts!inner(
      id,
      part_number,
      job:jobs!inner(id, job_number)
    )
  `)
  .eq('id', operationId)
  .single();

const operation = data as OperationWithPart;
```

**SOLID Principle:** Interface Segregation - Define small, focused interfaces rather than large, generic ones.

---

### Graceful Error Handling in Event Dispatch

**Problem Found:** Event dispatch failures could potentially fail the main operation.

```tsx
// BAD - Synchronous await can fail the whole operation
await dispatchEvent(tenantId, 'job.created', data);  // If this fails, job creation fails!
```

**Solution:** Use non-blocking dispatch with error catching.

```tsx
// GOOD - Non-blocking with error logging
dispatchEvent(tenantId, 'job.created', data).catch(error => {
  console.error('Failed to dispatch event:', error);
  // Don't fail the main operation
});

// The main operation continues regardless of event dispatch result
return job;
```

**When to Use Blocking vs Non-Blocking:**
- **Non-blocking**: Event notifications, webhooks, analytics
- **Blocking**: Operations that must succeed together (database transactions)

---

### Summary: KISS & SOLID Checklist

Before completing code:

- [ ] **No duplication** - Single source of truth for types and functions
- [ ] **No `any` types** - Proper TypeScript interfaces for all data
- [ ] **Test isolation** - Mocks reset between tests, no state leakage
- [ ] **Events dispatched** - All business actions trigger appropriate events
- [ ] **Focused interfaces** - Small, specific interfaces for query results
- [ ] **Graceful errors** - Event dispatch failures don't crash operations
- [ ] **Simple patterns** - Code is easy to understand at a glance

