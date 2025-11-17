# Eryxon MES - Design System Migration Plan

## Executive Summary

This document outlines the migration strategy from the current hybrid styling system to a centralized, modern design system for Eryxon MES. The goal is to create a clean, modern, slick SaaS UI with consistent styling, better maintainability, and improved user experience.

---

## Current State Analysis

### Styling Architecture
- **Hybrid approach**: Tailwind CSS + Material-UI (Emotion) + shadcn/ui
- **Font**: Montserrat (5 weights)
- **Colors**: HSL-based CSS variables with industrial theme
- **Components**: 71 component files (51 shadcn/ui, 8 MUI wrappers, 12 custom)
- **Main styling files**:
  - `src/index.css` - Current design tokens
  - `src/theme/theme.ts` - MUI theme configuration
  - `tailwind.config.ts` - Tailwind configuration

### Key Issues Identified
1. **Font choice**: Montserrat is dated for modern SaaS
2. **Color inconsistency**: Multiple color definitions across MUI theme and CSS variables
3. **Hardcoded styles**: Inline styles and sx props scattered throughout components
4. **Component library fragmentation**: Mix of MUI and shadcn/ui without clear usage guidelines
5. **Limited design token coverage**: Missing tokens for shadows, z-index, transitions

---

## Proposed Design System

### 1. Typography

**Font Family: Inter**

**Rationale:**
- Modern, clean, optimized for UI
- Superior legibility for manufacturing data (part numbers, serial codes)
- Excellent character distinction (important for technical data)
- Open-source and production-ready
- Used by: Linear, GitHub, Stripe, Vercel, Raycast

**Type Scale:**
```
xs:   12px (0.75rem)    - Captions, timestamps
sm:   14px (0.875rem)   - Secondary text, labels
base: 16px (1rem)       - Body text
lg:   18px (1.125rem)   - Emphasized body
xl:   20px (1.25rem)    - Small headings
2xl:  24px (1.5rem)     - Section headings
3xl:  30px (1.875rem)   - Page headings
4xl:  36px (2.25rem)    - Major headings
5xl:  48px (3rem)       - Display headings
```

**Font Weights:**
- Light (300): Rarely used, display text only
- Regular (400): Body text
- Medium (500): Buttons, emphasized text
- Semibold (600): Subheadings, card titles
- Bold (700): Headings, hero text

### 2. Color Palette: Industrial Modern

**Philosophy:**
- Professional and trustworthy for manufacturing environment
- High contrast for shopfloor visibility
- Modern but not flashy
- Accessible (WCAG AA compliant)

**Primary Colors:**
```css
Brand Primary:   hsl(215, 25%, 27%)   /* Deep Slate Blue - industrial strength */
Brand Accent:    hsl(211, 100%, 50%)  /* Electric Blue - modern, tech-forward */
```

**Semantic Colors:**
```css
Success:  hsl(152, 69%, 42%)   /* Emerald - completed work */
Warning:  hsl(38, 100%, 50%)   /* Amber - needs attention */
Error:    hsl(4, 90%, 58%)     /* Crimson - critical issues */
Info:     hsl(199, 89%, 48%)   /* Cyan - informational */
```

**Neutral Scale (Cool Grays - steel-inspired):**
```css
50:  hsl(220, 20%, 98%)   /* Near white */
100: hsl(220, 18%, 96%)   /* Very light gray */
200: hsl(220, 16%, 92%)   /* Light gray - borders, dividers */
300: hsl(220, 14%, 86%)   /* Medium light gray */
400: hsl(220, 12%, 72%)   /* Medium gray */
500: hsl(220, 10%, 54%)   /* True middle gray */
600: hsl(220, 14%, 40%)   /* Dark gray - secondary text */
700: hsl(220, 18%, 30%)   /* Darker gray */
800: hsl(220, 24%, 20%)   /* Very dark gray */
900: hsl(220, 30%, 12%)   /* Near black */
950: hsl(220, 35%, 8%)    /* Darkest - dark mode background */
```

**MES-Specific Status Colors:**
```css
Active Work:  hsl(38, 100%, 50%)   /* Amber - timing active */
Completed:    hsl(152, 69%, 42%)   /* Emerald - done */
On Hold:      hsl(25, 95%, 53%)    /* Orange - paused */
Blocked:      hsl(4, 90%, 58%)     /* Crimson - blocked */
Pending:      hsl(220, 12%, 72%)   /* Gray - not started */
```

**Issue Severity Colors:**
```css
Critical:  hsl(4, 90%, 58%)      /* Crimson */
High:      hsl(25, 95%, 53%)     /* Orange */
Medium:    hsl(38, 100%, 50%)    /* Amber */
Low:       hsl(220, 10%, 54%)    /* Gray */
```

**Stage Colors (manufacturing zones):**
```css
Cutting:    hsl(199, 89%, 48%)   /* Cyan */
Bending:    hsl(271, 91%, 65%)   /* Purple */
Welding:    hsl(25, 95%, 53%)    /* Orange */
Assembly:   hsl(152, 69%, 42%)   /* Emerald */
Finishing:  hsl(38, 100%, 50%)   /* Amber */
```

### 3. Spacing & Sizing

**Touch Targets:**
```css
Minimum:     44px   /* iOS/Android minimum */
Comfortable: 48px   /* Recommended for operator UI */
```

**Border Radius:**
```css
sm:   6px    /* Small elements, badges */
base: 8px    /* Default - buttons, inputs */
md:   12px   /* Cards, panels */
lg:   16px   /* Large cards, modals */
xl:   24px   /* Hero sections */
full: 9999px /* Fully rounded - pills, avatars */
```

**Spacing Scale:**
```css
xs:   4px    /* Tight spacing */
sm:   8px    /* Small spacing */
base: 16px   /* Default spacing */
md:   24px   /* Medium spacing */
lg:   32px   /* Large spacing */
xl:   48px   /* Extra large spacing */
2xl:  64px   /* Section spacing */
```

### 4. Shadows

**Light Mode:**
```css
sm:   Subtle hint of depth
base: Standard card elevation
md:   Raised elements (dropdowns, popovers)
lg:   Modals, dialogs
xl:   Hero cards, major elevations
2xl:  Maximum elevation
```

**Dark Mode:**
- Deeper, more pronounced shadows for better separation

### 5. Transitions

**Timing:**
```css
base:   150ms  /* Quick interactions */
smooth: 200ms  /* Standard animations */
slow:   300ms  /* Complex transitions */
```

**Easing:**
```css
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)  /* Default */
ease-out:    cubic-bezier(0, 0, 0.2, 1)    /* Entrances */
ease-in:     cubic-bezier(0.4, 0, 1, 1)    /* Exits */
```

---

## Migration Strategy

### Phase 1: Foundation Setup (Week 1)

**Goal:** Set up new design system without breaking existing UI

**Tasks:**

1. **Install Inter font**
   - Add `@fontsource/inter` package
   - Remove `@fontsource/montserrat`
   - Update imports in ThemeProvider

2. **Create new design system file**
   - Create `src/styles/design-system.css`
   - Define all CSS variables (colors, typography, spacing, shadows)
   - Keep `src/index.css` as backup initially

3. **Update Tailwind configuration**
   - Extend Tailwind with new color tokens
   - Add custom utilities for MES-specific use cases
   - Configure font family

4. **Update MUI theme**
   - Update `src/theme/theme.ts` to use Inter
   - Map MUI theme colors to new CSS variables
   - Ensure backward compatibility during migration

5. **Create component style guide**
   - Document component patterns
   - Define when to use Tailwind vs MUI
   - Create usage examples

**Deliverables:**
- ✅ New design system CSS file
- ✅ Updated Tailwind config
- ✅ Updated MUI theme
- ✅ Style guide documentation
- ✅ No visual changes to existing UI (yet)

**Estimated Time:** 2-3 days

---

### Phase 2: Component Library Audit (Week 1-2)

**Goal:** Identify all components that need migration and prioritize

**Tasks:**

1. **Audit all components**
   - Create inventory of hardcoded styles
   - Identify inline `sx` props in MUI components
   - Document color usage inconsistencies
   - List components by migration priority

2. **Create component migration templates**
   - Button pattern
   - Card pattern
   - Form input pattern
   - Badge/status indicator pattern
   - Navigation pattern

3. **Set up component testing**
   - Visual regression testing setup (optional but recommended)
   - Manual testing checklist
   - Dark mode verification checklist

**Deliverables:**
- ✅ Component audit spreadsheet
- ✅ Migration priority list
- ✅ Component templates
- ✅ Testing strategy

**Estimated Time:** 2-3 days

---

### Phase 3: Core Component Migration (Week 2-3)

**Goal:** Migrate most-used, foundational components

**Priority 1: Base UI Components (shadcn/ui)**
- ✅ Button (`src/components/ui/button.tsx`)
- ✅ Badge (`src/components/ui/badge.tsx`)
- ✅ Card (`src/components/ui/card.tsx`)
- ✅ Input (`src/components/ui/input.tsx`)
- ✅ Select (`src/components/ui/select.tsx`)
- ✅ Dialog (`src/components/ui/dialog.tsx`)

**Priority 2: Layout Components**
- ✅ AppHeader (`src/components/mui/AppHeader.tsx`)
- ✅ Sidebar (`src/components/ui/sidebar.tsx`)
- ✅ AdminLayout (`src/components/admin/AdminLayout.tsx`)
- ✅ OperatorLayout (`src/components/operator/OperatorLayout.tsx`)

**Priority 3: Feature Components**
- ✅ StatusBadge (`src/components/mui/StatusBadge.tsx`)
- ✅ OperationCard (`src/components/operator/OperationCard.tsx`)
- ✅ DataTable (`src/components/mui/DataTable.tsx`)

**Migration Approach for Each Component:**

1. **Create new version with design tokens**
   - Replace hardcoded colors with CSS variables
   - Replace hardcoded spacing with design tokens
   - Update font styles to Inter
   - Ensure touch targets meet minimum size

2. **Test thoroughly**
   - Visual check in light mode
   - Visual check in dark mode
   - Tablet/mobile responsiveness
   - Accessibility (keyboard nav, screen reader)

3. **Update all usages**
   - Find all imports
   - Verify no regressions
   - Update any component-specific styles

4. **Remove old code**
   - Clean up unused styles
   - Remove commented code
   - Update component documentation

**Deliverables:**
- ✅ Migrated core components
- ✅ Updated component tests
- ✅ No visual regressions
- ✅ Dark mode working

**Estimated Time:** 5-7 days

---

### Phase 4: Feature Components Migration (Week 3-4)

**Goal:** Migrate feature-specific components

**Admin Components:**
- ✅ PartDetailModal
- ✅ JobDetailModal
- ✅ DueDateOverrideModal
- ✅ Admin dashboard components

**Operator Components:**
- ✅ OperatorFooterBar
- ✅ OperationDetailModal
- ✅ Time tracking components

**Shared Components:**
- ✅ ToastNotification
- ✅ ActionButtons
- ✅ FormComponents

**Deliverables:**
- ✅ All feature components migrated
- ✅ Consistent styling across app
- ✅ Documentation updated

**Estimated Time:** 5-7 days

---

### Phase 5: Cleanup & Optimization (Week 4)

**Goal:** Remove old system, optimize bundle size

**Tasks:**

1. **Remove legacy code**
   - Delete or archive `src/index.css` (old version)
   - Remove Montserrat font imports
   - Clean up unused MUI theme overrides
   - Remove hardcoded color values

2. **Optimize bundle size**
   - Tree-shake unused Tailwind classes
   - Audit and remove unused dependencies
   - Optimize font loading (variable font only)

3. **Update documentation**
   - Component usage guide
   - Design token reference
   - Contributing guidelines
   - Dark mode implementation guide

4. **Final QA**
   - Full app walkthrough
   - Dark mode verification
   - Mobile/tablet testing
   - Performance audit

**Deliverables:**
- ✅ Clean codebase
- ✅ Optimized bundle
- ✅ Complete documentation
- ✅ QA sign-off

**Estimated Time:** 3-4 days

---

## Component Usage Guidelines

### When to Use Tailwind (shadcn/ui)

**Use for:**
- Simple, static components
- Layout components (flex, grid)
- Responsive utilities
- Spacing and sizing
- Text styling
- Borders and shadows

**Examples:**
```tsx
// Good: Simple card with Tailwind
<div className="card p-6 space-y-4">
  <h3 className="text-lg font-semibold">Part #12345</h3>
  <p className="text-sm text-muted-foreground">Status: Active</p>
</div>
```

### When to Use Material-UI

**Use for:**
- Complex data tables (DataGrid)
- Date/time pickers
- Advanced form controls
- Charts and visualizations
- Complex menus and navigation

**Examples:**
```tsx
// Good: Complex data table
<DataGrid
  rows={parts}
  columns={columns}
  pageSize={25}
  sortingMode="server"
  onSortModelChange={handleSort}
/>
```

### When to Avoid

**Don't:**
- Mix Tailwind and MUI styles on the same element
- Use inline styles for design tokens (use CSS variables)
- Hardcode colors, spacing, or font sizes
- Create custom CSS classes for one-off components (use Tailwind)

---

## Design Token Naming Convention

### CSS Variables
```css
/* Component-level tokens */
--component-property-variant-state

/* Examples */
--button-bg-primary-hover
--card-border-elevated
--input-ring-focus

/* Semantic tokens */
--status-{status}-{property}
--severity-{level}-{property}
--stage-{stage}-{property}

/* Examples */
--status-active-bg
--severity-critical-text
--stage-cutting-border
```

### Tailwind Classes
```
{property}-{semantic-name}-{variant}

Examples:
bg-primary
text-success
border-warning
```

---

## Accessibility Checklist

### Color Contrast
- ✅ All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- ✅ Status colors distinguishable for colorblind users
- ✅ Dark mode meets same contrast ratios

### Touch Targets
- ✅ All interactive elements minimum 44x44px
- ✅ Spacing between touch targets minimum 8px
- ✅ Focus indicators visible and clear

### Keyboard Navigation
- ✅ All interactive elements keyboard accessible
- ✅ Focus order logical
- ✅ Focus indicators meet 3:1 contrast ratio

### Screen Readers
- ✅ Semantic HTML used appropriately
- ✅ ARIA labels on icon-only buttons
- ✅ Status changes announced

---

## Testing Strategy

### Manual Testing

**For each migrated component:**

1. **Visual verification**
   - Light mode appearance
   - Dark mode appearance
   - Hover states
   - Active/focus states
   - Disabled states

2. **Responsive testing**
   - Desktop (1920x1080)
   - Tablet landscape (1024x768)
   - Tablet portrait (768x1024)
   - Mobile (375x667)

3. **Interaction testing**
   - Mouse interactions
   - Touch interactions (on device)
   - Keyboard navigation
   - Screen reader (VoiceOver/NVDA)

### Automated Testing (Optional)

**Visual Regression:**
- Chromatic or Percy for component screenshots
- Compare before/after migration

**Unit Tests:**
- Update existing tests
- Add tests for new variants

---

## Risk Assessment

### High Risk Areas

1. **AppHeader gradient**
   - Current: `linear-gradient(90deg, #6658A3 0%, #47B5E2 100%)`
   - Action: Need to decide if keeping or updating to new brand colors
   - Mitigation: Design review before migration

2. **MUI theme deep customization**
   - 25-level shadow system
   - Custom component overrides
   - Action: Carefully map to new design tokens
   - Mitigation: Comprehensive testing

3. **Hardcoded colors in logic**
   - Dynamic color assignment based on status
   - Color stored in database
   - Action: Ensure backward compatibility
   - Mitigation: Maintain color mapping table

4. **Third-party component styles**
   - MUI DataGrid custom styling
   - PDF viewer styling
   - STEP file viewer styling
   - Action: Test thoroughly after migration
   - Mitigation: Keep fallback styles

### Medium Risk Areas

1. **Dark mode edge cases**
   - SVG fills
   - Image backgrounds
   - Opacity calculations

2. **Mobile-specific styles**
   - Safe area insets
   - Touch ripple effects
   - Scroll behavior

### Low Risk Areas

1. **Simple components** (buttons, badges, cards)
2. **Layout components** (already using Tailwind)
3. **Typography** (straightforward font swap)

---

## Success Metrics

### Quantitative

- [ ] Bundle size reduction: Target 10-15% (removing Montserrat, optimizing MUI)
- [ ] CSS file size reduction: Target 20-30%
- [ ] Component render performance: No regressions
- [ ] Lighthouse score: Maintain or improve

### Qualitative

- [ ] Consistent visual appearance across all pages
- [ ] Improved readability (Inter vs Montserrat)
- [ ] Cleaner codebase (less inline styles)
- [ ] Better developer experience (clear design tokens)
- [ ] Positive user feedback on new look

---

## Rollback Plan

### If Migration Fails

1. **Immediate rollback**
   - Revert to previous commit
   - Keep `src/index.css` backup
   - Restore Montserrat imports

2. **Partial rollback**
   - Use feature flags for new components
   - Gradual rollout by route/role
   - A/B test with users

3. **Lessons learned**
   - Document what went wrong
   - Adjust migration plan
   - Re-test in staging environment

---

## Timeline Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1: Foundation | 2-3 days | Design system setup |
| Phase 2: Audit | 2-3 days | Component inventory |
| Phase 3: Core Components | 5-7 days | Base UI migration |
| Phase 4: Feature Components | 5-7 days | Feature migration |
| Phase 5: Cleanup | 3-4 days | Optimization & docs |
| **Total** | **17-24 days** | **3-5 weeks** |

---

## Open Questions for Review

1. **Brand colors**: Keep the existing purple-to-blue gradient in the header, or update to new palette?

2. **Component library strategy**: Should we fully standardize on shadcn/ui and phase out MUI (except DataGrid), or maintain both?

3. **Dark mode**: Is dark mode heavily used? Should it be default for operator view (manufacturing floor)?

4. **Typography**: Inter is the proposal, but are there other preferences? (Alternatives: Geist, DM Sans, Outfit)

5. **Migration approach**: Big bang (migrate everything at once) vs gradual (route by route)?

6. **Testing**: Do we want visual regression testing, or is manual testing sufficient?

7. **Stage colors**: Should manufacturing stages have distinct colors, or use a single primary color with different shades?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Answer open questions** above
3. **Approve design system** (colors, typography, tokens)
4. **Set migration timeline** based on sprint schedule
5. **Begin Phase 1** upon approval

---

## Resources

- [Inter Font](https://rsms.me/inter/)
- [Tailwind CSS Docs](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Material-UI](https://mui.com)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

**Document Version:** 1.0
**Created:** 2025-11-17
**Author:** Claude (Eryxon MES Design System Migration)
**Status:** Awaiting Review
