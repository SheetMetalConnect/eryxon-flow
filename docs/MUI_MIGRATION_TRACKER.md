# MUI to shadcn/ui Migration Tracker

**Goal**: Remove all Material UI dependencies and achieve 100% shadcn/ui + Tailwind CSS

**Branch**: `claude/review-material-ui-018DyTJraQWcpmMCqHRdT8pg`

---

## Phase 1: Foundation Components
- [x] Create DatePicker component (`src/components/ui/date-picker.tsx`)
- [x] Create TimePicker component (`src/components/ui/time-picker.tsx`)
- [x] Create DateTimePicker component (`src/components/ui/datetime-picker.tsx`)
- [x] Create Spinner component (`src/components/ui/spinner.tsx`)
- [x] Create Chip component (`src/components/ui/chip.tsx`)

## Phase 2: Simple File Migrations
- [x] Migrate `src/pages/common/About.tsx`
- [x] Migrate `src/pages/common/PrivacyPolicy.tsx`
- [x] Migrate `src/pages/common/TermsOfService.tsx`
- [x] Migrate `src/pages/SubscriptionBlocked.tsx`
- [x] Create `src/components/ui/status-badge.tsx` (replacement)

## Phase 3: Core MUI Wrapper Components
- [x] Create `src/components/ui/action-buttons.tsx` (shadcn Button + Lucide icons)
- [x] Create `src/components/ui/toast-provider.tsx` (sonner wrapper with same API)
- [x] Create `src/components/ui/modal-dialog.tsx` (shadcn Dialog/AlertDialog)
- [x] Create `src/components/ui/form-components.tsx` (shadcn Form + pickers)

## Phase 4: DataTable Migration
- [ ] Migrate `src/components/mui/DataTable.tsx` → TanStack Table + shadcn table

## Phase 5: Layout & Navigation
- [ ] Migrate `src/components/mui/AppHeader.tsx` → Tailwind + shadcn DropdownMenu
- [ ] Migrate `src/layouts/OperatorLayout.tsx` → Tailwind layout

## Phase 6: Feature Components
- [ ] Migrate `src/components/GlobalSearch.tsx` → shadcn Command (cmdk)
- [ ] Migrate `src/components/NotificationsCenter.tsx` → shadcn Popover + list
- [ ] Migrate `src/components/QuickCreateMenu.tsx` → shadcn DropdownMenu
- [ ] Migrate `src/components/admin/TenantSwitcher.tsx` → shadcn Dialog + list

## Phase 7: Complex Pages
- [ ] Migrate `src/pages/common/Help.tsx` → shadcn Accordion/Tabs
- [ ] Migrate `src/pages/common/MyPlan.tsx` → shadcn Card/Progress
- [ ] Migrate `src/pages/Help.tsx` (duplicate check)
- [ ] Migrate `src/pages/operator/OperatorView.tsx` (1366 lines - largest file)

## Phase 8: Cleanup
- [ ] Delete `src/components/mui/` directory
- [ ] Delete `src/theme/theme.ts` (MUI theme)
- [ ] Remove MUI dependencies from package.json:
  - `@mui/material`
  - `@mui/icons-material`
  - `@mui/x-data-grid`
  - `@mui/x-date-pickers`
  - `@emotion/react`
  - `@emotion/styled`
- [ ] Update DESIGN_SYSTEM.md (remove MUI references)
- [ ] Run build to verify no MUI imports remain
- [ ] Update README.md badges if needed

---

## Progress Log

| Date | Phase | Status |
|------|-------|--------|
| 2025-11-27 | Phase 1 | ✅ Complete |
| 2025-11-27 | Phase 2 | ✅ Complete |
| 2025-11-27 | Phase 3 | ✅ Complete |
| 2025-11-27 | Phase 4 | 🔄 In Progress |

---

## Notes

- Follow Antigravity design system (glass-card, cta-button classes)
- Use Lucide React icons (not MUI icons)
- Preserve all existing functionality
- Test each component after migration
