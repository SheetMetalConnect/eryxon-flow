# Code Conventions — Eryxon Flow

> Quick-reference for agents. Patterns to follow when adding new code.

## File Naming

| Area | Pattern | Example |
|------|---------|---------|
| Components | PascalCase.tsx | `JobDetail.tsx`, `PartCreate.tsx` |
| Pages | PascalCase.tsx | `Dashboard.tsx`, `Settings.tsx` |
| Hooks | camelCase with `use` prefix | `useJobIssues.ts`, `useServerPagination.ts` |
| Utils/lib | camelCase.ts | `queryClient.ts`, `searchService.ts` |
| Edge Functions | kebab-case directory | `api-jobs/`, `api-time-entries/` |
| Migrations | timestamp_description.sql | `20260121175020_remote_schema.sql` |
| Tests | same name + `.test.ts(x)` | `useDebounce.test.ts` |
| Types | camelCase.ts | `metadata.ts`, `qrm.ts` |
| i18n | locale code directory | `en/`, `nl/`, `de/` |

## Component Pattern

```tsx
// src/components/admin/ExampleWidget.tsx
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ExampleWidget({ jobId }: { jobId: string }) {
  const { t } = useTranslation();
  // TanStack Query hook for data
  // shadcn/ui components for layout
  // Sonner for toast notifications
}
```

## Hook Pattern

```tsx
// src/hooks/useExampleData.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useExampleData(id: string) {
  return useQuery({
    queryKey: ["example", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("examples")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
```

## Edge Function Pattern

```ts
// supabase/functions/api-examples/index.ts
import { serveApi } from "@shared/handler.ts";
import { createCrudHandler } from "@shared/crud-builder.ts";

serveApi(createCrudHandler({
  table: "examples",
  selectFields: "*, parent(id, name)",
  searchFields: ["name", "description"],
  allowedFilters: ["status", "category"],
  sortableFields: ["created_at", "name"],
  defaultSort: { field: "created_at", direction: "desc" },
}));
```

Each function directory needs its own `deno.json`:
```json
{ "imports": { "@shared/": "../_shared/" } }
```

## Page Pattern

```tsx
// src/pages/admin/ExamplePage.tsx
import { AdminLayout } from "@/components/AdminLayout";

export default function ExamplePage() {
  return (
    <AdminLayout>
      {/* Page content using hooks + components */}
    </AdminLayout>
  );
}
```

## Route Registration

Add to `src/routes/adminRoutes.tsx` or `operatorRoutes.tsx`:
```tsx
<Route path="/admin/examples" element={<LazyRoute><ExamplePage /></LazyRoute>} />
```

## Database Conventions

- All tables have: `id` (uuid PK), `tenant_id` (FK), `created_at`, `updated_at`
- Soft delete: `deleted_at`, `deleted_by` columns
- ERP sync: `external_id`, `external_source`, `synced_at`, `sync_hash`
- RLS policy required on every table
- snake_case for all column and table names
- FK hints required when table has multiple FKs to same target: `!column_name`

## i18n

All UI text uses translation keys:
```tsx
const { t } = useTranslation();
<p>{t("jobs.status.in_progress")}</p>
```

Keys go in `src/i18n/en/`, `nl/`, `de/`. English is the primary language.

## Imports

Use `@/` path alias for all src imports:
```tsx
import { Button } from "@/components/ui/button";
import { useJobIssues } from "@/hooks/useJobIssues";
```

## Commit Messages

Conventional commits: `feat:`, `fix:`, `deps:`, `docs:`, `chore:`, `refactor:`

## Module Boundaries

| Rule | Limit |
|------|-------|
| Max lines per component | 400 |
| Max lines per hook | 200 |
| Max lines per utility module | 300 |
| Max functions per class | 10 |
| Max imports of a single hook | 30 (split if exceeded) |

When a file exceeds these limits, decompose it before adding new functionality.
