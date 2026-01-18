# Codex/GPT Agent Guidelines for Eryxon Flow

> **Docs:** [eryxon.eu/docs](https://eryxon.eu/docs) | **Hosted:** [app.eryxon.eu](https://app.eryxon.eu)

Guidelines for OpenAI Codex, GPT-4, and similar AI agents working on the Eryxon Flow codebase.

**For Claude agents:** See [CLAUDE.md](CLAUDE.md) for detailed guidelines.

---

## Quick Reference

### Project Type
- **Application:** Manufacturing Execution System (MES)
- **Stack:** React + TypeScript + Vite + Supabase + shadcn/ui
- **Languages:** English, Dutch, German (i18n required)
- **Multi-tenant:** Yes, with Row-Level Security (RLS)

### Key Commands
```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run typecheck # TypeScript check
npm test          # Run tests
```

---

## Critical Rules

### 0. NEVER Work on Main/Master
Always create a feature branch. Never commit directly to `main` or `master`.

```bash
# CORRECT - Create descriptive branch
git checkout -b feature/add-job-export
git checkout -b fix/operator-time-calculation
git checkout -b docs/update-api-reference

# WRONG - Never work directly on main
git checkout main && git commit  # NO!
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code improvements
- `test/` - Test additions

### Pull Requests - Use Full Template

**Always fill out the complete PR template:**

```markdown
## What does this PR do?
[Brief description]

## Why?
[Motivation - what problem does this solve?]

## How to test
1. [Steps to verify]

## Screenshots (if UI changes)
[Before/after or "N/A"]

## Checklist
- [ ] Code follows project style
- [ ] All text localized (EN/DE/NL)
- [ ] Tests pass (`npm test`)
- [ ] TypeScript clean (`npm run typecheck`)
- [ ] Docs updated if needed
- [ ] No mock data or hardcoded strings

## Related issues
[Fixes #123]
```

**PR Title:** `type(scope): description` (e.g., `feat(jobs): add export`)

### 1. NO Mock Data
Always fetch from Supabase. Never create placeholder/test data.

```tsx
// CORRECT
const { data } = useQuery({
  queryKey: ['jobs'],
  queryFn: () => supabase.from('jobs').select('*')
});

// WRONG - Never do this
const mockData = [{ id: 1, name: 'Test' }];
```

### 2. NO Hardcoded Strings
All user-facing text must use translation keys.

```tsx
// CORRECT
const { t } = useTranslation();
<Button>{t('common.save')}</Button>

// WRONG
<Button>Save</Button>
```

### 3. Design System Required
Use existing CSS classes, never inline styles.

```tsx
// CORRECT
<div className="glass-card">
  <h1 className="hero-title">{title}</h1>
</div>

// WRONG
<div style={{ background: '#1a1a2e' }}>
```

### 4. TypeScript Strict
No `any` types. Define interfaces for all data structures.

```tsx
// CORRECT
interface Job {
  id: string;
  job_number: string;
  status: 'active' | 'completed';
}

// WRONG
const job: any = {...};
```

---

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific
│   ├── operator/       # Operator terminal
│   └── ui/             # shadcn/ui base
├── pages/              # Route pages
│   ├── admin/          # Admin pages
│   ├── auth/           # Auth pages
│   ├── operator/       # Operator pages
│   └── common/         # Shared pages
├── hooks/              # Custom React hooks
├── i18n/locales/       # Translations (en, nl, de)
├── integrations/       # Supabase client
└── styles/             # Global styles
```

---

## Localization

### Namespace Files
Translations are split by feature area:

| Area | File | Example Key |
|------|------|-------------|
| Common UI | `common.json` | `common.save` |
| Auth | `auth.json` | `auth.signIn` |
| Navigation | `navigation.json` | `navigation.dashboard` |
| Admin | `admin.json` | `dashboard.title` |
| Jobs | `jobs.json` | `jobs.createJob` |
| Config | `config.json` | `stages.title` |
| Analytics | `analytics.json` | `oee.availability` |

### Adding Translations
Always add to ALL three languages:
- `src/i18n/locales/en/*.json`
- `src/i18n/locales/nl/*.json`
- `src/i18n/locales/de/*.json`

---

## Data Patterns

### Fetching Data
```tsx
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['jobs', tenantId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw error;
    return data;
  }
});
```

### Mutations
```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (job) => {
    const { data, error } = await supabase
      .from('jobs')
      .insert(job)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  }
});
```

---

## Design Classes

| Class | Use For |
|-------|---------|
| `glass-card` | Card containers |
| `hero-title` | Page titles (gradient) |
| `cta-button` | Primary action buttons |
| `title-divider` | Section dividers |

### Color Tokens
Use CSS variables, not hex codes:
- `bg-background`, `text-foreground`
- `bg-status-active`, `bg-status-completed`

---

## Component Library

Use shadcn/ui from `src/components/ui/`:

```tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
```

---

## Before Completing Any Task

- [ ] No mock data used
- [ ] All strings localized (EN/NL/DE)
- [ ] Design system classes used
- [ ] TypeScript strict (no `any`)
- [ ] Navigation updated if new page
- [ ] Error states handled

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/DESIGN_SYSTEM.md` | Design guidelines |
| `docs/CODING_PATTERNS.md` | Code patterns |
| `src/styles/design-system.css` | CSS tokens |
| `src/integrations/supabase/client.ts` | DB client |
| `src/integrations/supabase/types.ts` | DB types |

---

## Resources

### Local Documentation (For AI Agents)
Always refer to local files, not web links:

- **Quick Start:** `website/src/content/docs/guides/quick-start.md`
- **Self-Hosting:** `website/src/content/docs/guides/self-hosting.md`
- **API Docs:** `website/src/content/docs/api/api_documentation.md`
- **Database:** `website/src/content/docs/architecture/database.md`
- **Design System:** `docs/DESIGN_SYSTEM.md`
- **Coding Patterns:** `docs/CODING_PATTERNS.md`
- **Full Guidelines:** [CLAUDE.md](CLAUDE.md)

### External Links (For Users)
- **Live Docs:** [eryxon.eu/docs](https://eryxon.eu/docs)
- **Hosted Version:** [app.eryxon.eu](https://app.eryxon.eu)
- **GitHub:** [github.com/SheetMetalConnect/eryxon-flow](https://github.com/SheetMetalConnect/eryxon-flow)
