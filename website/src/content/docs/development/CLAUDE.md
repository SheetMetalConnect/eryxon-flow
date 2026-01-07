---
title: "Claude AI Guide"
description: "AI Assistant Guide for working with the Eryxon Flow codebase."
---



**Internal/Proprietary Project**

This document provides comprehensive guidance for AI assistants working with the Eryxon Flow MES (Manufacturing Execution System) codebase.

## Project Overview

**Eryxon Flow** is a modern Manufacturing Execution System built with:
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui (Radix UI) + Material-UI
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State Management**: React Query + React Context
- **Real-time**: Supabase Realtime
- **Multi-language**: i18next (English, Dutch, German)

**Key Features**:
- Job and parts tracking through production stages
- Role-based access (Admin/Operator views)
- Real-time notifications and updates
- MCP Server for AI assistant integration
- RESTful API with webhooks
- Multi-tenancy with tenant isolation
- Quick Response Manufacturing (QRM) capacity management
- Operator terminal with real-time capacity indicators
- Production quantity tracking with scrap reasons
- Substeps management for operations
- 3D STEP file viewer
- Data export system
- Organization settings (timezone, billing, etc.)

## Directory Structure

```
/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/
├── src/
│   ├── App.tsx                      # Main app with routing
│   ├── main.tsx                     # Entry point
│   ├── routes.ts                    # Route constants
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components (54 files)
│   │   ├── admin/                   # Admin-specific components (7 files)
│   │   ├── operator/                # Operator-specific components (11 files)
│   │   ├── issues/                  # Issue tracking components (6 files)
│   │   ├── terminal/                # Terminal view components (6 files)
│   │   ├── qrm/                     # QRM capacity components (7 files)
│   │   ├── mui/                     # Material-UI wrappers (11 files)
│   │   └── onboarding/              # Onboarding wizard (10 files)
│   ├── pages/
│   │   ├── admin/                   # Admin pages (20 pages)
│   │   ├── operator/                # Operator pages (5 pages)
│   │   └── common/                  # Common pages (5 pages)
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth + tenant management
│   ├── hooks/                       # Custom React hooks (12 hooks)
│   ├── lib/                         # Utilities (9 files)
│   ├── integrations/supabase/       # Supabase client + types
│   ├── i18n/                        # Internationalization
│   ├── layouts/                     # Layout components
│   ├── theme/                       # MUI theme config
│   ├── types/                       # TypeScript definitions
│   └── styles/                      # Global styles
├── supabase/
│   ├── functions/                   # Edge Functions (23 functions)
│   └── migrations/                  # Database migrations
├── mcp-server/                      # MCP server for AI integration
├── docs/                            # Documentation (14 MD files)
├── public/                          # Static assets
└── scripts/                         # Utility scripts
```

## Key Technologies

### Core Stack
- **React** 18.3.1 - UI framework
- **TypeScript** 5.8.3 - Type safety
- **Vite** 5.4.19 - Build tool (using SWC for fast compilation)
- **React Router** 6.30.1 - Client-side routing
- **Tailwind CSS** 3.4.17 - Utility-first CSS

### UI Components
- **shadcn/ui** - 54 Radix UI components (accessible, unstyled primitives)
- **Material-UI** 7.3.5 - Additional component library (data grids, date pickers)
- **Lucide React** - Icon library
- **next-themes** - Dark mode management
- **three.js** - 3D CAD viewer for STEP files

### Data & State
- **@tanstack/react-query** 5.83.0 - Server state management
- **@supabase/supabase-js** 2.80.0 - Backend client
- **React Context** - Global state (auth, tenant)

### Forms & Validation
- **react-hook-form** 7.61.1 - Form management
- **zod** 3.25.76 - Schema validation

### Internationalization
- **i18next** 25.6.2 - Translation framework
- **react-i18next** 16.3.3 - React integration

## Architecture Patterns

### 1. Routing Architecture

**Location**: `/src/App.tsx`

**Pattern**: Role-based routing with protected routes

```typescript
// Routes are constants in /src/routes.ts
export const ROUTES = {
  AUTH: '/auth',
  OPERATOR: {
    WORK_QUEUE: '/operator/work-queue',
    // ...
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    // ...
  }
};

// Protected routes use AuthContext
function ProtectedRoute({ children, adminOnly }) {
  const { profile } = useAuth();
  // UI-level check (convenience only - not security)
  if (adminOnly && profile.role !== 'admin') {
    return <Navigate to="/operator/work-queue" />;
  }
  return children;
}
```

**Important**: Client-side route protection is UI convenience only. Real security is enforced by Supabase Row Level Security (RLS) policies.

### 2. State Management Strategy

**Three-layer approach**:

1. **Server State**: React Query for data fetching/caching
   ```typescript
   const { data, isLoading } = useQuery({
     queryKey: ['jobs', tenantId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('jobs')
         .select('*');
       if (error) throw error;
       return data;
     }
   });
   ```

2. **Global State**: React Context for user/tenant
   ```typescript
   const { user, profile, tenant } = useAuth();
   ```

3. **Local State**: useState/useReducer in components
   ```typescript
   const [isOpen, setIsOpen] = useState(false);
   ```

4. **Caching Layer**: Optional Redis caching for server-side data
   - See `src/lib/queryClient.ts` for React Query configuration
   - See `supabase/functions/_shared/cache.ts` for Edge Function caching
   - See `docs/CACHING.md` for full caching architecture documentation

### 3. Data Fetching Patterns

**Standard Pattern**:
```typescript
// Custom hook encapsulates React Query + Supabase
export function useJobData(jobId: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, parts(*), operations(*)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!jobId && !!profile?.tenant_id
  });
}
```

**Real-time Updates**:
```typescript
useEffect(() => {
  // Initial fetch
  fetchData();

  // Subscribe to changes
  const channel = supabase
    .channel('table_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'jobs',
      filter: `tenant_id=eq.${tenant.id}`
    }, () => {
      // Refetch data on change
      fetchData();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [tenant.id]);
```

### 4. Supabase Integration

**Client Setup**: `/src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

**Type Safety**: Auto-generated types in `/src/integrations/supabase/types.ts` (2,202 lines)

**Authentication Flow**:
1. Login → `supabase.auth.signInWithPassword()`
2. Session stored in localStorage
3. AuthContext fetches profile and tenant
4. Route navigation based on role

### 5. Multi-Tenancy Pattern

**Every database operation is tenant-scoped**:

```typescript
// Client-side: Filter by tenant_id
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('tenant_id', tenant.id);

// Server-side: RLS policies enforce tenant isolation
// Database function: get_tenant_info() returns current tenant
// All tables have tenant_id foreign key
```

**Tenant Switching** (root admin only):
```typescript
await supabase.rpc('set_active_tenant', { p_tenant_id: newTenantId });
```

## Development Conventions

### File Organization

**Components**: Feature-based organization
```
components/
├── ui/                    # Shared UI primitives (shadcn/ui)
├── admin/                 # Admin-specific features
├── operator/              # Operator-specific features
├── issues/                # Issue tracking
├── terminal/              # Work center terminal
└── [feature]/             # Other feature-specific components
```

**Naming Conventions**:
- **Components**: PascalCase (`JobDetailModal.tsx`)
- **Hooks**: camelCase with `use` prefix (`useJobData.ts`)
- **Utilities**: camelCase (`database.ts`, `utils.ts`)
- **Types**: PascalCase (`Profile`, `TenantInfo`)

### Import Patterns

**Always use path alias**:
```typescript
// ✅ Correct
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// ❌ Avoid
import { Button } from '../../../components/ui/button';
```

**Alias Configuration**: `@/` → `/src/` (configured in `vite.config.ts`)

### Component Patterns

**Functional Components** (always):
```typescript
interface JobCardProps {
  jobId: string;
  onSelect?: (id: string) => void;
}

export function JobCard({ jobId, onSelect }: JobCardProps) {
  const { data: job, isLoading } = useJobData(jobId);
  const { t } = useTranslation();

  if (isLoading) return <Skeleton />;

  return (
    <Card onClick={() => onSelect?.(jobId)}>
      <CardHeader>
        <CardTitle>{job.name}</CardTitle>
      </CardHeader>
    </Card>
  );
}
```

### Styling Conventions

**Primary Method**: Tailwind utility classes

```tsx
<Card className="bg-surface border-border-subtle rounded-xl shadow-glass">
  <CardHeader className="pb-4">
    <CardTitle className="text-2xl font-bold text-foreground">
      {title}
    </CardTitle>
  </CardHeader>
</Card>
```

**Conditional Classes** (use `cn()` utility):
```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "base-class p-4 rounded-lg",
  isActive && "bg-brand-primary text-white",
  size === "large" && "text-lg p-6"
)}>
```

**Design Tokens** (from `/src/styles/design-system.css`):
- Colors: `bg-surface`, `text-foreground`, `border-border-subtle`
- Status: `bg-status-active`, `text-status-completed`
- Severity: `bg-severity-critical`, `text-severity-high`
- Spacing: Use Tailwind scale (`p-4`, `gap-6`, `space-y-4`)

**Dark Mode**: Application is dark-mode only (enforced in `index.html`)

### Error Handling

**Standard Pattern**:
```typescript
try {
  const { data, error } = await supabase
    .from('jobs')
    .insert({ ... });

  if (error) throw error;

  toast.success(t('job.created'));
  queryClient.invalidateQueries(['jobs']);
} catch (error) {
  console.error('Error creating job:', error);
  toast.error(t('job.createError'));
}
```

**User Feedback**: Always use toast notifications
```typescript
import { toast } from 'sonner';

toast.success('Operation completed');
toast.error('Something went wrong');
toast.loading('Processing...');
```

### TypeScript Conventions

**Type Annotations**:
- Always type component props
- Use Supabase generated types for database entities
- Prefer interfaces over types for object shapes

```typescript
import type { Database } from '@/integrations/supabase/types';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
```

**TypeScript Config**: Relaxed mode
- `noImplicitAny: false`
- `strictNullChecks: false`
- Focus on developer productivity over strict typing

## Security Model

### Client vs. Server Security

**Critical Understanding**:

```typescript
// ⚠️ CLIENT-SIDE: UI CONVENIENCE ONLY - PROVIDES ZERO SECURITY
if (profile.role !== 'admin') {
  return <Navigate to="/operator/work-queue" />;
}

// ✅ SERVER-SIDE: ACTUAL SECURITY VIA RLS POLICIES
// Enforced by PostgreSQL Row Level Security
// Cannot be bypassed by client
```

**Security Layers**:
1. **RLS Policies** (database level) - Real security
2. **Edge Function Validation** - API key, rate limits, plan limits
3. **Client-side Checks** - UX only, easily bypassed

### Multi-Tenancy Security

**Tenant Isolation**:
- Every table has `tenant_id` column
- RLS policies filter all queries by tenant
- Database function `get_tenant_info()` returns current tenant
- Impossible to access other tenant's data

**API Security**:
- API keys required for external access
- Keys prefixed: `ery_live_*`, `ery_test_*`
- Bcrypt hashing for key storage
- Rate limiting per tenant/key
- Plan-based feature limits

## Common Tasks

### Adding a New Page

1. **Create page component** in `/src/pages/admin/` or `/src/pages/operator/`
   ```typescript
   // /src/pages/admin/NewFeature.tsx
   export default function NewFeature() {
     return <div>New Feature</div>;
   }
   ```

2. **Add route constant** in `/src/routes.ts`
   ```typescript
   export const ROUTES = {
     ADMIN: {
       NEW_FEATURE: '/admin/new-feature',
     }
   };
   ```

3. **Add route** in `/src/App.tsx`
   ```typescript
   <Route
     path="/admin/new-feature"
     element={
       <ProtectedRoute adminOnly>
         <NewFeature />
       </ProtectedRoute>
     }
   />
   ```

4. **Add navigation** in layout (e.g., `AdminLayout.tsx`)

### Creating a Custom Hook

**Location**: `/src/hooks/`

**Pattern**:
```typescript
// /src/hooks/useFeatureData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFeatureData(id: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['feature', id, profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('table_name')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!profile?.tenant_id,
  });
}
```

### Adding a shadcn/ui Component

```bash

npx shadcn@latest add [component-name]


npx shadcn@latest add dropdown-menu
```

This adds the component to `/src/components/ui/`

### Adding Translations

1. **Add key to English** (`/src/i18n/locales/en/translation.json`)
   ```json
   {
     "feature": {
       "title": "Feature Title",
       "description": "Feature description"
     }
   }
   ```

2. **Add to other languages** (`nl/translation.json`, `de/translation.json`)

3. **Use in component**:
   ```typescript
   import { useTranslation } from 'react-i18next';

   function Component() {
     const { t } = useTranslation();
     return <h1>{t('feature.title')}</h1>;
   }
   ```

4. **Validate translations**:
   ```bash
   node scripts/check-translations.js
   ```

### Working with Supabase Edge Functions

**Location**: `/supabase/functions/`

**Pattern** (API endpoint):
```typescript
// /supabase/functions/api-feature/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"
import { corsHeaders } from "../_shared/cors.ts"
import { validateApiKey } from "../_shared/security.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('X-API-Key');
    const { tenantId } = await validateApiKey(apiKey);

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Set tenant context
    await supabase.rpc('set_active_tenant', {
      p_tenant_id: tenantId
    });

    // Handle request
    const body = await req.json();

    // Database operations (RLS enforced)
    const { data, error } = await supabase
      .from('table')
      .insert(body);

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

## Important Files Reference

### Configuration Files
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/vite.config.ts` - Vite build config
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/tailwind.config.ts` - Tailwind/design tokens
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/tsconfig.json` - TypeScript config
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/package.json` - Dependencies
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/components.json` - shadcn/ui config

### Core Application Files
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/App.tsx` - Main app with routing
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/main.tsx` - Entry point
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/routes.ts` - Route constants
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/contexts/AuthContext.tsx` - Auth + tenant
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/integrations/supabase/client.ts` - Supabase client
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/integrations/supabase/types.ts` - DB types
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/i18n/index.ts` - i18n config

### Key Utilities
- `/src/lib/utils.ts` - `cn()` utility
- `/src/lib/database.ts` - DB query helpers
- `/src/lib/searchService.ts` - Global search
- `/src/lib/substepTemplates.ts` - Substep template management
- `/src/lib/mockDataGenerator.ts` - Mock data generation
- `/src/lib/webhooks.ts` - Webhook utilities
- `/src/lib/queryClient.ts` - React Query configuration with cache presets
- `/src/lib/cacheInvalidation.ts` - Cache invalidation utilities

### Caching Infrastructure
- `/supabase/functions/_shared/cache.ts` - Cache abstraction (Redis/in-memory)
- `/supabase/functions/_shared/cache-utils.ts` - High-level caching utilities
- `/supabase/functions/_shared/rate-limiter.ts` - Rate limiting with cache support
- `/mcp-server/src/utils/cache.ts` - MCP Server cache utilities

### Styling
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/styles/design-system.css` - Design tokens
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/src/theme/theme.ts` - MUI theme

### Documentation
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/docs/HOW-THE-APP-WORKS.md` - Comprehensive guide
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/docs/DESIGN_SYSTEM.md` - Design system docs
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/docs/API_DOCUMENTATION.md` - API reference
- `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/docs/HELP.md` - User help and FAQs

## New Features & Systems (2025 Updates)

### 1. QRM Capacity Management

**Purpose**: Prevent bottlenecks using Quick Response Manufacturing principles

**Components**:
- `src/components/qrm/` - 7 QRM-specific components
- `src/components/terminal/NextCellInfo.tsx` - Shows next cell capacity
- `src/components/qrm/WIPIndicator.tsx` - Work-in-progress visual indicator
- `src/components/qrm/CapacityWarning.tsx` - Warning when approaching capacity
- `src/components/qrm/RoutingVisualization.tsx` - Visual flow through cells

**Database Fields** (in `cells` table):
- `wip_limit` - Maximum jobs allowed in cell
- `wip_warning_threshold` - Warning level (default 80%)
- `enforce_limit` - Block operations if next cell at capacity
- `show_warning` - Display warnings in operator terminal

**How It Works**:
1. Each cell/stage has configurable WIP limit
2. System tracks current WIP count per cell
3. Operator terminal shows next cell capacity before completing operation
4. If `enforce_limit` is true, operators cannot complete if next cell is full
5. Visual indicators: 🟢 Green (available), 🟡 Yellow (warning), 🔴 Red (at capacity)

**Configuration**: `/admin/config/stages`

### 2. Scrap Reasons System

**Purpose**: Categorize and track scrap/defects systematically

**Location**: 
- Page: `src/pages/admin/ConfigScrapReasons.tsx`
- Route: `/admin/config/scrap-reasons`
- Database: `scrap_reasons` table

**Categories**:
- `material` - Material defects
- `process` - Process errors
- `equipment` - Equipment failures
- `operator` - Operator errors
- `design` - Design issues
- `other` - Other reasons

**Fields**:
- `code` - Short code (e.g., "MAT-001")
- `description` - Full description
- `category` - One of the categories above
- `active` - Whether reason is currently in use

**Usage**: When reporting production quantities with scrap, operators select a scrap reason code

### 3. Production Quantity Tracking

**Component**: `src/components/operator/ProductionQuantityModal.tsx`

**Purpose**: Track actual production vs planned, including scrap

**Flow**:
1. Operator completes operation
2. Modal appears asking for quantities
3. Operator enters:
   - **Good Quantity**: Parts that passed
   - **Scrap Quantity**: Parts that failed
   - **Scrap Reason**: Why parts were scrapped (from scrap_reasons)
4. System records to database

**Database Fields**:
- `operations.good_quantity` - Count of good parts
- `operations.scrap_quantity` - Count of scrapped parts
- `operations.scrap_reason_id` - Foreign key to scrap_reasons

### 4. Substeps Management

**Purpose**: Break operations into smaller checkable tasks

**Components**:
- `src/components/operator/SubstepsManager.tsx` - Operator checklist
- `src/components/admin/AllSubstepsView.tsx` - Admin view of all substeps
- `src/components/admin/TemplatesManager.tsx` - Manage reusable templates
- `src/lib/substepTemplates.ts` - Template utilities

**Database Tables**:
- `substeps` - Individual substeps for operations
- `substep_templates` - Reusable templates

**Flow**:
1. Admin creates substep templates (e.g., "Laser Cutting Checklist")
2. When creating operations, admin can apply template
3. Operator sees substeps as checklist
4. Operator checks off each substep as completed
5. All substeps must be complete before operation can be completed

**Benefits**:
- Standardized procedures
- Training aid for new operators
- Quality assurance
- Audit trail of completed steps

### 5. Operator Terminal

**Location**: `src/pages/operator/OperatorTerminal.tsx`

**Purpose**: Streamlined, real-time production interface

**Layout**:
- **Left Panel**: Job list sorted by status
  - 🟢 In Process - Currently active operations
  - 🔵 In Buffer - Next 5 operations ready to start
  - 🟡 Expected - Upcoming work in queue
- **Right Panel**: Detailed job view
  - Job details (customer, quantity, due date)
  - Current operation controls
  - **Next Cell Info** with capacity status
  - **Routing Visualization** showing full workflow
  - 3D model viewer (if STEP file attached)
  - PDF drawing viewer (if drawing attached)
  - Operations list

**QRM Integration**:
- Real-time next cell capacity display
- Visual routing with capacity indicators
- Blocked completion if next cell at capacity (when enforced)
- Warning messages for capacity issues

**Route**: `/operator/terminal`

### 6. Organization Settings

**Location**: `src/pages/admin/OrganizationSettings.tsx`

**Purpose**: Configure tenant-level settings

**Route**: `/admin/settings`

**Settings**:
- **Organization Name**: Display name for tenant
- **Company Name**: Legal company name
- **Timezone**: Default timezone for all timestamps
- **Billing Email**: Email for subscription/billing notifications

**Database**: `tenants` table

### 7. Steps Templates System

**Location**: 
- Page: `src/pages/admin/StepsTemplatesView.tsx`
- Route: `/admin/config/steps-templates`

**Purpose**: Create reusable substep templates for common operations

**Features**:
- Create templates with multiple steps
- Edit existing templates
- Delete unused templates
- Apply templates when creating operations
- Each template can have unlimited substeps

**Use Case**: 
- "Laser Cutting Checklist" - Check material, load program, verify settings, etc.
- "Quality Inspection" - Measure dimensions, check finish, verify quantity, etc.

## MCP Server Integration

**Location**: `/Users/vanenkhuizen/Documents/GitHub/eryxon-flow/mcp-server/`

The MCP (Model Context Protocol) server enables AI assistants like Claude to directly interact with manufacturing data.

**Available Tools** (9 tools):
- `fetch_jobs` - Retrieve jobs with filtering
- `fetch_parts` - Get parts data
- `fetch_tasks` - Query tasks
- `fetch_issues` - View production issues
- `update_job` - Modify job status/priority
- `update_part` - Update part progress
- `update_task` - Change task assignments
- `create_job` - Create new jobs
- `get_dashboard_stats` - Retrieve metrics

**Development**:
```bash
cd mcp-server
npm install
npm run dev      # Development with watch mode
npm run build    # Compile TypeScript
```

**Configuration** (Claude Desktop):
```json
{
  "mcpServers": {
    "eryxon-flow": {
      "command": "node",
      "args": ["/path/to/eryxon-flow/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Development Workflow

### Local Development

```bash

npm install


npm run dev


npm run lint


npm run build


npm run preview
```

### Environment Variables

Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Git Workflow

**Current Branch**: `claude/claude-md-mianmph4gygv8jut-01R3Dt5SdhmhRExHwwgFRRAi`

**Commit Conventions**:
- Descriptive commit messages
- Focus on "why" rather than "what"
- Reference issue/PR numbers when applicable

**Push Pattern**:
```bash
git add .
git commit -m "feat: Add new feature"
git push -u origin <branch-name>
```

## Common Gotchas

### 1. Tenant Context Required

Many queries fail without tenant context:
```typescript
// ❌ Will fail - no tenant context
const { data } = await supabase.from('jobs').select('*');

// ✅ Correct - tenant from AuthContext
const { profile } = useAuth();
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('tenant_id', profile.tenant_id);
```

### 2. RLS Policies Block Direct Access

If queries fail with permission errors, check:
- User is authenticated
- Tenant context is set
- RLS policies allow the operation
- Using correct service role key (Edge Functions only)

### 3. Real-time Subscriptions Need Cleanup

```typescript
useEffect(() => {
  const channel = supabase.channel('changes').subscribe();

  // ✅ Always cleanup
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 4. Translation Keys Must Exist

Missing translation keys show the key itself:
```typescript
t('missing.key') // Shows: "missing.key"
```

Always add keys to all language files (`en`, `nl`, `de`)

### 5. TypeScript Relaxed Mode

The codebase uses relaxed TypeScript:
- `any` types are allowed
- Null checks not enforced
- Implicit any is allowed

This prioritizes developer velocity over strict typing.

### 6. Dark Mode Only

The application only supports dark mode:
- Don't add light mode variants
- Use dark mode design tokens
- Test in dark mode only

### 7. Path Alias Required

Always use `@/` alias instead of relative imports:
```typescript
// ✅ Correct
import { Button } from '@/components/ui/button';

// ❌ Wrong
import { Button } from '../../components/ui/button';
```

## Testing

**Status**: No automated testing configured

**Current Approach**:
- Manual testing
- Production monitoring
- User feedback

**Future Consideration**: Add testing framework (Vitest, React Testing Library)

## Performance Considerations

### React Query Caching

React Query caches server state automatically:
```typescript
// Cached for 5 minutes by default
const { data } = useQuery({
  queryKey: ['jobs'],
  queryFn: fetchJobs,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Real-time Optimization

Limit real-time subscriptions:
```typescript
// ✅ Good - one subscription per component
useEffect(() => {
  const channel = supabase.channel('updates').subscribe();
  return () => supabase.removeChannel(channel);
}, []);

// ❌ Bad - subscription in render or multiple subscriptions
```

### Component Code Splitting

Large components are loaded lazily:
```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Skeleton />}>
  <HeavyComponent />
</Suspense>
```

## Accessibility

**shadcn/ui** (Radix UI) provides accessible primitives:
- Keyboard navigation built-in
- ARIA attributes handled
- Focus management automatic
- Screen reader support

**Best Practices**:
- Use semantic HTML
- Provide alt text for images
- Use descriptive button labels
- Test with keyboard navigation

## Documentation Resources

### In-Repo Documentation (22 files)
- `/docs/HOW-THE-APP-WORKS.md` - Comprehensive app guide (35KB)
- `/docs/DESIGN_SYSTEM.md` - Design system reference
- `/docs/API_DOCUMENTATION.md` - API endpoint reference
- `/docs/NOTIFICATIONS_SYSTEM.md` - Notifications architecture
- `/docs/FLEXIBLE_METADATA_GUIDE.md` - Custom fields system
- `/docs/EDGE_FUNCTIONS_SETUP.md` - Edge Functions guide
- See `/docs/` for all documentation

### External Documentation
- [Supabase Docs](https://supabase.com/docs)
- [React Query Docs](https://tanstack.com/query/latest)
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Radix UI Docs](https://www.radix-ui.com/)

## Quick Reference

### File Location Patterns

| Type | Location | Example |
|------|----------|---------|
| Pages | `/src/pages/[role]/` | `/src/pages/admin/Dashboard.tsx` |
| Components | `/src/components/[feature]/` | `/src/components/issues/IssueForm.tsx` |
| UI Primitives | `/src/components/ui/` | `/src/components/ui/button.tsx` |
| Hooks | `/src/hooks/` | `/src/hooks/useJobData.ts` |
| Utilities | `/src/lib/` | `/src/lib/utils.ts` |
| Types | `/src/types/` | `/src/types/qrm.ts` |
| Translations | `/src/i18n/locales/[lang]/` | `/src/i18n/locales/en/translation.json` |
| Edge Functions | `/supabase/functions/` | `/supabase/functions/api-jobs/` |

### Import Shortcuts

```typescript
// Components
import { Button } from '@/components/ui/button';
import { JobCard } from '@/components/admin/JobCard';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useJobData } from '@/hooks/useJobData';

// Utilities
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Types
import type { Database } from '@/integrations/supabase/types';

// Translations
import { useTranslation } from 'react-i18next';
```

### Common Patterns

```typescript
// 1. Fetch data with React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }
});

// 2. Mutate data with React Query
const mutation = useMutation({
  mutationFn: async (newData) => {
    const { data, error } = await supabase
      .from('table')
      .insert(newData);
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries(['resource']);
    toast.success('Success!');
  },
  onError: (error) => {
    toast.error('Error: ' + error.message);
  }
});

// 3. Conditional rendering
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;
return <DataDisplay data={data} />;

// 4. Modal pattern
const [isOpen, setIsOpen] = useState(false);
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>...</DialogContent>
</Dialog>

// 5. Form with validation
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... }
});
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    ...
  </form>
</Form>
```

## Summary

**Eryxon Flow** is a well-architected MES application with:
- 115+ components organized by feature and role
- Multi-tenancy with complete data isolation
- Real-time updates via Supabase
- Comprehensive API with webhooks
- AI assistant integration via MCP server
- Multi-language support (en, nl, de)
- Modern React/TypeScript best practices
- Dark mode design system

**Key Principles**:
1. **Security**: Server-side enforcement (RLS), client-side convenience
2. **Multi-tenancy**: Every operation is tenant-scoped
3. **Real-time**: Supabase subscriptions for live updates
4. **Type Safety**: Generated types from Supabase schema
5. **Accessibility**: Radix UI primitives
6. **Developer Experience**: Fast builds, hot reload, path aliases
7. **Internationalization**: Support for multiple languages
8. **Component Reusability**: shadcn/ui for consistent UI

**When in Doubt**:
- Check `/docs/` for detailed documentation
- Review existing components for patterns
- Use `@/` alias for all imports
- Always consider tenant context
- Client-side protection is UX only
- RLS policies enforce real security

---

*Last Updated: 2025-11-22*
*Version: Based on commit e07d07f*
