# Contributing to Eryxon Flow

Thank you for your interest in contributing to Eryxon Flow! This document provides guidelines and information for contributors.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

---

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

---

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report:

1. Check the [existing issues](https://github.com/your-org/eryxon-flow/issues) to avoid duplicates
2. Collect information about the bug:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/Node version
   - Screenshots if applicable

Use the bug report template when creating an issue.

### Suggesting Features

We welcome feature suggestions! Please:

1. Check existing issues/discussions first
2. Describe the use case clearly
3. Explain why this would benefit other users
4. Consider if it fits the project's scope (manufacturing/MES)

### Code Contributions

Great areas to contribute:

- **Bug fixes** - Always welcome!
- **Documentation** - Improve guides, add examples
- **Translations** - Add new languages (see `src/i18n/`)
- **Tests** - Help improve test coverage
- **Performance** - Optimize queries, reduce bundle size
- **Accessibility** - Improve a11y compliance

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm or bun
- Git
- A Supabase account (for testing)

### Local Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/eryxon-flow.git
cd eryxon-flow

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### Running Tests

```bash
# Lint code
npm run lint

# Type check
npm run typecheck

# Run tests (when available)
npm test
```

### Building

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

---

## Code Style

### TypeScript

- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Export types that might be reused

```typescript
// Good
interface JobFormData {
  name: string;
  customer: string;
  dueDate: Date;
}

// Avoid
const data: any = {...};
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use React Query for server state

```typescript
// Good: Focused component
export function JobCard({ job }: { job: Job }) {
  return (
    <Card>
      <CardHeader>{job.name}</CardHeader>
      <CardContent>...</CardContent>
    </Card>
  );
}

// Good: Custom hook for data fetching
export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });
}
```

### Imports

Use the `@/` path alias for all imports:

```typescript
// Good
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Avoid
import { Button } from '../../../components/ui/button';
```

### Styling

- Use Tailwind CSS utility classes
- Follow the design system in `src/styles/design-system.css`
- Use CSS variables for colors and spacing
- Keep dark mode in mind (use `dark:` variants)

```tsx
// Good: Using design system
<div className="bg-surface-primary border-subtle rounded-lg p-4">

// Good: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### Database Queries

- Always scope queries by `tenant_id`
- Use RLS policies for security (never rely on client-side filtering)
- Handle errors gracefully

```typescript
// Good: Tenant-scoped query
const { data } = await supabase
  .from('jobs')
  .select('*')
  .eq('tenant_id', profile.tenant_id)
  .order('created_at', { ascending: false });
```

---

## Commit Messages

Follow the conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(jobs): add bulk status update action
fix(operator): correct time calculation for paused operations
docs(api): add webhook payload examples
refactor(auth): simplify tenant resolution logic
```

---

## Pull Request Process

### Before Submitting

1. **Create an issue first** for significant changes
2. **Fork the repository** and create a feature branch
3. **Write/update tests** if applicable
4. **Update documentation** if needed
5. **Run linting** and fix any issues
6. **Test your changes** thoroughly

### Branch Naming

```
feature/short-description
fix/issue-number-description
docs/what-changed
```

### PR Template

When opening a PR, include:

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
How did you test these changes?

## Screenshots
If applicable

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed my code
- [ ] Added/updated documentation
- [ ] No new warnings
```

### Review Process

1. Automated checks must pass (lint, type check)
2. At least one maintainer review required
3. Address feedback promptly
4. Squash commits before merge (we'll help)

---

## Project Structure

```
eryxon-flow/
├── src/
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── admin/           # Admin-specific components
│   │   ├── operator/        # Operator components
│   │   ├── terminal/        # Terminal view
│   │   ├── qrm/             # QRM capacity components
│   │   └── issues/          # Issue tracking
│   ├── pages/               # Page components (routes)
│   │   ├── admin/           # Admin pages
│   │   ├── operator/        # Operator pages
│   │   └── common/          # Shared pages
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions
│   ├── contexts/            # React contexts
│   ├── integrations/        # External service integrations
│   │   └── supabase/        # Supabase client & types
│   ├── i18n/                # Internationalization
│   │   └── locales/         # Translation files (en, nl, de)
│   ├── types/               # TypeScript type definitions
│   └── styles/              # Global styles
├── supabase/
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── _shared/         # Shared utilities
│   │   └── */               # Individual functions
│   └── migrations/          # Database migrations
├── mcp-server/              # MCP server for AI integration
├── docs/                    # Documentation
└── scripts/                 # Utility scripts
```

### Key Files

| File | Purpose |
|------|---------|
| `src/contexts/AuthContext.tsx` | Authentication & tenant state |
| `src/integrations/supabase/client.ts` | Supabase client setup |
| `src/integrations/supabase/types.ts` | Auto-generated DB types |
| `supabase/functions/_shared/security.ts` | Security utilities |

---

## Adding New Features

### Adding a New Page

1. Create component in `src/pages/admin/` or `src/pages/operator/`
2. Add route in `src/App.tsx`
3. Add navigation link if needed
4. Add translations in `src/i18n/locales/*/translation.json`

### Adding a New Edge Function

1. Create folder in `supabase/functions/`
2. Add `index.ts` with handler
3. Use shared utilities from `_shared/`
4. Deploy with `supabase functions deploy`

### Adding Translations

1. Add keys to all locale files in `src/i18n/locales/`
2. Run `node scripts/check-translations.js` to verify
3. Use `t('key')` in components

---

## Questions?

- Open a [Discussion](https://github.com/your-org/eryxon-flow/discussions)
- Check existing [Issues](https://github.com/your-org/eryxon-flow/issues)
- Read the [Documentation](./README.md)

---

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- CONTRIBUTORS.md file
- Release notes for significant contributions

Thank you for helping make Eryxon Flow better!
