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
- [x] Create `src/components/ui/app-header.tsx` → Tailwind + shadcn DropdownMenu
- [x] Migrate `src/layouts/OperatorLayout.tsx` → Tailwind layout

## Phase 6: Feature Components
- [x] Migrate `src/components/GlobalSearch.tsx` → shadcn Command (cmdk)
- [x] Migrate `src/components/NotificationsCenter.tsx` → shadcn Popover + list
- [x] Migrate `src/components/QuickCreateMenu.tsx` → shadcn DropdownMenu
- [x] Migrate `src/components/admin/TenantSwitcher.tsx` → shadcn Dialog + list

## Phase 7: Complex Pages
- [x] Migrate `src/pages/common/Help.tsx` → shadcn Accordion/Tabs
- [x] Migrate `src/pages/common/MyPlan.tsx` → shadcn Card/Progress
- [ ] Migrate `src/pages/operator/OperatorView.tsx` (1366 lines - largest file)

## Phase 8: Cleanup
- [x] Delete `src/components/mui/` directory
- [x] Verify `src/theme/theme.ts` is MUI-free (already CSS-based)
- [x] Verify `src/theme/ThemeProvider.tsx` is MUI-free (already pure CSS)
- [x] Remove MUI dependencies from package.json:
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
| 2025-11-27 | Phase 4 | ✅ Complete |
| 2025-11-27 | Phase 5 | ✅ Complete |
| 2025-11-27 | Phase 6 | ✅ Complete |
| 2025-11-27 | Phase 7 | 🔄 In Progress (OperatorView pending) |
| 2025-11-27 | Phase 8 | 🔄 In Progress (MUI deps removal pending) |

---

## Notes

- Follow Antigravity design system (glass-card, cta-button classes)
- Use Lucide React icons (not MUI icons)
- Preserve all existing functionality
- Test each component after migration
