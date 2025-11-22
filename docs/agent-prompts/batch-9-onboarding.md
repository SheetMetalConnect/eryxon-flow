# Agent Prompt: Batch 9 - Onboarding & Substeps

**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Priority:** 🟡 MEDIUM
**Estimated Time:** 3 hours
**Conflicts:** None

## Files to Update

### 1. `/home/user/eryxon-flow/src/components/admin/AllSubstepsView.tsx`

```typescript
// Lines 218-224 (status color combinations)
// Current hardcoded combinations:
'bg-green-500/10 text-green-500 border-green-500/20'
'bg-blue-500/10 text-blue-500 border-blue-500/20'
'bg-red-500/10 text-red-500 border-red-500/20'
'bg-gray-500/10 text-gray-500 border-gray-500/20'

// Replace with semantic tokens:
'bg-alert-success-bg text-success border-alert-success-border'
'bg-alert-info-bg text-brand-primary border-alert-info-border'
'bg-alert-error-bg text-destructive border-alert-error-border'
'bg-muted text-muted-foreground border-border'

// OR use status tokens if these are work statuses:
'bg-status-completed text-status-completed ...'
```

### 2. `/home/user/eryxon-flow/src/components/onboarding/OnboardingWizard.tsx`

```typescript
// Lines 147, 162, 171-172 (multiple grays and whites)
bg-gray-300 → bg-muted
bg-gray-600 → bg-muted-foreground or bg-primary
bg-white → bg-card
bg-gray-700 → bg-secondary
bg-transparent → bg-transparent (keep)

border-gray-300 → border-border
border-gray-600 → border-strong or border-primary

// Use context to determine best semantic token
// Progress bars might use bg-primary vs bg-muted
```

### 3. `/home/user/eryxon-flow/src/components/onboarding/MockDataImport.tsx`

```typescript
// Lines 146-148
bg-green-50 → bg-alert-success-bg
border-green-200 → border-alert-success-border
text-green-600 → text-success
text-green-900 → text-success (or text-success-foreground)
```

## Design Tokens

```css
/* Alert backgrounds with borders: */
bg-alert-success-bg, border-alert-success-border, text-success
bg-alert-info-bg, border-alert-info-border, text-brand-primary
bg-alert-error-bg, border-alert-error-border, text-destructive

/* Neutrals: */
bg-muted, text-muted-foreground
bg-card, text-card-foreground
border-border, border-strong
```

## Commit Message

```
Update UI [Batch 9]: Onboarding & Substeps

Replace hardcoded colors:
- AllSubstepsView.tsx: Use alert/status semantic combinations
- OnboardingWizard.tsx: Replace grays with muted/card tokens
- MockDataImport.tsx: Use success alert backgrounds

Batch 9 of 10 - Medium Priority Complete
```
