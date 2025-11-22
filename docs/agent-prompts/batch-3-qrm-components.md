# Agent Prompt: Batch 3 - QRM Components

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟡 MEDIUM
**Estimated Time:** 3 hours
**Conflicts:** None

## Files to Update

### 1. `/home/user/eryxon-flow/src/components/qrm/CapacityWarning.tsx`

```typescript
// Replace alert backgrounds:
bg-red-50 → bg-alert-error-bg
border-red-200 → border-alert-error-border

bg-yellow-50 → bg-alert-warning-bg
border-yellow-200 → border-alert-warning-border

bg-blue-50 → bg-alert-info-bg
border-blue-200 → border-alert-info-border

// Lines 94, 102, 138-139
bg-white → bg-card
border-gray-300 → border-border
```

### 2. `/home/user/eryxon-flow/src/components/qrm/WIPIndicator.tsx`

```typescript
// Line 142
bg-yellow-400 → bg-warning

// Line 153
bg-red-600 → bg-destructive
```

### 3. `/home/user/eryxon-flow/src/components/qrm/RoutingVisualization.tsx`

```typescript
// Lines 60, 141-142, 155
text-green-600 → text-status-completed
text-blue-600 → text-brand-primary or text-info
text-gray-300 → text-muted-foreground
```

## Design Tokens

```css
/* Alert backgrounds (10% opacity with borders): */
bg-alert-error-bg, border-alert-error-border
bg-alert-warning-bg, border-alert-warning-border
bg-alert-info-bg, border-alert-info-border
bg-alert-success-bg, border-alert-success-border
```

## Commit Message

```
Update UI [Batch 3]: QRM Components

Replace hardcoded colors in QRM components:
- CapacityWarning.tsx: Use semantic alert backgrounds
- WIPIndicator.tsx: Use warning/destructive tokens
- RoutingVisualization.tsx: Use semantic status colors

Batch 3 of 10 - Medium Priority Complete
```
