# Agent Prompt: Batch 1 - Operator Core Pages

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🔴 HIGH
**Estimated Time:** 2-3 hours
**Conflicts:** None

## Task Overview
Update the core operator-facing pages to use semantic design tokens instead of hardcoded colors. These are the most visible pages for shop floor operators.

## Reference Documentation
Read first: `/home/user/eryxon-flow/docs/ui-modernization-plan.md`

## Files to Update

### 1. `/home/user/eryxon-flow/src/pages/operator/WorkQueue.tsx`

**Find and Replace:**
```typescript
// Line ~233
text-blue-600 → text-brand-primary

// Line ~237
text-green-600 → text-status-completed

// Line ~241
text-gray-600 → text-muted-foreground

// Lines 368-373 (inline styles for cell colors)
// Remove inline style={{ backgroundColor }}
// Instead use className with bg-stage-cutting, bg-stage-bending, etc.
// OR create CSS custom properties

// Lines 398-400 (inline borderTopColor)
// Replace with border-t-* classes using stage colors
```

### 2. `/home/user/eryxon-flow/src/pages/operator/MyActivity.tsx`

**Find and Replace:**
```typescript
// Lines 192-194 (inline cell badge styles)
// Replace: style={{ backgroundColor, color }}
// With: className="bg-stage-{type}" or similar semantic class

// Line 200
text-green-600 → text-status-completed

// Lines 145-160 (Card components)
// Consider: Migrate to GlassCard for visual consistency (optional)
```

### 3. `/home/user/eryxon-flow/src/pages/operator/OperatorView.tsx`

**Find and Replace:**
```typescript
// Lines 795-805 (RGBA colors)
rgba(58, 70, 86, 0.12) → hsl(var(--muted) / 0.12)
rgba(20, 136, 83, 0.08) → hsl(var(--success) / 0.08)

// General pattern:
// rgba(R, G, B, A) → hsl(var(--semantic-color) / opacity)
```

## Design Tokens Available

```css
/* Use these semantic tokens: */
text-brand-primary, bg-brand-primary
text-status-completed, bg-status-completed
text-status-in-progress, bg-status-active
text-muted-foreground, bg-muted
text-foreground, bg-foreground

/* Stage colors: */
bg-stage-cutting, bg-stage-bending, bg-stage-welding
bg-stage-assembly, bg-stage-finishing
```

## Success Criteria

- [ ] No hardcoded `#` hex colors in any of the 3 files
- [ ] No `text-blue-600`, `text-green-600`, `text-gray-600` classes
- [ ] No inline `style={{ backgroundColor }}` for semantic colors
- [ ] All status colors use `text-status-*` or `bg-status-*`
- [ ] All stage colors use `bg-stage-*`
- [ ] RGBA colors converted to HSL with opacity

## Testing Checklist

- [ ] WorkQueue displays correctly with new colors
- [ ] MyActivity cell badges render properly
- [ ] OperatorView backgrounds show correct opacity
- [ ] No console errors
- [ ] Colors match the original visual intent

## Commit Message

```
Update UI [Batch 1]: Operator Core Pages

Replace hardcoded colors in operator-facing pages:
- WorkQueue.tsx: Use semantic status and brand colors
- MyActivity.tsx: Replace inline cell badge styles
- OperatorView.tsx: Convert RGBA to HSL with opacity

All colors now use design tokens from design-system.css.

Batch 1 of 10 - High Priority Complete
```

## Notes

- **Important:** WorkQueue has inline styles that may require refactoring
- Consider extracting cell badge styles to a reusable component
- Test on operator terminal view for visual accuracy
- If unsure about a color mapping, check `docs/ui-modernization-plan.md`

## Questions?

If you encounter:
- **Missing token:** Check `/home/user/eryxon-flow/src/styles/design-system.css`
- **Complex inline styles:** Extract to CSS class or create component
- **Unclear semantic mapping:** Use closest semantic token (success/warning/error/info)
