# Agent Instructions & Planned Features

This folder contains implementation plans and instructions for AI agents and developers to execute planned features.

## Purpose

- **Planned Features**: Step-by-step implementation guides for future features
- **Agent Tasks**: Task lists and instructions designed for AI agents (like Claude Code)
- **Architecture Plans**: Strategic planning documents with implementation steps

## Files

### [stripe-integration-signup-plan.md](./stripe-integration-signup-plan.md)
Complete implementation plan for Stripe payment processing and self-service signup.

**Status**: Planned (not started)

**Contents**:
- Phase 1: Database & Schema Setup
- Phase 2: Stripe Configuration
- Phase 3: Backend Subscription Management
- Phase 4: Team Management Backend
- Phase 5: Frontend Signup Flow
- Phase 6: Subscription Management UI
- Phase 7: Team Management UI
- Phase 8: Testing & QA
- Phase 9: Documentation & Deployment

**Estimated Scope**: Large (50+ tasks across 9 phases)

---

### [modular-architecture-plan.md](./modular-architecture-plan.md)
Architecture planning and refactoring strategies for improving code organization.

**Status**: Reference document

**Contents**:
- Code organization strategies
- Modular architecture patterns
- Refactoring guidelines
- Best practices for scaling

---

## How to Use

### For AI Agents (Claude Code, etc.)

When asked to implement a feature from this folder:

1. Read the entire plan document
2. Create a todo list from the tasks
3. Work through tasks sequentially
4. Mark tasks complete as you go
5. Test thoroughly between phases
6. Update documentation when done

### For Developers

1. Review the plan to understand scope
2. Break down into sprints if needed
3. Follow the phases in order
4. Test each phase before moving to next
5. Update the plan if you deviate

---

## Documentation Structure

```
/eryxon-flow
├── README.md                    # App overview & dev notes (internal)
├── agent/                       # THIS FOLDER - Planned features with tasks
│   ├── README.md
│   ├── stripe-integration-signup-plan.md
│   └── modular-architecture-plan.md
└── docs/                        # How features work (no TODOs)
    ├── index.md
    ├── API_DOCUMENTATION.md
    ├── HOW-THE-APP-WORKS.md
    └── ... (15+ documentation files)
```

---

## Adding New Plans

When creating a new implementation plan for this folder:

1. **Use clear phase structure** - Break work into logical phases
2. **Include task lists** - Use markdown checkboxes `- [ ]`
3. **Add context** - Explain WHY, not just WHAT
4. **Provide code examples** - Show expected patterns
5. **Include testing steps** - QA checklist for each phase
6. **Document dependencies** - External libs, migrations, etc.

### Template Structure

```markdown
# Feature Name

## Overview
Brief description of what this feature does

## Goals
- Goal 1
- Goal 2

## Prerequisites
- Required knowledge
- Required access
- Dependencies

## Implementation Phases

### Phase 1: [Phase Name]
#### Tasks
- [ ] Task 1
- [ ] Task 2

#### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### Phase 2: [Phase Name]
...

## Testing Strategy
How to test this feature

## Deployment Notes
Any special deployment steps

## Rollback Plan
How to undo if something goes wrong
```

---

## Status Tracking

When working on a plan:

- Update task checkboxes as you complete them
- Add notes about changes or deviations
- Create new sections if you discover missing tasks
- Mark phases complete when all tasks done

---

**Last Updated**: 2025-11-22
