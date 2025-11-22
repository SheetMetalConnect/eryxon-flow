# Agent Prompt: Batch 5 - Terminal & Job Components

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟡 MEDIUM
**Estimated Time:** 3 hours
**Conflicts:** None

## Files to Update

### 1. `/home/user/eryxon-flow/src/components/terminal/JobRow.tsx`

```typescript
// Lines 17, 20, 21 (operation type colors)
bg-blue-500 → bg-operation-milling
bg-red-500 → bg-operation-welding
bg-gray-400 → bg-operation-default

// Lines 49, 95, 100
text-white → text-primary-foreground or text-foreground
text-blue-500 → text-brand-primary
text-purple-500 → text-accent or appropriate semantic color
```

### 2. `/home/user/eryxon-flow/src/pages/operator/OperatorTerminal.tsx`

```typescript
// Line 331
bg-blue-950/10 → bg-alert-info-bg
border-l-4 border-blue-500 → border-l-4 border-alert-info-border
```

### 3. `/home/user/eryxon-flow/src/components/admin/JobDetailModal.tsx`

```typescript
// Line 114
text-red-600 → text-destructive

// Line 274
bg-gray-50 → bg-muted

// Lines 283, 285
text-green-600 → text-success
text-blue-600 → text-brand-primary or text-info

// Line 311
text-green-600 → text-success
border-green-300 → border-success or border-alert-success-border
```

## Design Tokens

```css
/* Operation types: */
bg-operation-milling, bg-operation-welding, bg-operation-default

/* Alert backgrounds: */
bg-alert-info-bg, border-alert-info-border

/* Semantic colors: */
text-destructive, text-success, text-brand-primary
bg-muted
```

## Commit Message

```
Update UI [Batch 5]: Terminal & Job Components

Replace hardcoded colors:
- JobRow.tsx: Use operation type tokens
- OperatorTerminal.tsx: Use alert info backgrounds
- JobDetailModal.tsx: Use semantic status colors

Batch 5 of 10 - Medium Priority Complete
```
