# Material-UI Migration Plan

**Status**: 🚧 In Progress
**Created**: November 22, 2025
**Last Updated**: November 22, 2025

---

## Overview

This document outlines the plan to remove Material-UI (MUI) from the Eryxon Flow codebase and migrate to a unified design system using shadcn/ui components and our custom design-system.css.

## Problem Statement

### Current Issues

1. **Design System Conflict**: Two UI frameworks fighting for control
   - Material-UI's `CssBaseline` overrides custom glass morphism styles
   - MUI theme loads after custom CSS, removing transparency effects
   - Requires `!important` hacks to maintain custom styling

2. **Inconsistent UX**: Different looks between admin and operator views
   - Admin panel: shadcn/ui with glass morphism (modern, premium)
   - Operator panel: Material-UI components (different aesthetic)

3. **Bundle Size**: Shipping two complete UI frameworks
   - MUI: ~300KB+ minified
   - shadcn/ui: Already included, tree-shakeable

4. **Maintenance Burden**: Two theming systems to maintain
   - `/src/theme/theme.ts` - MUI theme configuration
   - `/src/styles/design-system.css` - Custom design system
   - Constant conflicts and overrides

## Current State

### What Uses Material-UI

**Operator Components (Primary Usage)**:
- `OperatorLayout.tsx` - AppBar, Box, Menu, BottomNavigation, Paper
- `CurrentlyTimingWidget.tsx` - Card, Typography
- MUI-specific components in `/src/components/mui/`

**Admin Components (Minimal Usage)**:
- `TenantSwitcher.tsx` - Menu component
- `ActivityMonitor.tsx` - Limited usage

**Global Impact**:
- Previously: MUI's `ThemeProvider` and `CssBaseline` were global (App.tsx)
- Now: Scoped to `OperatorLayout` only (✅ Fixed in this PR)

### Available shadcn/ui Components

We have **52 shadcn/ui components** available:

```
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb,
button, calendar, card, carousel, chart, checkbox, collapsible, command,
context-menu, dialog, drawer, dropdown-menu, form, hover-card, icon-picker,
input, input-otp, label, menubar, navigation-menu, pagination, popover,
progress, radio-group, resizable, scroll-area, select, separator, sheet,
sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast,
toaster, toggle, toggle-group, tooltip
```

**Coverage**: 100% of needed components available!

---

## Migration Strategy

### Phase 1: Scoping (✅ COMPLETED)

**Goal**: Isolate MUI to operator-only scope, remove global interference

**Changes Made**:
- ✅ Removed global `ThemeProvider` from `App.tsx`
- ✅ Moved `MuiThemeProvider` + `CssBaseline` to `OperatorLayout.tsx` only
- ✅ Removed theme toggle button (dark mode only)
- ✅ Admin panel now 100% MUI-free

**Result**: Admin panel glass morphism effects work perfectly without conflicts

---

### Phase 2: Operator Layout Migration (📋 NEXT)

**Goal**: Replace MUI components in `OperatorLayout.tsx` with shadcn/ui equivalents

#### Component Mapping

| MUI Component | shadcn/ui Replacement | Complexity |
|---------------|----------------------|------------|
| `AppBar` | Custom header (`div` + Tailwind) | Easy |
| `Toolbar` | `div` with flex layout | Easy |
| `Box` | `div` with `className` | Trivial |
| `Typography` | Native HTML (`h1`, `p`, `span`) | Trivial |
| `IconButton` | `Button variant="ghost" size="icon"` | Easy |
| `Avatar` | `Avatar` component | Direct swap |
| `Menu` + `MenuItem` | `DropdownMenu` | Easy |
| `Paper` | `Card` or `div` with `card-transparent` | Easy |
| `BottomNavigation` | Custom nav with `Button` array | Medium |
| `BottomNavigationAction` | `Button variant="ghost"` | Easy |

#### Implementation Plan

**Step 1: Header/AppBar** (1-2 hours)
```tsx
// Before (MUI)
<AppBar position="sticky" elevation={0}>
  <Toolbar>
    <Typography variant="h6">Eryxon Flow</Typography>
  </Toolbar>
</AppBar>

// After (shadcn/ui)
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
  <div className="container flex h-14 items-center">
    <h1 className="text-lg font-bold">Eryxon Flow</h1>
  </div>
</header>
```

**Step 2: User Menu** (1 hour)
```tsx
// Before (MUI)
<Menu anchorEl={anchorEl} open={Boolean(anchorEl)}>
  <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
</Menu>

// After (shadcn/ui)
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <Avatar />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Step 3: Bottom Navigation** (2-3 hours)
```tsx
// Before (MUI)
<BottomNavigation value={getCurrentNavValue()} onChange={handleNavigationChange}>
  {navItems.map((item) => (
    <BottomNavigationAction key={item.path} label={item.label} value={item.path} icon={item.icon} />
  ))}
</BottomNavigation>

// After (shadcn/ui)
<nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur">
  <div className="flex justify-around p-2">
    {navItems.map((item) => (
      <Button
        key={item.path}
        variant={location.pathname === item.path ? "default" : "ghost"}
        className="flex-col h-auto py-2"
        onClick={() => navigate(item.path)}
      >
        <item.icon className="h-5 w-5" />
        <span className="text-xs mt-1">{item.label}</span>
      </Button>
    ))}
  </div>
</nav>
```

**Step 4: Responsive Breakpoints** (1 hour)
```tsx
// Before (MUI)
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

// After (Tailwind)
// Use Tailwind responsive classes: sm:, md:, lg:
<div className="hidden sm:block">Desktop content</div>
<div className="block sm:hidden">Mobile content</div>
```

**Estimated Total**: 5-7 hours

---

### Phase 3: Widget Migration (📋 FUTURE)

**Goal**: Migrate remaining MUI components in operator widgets

**Files to Update**:
- `CurrentlyTimingWidget.tsx`
- Components in `/src/components/mui/` (optional - can keep as utilities)

**Complexity**: Low - mostly Card and Typography replacements

---

### Phase 4: Cleanup & Removal (📋 FUTURE)

**Goal**: Remove MUI dependencies entirely

**Tasks**:
1. Remove MUI from `package.json`:
   ```bash
   npm uninstall @mui/material @mui/icons-material @emotion/react @emotion/styled
   ```

2. Delete `/src/theme/theme.ts` and `/src/theme/ThemeProvider.tsx`

3. Replace MUI icons with Lucide React (already in use)

4. Update `tsconfig.json` if needed

5. Run build and test thoroughly

**Bundle Size Savings**: ~300KB+ minified

---

## Benefits of Migration

### 1. Performance
- **Smaller Bundle**: Remove ~300KB of MUI code
- **Faster Load**: Single UI framework, less CSS processing
- **Tree Shaking**: shadcn/ui components are tree-shakeable

### 2. Design Consistency
- **Unified Look**: Same components across admin and operator
- **Glass Morphism**: Apply premium styling everywhere
- **No Conflicts**: Single source of truth for styling

### 3. Developer Experience
- **One System**: Learn and maintain one component library
- **Better DX**: shadcn/ui components are more customizable
- **No Overrides**: No more `!important` hacks

### 4. Maintainability
- **Less Code**: Remove entire theming system
- **Simpler**: One design-system.css file
- **Future-Proof**: Based on Tailwind and Radix UI primitives

---

## Migration Checklist

### Phase 1: Scoping ✅
- [x] Remove global MUI theme provider
- [x] Scope MUI to OperatorLayout only
- [x] Fix admin panel glass morphism
- [x] Remove theme toggle (dark mode only)

### Phase 2: Operator Layout 📋
- [ ] Replace AppBar with custom header
- [ ] Replace Toolbar with flex div
- [ ] Replace Menu with DropdownMenu
- [ ] Replace BottomNavigation with custom nav
- [ ] Replace Box with div
- [ ] Replace Typography with native HTML
- [ ] Replace IconButton with Button
- [ ] Test responsive behavior
- [ ] Test all navigation flows

### Phase 3: Widgets 📋
- [ ] Migrate CurrentlyTimingWidget
- [ ] Review /src/components/mui/ usage
- [ ] Replace remaining MUI components

### Phase 4: Cleanup 📋
- [ ] Remove MUI dependencies
- [ ] Delete theme files
- [ ] Update documentation
- [ ] Test full application
- [ ] Measure bundle size reduction

---

## Testing Strategy

### Manual Testing
- [ ] Admin panel: All pages render correctly
- [ ] Operator panel: All navigation works
- [ ] Mobile: Bottom nav functions properly
- [ ] Desktop: Top nav + tabs work
- [ ] Glass effects: No MUI override issues
- [ ] Responsive: All breakpoints tested

### Automated Testing
- [ ] Component tests pass
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] No console warnings

### Visual Regression
- [ ] Screenshot comparison before/after
- [ ] Verify glass morphism effects
- [ ] Check color consistency
- [ ] Validate typography

---

## Rollback Plan

If issues arise:

1. **Phase 2 Rollback**: Revert OperatorLayout changes, keep MUI scoped
2. **Phase 1 Rollback**: Restore global ThemeProvider (not recommended)

All changes are incremental and reversible via git.

---

## Decision Log

### Why Remove MUI?

**Decision**: Migrate away from Material-UI to shadcn/ui
**Date**: November 22, 2025
**Reasoning**:
1. Design system conflicts causing glass morphism issues
2. Two UI frameworks = unnecessary complexity
3. shadcn/ui provides all needed components
4. Better performance with smaller bundle
5. More customization freedom

**Alternatives Considered**:
1. Keep both frameworks - ❌ Maintains conflicts
2. Migrate admin to MUI - ❌ Loses custom design system
3. Use MUI only - ❌ Loses glass morphism premium look

**Decision**: Migrate to 100% shadcn/ui + custom design system

---

## Resources

### Documentation
- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
- [Design System Guide](/docs/DESIGN_SYSTEM.md)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Code References
- Admin Layout: `/src/components/AdminLayout.tsx` (reference implementation)
- Design Tokens: `/src/styles/design-system.css`
- Component Library: `/src/components/ui/`

### Related Issues
- Glass morphism override issue (fixed in Phase 1)
- Design consistency between panels
- Bundle size optimization

---

## Questions & Answers

**Q: Will this break existing functionality?**
A: No. Migration is incremental. Each phase is tested before moving forward.

**Q: What about MUI icons?**
A: Replace with Lucide React icons (already in use for admin panel).

**Q: Can we keep some MUI components?**
A: Yes. Keep `/src/components/mui/` as utilities if needed, but avoid direct usage.

**Q: How long will migration take?**
A: Phase 2 (main work): 5-7 hours. Full migration: 10-15 hours total.

**Q: What if we need a component not in shadcn/ui?**
A: Build custom components using Radix UI primitives (shadcn's foundation).

---

**Status**: Phase 1 complete ✅
**Next**: Begin Phase 2 - Operator Layout Migration
**Owner**: Development Team
**Priority**: Medium (completed admin panel, operator can wait)
