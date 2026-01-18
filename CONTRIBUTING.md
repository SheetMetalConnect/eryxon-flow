# Contributing to Eryxon Flow

Thank you for your interest in contributing to Eryxon Flow! This document provides guidelines for contributing to this manufacturing execution system.

## License Agreement

By contributing to Eryxon Flow, you agree that your contributions will be licensed under the same [Business Source License 1.1](LICENSE) that covers the project. After the change date, contributions will be available under Apache 2.0.

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Git
- A [Supabase](https://supabase.com) account (free tier works)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/SheetMetalConnect/eryxon-flow.git
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
# Run all tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## How to Contribute

### Reporting Bugs

1. Check existing [GitHub Issues](https://github.com/SheetMetalConnect/eryxon-flow/issues) to avoid duplicates
2. Use the bug report template
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser/environment details
   - Screenshots if applicable

### Suggesting Features

1. Open a [GitHub Discussion](https://github.com/SheetMetalConnect/eryxon-flow/discussions) first
2. Describe the use case and manufacturing context
3. Explain why existing features don't solve the problem

### Submitting Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our code style
4. **Test** your changes thoroughly
5. **Commit** with clear messages (see below)
6. **Push** and open a Pull Request

## Code Style

### General Guidelines

- Follow existing code patterns in the codebase
- Use TypeScript with strict typing (no `any`)
- Keep components small and focused
- Write self-documenting code

### Localization

**All user-facing text must be localized.** Never hardcode strings.

```tsx
// Correct
const { t } = useTranslation();
<Button>{t('common.save')}</Button>

// Incorrect - never do this
<Button>Save</Button>
```

Add translations to all three language files:
- `src/i18n/locales/en/` - English
- `src/i18n/locales/nl/` - Dutch
- `src/i18n/locales/de/` - German

### Design System

Use existing design tokens and classes. See `docs/DESIGN_SYSTEM.md`:

```tsx
// Correct - use design system classes
<div className="glass-card">
  <h1 className="hero-title">{title}</h1>
</div>

// Incorrect - never inline custom styles
<div style={{ background: '#1a1a2e' }}>
```

### Data Fetching

Always use real data from Supabase. Never create mock data:

```tsx
// Correct
const { data } = useQuery({
  queryKey: ['jobs'],
  queryFn: () => supabase.from('jobs').select('*')
});

// Incorrect - never mock data
const mockJobs = [{ id: 1, name: 'Test' }];
```

## Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```
feat(jobs): add bulk delete functionality
fix(operator): correct time calculation for paused operations
docs(api): update webhook documentation
```

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows the style guide
- [ ] All tests pass
- [ ] TypeScript has no errors (`npm run typecheck`)
- [ ] New features have translations in all 3 languages
- [ ] Documentation updated if needed

### PR Description

Include:
- What the PR does
- Why the change is needed
- How to test the changes
- Screenshots for UI changes

### Review Process

1. Maintainers will review within 1-2 weeks
2. Address feedback promptly
3. Keep PRs focused - split large changes

## Development Resources

- [CLAUDE.md](CLAUDE.md) - AI agent guidelines (Claude)
- [CODEX.md](CODEX.md) - AI agent guidelines (OpenAI Codex/GPT)
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) - UI design system
- [docs/CODING_PATTERNS.md](docs/CODING_PATTERNS.md) - Code patterns
- [docs/DATABASE.md](docs/DATABASE.md) - Database schema

### Full Documentation
- **Online:** [eryxon.eu/docs](https://eryxon.eu/docs)
- **Local:** `website/src/content/docs/` (Astro markdown files)

## Questions?

- Open a [GitHub Discussion](https://github.com/SheetMetalConnect/eryxon-flow/discussions)
- Check [documentation](https://eryxon.eu/docs)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

Thank you for contributing to manufacturing innovation!
