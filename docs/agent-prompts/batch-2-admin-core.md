# Agent Prompt: Batch 2 - Admin Core Pages

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🔴 HIGH
**Estimated Time:** 2 hours
**Conflicts:** None

## Task Overview
Update admin dashboard and core admin pages to use semantic design tokens.

## Files to Update

### 1. `/home/user/eryxon-flow/src/pages/admin/Dashboard.tsx`

**Find and Replace:**
```typescript
// Lines 263-265, 434-437 (inline cell badge styles)
// Replace: style={{ backgroundColor, color }}
// With: className="bg-status-{completed|active|pending}" and appropriate text color

// Extract pattern to reusable component if used multiple times
```

### 2. `/home/user/eryxon-flow/src/pages/admin/IssueQueue.tsx`

**Apply same pattern as MyIssues.tsx:**
```typescript
// If severity colors exist, use:
bg-severity-low, bg-severity-medium, bg-severity-high, bg-severity-critical

// If status colors exist, use:
bg-issue-pending, bg-issue-approved, bg-issue-rejected, bg-issue-closed
```

### 3. `/home/user/eryxon-flow/src/pages/admin/Jobs.tsx`

**Find and Replace:**
```typescript
// Look for any hardcoded colors
// Replace with semantic status tokens
text-status-completed, text-status-active, text-status-pending
bg-status-completed, bg-status-active, bg-status-pending
```

## Design Tokens Available

```css
/* Status tokens: */
bg-status-completed, text-status-completed
bg-status-active, text-status-active
bg-status-pending, text-status-pending
bg-status-on-hold, text-status-on-hold
bg-status-blocked, text-status-blocked

/* Severity tokens: */
bg-severity-critical, bg-severity-high, bg-severity-medium, bg-severity-low
```

## Success Criteria

- [ ] No hardcoded hex colors or RGBA
- [ ] No hardcoded Tailwind color classes (blue-*, green-*, red-*, gray-*)
- [ ] Cell badges use semantic tokens
- [ ] Status indicators use `status-*` tokens

## Commit Message

```
Update UI [Batch 2]: Admin Core Pages

Replace hardcoded colors in admin pages:
- Dashboard.tsx: Extract cell badge styles to semantic tokens
- IssueQueue.tsx: Use severity and status tokens
- Jobs.tsx: Apply semantic status colors

Batch 2 of 10 - High Priority Complete
```
