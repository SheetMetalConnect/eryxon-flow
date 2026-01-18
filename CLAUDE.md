# Claude Agent Guidelines for Eryxon Flow

> **Version:** 0.1.0 (Alpha) | **Docs:** [eryxon.eu/docs](https://eryxon.eu/docs) | **Hosted:** [app.eryxon.eu](https://app.eryxon.eu)

This document provides essential guidelines for AI agents (Claude) working on the Eryxon Flow codebase. Following these rules ensures consistency, quality, and maintainability.

**For other AI agents:** See also [CODEX.md](CODEX.md) for OpenAI Codex/GPT-based tools, or [.cursorrules](.cursorrules) for Cursor IDE.

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

### Git Branch Discipline

**NEVER work directly on `main` or `master`.** Always create a descriptive feature branch.

```bash
# CORRECT - Create descriptive branch names
git checkout -b feature/add-job-export
git checkout -b fix/operator-time-calculation
git checkout -b docs/update-api-reference
git checkout -b refactor/simplify-auth-flow

# WRONG - Never commit directly to main
git checkout main && git commit  # NEVER DO THIS!
```

**Branch naming conventions:**
- `feature/` - New features or enhancements
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code improvements (no behavior change)
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

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

**For technical code patterns and examples, see [docs/CODING_PATTERNS.md](docs/CODING_PATTERNS.md).**

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

### Modular Namespace Structure

Translations are split into **namespace files** for better AI agent collaboration and reduced context window usage. Each namespace file is small enough to be read and edited efficiently.

**Namespace files location:**
```
src/i18n/locales/
├── en/
│   ├── common.json        # Shared: Actions, Cancel, forms, notifications, modals, time
│   ├── auth.json          # Authentication, legal, onboarding, subscription
│   ├── navigation.json    # Sidebar and navigation items
│   ├── admin.json         # Dashboard, settings, users, activity, pricing, myPlan
│   ├── operator.json      # WorkQueue, terminal, session tracking, production
│   ├── jobs.json          # Jobs, parts, operations, issues
│   ├── config.json        # Stages, materials, resources, assignments
│   ├── integrations.json  # API keys, webhooks, MQTT, data import/export
│   ├── analytics.json     # QRM, OEE, quality, reliability, capacity
│   └── shipping.json      # Shipping module
├── nl/                    # Dutch (same structure)
└── de/                    # German (same structure)
```

### Which Namespace to Edit

| Feature Area | Namespace File | Key Examples |
|--------------|----------------|--------------|
| Common UI elements | `common.json` | `common.save`, `forms.required`, `notifications.success` |
| Login, signup, legal | `auth.json` | `auth.signIn`, `legal.privacyPolicy`, `onboarding.welcome` |
| Sidebar, menus | `navigation.json` | `navigation.dashboard`, `navigation.jobs` |
| Admin pages | `admin.json` | `dashboard.title`, `settings.demoData`, `users.createUser` |
| Operator terminal | `operator.json` | `workQueue.total`, `terminal.columns`, `production.target` |
| Jobs/Parts/Operations | `jobs.json` | `jobs.createJob`, `parts.addPart`, `operations.stage` |
| Configuration | `config.json` | `stages.createStage`, `materials.title`, `resources.name` |
| Integrations | `integrations.json` | `apiKeys.createKey`, `webhooks.title`, `mqtt.brokerUrl` |
| Analytics | `analytics.json` | `qrm.dashboardTitle`, `oee.availability`, `quality.yieldRate` |
| Shipping | `shipping.json` | `shipping.createShipment`, `shipping.status.delivered` |

### Adding New Translations

When adding any user-facing text:

1. **Identify the correct namespace file** based on feature area (see table above)
2. **Add to ALL three languages** (en, nl, de)
3. **Use nested keys** for organization

```tsx
const { t } = useTranslation();

// Simple key
<Button>{t('common.save')}</Button>

// Nested key
<h1>{t('jobs.title')}</h1>

// With interpolation
<p>{t('dashboard.activeWorkers', { count: 5 })}</p>
```

### Translation Key Structure

Follow the existing nested structure within each namespace file:

```json
{
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

### What Must Be Localized

- All UI labels and buttons
- Error messages and notifications
- Placeholder text
- Tooltips and hints
- Modal titles and content
- Form field labels
- Table column headers
- Status badges

### Re-splitting Translations (Maintenance)

If you need to reorganize the namespaces, run:

```bash
node scripts/split-translations.js
```

This script reads the namespace mappings and regenerates all namespace files from the source.

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
│   └── Layout.tsx      # Role-based layout router
├── pages/              # Route pages (with barrel exports)
│   ├── admin/          # Admin pages
│   │   ├── config/     # Config pages (Stages, Users, etc.)
│   │   └── analytics/  # Analytics pages (OEE, QRM, etc.)
│   ├── auth/           # Auth pages (Auth, AcceptInvitation)
│   ├── operator/       # Operator pages (WorkQueue, etc.)
│   └── common/         # Shared pages (MyPlan, Pricing, Help, etc.)
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── integrations/       # Supabase client
├── i18n/               # Localization
│   └── locales/        # Translation files (en, nl, de)
├── styles/             # Global styles
│   └── design-system.css
├── routes.ts           # Centralized route definitions
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

## Deployment Architecture

### Two Deployment Modes

Eryxon Flow supports two deployment approaches:

1. **Cloud Supabase + App Container (Recommended)**
   - App runs on your infrastructure (Docker, VPS, Cloudflare Pages)
   - Database and backend services run on Supabase Cloud
   - Minimal disk space (~500MB for app)
   - No database maintenance required

2. **Fully Self-Hosted (Air-Gapped)**
   - All services run on your infrastructure
   - Requires `supabase-docker/` setup (10+ containers)
   - Significant disk space required (20GB+ minimum, 50GB+ recommended)
   - Full control over all components
   - Only needed for air-gapped environments or strict data sovereignty

### Database Schema Considerations

When making database schema changes:

- **Test both deployment modes** - Cloud Supabase and self-hosted use the same PostgreSQL, but verify migrations work in both
- **Use Supabase migrations** - All schema changes go in `supabase/migrations/`
- **Follow migration naming convention** - `YYYYMMDDHHMMSS_description.sql`
- **Test migration rollback** - Ensure migrations can be safely applied and reverted
- **Document breaking changes** - If a migration requires data transformation or manual steps, document it clearly

### Environment Variables

Different deployment modes require different environment variables:

**App Container (both modes):**
```env
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
```

**Self-Hosted Supabase:**
- See `supabase-docker/.env.example` for full list
- Includes PostgreSQL credentials, JWT secrets, SMTP config, etc.

**Important:** Never commit `.env` files to git. Use `.env.example` as template.

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
// 1. Add translation keys to navigation.json for all languages
// src/i18n/locales/en/navigation.json
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
| `src/routes.ts` | Centralized route definitions |
| `src/integrations/supabase/client.ts` | Supabase client |
| `src/integrations/supabase/types.ts` | Database types |
| `src/i18n/locales/*/common.json` | Common translations (forms, notifications, time) |
| `src/i18n/locales/*/auth.json` | Auth & onboarding translations |
| `src/i18n/locales/*/navigation.json` | Navigation translations |
| `src/i18n/locales/*/admin.json` | Admin page translations |
| `src/i18n/locales/*/operator.json` | Operator terminal translations |
| `src/i18n/locales/*/jobs.json` | Jobs, parts, operations translations |
| `src/i18n/locales/*/config.json` | Config translations (stages, materials) |
| `src/i18n/locales/*/integrations.json` | Integration translations (API, webhooks) |
| `src/i18n/locales/*/analytics.json` | Analytics translations (QRM, OEE) |
| `src/i18n/locales/*/shipping.json` | Shipping module translations |
| `src/components/ui/*` | shadcn/ui components |
| `src/components/admin/AdminPageHeader.tsx` | Standardized page header |
| `src/components/admin/PageStatsRow.tsx` | Stats row component |
| `src/theme/ThemeProvider.tsx` | Theme (dark/light/auto) |

### Page Organization

Pages are organized by role with barrel exports (`index.ts`):

```
src/pages/
├── admin/
│   ├── config/           # Config pages
│   │   ├── index.ts      # Barrel export
│   │   ├── Stages.tsx
│   │   ├── Materials.tsx
│   │   └── Users.tsx     # etc.
│   ├── analytics/        # Analytics pages
│   │   ├── index.ts      # Barrel export
│   │   └── OEEAnalytics.tsx  # etc.
│   └── Dashboard.tsx     # Other admin pages
├── auth/
│   ├── index.ts          # Barrel export
│   ├── Auth.tsx
│   └── AcceptInvitation.tsx
├── operator/
│   ├── index.ts          # Barrel export
│   └── WorkQueue.tsx     # etc.
└── common/
    ├── index.ts          # Barrel export
    ├── MyPlan.tsx
    ├── Pricing.tsx
    └── Help.tsx          # etc.
```

### Adding New Files

Follow existing patterns:
- **Admin page**: `src/pages/admin/NewFeature.tsx`
- **Config page**: `src/pages/admin/config/NewConfig.tsx` (add to barrel export)
- **Common page**: `src/pages/common/NewPage.tsx` (add to barrel export)
- **Component**: `src/components/admin/NewFeatureComponent.tsx`
- **Hook**: `src/hooks/useNewFeature.ts`
- **Type**: Add to `src/integrations/supabase/types.ts`

### Import Pattern

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

## Coding Patterns

For detailed code patterns and technical examples, see **[docs/CODING_PATTERNS.md](docs/CODING_PATTERNS.md)**.

Key patterns documented there:
- Supabase types modular architecture
- Realtime subscription cleanup (memory leak prevention)
- Data fetching with React Query
- Admin page layout components
- Toast notifications
- TypeScript patterns

---

## Summary Checklist

Before completing ANY task, verify:

- [ ] **No mock data** - All data comes from Supabase
- [ ] **No hardcoded strings** - All text uses translation keys
- [ ] **No hardcoded metrics** - All numbers are fetched
- [ ] **Design system compliance** - Using centralized classes
- [ ] **Translations complete** - Keys added to correct namespace file for all 3 languages
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

## Resources

### Local Documentation (For AI Agents)
Refer to these local files instead of web links:

| Topic | Local Path |
|-------|------------|
| Quick Start | `website/src/content/docs/guides/quick-start.md` |
| Self-Hosting | `website/src/content/docs/guides/self-hosting.md` |
| API Documentation | `website/src/content/docs/api/api_documentation.md` |
| Database Schema | `website/src/content/docs/architecture/database.md` |
| Operator Manual | `website/src/content/docs/guides/operator-manual.md` |
| Admin Manual | `website/src/content/docs/guides/admin-manual.md` |
| Design System | `docs/DESIGN_SYSTEM.md` |
| Coding Patterns | `docs/CODING_PATTERNS.md` |
| App Architecture | `website/src/content/docs/architecture/app-architecture.md` |
| Roadmap | `website/src/content/docs/roadmap.md` |

### External Resources
- **Live Docs:** [eryxon.eu/docs](https://eryxon.eu/docs)
- **Hosted Version:** [app.eryxon.eu](https://app.eryxon.eu)
- **GitHub:** [github.com/SheetMetalConnect/eryxon-flow](https://github.com/SheetMetalConnect/eryxon-flow)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)

---

*This document is the source of truth for Claude agents working on Eryxon Flow. When in doubt, refer to these guidelines.*
