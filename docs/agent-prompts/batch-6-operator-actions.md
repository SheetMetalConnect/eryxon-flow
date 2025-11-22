# Agent Prompt: Batch 6 - Operator Action Buttons

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟡 MEDIUM
**Estimated Time:** 2 hours
**Conflicts:** None

## Files to Update

### 1. `/home/user/eryxon-flow/src/components/operator/OperatorFooterBar.tsx`

```typescript
// Line 184 (complete button gradient)
bg-gradient-to-r from-blue-600 to-purple-600 → bg-operator-complete
border-blue-400 → border-primary

// Lines 217, 229 (pause button)
bg-orange-500 → bg-operator-pause
hover:bg-orange-600 → hover:bg-operator-pause/90
border-orange-400 → border-operator-pause

// Line 241 (start button)
bg-green-500 → bg-operator-start
hover:bg-green-600 → hover:bg-operator-start/90
border-green-400 → border-operator-start

// Line 253 (resume button)
bg-yellow-500 → bg-operator-resume
hover:bg-yellow-600 → hover:bg-operator-resume/90
border-yellow-400 → border-operator-resume

// Line 267 (issue button)
bg-red-500 → bg-operator-issue
hover:bg-red-600 → hover:bg-operator-issue/90
border-red-400 → border-operator-issue
```

**Note on Gradient (Line 184):**
The complete button currently uses a gradient. Options:
1. Replace with solid `bg-operator-complete` (already defined as primary blue)
2. Keep gradient but use CSS custom property
3. Create new gradient token in design-system.css

Recommend option 1 for consistency, but ask if unsure.

## Design Tokens Available

```css
/* Operator action colors: */
bg-operator-start (green)
bg-operator-pause (orange)
bg-operator-resume (yellow)
bg-operator-complete (blue)
bg-operator-issue (red)

/* Hover states using /90 opacity: */
hover:bg-operator-start/90
```

## Commit Message

```
Update UI [Batch 6]: Operator Action Buttons

Replace hardcoded colors in OperatorFooterBar:
- Use operator-start/pause/resume/complete/issue tokens
- Replace all action button colors with semantic tokens
- Maintain visual hierarchy and operator-friendly design

Batch 6 of 10 - Medium Priority Complete
```
