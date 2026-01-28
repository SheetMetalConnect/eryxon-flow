---
title: "Responsive UI  SaaS-Style Patterns"
description: "Documentation for Responsive UI  SaaS-Style Patterns"
---



This document describes the responsive design patterns and SaaS-style UI conventions used throughout Eryxon MES.

The app is designed to work **equally well on all screen sizes** - desktop, tablet, and mobile. It is not mobile-first or desktop-first, but rather **responsive and adaptive** to provide the best experience on each device.

---

## Table of Contents

- [SaaS-Style Modal Patterns](#saas-style-modal-patterns)
- [Responsive Data Tables](#responsive-data-tables)
- [Adaptive Layouts](#adaptive-layouts)
- [Component Reference](#component-reference)

---

## SaaS-Style Modal Patterns

Modern SaaS applications (Notion, Linear, Stripe Dashboard) use consistent patterns for displaying detailed information. We follow these conventions:

### 1. Tabbed Content Organization

Instead of displaying all data in one scrollable view, content is organized into logical tabs:

```
┌─────────────────────────────────────────────┐
│  Operation Name                    Status   │
│  #Part-001 · JOB-1234                       │
├─────────────────────────────────────────────┤
│  [Details]  [Resources (3)]  [Files (2)]    │  ← Underline-style tabs
├─────────────────────────────────────────────┤
│                                             │
│  Tab content here...                        │
│                                             │
└─────────────────────────────────────────────┘
```

**Implementation:**

```tsx
<Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
  <TabsList className="h-10 w-full justify-start bg-transparent p-0 gap-4">
    <TabsTrigger
      value="details"
      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
    >
      Details
    </TabsTrigger>
    {/* Additional tabs */}
  </TabsList>

  <div className="flex-1 overflow-y-auto">
    <TabsContent value="details" className="p-4 sm:p-6 space-y-5 m-0">
      {/* Content */}
    </TabsContent>
  </div>
</Tabs>
```

### 2. Clean Header with Context

Modal headers display:
- Title prominently
- Status badge (not buried in content)
- Breadcrumb-style context (Part # · Job #)
- Action buttons alongside title

```tsx
<div className="px-4 sm:px-6 py-4 border-b bg-muted/30">
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
    <div className="flex-1 min-w-0">
      <DialogTitle className="text-lg sm:text-xl font-semibold truncate">
        {title}
      </DialogTitle>
      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
        <Package className="h-3.5 w-3.5" />
        <span>#{partNumber}</span>
        <span>·</span>
        <span>JOB-{jobNumber}</span>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <StatusBadge status={status} />
      {/* Action buttons */}
    </div>
  </div>
</div>
```

### 3. Summary Stats Grid

Key metrics displayed in a scannable grid at the top of content:

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ DUE DATE │ │ EST TIME │ │ MATERIAL │ │ QUANTITY │
│ Dec 15   │ │ 45 min   │ │ Steel    │ │ 100      │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  <div className="p-3 rounded-lg bg-muted/50 border">
    <p className="text-xs text-muted-foreground uppercase tracking-wide">
      Due Date
    </p>
    <p className="mt-1 font-semibold text-sm">Dec 15, 2024</p>
  </div>
  {/* More stat cards */}
</div>
```

### 4. Card-Based Sections

Content grouped in bordered, rounded cards with subtle backgrounds:

```tsx
<div className="border rounded-lg p-4 bg-muted/20">
  <h4 className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
    Context
  </h4>
  {/* Section content */}
</div>
```

### 5. Progressive Disclosure

- Only show tabs if content exists
- Use collapsible sections for secondary information
- Hide less important columns on mobile (accessible via detail modals)

```tsx
{filesCount > 0 && (
  <TabsTrigger value="files">
    Files ({filesCount})
  </TabsTrigger>
)}
```

---

## Responsive Data Tables

### Column Visibility Hook

The `useResponsiveColumns` hook manages which columns are visible at different breakpoints:

```tsx
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";

const { columnVisibility, isMobile } = useResponsiveColumns([
  { id: "job_number", alwaysVisible: true },
  { id: "due_date", alwaysVisible: true },
  { id: "status", alwaysVisible: true },
  { id: "flow", hideBelow: "lg" },      // Hidden on mobile/tablet
  { id: "details", hideBelow: "md" },   // Hidden on mobile
  { id: "files", hideBelow: "md" },     // Hidden on mobile
  { id: "actions", alwaysVisible: true },
]);
```

### Breakpoint Definitions

| Breakpoint | Width | Typical Devices |
|------------|-------|-----------------|
| `sm` | 640px | Small phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |

### DataTable Integration

Pass column visibility to the DataTable component:

```tsx
<DataTable
  columns={columns}
  data={data}
  columnVisibility={columnVisibility}
  pageSize={isMobile ? 10 : 20}
  maxHeight={isMobile ? "calc(100vh - 320px)" : "calc(100vh - 280px)"}
/>
```

### Column Priority Guidelines

| Priority | Always Visible | Examples |
|----------|----------------|----------|
| Critical | Yes | ID, Name, Status |
| Important | Show on tablet+ | Due Date, Assigned To |
| Secondary | Show on desktop | Details, Files, Flow |
| Actions | Yes | Menu button |

---

## Adaptive Layouts

The UI adapts to provide optimal experiences across all device sizes.

### Modal Behavior

Modals adapt their presentation based on available screen space:

| Screen Size | Behavior |
|-------------|----------|
| Mobile (<640px) | Full-screen or bottom sheet style |
| Tablet (640-1024px) | Centered modal, medium width |
| Desktop (>1024px) | Centered modal, larger width |

```tsx
<DialogContent className="
  sm:max-w-xl lg:max-w-2xl
  max-h-[85vh]
  overflow-hidden
  flex flex-col
  p-0
">
```

### File Viewer Dialog

Adapts to screen size for optimal viewing:

```tsx
<DialogContent className="
  glass-card
  w-full h-[100dvh]
  sm:h-[90vh] sm:max-w-6xl
  flex flex-col p-0
  rounded-none sm:rounded-lg
  inset-0
  sm:inset-auto sm:left-[50%] sm:top-[50%]
  sm:translate-x-[-50%] sm:translate-y-[-50%]
">
```

### Responsive Spacing

Spacing adjusts based on available screen real estate:

```tsx
<div className="glass-card p-2 sm:p-4">
  {/* Content */}
</div>
```

### Touch-Friendly Targets

Interactive elements maintain adequate touch targets (44px minimum) on all devices for accessibility and usability.

---

## Component Reference

### Modified Components

| Component | File | Changes |
|-----------|------|---------|
| DataTable | `src/components/ui/data-table/DataTable.tsx` | Added `columnVisibility` prop |
| Dialog | `src/components/ui/dialog.tsx` | Mobile bottom-sheet behavior |
| PageStatsRow | `src/components/admin/PageStatsRow.tsx` | 2-col mobile, 4-col desktop grid |
| AdminPageHeader | `src/components/admin/AdminPageHeader.tsx` | Stack on mobile |

### Modal Components

| Modal | File | Tabs |
|-------|------|------|
| JobDetailModal | `src/components/admin/JobDetailModal.tsx` | Overview, Parts, Delivery |
| PartDetailModal | `src/components/admin/PartDetailModal.tsx` | Details, Operations, Files |
| OperationDetailModal | `src/components/admin/OperationDetailModal.tsx` | Details, Resources, Files |

### Hooks

| Hook | File | Purpose |
|------|------|---------|
| useResponsiveColumns | `src/hooks/useResponsiveColumns.ts` | Manage column visibility by breakpoint |
| useBreakpoint | `src/hooks/useResponsiveColumns.ts` | Get current breakpoint info |

---

## Design Principles

1. **Equal Device Support** - Works equally well on desktop, tablet, and mobile
2. **Scannability** - Users find information quickly via organized tabs and stat grids
3. **Focus** - One context at a time via tabbed interfaces
4. **Density** - Appropriate data density for each screen size
5. **Consistency** - Same patterns across all modals and pages
6. **Progressive Disclosure** - Show essential data first, details on demand
7. **100% Data Coverage** - All data accessible on every device, presentation adapts to screen size

---

## Related Documentation

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) - CSS tokens and design classes
- [CODING_PATTERNS.md](./CODING_PATTERNS.md) - Code patterns and examples
