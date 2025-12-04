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
