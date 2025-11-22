# Agent Prompts - UI Modernization Batches

**Project:** Eryxon MES Dark Mode Modernization
**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Documentation:** `/home/user/eryxon-flow/docs/ui-modernization-plan.md`

## 📋 Available Batch Prompts

Each prompt is a self-contained task that can be assigned to an agent independently.

### 🔴 High Priority (Operator & Admin Facing)

1. **[Batch 1: Operator Core Pages](./batch-1-operator-core.md)**
   - Files: WorkQueue.tsx, MyActivity.tsx, OperatorView.tsx
   - Time: 2-3 hours
   - Complexity: Medium
   - Conflicts: None ✅

2. **[Batch 2: Admin Core Pages](./batch-2-admin-core.md)**
   - Files: Dashboard.tsx, IssueQueue.tsx, Jobs.tsx
   - Time: 2 hours
   - Complexity: Simple
   - Conflicts: None ✅

### 🟡 Medium Priority (Components & Features)

3. **[Batch 3: QRM Components](./batch-3-qrm-components.md)**
   - Files: CapacityWarning.tsx, WIPIndicator.tsx, RoutingVisualization.tsx
   - Time: 3 hours
   - Complexity: Simple
   - Conflicts: None ✅

4. **[Batch 4: Issue Components](./batch-4-issue-components.md)**
   - Files: OperationCard.tsx (IssuesSummarySection.tsx already done)
   - Time: 2 hours
   - Complexity: Simple
   - Conflicts: None ✅

5. **[Batch 5: Terminal & Jobs](./batch-5-terminal-jobs.md)**
   - Files: JobRow.tsx, OperatorTerminal.tsx, JobDetailModal.tsx
   - Time: 3 hours
   - Complexity: Medium
   - Conflicts: None ✅

6. **[Batch 6: Operator Actions](./batch-6-operator-actions.md)**
   - Files: OperatorFooterBar.tsx
   - Time: 2 hours
   - Complexity: Simple
   - Conflicts: None ✅

8. **[Batch 8: Modals & Overlays](./batch-8-modals.md)**
   - Files: PartDetailModal.tsx, DueDateOverrideModal.tsx, UploadProgress.tsx
   - Time: 4 hours
   - Complexity: ⚠️ HIGH
   - Conflicts: None ✅

9. **[Batch 9: Onboarding](./batch-9-onboarding.md)**
   - Files: AllSubstepsView.tsx, OnboardingWizard.tsx, MockDataImport.tsx
   - Time: 3 hours
   - Complexity: Medium
   - Conflicts: None ✅

10. **[Batch 10: Layouts](./batch-10-layouts.md)**
    - Files: OperatorLayout.tsx, MyPlan.tsx
    - Time: 4 hours
    - Complexity: ⚠️ VERY HIGH
    - Conflicts: ⚠️ Critical files - test thoroughly

### 🟢 Low Priority (Common Pages)

7. **[Batch 7: Common Pages](./batch-7-common-pages.md)**
   - Files: Pricing.tsx, ApiDocs.tsx, Help.tsx, About.tsx
   - Time: 2 hours
   - Complexity: Simple
   - Conflicts: None ✅

## 🚀 How to Assign to Agents

### Option 1: Copy Entire Prompt
```
Read and execute: /home/user/eryxon-flow/docs/agent-prompts/batch-1-operator-core.md
```

### Option 2: Reference by Batch Number
```
Execute Batch 1 from the UI modernization plan:
- Read /home/user/eryxon-flow/docs/agent-prompts/batch-1-operator-core.md
- Update the 3 specified files
- Use semantic design tokens from design-system.css
- Commit with the provided commit message format
```

### Option 3: Parallel Assignment
```
Agent A: Execute Batch 1 (Operator Core)
Agent B: Execute Batch 2 (Admin Core)
Agent C: Execute Batch 3 (QRM Components)
... all simultaneously - no conflicts
```

## 📊 Progress Tracking

Use this checklist to track batch completion:

- [ ] Batch 1: Operator Core Pages (HIGH)
- [ ] Batch 2: Admin Core Pages (HIGH)
- [ ] Batch 3: QRM Components (MEDIUM)
- [ ] Batch 4: Issue Components (MEDIUM)
- [ ] Batch 5: Terminal & Jobs (MEDIUM)
- [ ] Batch 6: Operator Actions (MEDIUM)
- [ ] Batch 7: Common Pages (LOW)
- [ ] Batch 8: Modals & Overlays (MEDIUM - COMPLEX)
- [ ] Batch 9: Onboarding (MEDIUM)
- [ ] Batch 10: Layouts (MEDIUM - VERY COMPLEX)

## ✅ Success Criteria (All Batches)

When all batches are complete:

- [ ] Zero hardcoded hex colors (#...) in any file
- [ ] Zero hardcoded Tailwind color classes (gray-*, blue-*, etc.)
- [ ] All components use design tokens
- [ ] Visual consistency across entire app
- [ ] Dark mode optimized for operators
- [ ] Touch targets maintained
- [ ] No accessibility regressions

## 🔧 Design System Reference

**Main Files:**
- Design Tokens: `/home/user/eryxon-flow/src/styles/design-system.css`
- Tailwind Config: `/home/user/eryxon-flow/tailwind.config.ts`
- MUI Theme: `/home/user/eryxon-flow/src/theme/theme.ts`

**Example Files:**
- MyIssues.tsx - Status/severity pattern
- GlobalSearch.tsx - MUI theme usage
- ConfigStages.tsx - Design token constants

## 🎯 Recommended Execution Order

### Week 1: High Priority
1. Batch 1 (Operator Core)
2. Batch 2 (Admin Core)

### Week 2: Medium Priority (Easy Wins)
3. Batch 4 (Issue Components)
4. Batch 6 (Operator Actions)
5. Batch 3 (QRM Components)

### Week 3: Medium Priority (Complex)
6. Batch 5 (Terminal & Jobs)
7. Batch 9 (Onboarding)

### Week 4: Remaining + Complex
8. Batch 7 (Common Pages)
9. Batch 8 (Modals - COMPLEX)
10. Batch 10 (Layouts - VERY COMPLEX)

## ⚠️ Special Notes

**Batch 8 (Modals):**
- PartDetailModal.tsx has 30+ instances - use find/replace
- Allow extra time for testing

**Batch 10 (Layouts):**
- Critical files used throughout app
- May require adding new CSS token (--operator-gradient)
- Test extensively before merging
- Consider visual regression testing

## 📞 Questions or Issues?

If an agent encounters:
- **Missing design token** → Check design-system.css, may need to add
- **Complex inline styles** → Extract to CSS class or component
- **Unclear semantic mapping** → Use closest semantic token
- **Conflicts** → STOP and report, don't force merge

## 📈 Estimated Total Time

- High Priority: 4-5 hours
- Medium Priority: 17 hours
- Low Priority: 2 hours
- **Total: ~23-24 hours of work**
- **Can be parallelized to ~3-4 days with multiple agents**

## 🎉 Completion

When all batches are done:
1. Run visual QA across all pages
2. Test accessibility (contrast ratios)
3. Performance check
4. Create pull request to main
5. Celebrate! 🎊

---

**Last Updated:** 2025-11-22
**Branch:** `claude/modernize-ui-dark-mode-011ShPrRotCgvwLYqEY8chw9`
**Status:** Ready for agent assignment ✅
