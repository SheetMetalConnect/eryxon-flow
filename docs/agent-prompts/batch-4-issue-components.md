# Agent Prompt: Batch 4 - Issue Components

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟡 MEDIUM
**Estimated Time:** 2 hours
**Conflicts:** None

## Files to Update

### 1. `/home/user/eryxon-flow/src/components/issues/IssuesSummarySection.tsx`

**Already completed! ✅ Skip this file.**

### 2. `/home/user/eryxon-flow/src/components/operator/OperationCard.tsx`

```typescript
// Lines 129-132 (issue severity badges)
// Update inline HSL styles to use design tokens if applicable
// Check if status color map (lines 29-34) needs updates

// Pattern should match IssuesSummarySection.tsx:
const severityColors = {
  low: 'bg-severity-low',
  medium: 'bg-severity-medium',
  high: 'bg-severity-high',
  critical: 'bg-severity-critical',
};
```

## Design Tokens

```css
bg-severity-low, bg-severity-medium, bg-severity-high, bg-severity-critical
bg-status-active, bg-status-completed, bg-status-on-hold, bg-status-pending
```

## Commit Message

```
Update UI [Batch 4]: Issue Components

Replace hardcoded colors in issue components:
- OperationCard.tsx: Use semantic severity tokens for badges

Note: IssuesSummarySection.tsx already updated in Phase 1

Batch 4 of 10 - Medium Priority Complete
```
