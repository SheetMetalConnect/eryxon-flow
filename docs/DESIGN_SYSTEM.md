# Eryxon MES Design System

**Modern, professional design system for manufacturing execution**

Version: 2.0
Last Updated: November 17, 2025
Status: ✅ Implemented

---

## Table of Contents

- [Overview](#overview)
- [Typography](#typography)
- [Color Palette](#color-palette)
- [Component Styling Guidelines](#component-styling-guidelines)
- [Design Tokens Reference](#design-tokens-reference)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)

---

## Overview

### Philosophy

The Eryxon MES design system is built for **manufacturing professionals**. It prioritizes:

- **Clarity**: Easy to read technical data (part numbers, measurements, serial codes)
- **Efficiency**: Touch-friendly for tablet use on the shop floor
- **Professionalism**: Enterprise-grade appearance for business software
- **Consistency**: Centralized design tokens prevent style drift

### Technology Stack

- **Typography**: Inter font family (optimized for UI)
- **Colors**: HSL-based for easy theming
- **Styling**: Hybrid approach
  - Tailwind CSS for simple components and layouts
  - Material-UI (MUI) for complex components (DataGrid, forms)
  - shadcn/ui for base UI primitives
- **Design Tokens**: CSS custom properties (CSS variables)

### Architecture

```
src/styles/design-system.css  ← All design tokens defined here
├── Typography (Inter font)
├── Color palette (HSL values)
├── Spacing & sizing
├── Shadows & effects
├── Transitions
└── Manufacturing-specific tokens

src/index.css  ← Imports design-system.css
src/theme/theme.ts  ← MUI theme (maps to design tokens)
tailwind.config.ts  ← Tailwind config (extends design tokens)
```

---

## Typography

### Font Family: Inter

**Why Inter?**
- Superior on-screen legibility
- Excellent character distinction (1, l, I are clearly different)
- Optimized for small sizes
- Industry standard for modern SaaS (GitHub, Linear, Stripe, Vercel)

### Usage

**CSS:**
```css
font-family: var(--font-family-base);
/* Expands to: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif */
```

**Tailwind:**
```jsx
<p className="font-sans">Body text uses Inter</p>
```

**MUI:**
Inter is automatically applied to all MUI components via theme.

### Type Scale

| Level | Size | Weight | Use Case |
|-------|------|--------|----------|
| `h1` | 2.25rem (36px) | 700 | Page titles |
| `h2` | 1.875rem (30px) | 700 | Section headings |
| `h3` | 1.5rem (24px) | 600 | Card titles, subsections |
| `h4` | 1.25rem (20px) | 600 | Component headings |
| `h5` | 1.125rem (18px) | 600 | Small headings |
| `h6` | 1rem (16px) | 600 | Emphasized labels |
| `body1` | 1rem (16px) | 400 | Standard body text |
| `body2` | 0.875rem (14px) | 400 | Secondary text, labels |
| `caption` | 0.75rem (12px) | 400 | Timestamps, metadata |

### Font Weights

- **300 (Light)**: Rarely used, display text only
- **400 (Regular)**: Body text, descriptions
- **500 (Medium)**: Buttons, emphasized text
- **600 (Semibold)**: Headings, card titles
- **700 (Bold)**: Major headings, hero text

---

## Color Palette

### Industrial Modern Theme

Our color palette is inspired by **metal fabrication** - professional, trustworthy, industrial.

### Brand Colors

#### Primary: Deep Slate Blue
```css
--brand-primary: 215 25% 27%  /* #3a4656 */
```
- **Use**: Primary buttons, navigation, emphasis
- **Character**: Professional, industrial strength, trustworthy
- **Contrast**: High contrast with white text (WCAG AAA)

#### Accent: Electric Blue
```css
--brand-accent: 211 100% 50%  /* #0080ff */
```
- **Use**: Links, hover states, active elements, accents
- **Character**: Modern, tech-forward, energetic
- **Contrast**: Excellent on white and dark backgrounds

### Semantic Colors

#### Success (Emerald)
```css
--success: 152 69% 42%  /* #148853 */
```
- **Use**: Completed work, success messages, positive indicators
- **MES Context**: Completed operations, finished jobs

#### Warning (Amber)
```css
--warning: 38 100% 50%  /* #ff9900 */
```
- **Use**: Caution states, needs attention, active timing
- **MES Context**: Active time entries, pending approvals

#### Error (Crimson)
```css
--error: 4 90% 58%  /* #eb4034 */
```
- **Use**: Error states, critical issues, destructive actions
- **MES Context**: Blocked operations, critical issues

#### Info (Cyan)
```css
--info: 199 89% 48%  /* #0d9fc9 */
```
- **Use**: Informational messages, helpful hints
- **MES Context**: General information, process guidance

### Neutral Scale (Cool Grays)

Steel-inspired grays that match the metals fabrication context:

| Shade | HSL | Hex | Use Case |
|-------|-----|-----|----------|
| 50 | `220 20% 98%` | `#f5f7fa` | Backgrounds |
| 100 | `220 18% 96%` | `#f0f2f5` | Hover backgrounds |
| 200 | `220 16% 92%` | `#e8ebee` | Borders, dividers |
| 300 | `220 14% 86%` | `#d5dade` | Disabled backgrounds |
| 400 | `220 12% 72%` | `#abb4bd` | Placeholder text |
| 500 | `220 10% 54%` | `#7d8894` | Secondary text |
| 600 | `220 14% 40%` | `#57606a` | Body text (dark mode) |
| 700 | `220 18% 30%` | `#3f4954` | Headings (dark mode) |
| 800 | `220 24% 20%` | `#272e38` | Surfaces (dark mode) |
| 900 | `220 30% 12%` | `#1a1f29` | Foreground text |
| 950 | `220 35% 8%` | `#0f1419` | Backgrounds (dark mode) |

### MES-Specific Status Colors

Manufacturing workflow states:

```css
--status-active: 38 100% 50%       /* Amber - timing in progress */
--status-completed: 152 69% 42%    /* Emerald - finished */
--status-on-hold: 25 95% 53%       /* Orange - paused */
--status-blocked: 4 90% 58%        /* Crimson - cannot proceed */
--status-pending: 220 12% 72%      /* Gray - not started */
```

**Usage:**
```jsx
<Badge className="bg-status-active">Active</Badge>
<div className="text-status-completed">Completed: 45 parts</div>
```

### Issue Severity Colors

Issue priority levels:

```css
--severity-critical: 4 90% 58%     /* Crimson */
--severity-high: 25 95% 53%        /* Orange */
--severity-medium: 38 100% 50%     /* Amber */
--severity-low: 220 10% 54%        /* Gray */
```

**Usage:**
```jsx
<Badge className="bg-severity-critical">Critical Issue</Badge>
```

### Manufacturing Stage Colors

Visual identification for manufacturing zones:

```css
--stage-cutting: 199 89% 48%       /* Cyan - precision */
--stage-bending: 271 91% 65%       /* Purple - formation */
--stage-welding: 25 95% 53%        /* Orange - heat */
--stage-assembly: 152 69% 42%      /* Emerald - completion */
--stage-finishing: 38 100% 50%     /* Amber - final touch */
```

**Usage:**
```jsx
<Badge className="bg-stage-cutting">Cutting</Badge>
<div className="border-l-4 border-stage-welding">Welding operation</div>
```

### Dark Mode

All colors automatically adapt for dark mode. Dark mode uses:
- Brighter accent colors for better visibility
- Deeper shadows for better separation
- Adjusted contrast ratios to maintain WCAG AA compliance

**Toggle dark mode:**
```jsx
import { useThemeMode } from '@/theme/ThemeProvider';

const { mode, toggleTheme } = useThemeMode();
// mode is 'light' or 'dark'
```

---

## Component Styling Guidelines

### When to Use Tailwind

**Use Tailwind for:**
- Simple, static components
- Layout (flex, grid, spacing)
- Responsive utilities
- Text styling
- Borders, shadows, backgrounds

**Example:**
```jsx
<Card className="p-6 rounded-lg border border-border shadow-md hover:shadow-lg transition-smooth">
  <h3 className="text-lg font-semibold mb-2">Part #12345</h3>
  <p className="text-sm text-muted-foreground">Status: Active</p>
</Card>
```

### When to Use Material-UI

**Use MUI for:**
- Complex data tables (DataGrid)
- Date/time pickers
- Advanced form controls
- Charts and visualizations
- Complex navigation (menus, drawers)

**Example:**
```jsx
<DataGrid
  rows={parts}
  columns={columns}
  pageSize={25}
  sx={{
    '& .MuiDataGrid-cell': {
      fontSize: '0.875rem',
    },
  }}
/>
```

### When to Use shadcn/ui

**Use shadcn/ui for:**
- Base UI primitives (Button, Card, Badge, Dialog)
- Accessible components (Accordion, Tabs, Dropdown)
- Form components (Input, Select, Checkbox)

**Example:**
```jsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg">
  Start Operation
</Button>
```

### Don'ts

❌ **Don't:**
- Mix Tailwind and MUI styles on the same element
- Use inline styles for design tokens (use CSS variables)
- Hardcode colors, spacing, or font sizes
- Create custom CSS classes for one-off components
- Use arbitrary values without good reason (`w-[237px]`)

✅ **Do:**
- Use design tokens via CSS variables or Tailwind classes
- Use semantic color names (`bg-success` not `bg-green-500`)
- Use spacing scale (`p-4` not `p-[17px]`)
- Use component variants (`<Button variant="outline">`)

---

## Design Tokens Reference

### Using CSS Variables

**In CSS:**
```css
.custom-component {
  color: hsl(var(--foreground));
  background-color: hsl(var(--background));
  border-color: hsl(var(--border));
  border-radius: var(--radius-base);
  padding: var(--space-md);
  font-family: var(--font-family-base);
}
```

**In Tailwind (automatic):**
```jsx
<div className="text-foreground bg-background border-border rounded-lg p-6">
  Content
</div>
```

**In MUI (via theme):**
```jsx
<Box sx={{
  color: 'text.primary',
  bgcolor: 'background.default',
  borderRadius: 2
}}>
  Content
</Box>
```

### Spacing Scale

| Token | Value | Pixels | Use Case |
|-------|-------|--------|----------|
| `--space-xs` | 0.25rem | 4px | Tight spacing, fine adjustments |
| `--space-sm` | 0.5rem | 8px | Small gaps between related items |
| `--space-base` | 1rem | 16px | Default spacing |
| `--space-md` | 1.5rem | 24px | Medium spacing, card padding |
| `--space-lg` | 2rem | 32px | Large spacing, section gaps |
| `--space-xl` | 3rem | 48px | Extra large spacing |
| `--space-2xl` | 4rem | 64px | Section spacing |

**Usage:**
```css
padding: var(--space-md);  /* 24px */
gap: var(--space-sm);      /* 8px */
```

```jsx
<div className="p-6 gap-2">  {/* p-6 = 24px, gap-2 = 8px */}
```

### Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `--radius-sm` | 6px | Badges, small buttons |
| `--radius-base` | 8px | Default - buttons, inputs |
| `--radius-md` | 12px | Cards, panels |
| `--radius-lg` | 16px | Large cards, modals |
| `--radius-xl` | 24px | Hero sections |
| `--radius-full` | 9999px | Pills, avatars |

### Touch Targets

Minimum sizes for touch interaction (tablet/mobile):

```css
--touch-target-min: 44px;          /* iOS/Android minimum */
--touch-target-comfortable: 48px;   /* Recommended */
```

**Usage:**
```jsx
<Button className="min-h-[44px] min-w-[44px]">
  <Icon />
</Button>
```

### Shadows

| Level | CSS Variable | Use Case |
|-------|--------------|----------|
| sm | `var(--shadow-sm)` | Subtle hint of depth |
| base | `var(--shadow-base)` | Standard card elevation |
| md | `var(--shadow-md)` | Dropdowns, popovers |
| lg | `var(--shadow-lg)` | Modals, dialogs |
| xl | `var(--shadow-xl)` | Hero cards |
| 2xl | `var(--shadow-2xl)` | Maximum elevation |

**Usage:**
```jsx
<Card className="shadow-md hover:shadow-lg transition-shadow">
  Content
</Card>
```

### Transitions

| Token | Duration | Easing | Use Case |
|-------|----------|--------|----------|
| `--transition-base` | 150ms | ease-in-out | Quick interactions |
| `--transition-smooth` | 200ms | ease-in-out | Standard animations |
| `--transition-slow` | 300ms | ease-in-out | Complex transitions |

**Usage:**
```css
transition: var(--transition-smooth);
```

```jsx
<div className="transition-smooth hover:scale-105">
  Hover me
</div>
```

---

## Migration Guide

### Migrating from Old Design System

#### Color Variable Names

The design system includes backward compatibility aliases:

| Old Variable | New Variable | Aliased? |
|--------------|--------------|----------|
| `--active-work` | `--status-active` | ✅ Yes |
| `--completed` | `--status-completed` | ✅ Yes |
| `--on-hold` | `--status-on-hold` | ✅ Yes |
| `--issue-critical` | `--severity-critical` | ✅ Yes |
| `--issue-high` | `--severity-high` | ✅ Yes |
| `--issue-medium` | `--severity-medium` | ✅ Yes |
| `--issue-low` | `--severity-low` | ✅ Yes |

**This means existing code continues to work!**

```jsx
// Old code (still works):
<div className="bg-active-work">Active</div>

// New code (preferred):
<div className="bg-status-active">Active</div>
```

#### Font Migration

**Before (Montserrat):**
```css
font-family: 'Montserrat', sans-serif;
```

**After (Inter):**
```css
font-family: var(--font-family-base);
/* or */
font-family: 'Inter', sans-serif;
```

Tailwind automatically uses Inter for all `font-sans` classes.

#### Component Migration Checklist

When migrating a component:

1. **Remove hardcoded colors**
   ```jsx
   // ❌ Before
   <Box sx={{ color: '#47B5E2' }}>

   // ✅ After
   <Box sx={{ color: 'primary.main' }}>
   ```

2. **Replace hardcoded spacing**
   ```jsx
   // ❌ Before
   <div style={{ padding: '24px' }}>

   // ✅ After
   <div className="p-6">  {/* or: style={{ padding: 'var(--space-md)' }} */}
   ```

3. **Use semantic color names**
   ```jsx
   // ❌ Before
   <Badge className="bg-green-500">

   // ✅ After
   <Badge className="bg-success">
   ```

4. **Use design tokens for fonts**
   ```jsx
   // ❌ Before
   <p style={{ fontFamily: 'Montserrat', fontSize: '14px' }}>

   // ✅ After
   <p className="text-sm">  {/* or: Typography variant="body2" */}
   ```

---

## Best Practices

### Accessibility

✅ **Color Contrast**
- All text meets WCAG AA minimum (4.5:1 for normal, 3:1 for large)
- Status colors are distinguishable for colorblind users
- Use semantic HTML and ARIA labels where appropriate

✅ **Touch Targets**
- All interactive elements minimum 44x44px (iOS/Android standard)
- 8px minimum spacing between touch targets
- Comfortable target size: 48x48px

✅ **Keyboard Navigation**
- All interactive elements keyboard accessible
- Visible focus indicators (ring classes)
- Logical tab order

### Performance

✅ **Font Loading**
- Inter font loaded via @fontsource with automatic subsetting
- Only required weights loaded (300, 400, 500, 600, 700)
- Font-display: swap for no layout shift

✅ **CSS Bundle**
- Design tokens generate minimal CSS (~255KB uncompressed)
- Tailwind purges unused classes in production
- Critical CSS inlined in HTML

### Naming Conventions

✅ **CSS Variables**
```css
--component-property-variant-state

Examples:
--button-bg-primary-hover
--card-border-elevated
--text-color-muted
```

✅ **Tailwind Classes**
```
{property}-{semantic-name}-{variant}

Examples:
bg-primary
text-success
border-warning
```

✅ **MUI Theme**
```
category.variant.state

Examples:
palette.primary.main
typography.body1
spacing(2)
```

### Code Organization

✅ **File Structure**
```
src/
├── styles/
│   └── design-system.css         ← All design tokens
├── theme/
│   ├── theme.ts                  ← MUI theme (maps to tokens)
│   └── ThemeProvider.tsx         ← Theme context
├── components/
│   ├── ui/                       ← shadcn/ui primitives
│   ├── mui/                      ← MUI wrapper components
│   ├── operator/                 ← Operator-specific
│   └── admin/                    ← Admin-specific
└── index.css                     ← Imports design-system.css
```

✅ **Import Order**
```jsx
// 1. React and core libraries
import React from 'react';
import { useState } from 'react';

// 2. Third-party UI libraries
import { Box, Button } from '@mui/material';

// 3. Local components
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/mui/StatusBadge';

// 4. Utilities and hooks
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// 5. Types
import type { Operation } from '@/lib/database';
```

### Testing

When migrating components, test:

- ✅ Light mode appearance
- ✅ Dark mode appearance
- ✅ Hover/focus states
- ✅ Active/pressed states
- ✅ Disabled states
- ✅ Responsive behavior (desktop, tablet, mobile)
- ✅ Keyboard navigation
- ✅ Screen reader compatibility

---

## Examples

### Complete Component Example

```tsx
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle } from 'lucide-react';

interface OperationCardProps {
  operation: Operation;
  onStart: () => void;
}

export function OperationCard({ operation, onStart }: OperationCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-smooth">
      {/* Status bar using design tokens */}
      <div className={`h-1 -mx-6 -mt-6 mb-4 rounded-t bg-status-${operation.status}`} />

      {/* Header with proper typography */}
      <h3 className="text-lg font-semibold mb-2">
        {operation.name}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Job #{operation.jobNumber}
      </p>

      {/* Status badge using semantic colors */}
      <Badge className="mb-4" variant="outline">
        {operation.status}
      </Badge>

      {/* Time info using design tokens */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Clock className="h-4 w-4" />
        <span>{operation.actualTime}/{operation.estimatedTime}m</span>
      </div>

      {/* Issues indicator */}
      {operation.hasIssues && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-severity-critical/10 text-severity-critical mb-4">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Critical Issue</span>
        </div>
      )}

      {/* Action button with touch target */}
      <Button
        onClick={onStart}
        className="w-full touch-target-comfortable"
        variant="default"
      >
        Start Operation
      </Button>
    </Card>
  );
}
```

### AppHeader Gradient Example

```tsx
<AppBar
  position="sticky"
  sx={{
    background: 'linear-gradient(90deg, #3a4656 0%, #0080ff 100%)',
    boxShadow: trigger ? 4 : 0,
    transition: 'box-shadow 0.3s ease',
  }}
>
  {/* Header content */}
</AppBar>
```

### Status Color Example

```tsx
// Using CSS variables directly
<div
  style={{
    color: `hsl(var(--severity-${issue.severity}))`,
    borderColor: `hsl(var(--severity-${issue.severity}))`,
  }}
>
  {issue.title}
</div>

// Using Tailwind classes
<Badge className="bg-severity-critical text-white">
  Critical
</Badge>

// Using MUI theme
<Chip
  sx={{
    color: 'error.main',
    backgroundColor: alpha(theme.palette.error.main, 0.12),
  }}
/>
```

---

## Resources

### Design System Files

- **Main CSS**: `src/styles/design-system.css`
- **MUI Theme**: `src/theme/theme.ts`
- **Tailwind Config**: `tailwind.config.ts`
- **Theme Provider**: `src/theme/ThemeProvider.tsx`

### External Resources

- [Inter Font](https://rsms.me/inter/) - Official Inter website
- [Tailwind CSS Docs](https://tailwindcss.com) - Tailwind documentation
- [Material-UI](https://mui.com) - MUI documentation
- [shadcn/ui](https://ui.shadcn.com) - shadcn/ui components
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/) - Accessibility testing

### Support

For questions or issues with the design system:
1. Check this documentation first
2. Review the migration plan: `MIGRATION_PLAN.md`
3. See design comparison: `DESIGN_COMPARISON.md`
4. Ask in team chat or create an issue

---

**Document Version:** 2.0
**Last Updated:** November 17, 2025
**Author:** Eryxon Development Team
**Status:** ✅ Active
