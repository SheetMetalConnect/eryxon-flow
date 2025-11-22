# Agent Prompt: Batch 10 - Layouts (Complex)

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟡 MEDIUM
**Estimated Time:** 4 hours
**Conflicts:** ⚠️ CRITICAL FILES - Test thoroughly
**Complexity:** ⚠️ VERY HIGH

## ⚠️ IMPORTANT WARNINGS

- These are CRITICAL layout files used throughout the app
- Test thoroughly before committing
- Consider visual regression testing
- If unsure, ask for review before pushing

## Files to Update

### 1. `/home/user/eryxon-flow/src/layouts/OperatorLayout.tsx` ⚠️ COMPLEX

**Lines 114, 148, 223 (Material UI inline styles):**

```typescript
// Current:
background: 'linear-gradient(135deg, #3a4656 0%, #0080ff 100%)'

// Option A: Create CSS custom property
// In design-system.css:
--operator-gradient: linear-gradient(135deg, hsl(var(--neutral-700)), hsl(var(--brand-primary)));

// Then in component:
background: 'var(--operator-gradient)'

// Option B: Use theme.palette
background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`
```

**Lines 120, 224 (color: '#ffffff'):**

```typescript
// Replace:
color: '#ffffff'

// With:
color: theme.palette.primary.contrastText
// OR
color: 'hsl(var(--foreground))'
```

**Strategy for this file:**
1. Add custom property to design-system.css first
2. Import useTheme from MUI if using theme.palette
3. Replace inline hex values
4. Test operator view extensively

### 2. `/home/user/eryxon-flow/src/pages/MyPlan.tsx` (if not using common/MyPlan.tsx)

**Lines 146-150 (gradient backgrounds):**

```typescript
// Similar approach as OperatorLayout
// Replace hardcoded gradient hex values

// Lines 167-168, 192, 198
alpha('#fff', 0.2) → alpha(theme.palette.background.paper, 0.2)
// OR
'hsl(var(--card) / 0.2)'

backgroundColor: '#fff' → backgroundColor: theme.palette.background.paper
// OR
backgroundColor: 'hsl(var(--card))'
```

## Steps for OperatorLayout.tsx

1. **First, update design-system.css:**
```css
/* Add to design-system.css in appropriate section: */
--operator-gradient: linear-gradient(135deg, hsl(var(--neutral-700)), hsl(var(--brand-primary)));
```

2. **Then update OperatorLayout.tsx:**
```typescript
// Replace inline gradient
background: 'var(--operator-gradient)'

// Replace white color
color: 'hsl(var(--foreground))'
```

3. **Test thoroughly:**
- Verify operator header displays correctly
- Check gradient renders properly
- Ensure text is readable
- Test on different screen sizes

## Success Criteria

- [ ] No hardcoded hex colors (#...)
- [ ] Gradients use CSS custom properties or theme.palette
- [ ] All colors reference design system
- [ ] Operator layout renders correctly
- [ ] No visual regressions

## Commit Message

```
Update UI [Batch 10]: Layouts (COMPLEX)

Replace hardcoded colors in critical layout files:
- OperatorLayout.tsx: Use CSS custom property for gradient
- MyPlan.tsx: Replace gradient and alpha colors

Added --operator-gradient to design-system.css
Thoroughly tested for visual regressions

Batch 10 of 10 - FINAL BATCH COMPLETE ✅
```

## Testing Checklist

- [ ] Operator view header displays correctly
- [ ] Gradient renders smoothly
- [ ] Text contrast is maintained
- [ ] No layout shifts or visual regressions
- [ ] Test in Chrome, Firefox, Safari if possible
- [ ] Test on mobile/tablet viewports

## Notes

- This is the FINAL batch - highest complexity
- Take extra time for testing
- Consider creating a new CSS token: `--operator-gradient`
- May need to update tailwind.config.ts if using new tokens
- If you encounter issues, document them and ask for help

## If Adding New Token

Add to `/home/user/eryxon-flow/src/styles/design-system.css`:

```css
/* In appropriate section (after Operator Action Colors): */

/* Operator Layout */
--operator-gradient: linear-gradient(135deg, hsl(var(--neutral-700)) 0%, hsl(var(--brand-primary)) 100%);
```

Then can reference as: `background: var(--operator-gradient)`
