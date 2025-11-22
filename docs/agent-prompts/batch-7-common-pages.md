# Agent Prompt: Batch 7 - Common Pages

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟢 LOW
**Estimated Time:** 2 hours
**Conflicts:** None

## Files to Update

### 1. `/home/user/eryxon-flow/src/pages/Pricing.tsx` & `/home/user/eryxon-flow/src/pages/common/Pricing.tsx`

```typescript
// Lines 120-122
border-green-500 → border-success
shadow-xl ring-2 ring-green-500/20 → shadow-xl ring-2 ring-success/20
border-purple-500 → border-accent or border-primary

// Lines 126, 142, 146
bg-green-600 → bg-success
bg-green-500/10 → bg-alert-success-bg
text-green-600 → text-success
text-white → text-success-foreground or text-foreground
```

### 2. `/home/user/eryxon-flow/src/pages/ApiDocs.tsx` & `/home/user/eryxon-flow/src/pages/common/ApiDocs.tsx`

```typescript
// Lines 339, 433 (code blocks)
bg-slate-950 → bg-code-bg
text-green-400 → text-code-fg

// Line 344
bg-green-50 → bg-alert-success-bg
border-green-200 → border-alert-success-border
```

### 3. `/home/user/eryxon-flow/src/pages/Help.tsx` & `/home/user/eryxon-flow/src/pages/About.tsx`

```typescript
// Quick scan for any hardcoded colors
// Replace grays: bg-gray-* → bg-muted, text-muted-foreground
// Replace blues: text-blue-* → text-brand-primary or text-primary
// Replace success colors: bg-green-* → bg-success or bg-alert-success-bg
```

## Design Tokens

```css
/* Code blocks: */
bg-code-bg, text-code-fg

/* Success/plan highlighting: */
bg-success, text-success, border-success
bg-alert-success-bg, border-alert-success-border

/* Primary/accent: */
bg-primary, text-primary, border-primary
bg-accent, text-accent
```

## Commit Message

```
Update UI [Batch 7]: Common Pages

Replace hardcoded colors in common pages:
- Pricing.tsx: Use semantic success tokens for plan highlighting
- ApiDocs.tsx: Use code block and success alert tokens
- Help.tsx, About.tsx: Replace any remaining hardcoded colors

Batch 7 of 10 - Low Priority Complete
```
