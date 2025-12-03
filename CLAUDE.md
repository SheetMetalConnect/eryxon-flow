# Claude Agent Guidelines for Eryxon MES

This document provides essential guidelines for AI agents (Claude) working on the Eryxon MES codebase. Following these rules ensures consistency, quality, and maintainability.

---

## Agentic Workflow Rules

### Autonomous Execution

**Work autonomously without waiting for user input.** Continue executing tasks until:
- The goal is fully achieved within requirements
- Context length is exhausted
- A blocking error occurs that requires user intervention

**Do NOT:**
- Stop to ask for confirmation on routine decisions
- Wait for user approval between steps
- Request clarification on well-defined tasks

**DO:**
- Make reasonable decisions based on existing patterns
- Continue working through the entire task list
- Complete all requirements in a single session when possible

### Scope Discipline

**CRITICAL: Stay within the requested requirements.**

- **Do NOT add new features** beyond what was explicitly requested
- **Do NOT refactor unrelated code** unless it directly blocks the task
- **Do NOT expand scope** with "nice to have" improvements
- **Do NOT create new patterns** when existing ones work
- **Do NOT add extra error handling, logging, or comments** beyond what's necessary

**Example:**
```
User: "Add a delete button to the jobs table"

CORRECT approach:
- Add delete button
- Wire up delete mutation
- Add confirmation dialog
- Done

INCORRECT approach:
- Add delete button
- Also add bulk delete (not requested)
- Refactor the whole table component (not requested)
- Add undo functionality (not requested)
- Update unrelated tests (not requested)
```

### Completion Focus

Work until the goal is **fully achieved**:

1. Read the requirements carefully
2. Create a mental or written checklist
3. Execute each item completely
4. Verify all requirements are met
5. Stop when done - do not gold-plate

---

## Table of Contents

- [Agentic Workflow Rules](#agentic-workflow-rules)
- [Core Principles](#core-principles)
- [Data Guidelines](#data-guidelines)
- [Localization Requirements](#localization-requirements)
- [Design System Compliance](#design-system-compliance)
- [Architecture & Modularity](#architecture--modularity)
- [Navigation & Menu Updates](#navigation--menu-updates)
- [Task Management](#task-management)
- [Code Quality Standards](#code-quality-standards)
- [File Structure Reference](#file-structure-reference)
- [Common Patterns](#common-patterns)

---

## Core Principles

### 1. Real Data Only - No Mocks

**ALWAYS use real data from Supabase. NEVER create mock data, placeholder data, or hardcoded test values.**

```tsx
// CORRECT - Always fetch from Supabase
const { data: jobs, isLoading } = useQuery({
  queryKey: ['jobs'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data;
  }
});

// INCORRECT - Never do this
const mockJobs = [
  { id: 1, name: 'Test Job' },
  { id: 2, name: 'Sample Job' }
];
```

**Why:** Mock data creates inconsistencies, masks real data issues, and leads to bugs in production.

### 2. Full Localization - No Hardcoded Strings

**ALWAYS use translation keys from `src/i18n/locales/`. NEVER hardcode user-facing text.**

```tsx
// CORRECT - Use translation hook
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();
  return <h1>{t('jobs.title')}</h1>;
}

// INCORRECT - Never hardcode strings
function Component() {
  return <h1>Job Management</h1>; // NO!
}
```

**Locale files location:**
- `src/i18n/locales/en/translation.json` - English
- `src/i18n/locales/nl/translation.json` - Dutch
- `src/i18n/locales/de/translation.json` - German

**When adding new features:**
1. Add translation keys to ALL three locale files
2. Use nested keys for organization (e.g., `jobs.createSuccess`)
3. Keep translations consistent in meaning across languages

### 3. Real Metrics - No Hardcoded Values

**ALWAYS fetch metrics, counts, and statistics from Supabase. NEVER hardcode numbers.**

```tsx
// CORRECT - Fetch real counts
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: async () => {
    const { count: activeJobs } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    return { activeJobs };
  }
});

// INCORRECT - Never hardcode metrics
const stats = { activeJobs: 42, pendingIssues: 7 }; // NO!
```

---

## Data Guidelines

### Supabase Integration

All data operations go through the Supabase client at `src/integrations/supabase/client.ts`.

**Standard query pattern:**

```tsx
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetching data
const { data, isLoading, error } = useQuery({
  queryKey: ['entity-name', filters],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data;
  }
});

// Mutating data
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

### Multi-Tenancy

This is a multi-tenant SaaS application with Row-Level Security (RLS):
- Always include `tenant_id` in queries where applicable
- Never expose data from other tenants
- Trust RLS policies but validate on the frontend too

---

## Localization Requirements

### Translation Key Structure

Follow the existing nested structure in locale files:

```json
{
  "navigation": {
    "dashboard": "Dashboard",
    "jobs": "Jobs"
  },
  "jobs": {
    "title": "Job Management",
    "createJob": "Create Job",
    "status": {
      "active": "Active",
      "completed": "Completed"
    }
  }
}
```

### Adding New Translations

When adding any user-facing text:

1. **Identify the appropriate namespace** (navigation, jobs, parts, common, etc.)
2. **Add to ALL three locale files:**
   - `src/i18n/locales/en/translation.json`
   - `src/i18n/locales/nl/translation.json`
   - `src/i18n/locales/de/translation.json`
3. **Use the translation in code:**

```tsx
const { t } = useTranslation();

// Simple key
<Button>{t('common.save')}</Button>

// Nested key
<h1>{t('jobs.title')}</h1>

// With interpolation
<p>{t('dashboard.activeWorkers', { count: 5 })}</p>
```

### What Must Be Localized

- All UI labels and buttons
- Error messages and notifications
- Placeholder text
- Tooltips and hints
- Modal titles and content
- Form field labels
- Table column headers
- Status badges

---

## Design System Compliance

### CRITICAL: Read Before Any UI Work

**Before writing any UI code, ALWAYS read:**
- `docs/DESIGN_SYSTEM.md` - Complete design guidelines
- `src/styles/design-system.css` - All CSS tokens and classes

### Never Improvise Styles

**ALWAYS use centralized design tokens and classes. NEVER write inline styles or custom CSS in page components.**

```tsx
// CORRECT - Use design system classes
<div className="glass-card p-4">
  <h1 className="hero-title">{t('jobs.title')}</h1>
  <hr className="title-divider" />
  <Button className="cta-button">
    {t('jobs.createJob')}
    <ArrowRight className="arrow-icon" />
  </Button>
</div>

// INCORRECT - Never inline styles or arbitrary values
<div style={{ background: '#1a1a2e', padding: '15px' }}> // NO!
<div className="bg-[#1a1a2e] p-[15px]"> // NO!
```

### Core Design Classes

| Class | Purpose |
|-------|---------|
| `glass-card` | Glass morphism card container |
| `onboarding-card` | Premium auth/onboarding surfaces |
| `cta-button` | Primary action buttons |
| `hero-title` | Gradient page titles |
| `title-divider` | Gradient horizontal dividers |
| `informational-text` | Info capsules with gradient border |
| `use-case-card` | Feature/benefit cards |

### Color Tokens

Always use CSS variables, never hex codes:

```tsx
// CORRECT
<div className="bg-background text-foreground">
<Badge className="bg-status-active">

// INCORRECT
<div style={{ background: '#111927' }}> // NO!
```

### Component Library

Use shadcn/ui components from `src/components/ui/`:

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
```

---

## Architecture & Modularity

### Think Relationally

**ALWAYS consider how changes affect other parts of the application.**

Before making changes, ask:
1. What components depend on this?
2. What data relationships exist?
3. Will this affect other pages or features?
4. Are there shared hooks or utilities to update?

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── operator/       # Operator terminal components
│   ├── ui/             # shadcn/ui base components
│   └── shared/         # Cross-cutting components
├── pages/              # Route pages
│   ├── admin/          # Admin pages
│   ├── operator/       # Operator pages
│   └── common/         # Shared pages (auth, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── integrations/       # Supabase client
├── i18n/               # Localization
│   └── locales/        # Translation files
├── styles/             # Global styles
│   └── design-system.css
└── theme/              # Theme provider
```

### Modular Development Rules

1. **Extract reusable logic to hooks** in `src/hooks/`
2. **Share components** - If used in 2+ places, extract to `components/`
3. **Centralize types** - Use `src/integrations/supabase/types.ts`
4. **Keep pages thin** - Pages should compose components, not contain business logic

```tsx
// CORRECT - Thin page component
function JobsPage() {
  const { jobs, isLoading } = useJobs();
  const { t } = useTranslation();

  return (
    <PageLayout title={t('jobs.title')}>
      <JobsTable data={jobs} loading={isLoading} />
    </PageLayout>
  );
}

// INCORRECT - Fat page with business logic
function JobsPage() {
  const [jobs, setJobs] = useState([]);
  // 200 lines of data fetching, filtering, sorting... NO!
}
```

---

## Navigation & Menu Updates

### ALWAYS Update Navigation

**When adding new features or pages, ALWAYS check and update:**

1. **Sidebar navigation** - `src/components/admin/AdminSidebar.tsx`
2. **Mobile navigation** - Ensure responsive menu includes new items
3. **Breadcrumbs** - If applicable
4. **Route definitions** - `src/App.tsx` or route config

### Navigation Checklist

Before completing any feature:

- [ ] Is the new page/feature accessible from the sidebar?
- [ ] Are navigation labels localized?
- [ ] Does the active state work correctly?
- [ ] Is it visible in mobile view?
- [ ] Are permissions/roles considered?

### Adding a New Navigation Item

```tsx
// 1. Add translation keys
// src/i18n/locales/en/translation.json
{
  "navigation": {
    "newFeature": "New Feature"
  }
}

// 2. Add to sidebar
// src/components/admin/AdminSidebar.tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <NavLink to="/admin/new-feature">
      <NewFeatureIcon className="h-4 w-4" />
      <span>{t('navigation.newFeature')}</span>
    </NavLink>
  </SidebarMenuButton>
</SidebarMenuItem>

// 3. Add route
// src/App.tsx
<Route path="/admin/new-feature" element={<NewFeaturePage />} />
```

---

## Task Management

### Work with Scaffolding and To-Do Lists

**ALWAYS break down work into clear, trackable tasks.**

When starting work:
1. Analyze the requirements
2. Create a to-do list of subtasks
3. Work through tasks systematically
4. Mark tasks complete as you go

### Task Breakdown Example

For "Add a new report feature":

```
- [ ] Create translation keys for report feature
- [ ] Create ReportPage component
- [ ] Add route for /admin/reports
- [ ] Add navigation item to sidebar
- [ ] Create useReports hook for data fetching
- [ ] Build report table component
- [ ] Add export functionality
- [ ] Test all translations (EN/NL/DE)
- [ ] Verify navigation works on mobile
```

### Implementation Order

1. **Translations first** - Add all required keys
2. **Data layer** - Hooks and Supabase queries
3. **Components** - Build from smallest to largest
4. **Page assembly** - Compose components into pages
5. **Navigation** - Add routes and menu items
6. **Testing** - Verify all functionality

---

## Code Quality Standards

### TypeScript

- Use strict typing
- Define interfaces for all data structures
- Avoid `any` type

```tsx
// CORRECT
interface Job {
  id: string;
  job_number: string;
  customer: string;
  status: 'active' | 'completed' | 'on_hold';
}

// INCORRECT
const job: any = { ... }; // NO!
```

### Error Handling

Always handle errors gracefully:

```tsx
const { data, error, isLoading } = useQuery({...});

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={t('common.error')} />;
if (!data?.length) return <EmptyState message={t('jobs.noJobsFound')} />;
```

### Component Props

Use explicit prop types:

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

## File Structure Reference

### Key Files

| Path | Purpose |
|------|---------|
| `docs/DESIGN_SYSTEM.md` | Design guidelines (READ FIRST for UI work) |
| `src/styles/design-system.css` | CSS tokens and classes |
| `src/integrations/supabase/client.ts` | Supabase client |
| `src/integrations/supabase/types.ts` | Database types |
| `src/i18n/locales/*/translation.json` | Translations (EN/NL/DE) |
| `src/components/ui/*` | shadcn/ui components |
| `src/theme/ThemeProvider.tsx` | Theme (dark/light/auto) |

### Adding New Files

Follow existing patterns:
- **Page**: `src/pages/admin/NewFeaturePage.tsx`
- **Component**: `src/components/admin/NewFeatureComponent.tsx`
- **Hook**: `src/hooks/useNewFeature.ts`
- **Type**: Add to `src/integrations/supabase/types.ts`

---

## Common Patterns

### Page Layout

```tsx
import { useTranslation } from 'react-i18next';

export default function NewPage() {
  const { t } = useTranslation();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {t('newFeature.title')}
          </h1>
          <Button className="cta-button">
            {t('newFeature.action')}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          {t('newFeature.description')}
        </p>
      </div>

      <hr className="title-divider" />

      {/* Content */}
      <div className="glass-card p-4">
        {/* Page content */}
      </div>
    </div>
  );
}
```

### Data Fetching Hook

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

### Toast Notifications

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

## Summary Checklist

Before completing ANY task, verify:

- [ ] **No mock data** - All data comes from Supabase
- [ ] **No hardcoded strings** - All text uses translation keys
- [ ] **No hardcoded metrics** - All numbers are fetched
- [ ] **Design system compliance** - Using centralized classes
- [ ] **Translations complete** - Keys added to EN/NL/DE
- [ ] **Navigation updated** - Menu items added if needed
- [ ] **Modular code** - Reusable hooks and components
- [ ] **TypeScript strict** - No `any` types
- [ ] **Error handling** - Graceful error states

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

*This document is the source of truth for Claude agents working on Eryxon MES. When in doubt, refer to these guidelines.*
