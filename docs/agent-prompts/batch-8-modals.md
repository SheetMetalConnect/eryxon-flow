# Agent Prompt: Batch 8 - Modals & Overlays

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟡 MEDIUM
**Estimated Time:** 4 hours
**Conflicts:** None
**Complexity:** ⚠️ HIGH - Many instances

## Files to Update

### 1. `/home/user/eryxon-flow/src/components/admin/PartDetailModal.tsx` ⚠️ COMPLEX

This file has MANY instances (30+). Use find/replace systematically:

```typescript
// Grays:
text-gray-400 → text-muted
text-gray-500 → text-muted-foreground
text-gray-600 → text-muted-foreground
bg-gray-50 → bg-muted
bg-gray-100 → bg-muted
bg-white → bg-card

// Alert backgrounds:
bg-blue-50 → bg-alert-info-bg
border-blue-200 → border-alert-info-border
bg-green-50 → bg-alert-success-bg
border-green-200 → border-alert-success-border

// Semantic colors:
text-blue-600 → text-brand-primary or text-info
text-red-600 → text-destructive
text-green-600 → text-success

// Specific lines mentioned in audit:
// 432, 442, 451, 485-489, 486, 531, 560, 585, 589, 639, 692
```

**Strategy:** Use editor's find/replace across entire file, then verify visually.

### 2. `/home/user/eryxon-flow/src/components/admin/DueDateOverrideModal.tsx`

```typescript
// Lines 110, 112
text-gray-600 → text-muted-foreground
text-gray-500 → text-muted-foreground

// Line 147
bg-blue-50 → bg-alert-info-bg
border-blue-200 → border-alert-info-border
```

### 3. `/home/user/eryxon-flow/src/components/UploadProgress.tsx`

```typescript
// Line 32
bg-white → bg-card
shadow-sm → shadow-sm (keep, it's a design token)

// Line 135 (conditional backgrounds)
bg-red-50 → bg-alert-error-bg
bg-yellow-50 → bg-alert-warning-bg
bg-gray-50 → bg-muted

// Replace borders too:
border-red-200 → border-alert-error-border
border-yellow-200 → border-alert-warning-border
border-gray-200 → border-border
```

## Success Criteria

- [ ] PartDetailModal.tsx has zero `gray-*`, `blue-*`, `green-*`, `red-*` classes
- [ ] All backgrounds use `bg-card`, `bg-muted`, or `bg-alert-*-bg`
- [ ] All text uses `text-foreground`, `text-muted-foreground`, or semantic colors
- [ ] Borders use `border-border` or `border-alert-*-border`

## Commit Message

```
Update UI [Batch 8]: Modals & Overlays

Replace hardcoded colors in modal components (COMPLEX):
- PartDetailModal.tsx: Systematic replacement of 30+ instances
- DueDateOverrideModal.tsx: Use muted and info alert tokens
- UploadProgress.tsx: Use card and alert backgrounds

Batch 8 of 10 - Medium Priority (Complex) Complete
```

## Notes

- PartDetailModal is the most complex file in this batch
- Take extra time to verify visual correctness
- If unsure about a specific color, use the "closest" semantic token
- Test the modal with various states (loading, error, success)
