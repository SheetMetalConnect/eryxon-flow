# Modular Architecture Plan for Eryxon Flow

## Overview

This document outlines the technical transformation from the current flat component structure to a scalable, maintainable modular architecture. The plan addresses code organization, separation of concerns, layer abstraction, and long-term extensibility.

## Current State Analysis

### Technology Stack
- **Frontend**: React 18.3.1 + TypeScript 5.8.3 + Vite 5.4.19
- **Database**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI Libraries**: Material-UI v7.3.5 + shadcn/ui (Radix) + Tailwind CSS 3.4.17
- **State Management**: @tanstack/react-query 5.83.0 + React Context
- **Forms**: React Hook Form 7.61.1 + Zod 3.25.76
- **3D Rendering**: Three.js 0.180.0
- **Data Visualization**: Recharts 2.15.4
- **Internationalization**: i18next 25.6.2

### Critical Issues
- Monolithic App.tsx with 310 lines and 25+ route definitions
- Direct Supabase calls scattered across components
- No repository or service layer abstraction
- Large page components (20-36KB) mixing concerns
- Inconsistent barrel exports and import patterns
- Dual UI library usage without standardization guidelines
- No feature-based organization
- Business logic embedded in UI components
- Duplicated type definitions across files

---

## Target Architecture

### Module Hierarchy

```
src/
├── core/                      # Framework-level concerns
│   ├── routing/
│   ├── theme/
│   ├── i18n/
│   ├── providers/
│   └── types/
├── features/                  # Domain modules
│   ├── auth/
│   ├── jobs/
│   ├── parts/
│   ├── operations/
│   ├── cells/
│   ├── issues/
│   ├── assignments/
│   ├── time-tracking/
│   ├── materials/
│   ├── resources/
│   ├── subscriptions/
│   ├── users/
│   ├── api-keys/
│   ├── webhooks/
│   └── data-export/
├── shared/                    # Cross-cutting concerns
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   ├── constants/
│   └── layouts/
├── data/                      # Data access layer
│   ├── repositories/
│   ├── services/
│   ├── queries/
│   ├── mutations/
│   └── mappers/
└── infrastructure/            # External integrations
    ├── supabase/
    ├── storage/
    └── realtime/
```

---

## Feature Module Structure

Each feature module follows a consistent internal organization:

```
features/{feature-name}/
├── components/
│   ├── {Feature}List.tsx
│   ├── {Feature}Detail.tsx
│   ├── {Feature}Form.tsx
│   ├── {Feature}Modal.tsx
│   └── index.ts
├── hooks/
│   ├── use{Feature}.ts
│   ├── use{Feature}List.ts
│   ├── use{Feature}Mutations.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── {feature}.types.ts
│   ├── {feature}.schema.ts
│   └── index.ts
├── utils/
│   ├── {feature}.helpers.ts
│   ├── {feature}.validators.ts
│   └── index.ts
├── constants/
│   └── {feature}.constants.ts
├── routes/
│   └── {feature}.routes.tsx
└── index.ts
```

### Module Principles
- **Self-contained**: All feature logic colocated
- **Clear boundaries**: Explicit exports via barrel files
- **Consistent structure**: Same organization across all features
- **Single responsibility**: One domain per module
- **Dependency direction**: Features depend on shared/data, never on other features

---

## Data Access Layer Architecture

### Repository Pattern

Create abstraction over Supabase queries:

```
data/repositories/
├── BaseRepository.ts
├── JobRepository.ts
├── PartRepository.ts
├── OperationRepository.ts
├── IssueRepository.ts
├── TimeEntryRepository.ts
├── AssignmentRepository.ts
├── CellRepository.ts
├── MaterialRepository.ts
├── ResourceRepository.ts
├── ProfileRepository.ts
├── TenantRepository.ts
├── ApiKeyRepository.ts
└── WebhookRepository.ts
```

### Repository Responsibilities
- Encapsulate Supabase client operations
- Provide type-safe query methods
- Handle complex joins and relations
- Standardize error handling
- Abstract RLS implementation details
- Support query composition

### Service Layer

Business logic abstraction above repositories:

```
data/services/
├── JobService.ts              # Job lifecycle management
├── PartService.ts             # Part hierarchy operations
├── OperationService.ts        # Operation workflow
├── TimeTrackingService.ts     # Time entry logic with pause/resume
├── AssignmentService.ts       # Work assignment distribution
├── IssueService.ts            # Issue reporting and resolution
├── SubscriptionService.ts     # Plan limits and usage tracking
├── WebhookService.ts          # Webhook dispatch
├── FileStorageService.ts      # STEP/PDF file management
├── NotificationService.ts     # Realtime notification dispatch
└── OnboardingService.ts       # Onboarding flow orchestration
```

### Service Responsibilities
- Implement business rules
- Coordinate multiple repositories
- Handle transactional operations
- Trigger webhooks and notifications
- Validate business constraints
- Orchestrate complex workflows

### Query Hooks Layer

React Query hooks for component consumption:

```
data/queries/
├── useJobQueries.ts
├── usePartQueries.ts
├── useOperationQueries.ts
├── useTimeEntryQueries.ts
├── useIssueQueries.ts
├── useAssignmentQueries.ts
├── useCellQueries.ts
├── useProfileQueries.ts
├── useSubscriptionQueries.ts
└── index.ts

data/mutations/
├── useJobMutations.ts
├── usePartMutations.ts
├── useOperationMutations.ts
├── useTimeEntryMutations.ts
├── useIssueMutations.ts
├── useAssignmentMutations.ts
└── index.ts
```

### Query Hook Responsibilities
- Wrap service calls in React Query
- Manage caching strategies
- Handle optimistic updates
- Invalidate related queries
- Provide loading/error states
- Support pagination and infinite queries

---

## Routing Architecture

### Route Configuration

Extract from App.tsx into modular configuration:

```
core/routing/
├── routes/
│   ├── publicRoutes.tsx
│   ├── operatorRoutes.tsx
│   ├── adminRoutes.tsx
│   ├── sharedRoutes.tsx
│   └── index.ts
├── guards/
│   ├── AuthGuard.tsx
│   ├── RoleGuard.tsx
│   ├── OnboardingGuard.tsx
│   └── index.ts
├── layouts/
│   ├── RootLayout.tsx
│   ├── AdminLayout.tsx
│   ├── OperatorLayout.tsx
│   └── index.ts
├── config/
│   ├── routePaths.ts
│   ├── routeMetadata.ts
│   └── index.ts
└── AppRouter.tsx
```

### Route Organization Strategy
- **Feature-based route definitions**: Each feature exports its routes
- **Guard composition**: Stackable authentication, authorization, onboarding checks
- **Layout nesting**: Outlet-based layout hierarchy
- **Lazy loading**: Code-split by feature module
- **Type-safe paths**: Centralized route path constants

### Feature Route Integration

Each feature module exports route configuration:

```typescript
// features/jobs/routes/jobs.routes.tsx
export const jobRoutes = {
  list: {
    path: '/admin/jobs',
    element: lazy(() => import('../pages/JobList')),
    guards: [AuthGuard, RoleGuard({ role: 'admin' })],
  },
  create: {
    path: '/admin/jobs/new',
    element: lazy(() => import('../pages/JobCreate')),
    guards: [AuthGuard, RoleGuard({ role: 'admin' })],
  },
};
```

---

## Component Library Standardization

### Dual Library Strategy

**shadcn/ui (Primary)**: Form controls, data display, overlays
**Material-UI (Secondary)**: Complex tables (DataGrid), date pickers, advanced layouts

### Component Organization

```
shared/components/
├── ui/                        # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── table.tsx
│   └── [48 more components]
├── data-display/              # Complex display components
│   ├── DataTable.tsx          # MUI DataGrid wrapper
│   ├── DataGrid.tsx
│   ├── StatCard.tsx
│   ├── MetricChart.tsx
│   └── index.ts
├── forms/                     # Form components
│   ├── FormField.tsx
│   ├── FormSelect.tsx
│   ├── FormDatePicker.tsx
│   ├── FormFileUpload.tsx
│   └── index.ts
├── feedback/                  # User feedback
│   ├── Toast.tsx
│   ├── Alert.tsx
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── index.ts
├── navigation/                # Navigation elements
│   ├── NavBar.tsx
│   ├── NavDrawer.tsx
│   ├── NavTabs.tsx
│   ├── Breadcrumbs.tsx
│   └── index.ts
├── overlays/                  # Modals and popovers
│   ├── Modal.tsx
│   ├── Drawer.tsx
│   ├── Popover.tsx
│   └── index.ts
├── specialized/               # Domain-specific shared
│   ├── STEPViewer.tsx         # Three.js 3D viewer
│   ├── PDFViewer.tsx
│   ├── FileUploadZone.tsx
│   ├── GlobalSearch.tsx
│   └── index.ts
└── index.ts                   # Master barrel export
```

### Component Selection Guidelines
- **Form inputs**: shadcn/ui (consistent styling, Radix primitives)
- **Data tables**: MUI DataGrid (advanced features: sorting, filtering, pagination, column management)
- **Basic tables**: shadcn/ui Table (simple read-only displays)
- **Modals/dialogs**: shadcn/ui Dialog (accessibility, animations)
- **Date pickers**: MUI DatePicker (comprehensive date handling)
- **Buttons**: shadcn/ui Button (consistent design system)
- **Cards**: shadcn/ui Card (consistent layouts)
- **Alerts/toasts**: shadcn/ui components (styled consistently)

---

## Type System Architecture

### Type Organization

```
shared/types/
├── entities/                  # Domain entity types
│   ├── job.types.ts
│   ├── part.types.ts
│   ├── operation.types.ts
│   ├── issue.types.ts
│   ├── profile.types.ts
│   └── index.ts
├── api/                       # API request/response types
│   ├── requests.types.ts
│   ├── responses.types.ts
│   └── index.ts
├── ui/                        # UI-specific types
│   ├── table.types.ts
│   ├── form.types.ts
│   ├── modal.types.ts
│   └── index.ts
├── common/                    # Common utility types
│   ├── pagination.types.ts
│   ├── filters.types.ts
│   ├── status.types.ts
│   └── index.ts
└── index.ts

core/types/
├── database.types.ts          # Generated Supabase types
├── auth.types.ts
├── routing.types.ts
└── index.ts
```

### Type Strategy
- **Database types**: Auto-generated from Supabase (read-only, committed to repository)
- **Entity types**: Extend database types with computed properties and relations
- **API types**: Request/response shapes for service layer
- **UI types**: Component prop interfaces
- **Utility types**: Generic reusable type helpers

### Zod Schema Colocated with Types

```typescript
// shared/types/entities/job.types.ts
import { z } from 'zod';
import { Database } from '@/core/types';

export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export const JobFormSchema = z.object({
  job_number: z.string().min(1, 'Required'),
  customer: z.string().min(1, 'Required'),
  due_date: z.date(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'on_hold']),
  notes: z.string().optional(),
});

export type JobFormData = z.infer<typeof JobFormSchema>;
```

---

## Hook Organization

### Shared Hooks

```
shared/hooks/
├── useAuth.ts                 # Auth context consumer
├── useToast.ts                # Toast notifications
├── useDebounce.ts
├── useLocalStorage.ts
├── useMediaQuery.ts
├── useClickOutside.ts
├── useKeyboardShortcut.ts
├── useRealtime.ts             # Supabase realtime subscriptions
├── useFileUpload.ts
├── usePagination.ts
├── useFilters.ts
└── index.ts
```

### Feature-Specific Hooks

Each feature module contains hooks for its domain:

```typescript
// features/operations/hooks/useOperation.ts
export const useOperation = (id: string) => {
  return useQuery({
    queryKey: ['operation', id],
    queryFn: () => OperationService.getById(id),
  });
};

// features/operations/hooks/useOperationMutations.ts
export const useStartOperation = () => {
  return useMutation({
    mutationFn: OperationService.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    },
  });
};
```

---

## Utility Functions

### Shared Utilities

```
shared/utils/
├── date/
│   ├── formatDate.ts
│   ├── dateCalculations.ts
│   └── index.ts
├── string/
│   ├── formatters.ts
│   ├── validators.ts
│   └── index.ts
├── number/
│   ├── formatCurrency.ts
│   ├── formatDuration.ts
│   └── index.ts
├── array/
│   ├── groupBy.ts
│   ├── sortBy.ts
│   └── index.ts
├── file/
│   ├── fileValidation.ts
│   ├── fileTypeDetection.ts
│   ├── fileSize.ts
│   └── index.ts
├── color/
│   ├── colorPalette.ts
│   ├── colorConversion.ts
│   └── index.ts
└── index.ts
```

### Feature-Specific Utils

Domain logic utilities colocated with features:

```
features/operations/utils/
├── operationHelpers.ts        # Status transitions, completion %
├── operationValidators.ts     # Business rule validation
└── index.ts
```

---

## Constants and Configuration

### Shared Constants

```
shared/constants/
├── roles.ts
├── statuses.ts
├── colors.ts
├── durations.ts
├── limits.ts
└── index.ts
```

### Feature Constants

```
features/subscriptions/constants/
└── plans.ts                   # Plan definitions, limits, pricing
```

### Environment Configuration

```
core/config/
├── env.ts                     # Environment variables with validation
├── supabase.config.ts
├── app.config.ts
└── index.ts
```

---

## Layout System

### Layout Hierarchy

```
shared/layouts/
├── RootLayout.tsx             # Providers, theme, toast
├── AdminLayout.tsx            # Admin sidebar, header, notifications
├── OperatorLayout.tsx         # Mobile-first, bottom navigation
├── PublicLayout.tsx           # Marketing pages
├── components/
│   ├── AdminSidebar.tsx
│   ├── AdminHeader.tsx
│   ├── AdminQuickActions.tsx
│   ├── OperatorBottomNav.tsx
│   ├── OperatorHeader.tsx
│   └── index.ts
└── index.ts
```

### Layout Responsibilities
- **RootLayout**: Provider composition, error boundaries, theme application
- **AdminLayout**: Full-featured desktop interface with navigation, search, notifications
- **OperatorLayout**: Simplified mobile-first interface with bottom navigation
- **PublicLayout**: Marketing and authentication pages

---

## Infrastructure Layer

### Supabase Client Management

```
infrastructure/supabase/
├── client.ts                  # Singleton client instance
├── auth.ts                    # Auth helpers
├── storage.ts                 # File storage operations
├── realtime.ts                # Realtime subscription management
├── rpc.ts                     # RPC function calls
├── types.ts                   # Generated types (auto-generated)
└── index.ts
```

### Storage Service

```
infrastructure/storage/
├── FileStorageService.ts      # Upload, download, delete operations
├── fileValidation.ts          # MIME type, size validation
├── fileProcessing.ts          # Thumbnail generation, format conversion
└── index.ts
```

### Realtime Management

```
infrastructure/realtime/
├── RealtimeProvider.tsx       # Context for realtime subscriptions
├── useRealtimeSubscription.ts # Hook for component subscriptions
├── channels.ts                # Channel configuration
└── index.ts
```

---

## Feature Module Specifications

### Authentication Feature

```
features/auth/
├── components/
│   ├── LoginForm.tsx
│   ├── SignUpForm.tsx
│   ├── PasswordResetForm.tsx
│   └── index.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useSignIn.ts
│   ├── useSignUp.ts
│   ├── useSignOut.ts
│   └── index.ts
├── context/
│   ├── AuthContext.tsx
│   ├── AuthProvider.tsx
│   └── index.ts
├── types/
│   ├── auth.types.ts
│   ├── profile.types.ts
│   └── index.ts
├── routes/
│   └── auth.routes.tsx
└── index.ts
```

### Jobs Feature

```
features/jobs/
├── components/
│   ├── JobList.tsx
│   ├── JobCard.tsx
│   ├── JobDetail.tsx
│   ├── JobForm.tsx
│   ├── JobModal.tsx
│   ├── JobStatusBadge.tsx
│   └── index.ts
├── hooks/
│   ├── useJobs.ts
│   ├── useJob.ts
│   ├── useJobMutations.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── job.types.ts
│   ├── job.schema.ts
│   └── index.ts
├── utils/
│   ├── jobHelpers.ts
│   └── index.ts
├── routes/
│   └── jobs.routes.tsx
└── index.ts
```

### Parts Feature

```
features/parts/
├── components/
│   ├── PartList.tsx
│   ├── PartCard.tsx
│   ├── PartDetail.tsx
│   ├── PartDetailModal.tsx          # Refactored from 28KB to smaller components
│   ├── PartForm.tsx
│   ├── PartHierarchyTree.tsx        # Parent-child relationships
│   ├── PartFileViewer.tsx           # STEP/PDF viewer integration
│   └── index.ts
├── hooks/
│   ├── useParts.ts
│   ├── usePart.ts
│   ├── usePartMutations.ts
│   ├── usePartHierarchy.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── part.types.ts
│   ├── part.schema.ts
│   └── index.ts
├── utils/
│   ├── partHelpers.ts
│   ├── hierarchyHelpers.ts
│   └── index.ts
├── routes/
│   └── parts.routes.tsx
└── index.ts
```

### Operations Feature

```
features/operations/
├── components/
│   ├── OperationList.tsx
│   ├── OperationCard.tsx
│   ├── OperationDetail.tsx
│   ├── OperationDetailModal.tsx
│   ├── OperationTimeline.tsx
│   ├── OperationStatusBadge.tsx
│   └── index.ts
├── hooks/
│   ├── useOperations.ts
│   ├── useOperation.ts
│   ├── useOperationMutations.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── operation.types.ts
│   ├── operation.schema.ts
│   └── index.ts
├── routes/
│   └── operations.routes.tsx
└── index.ts
```

### Time Tracking Feature

```
features/time-tracking/
├── components/
│   ├── TimeEntryList.tsx
│   ├── TimeEntryCard.tsx
│   ├── ActiveTimer.tsx
│   ├── TimerControls.tsx            # Start/stop/pause/resume
│   ├── CurrentlyTimingWidget.tsx
│   └── index.ts
├── hooks/
│   ├── useTimeEntries.ts
│   ├── useActiveTimer.ts
│   ├── useTimerMutations.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── timeEntry.types.ts
│   └── index.ts
├── utils/
│   ├── durationCalculations.ts
│   └── index.ts
└── index.ts
```

### Issues Feature

```
features/issues/
├── components/
│   ├── IssueList.tsx
│   ├── IssueCard.tsx
│   ├── IssueDetail.tsx
│   ├── IssueForm.tsx
│   ├── IssueSeverityBadge.tsx
│   └── index.ts
├── hooks/
│   ├── useIssues.ts
│   ├── useIssue.ts
│   ├── useIssueMutations.ts
│   ├── useOperationIssues.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── issue.types.ts
│   ├── issue.schema.ts
│   └── index.ts
├── routes/
│   └── issues.routes.tsx
└── index.ts
```

### Subscriptions Feature

```
features/subscriptions/
├── components/
│   ├── PlanCard.tsx
│   ├── PlanComparison.tsx
│   ├── CurrentPlan.tsx
│   ├── UsageMetrics.tsx
│   ├── PlanUpgradeModal.tsx
│   └── index.ts
├── hooks/
│   ├── useSubscription.ts
│   ├── useUsageMetrics.ts
│   ├── usePlanMutations.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── subscription.types.ts
│   └── index.ts
├── constants/
│   └── plans.ts
├── routes/
│   └── subscriptions.routes.tsx
└── index.ts
```

### Onboarding Feature

```
features/onboarding/
├── components/
│   ├── OnboardingWizard.tsx
│   ├── OnboardingSteps.tsx
│   ├── PlanSelectionStep.tsx
│   ├── DataGenerationStep.tsx
│   ├── AppTourStep.tsx
│   └── index.ts
├── hooks/
│   ├── useOnboarding.ts
│   ├── useOnboardingProgress.ts
│   └── index.ts
├── api/
│   └── onboarding.api.ts
├── types/
│   └── onboarding.types.ts
├── routes/
│   └── onboarding.routes.tsx
└── index.ts
```

### Webhooks Feature

```
features/webhooks/
├── components/
│   ├── WebhookList.tsx
│   ├── WebhookForm.tsx
│   ├── WebhookTestTrigger.tsx
│   ├── WebhookLogs.tsx
│   └── index.ts
├── hooks/
│   ├── useWebhooks.ts
│   ├── useWebhook.ts
│   ├── useWebhookMutations.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── webhook.types.ts
│   ├── webhook.schema.ts
│   └── index.ts
├── constants/
│   └── webhookEvents.ts
├── routes/
│   └── webhooks.routes.tsx
└── index.ts
```

### API Keys Feature

```
features/api-keys/
├── components/
│   ├── ApiKeyList.tsx
│   ├── ApiKeyForm.tsx
│   ├── ApiKeyDisplay.tsx          # Show once on creation
│   └── index.ts
├── hooks/
│   ├── useApiKeys.ts
│   ├── useApiKeyMutations.ts
│   └── index.ts
├── api/
│   ├── queries.ts
│   ├── mutations.ts
│   └── index.ts
├── types/
│   ├── apiKey.types.ts
│   └── index.ts
├── routes/
│   └── apiKeys.routes.tsx
└── index.ts
```

---

## Internationalization Architecture

### i18n Organization

```
core/i18n/
├── config/
│   ├── i18n.config.ts
│   └── languages.ts
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── auth.json
│   │   ├── jobs.json
│   │   ├── parts.json
│   │   ├── operations.json
│   │   ├── errors.json
│   │   └── index.ts
│   ├── de/
│   │   └── [same structure]
│   └── nl/
│       └── [same structure]
├── hooks/
│   ├── useTranslation.ts
│   └── index.ts
└── index.ts
```

### Translation Key Strategy
- **Namespaced by feature**: `jobs.list.title`, `operations.status.in_progress`
- **Common keys**: `common.actions.save`, `common.labels.search`
- **Error messages**: `errors.validation.required`, `errors.api.network`
- **Lazy loading**: Load feature translations on route access

---

## Theme Architecture

### Theme Organization

```
core/theme/
├── config/
│   ├── muiTheme.ts            # Material-UI theme
│   ├── tailwindTheme.ts       # Tailwind config reference
│   └── tokens.ts              # Design tokens
├── components/
│   ├── ThemeProvider.tsx
│   ├── ThemeSwitcher.tsx
│   └── index.ts
├── hooks/
│   ├── useTheme.ts
│   └── index.ts
└── index.ts
```

### Design Token System
- **Colors**: HSL-based CSS variables for light/dark modes
- **Spacing**: 4px base unit, consistent scale
- **Typography**: Font families, sizes, weights, line heights
- **Shadows**: Elevation system
- **Borders**: Radius, widths
- **Transitions**: Duration, easing functions

### Dark Mode Strategy
- CSS variable swapping on `<html>` class (`light` / `dark`)
- MUI theme palette synchronized with CSS variables
- Persistent preference in localStorage
- System preference detection fallback

---

## State Management Architecture

### State Categories

**Server State** (React Query):
- Jobs, parts, operations, issues, assignments
- User profiles, tenant data, subscriptions
- Cached with intelligent invalidation
- Background refetching
- Optimistic updates

**Authentication State** (React Context):
- Current user session
- User profile
- Tenant association
- Role-based permissions

**UI State** (React useState/useReducer):
- Modal open/closed
- Form field values
- Filter/sort selections
- Pagination cursors
- Sidebar collapsed state

**Form State** (React Hook Form):
- Form field registration
- Validation state
- Error messages
- Dirty/touched tracking

### State Management Principles
- **Colocation**: State as close to usage as possible
- **Server state in React Query**: Never duplicate server data in local state
- **Lift state minimally**: Only lift when shared between siblings
- **URL as state**: Search params for filters, sorts, pagination
- **Avoid prop drilling**: Use composition and context judiciously

---

## Error Handling Architecture

### Error Boundaries

```
shared/components/feedback/
├── ErrorBoundary.tsx          # Top-level error boundary
├── FeatureErrorBoundary.tsx   # Feature-level recovery
└── index.ts
```

### Error Handling Layers

**Repository Layer**:
- Catch Supabase errors
- Transform to domain errors
- Log to monitoring service
- Return typed Result<T, Error>

**Service Layer**:
- Validate business rules
- Throw domain-specific errors
- Handle transactional rollbacks

**React Query Layer**:
- Expose error state to components
- Retry strategies for transient failures
- Error callbacks for logging

**Component Layer**:
- Display user-friendly error messages
- Fallback UI
- Recovery actions

### Error Types

```
shared/types/errors/
├── DatabaseError.ts
├── ValidationError.ts
├── AuthorizationError.ts
├── NotFoundError.ts
├── BusinessRuleError.ts
└── index.ts
```

---

## Testing Strategy

### Test Organization

```
src/
├── features/
│   └── jobs/
│       ├── __tests__/
│       │   ├── components/
│       │   │   ├── JobList.test.tsx
│       │   │   └── JobForm.test.tsx
│       │   ├── hooks/
│       │   │   └── useJobs.test.ts
│       │   └── utils/
│       │       └── jobHelpers.test.ts
│       └── [feature files]
```

### Testing Libraries
- **Unit/Integration**: Vitest
- **Component testing**: React Testing Library
- **E2E testing**: Playwright
- **Mock service worker**: MSW for API mocking

### Testing Layers

**Repository Tests**:
- Mock Supabase client
- Test query construction
- Verify error handling

**Service Tests**:
- Mock repositories
- Test business logic
- Verify transaction coordination

**Hook Tests**:
- Mock React Query
- Test state management
- Verify side effects

**Component Tests**:
- Mock hooks
- Test user interactions
- Verify rendering
- Accessibility checks

**E2E Tests**:
- Critical user flows
- Multi-page workflows
- Real database (test environment)

---

## Build and Bundling Optimization

### Code Splitting Strategy

**Route-based splitting**:
- Lazy load all page components
- Feature modules loaded on demand
- Separate bundles per major feature

**Component splitting**:
- Heavy components lazy loaded (STEPViewer, PDFViewer)
- Modal content lazy loaded

**Library splitting**:
- Vendor chunk for stable dependencies
- Separate chunks for large libraries (Three.js, MUI)

### Vite Configuration

```
vite.config.ts
├── manualChunks configuration:
│   ├── 'react-vendor': React, React-DOM, React-Router
│   ├── 'mui-vendor': @mui/* packages
│   ├── 'ui-vendor': Radix UI primitives
│   ├── 'three-vendor': Three.js
│   ├── 'query-vendor': React Query
│   └── Feature-based chunks by directory
├── Plugin configuration:
│   ├── react()
│   ├── tsconfigPaths()
│   └── compression (gzip/brotli)
└── Build optimization:
    ├── minification: esbuild
    ├── source maps: hidden in production
    └── asset optimization
```

### Bundle Size Targets
- Initial bundle: < 200KB gzipped
- Route chunks: < 100KB gzipped each
- Lazy components: < 50KB gzipped each

---

## Migration Strategy

### Component Migration Pattern

**From**: Large monolithic component with mixed concerns

```typescript
// OLD: pages/admin/JobCreate.tsx (36KB)
// - Direct Supabase queries
// - Complex form logic
// - Business validation
// - UI rendering
// - File uploads
// - All in one file
```

**To**: Modular feature structure

```typescript
// NEW: features/jobs/
// - api/mutations.ts (data access)
// - hooks/useJobMutations.ts (React Query integration)
// - components/JobForm.tsx (form UI)
// - components/JobFormSections/ (form subsections)
// - types/job.schema.ts (validation schema)
// - utils/jobValidators.ts (business rules)
```

### Refactoring Steps Per Feature

1. **Extract types and schemas** → `features/{name}/types/`
2. **Create repository** → `data/repositories/{Name}Repository.ts`
3. **Create service** → `data/services/{Name}Service.ts`
4. **Create query hooks** → `data/queries/use{Name}Queries.ts`
5. **Create mutation hooks** → `data/mutations/use{Name}Mutations.ts`
6. **Extract components** → `features/{name}/components/`
7. **Extract utilities** → `features/{name}/utils/`
8. **Create route config** → `features/{name}/routes/`
9. **Create barrel exports** → `features/{name}/index.ts`
10. **Update imports** in consuming files
11. **Remove old files** from flat structure
12. **Update route configuration** in core/routing

### Migration Order

Priority based on complexity and dependencies:

1. **Core infrastructure**
   - Repository pattern base classes
   - Service layer foundation
   - Query/mutation hooks infrastructure

2. **Foundation features** (no dependencies)
   - Auth
   - Profiles
   - Tenants
   - Subscriptions

3. **Configuration features**
   - Cells
   - Materials
   - Resources

4. **Core workflow features** (depend on foundation)
   - Jobs
   - Parts
   - Operations

5. **Supporting features** (depend on workflow)
   - Time tracking
   - Assignments
   - Issues

6. **Integration features**
   - Webhooks
   - API keys
   - Data export

7. **User experience features**
   - Onboarding
   - Global search
   - Notifications

---

## Documentation Requirements

### Code Documentation

**Repository classes**:
- JSDoc comments for all public methods
- Parameter descriptions
- Return type documentation
- Example usage

**Service classes**:
- Business rule documentation
- Transaction boundaries
- Error scenarios
- Side effects (webhooks, notifications)

**Hooks**:
- Usage examples
- Parameter descriptions
- Return value structure
- Common patterns

**Components**:
- Props interface documentation
- Usage examples
- Accessibility notes
- Responsive behavior

### Technical Documentation

```
docs/
├── architecture/
│   ├── overview.md
│   ├── data-layer.md
│   ├── state-management.md
│   ├── routing.md
│   └── testing.md
├── features/
│   ├── jobs.md
│   ├── parts.md
│   ├── operations.md
│   └── [one per feature]
├── guides/
│   ├── adding-a-feature.md
│   ├── creating-a-repository.md
│   ├── writing-tests.md
│   ├── component-guidelines.md
│   └── styling-guide.md
├── api/
│   └── openapi.json
└── diagrams/
    ├── architecture-overview.svg
    ├── data-flow.svg
    └── feature-dependencies.svg
```

---

## Performance Optimization

### React Query Configuration

```typescript
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### Realtime Subscription Strategy
- **Selective subscriptions**: Only active features
- **Subscription cleanup**: Unmount cleanup
- **Throttling**: Debounce rapid updates
- **Background sync**: Reconcile on reconnect

### Memoization Strategy
- **Component memoization**: React.memo for expensive renders
- **Value memoization**: useMemo for expensive calculations
- **Callback memoization**: useCallback for stable references
- **Selector memoization**: Derived state calculations

### Virtual Scrolling
- Implement for large lists (operations, time entries)
- Use `react-virtual` or similar library
- Threshold: > 100 items

### Image Optimization
- Lazy load images below the fold
- Serve responsive images
- Use WebP format with fallbacks
- Implement progressive loading

---

## Developer Experience

### Tooling

**Linting**:
- ESLint with TypeScript rules
- Import order enforcement
- Unused import detection
- React hooks rules

**Formatting**:
- Prettier for consistent style
- Pre-commit hooks (husky)

**Type checking**:
- Strict TypeScript configuration
- No implicit any
- Strict null checks
- Path aliases (`@/` prefix)

**Git hooks**:
- Pre-commit: Lint staged files
- Pre-push: Type check, run tests
- Commit message linting

### Development Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "type-check": "tsc --noEmit",
    "generate-types": "supabase gen types typescript --local > src/core/types/database.types.ts"
  }
}
```

### VS Code Configuration

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Security Considerations

### Authentication Security
- Supabase Auth with RLS enforcement
- JWT token refresh handling
- Secure session storage
- CSRF protection via Supabase

### Authorization Security
- Role-based access control (RBAC)
- Route guards for UI protection
- RLS policies for data protection
- No client-side permission logic for security

### Data Security
- Multi-tenant isolation via tenant_id
- Row Level Security on all tables
- File storage access policies
- API key hashing (bcrypt)

### Input Validation
- Zod schemas for all forms
- Server-side validation in services
- Sanitization for user-generated content
- File upload validation (type, size)

### Secrets Management
- Environment variables for sensitive config
- No hardcoded API keys
- Supabase environment isolation
- .env files in .gitignore

---

## Monitoring and Observability

### Error Monitoring
- Integrate error tracking service (Sentry, LogRocket)
- Repository layer error logging
- Service layer error logging
- Error boundaries with context capture

### Performance Monitoring
- React Query DevTools in development
- Bundle analysis (vite-bundle-visualizer)
- Lighthouse CI integration
- Web Vitals tracking

### User Analytics
- Feature usage tracking
- User flow analysis
- Error occurrence tracking
- Performance metrics per route

---

## Database Architecture Considerations

### Schema Evolution
- Versioned migrations in `/supabase/migrations/`
- Forward-only migration strategy
- Data migration scripts separate from schema
- Test migrations in staging first

### Indexing Strategy
- Index foreign keys (tenant_id, job_id, part_id, operation_id)
- Composite indexes for common queries
- Partial indexes for status filtering
- Full-text search indexes for search features

### Query Optimization
- Use `.select()` with specific columns
- Avoid N+1 queries with joins
- Implement pagination for large datasets
- Use RPC functions for complex aggregations

### Data Archiving
- Archive completed jobs after retention period
- Soft deletes for audit trails
- Historical data in separate tables
- Implement data lifecycle policies

---

## API Design (Future REST API)

If moving beyond direct Supabase client usage:

### RESTful Endpoint Structure

```
/api/v1/
├── /jobs
│   ├── GET    /               # List jobs
│   ├── POST   /               # Create job
│   ├── GET    /:id            # Get job details
│   ├── PATCH  /:id            # Update job
│   ├── DELETE /:id            # Delete job
│   └── GET    /:id/parts      # Get job's parts
├── /parts
│   ├── GET    /               # List parts
│   ├── POST   /               # Create part
│   ├── GET    /:id            # Get part details
│   ├── PATCH  /:id            # Update part
│   └── DELETE /:id            # Delete part
├── /operations
│   ├── GET    /               # List operations
│   ├── POST   /               # Create operation
│   ├── GET    /:id            # Get operation details
│   ├── PATCH  /:id            # Update operation
│   ├── POST   /:id/start      # Start operation
│   ├── POST   /:id/complete   # Complete operation
│   └── POST   /:id/pause      # Pause operation
└── [additional resources]
```

### API Standards
- **Versioning**: URL-based (`/api/v1/`)
- **Authentication**: JWT bearer tokens
- **Response format**: JSON with consistent envelope
- **Error format**: RFC 7807 Problem Details
- **Pagination**: Cursor-based for infinite scroll, offset for pages
- **Filtering**: Query parameters (`?status=in_progress`)
- **Sorting**: Query parameters (`?sort=-created_at`)
- **Field selection**: Sparse fieldsets (`?fields=id,name`)

---

## Deployment and CI/CD

### Build Pipeline

1. **Lint**: ESLint check
2. **Type check**: TypeScript compilation
3. **Unit tests**: Vitest run
4. **Build**: Vite production build
5. **E2E tests**: Playwright on preview build
6. **Bundle analysis**: Check size limits
7. **Deploy**: To hosting platform

### Environment Strategy
- **Development**: Local Supabase + local Vite
- **Staging**: Staging Supabase project + preview deployment
- **Production**: Production Supabase project + production deployment

### Deployment Platforms
- **Frontend**: Vercel, Netlify, or Cloudflare Pages
- **Database**: Supabase hosted
- **Edge functions**: Supabase edge functions

---

## Future Extensibility

### Plugin Architecture (Future)

```
plugins/
├── {plugin-name}/
│   ├── index.ts               # Plugin registration
│   ├── routes.tsx             # Additional routes
│   ├── components/            # Plugin components
│   ├── hooks/                 # Plugin hooks
│   └── api/                   # Plugin API integration
└── index.ts                   # Plugin loader
```

### Extension Points
- **Custom cell types**: Pluggable cell implementations
- **Custom operations**: Define new operation types
- **Custom reports**: Add new data export formats
- **Custom integrations**: Third-party service connectors
- **Custom themes**: Additional theme variants
- **Custom languages**: Additional i18n locales

### API Extensibility
- Webhook system for external integrations
- REST API for third-party applications
- GraphQL layer (future consideration)
- Server-sent events for realtime updates

---

## Conclusion

This modular architecture plan provides a comprehensive blueprint for transforming Eryxon Flow from a rapid-iteration prototype into a maintainable, scalable, production-grade application. The feature-based module structure, combined with clear layer separation and consistent patterns, will enable long-term growth while maintaining code quality and developer productivity.

The migration can be executed incrementally, feature by feature, without disrupting the existing application functionality. Each completed migration step will improve code organization, testability, and maintainability while preserving the application's current capabilities.
