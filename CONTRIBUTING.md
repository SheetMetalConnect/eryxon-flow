# Contributing to Eryxon Flow

Thanks for your interest! Eryxon Flow is a source-available MES for
small and mid-size metalworking shops, licensed under the Business Source
License 1.1. Contributions
of every size are welcome — a typo fix, a Dutch or German translation, a bug
report from your shop floor, or a new feature.

## Quick start

```bash
npm ci && npm run dev   # App dev server at localhost:8080
npm run build                # Must pass before any PR
npm run test:run             # Vitest suite — must stay green
npm run lint                 # ESLint — zero errors required
npm run typecheck            # Check all referenced TypeScript projects
```

The marketing/docs website lives in `website/` with its own `package.json`
(`cd website && npm ci && npm run dev`).

## Project layout

| Path | What lives there |
|------|-------------------|
| `src/` | React 18 + TypeScript app (Vite, Tailwind, shadcn/ui) |
| `src/pages/operator` | Shared responsive operator interface |
| `src/pages/admin` | Admin surfaces |
| `supabase/functions/` | Deno edge functions (REST API), shared code in `_shared/` |
| `supabase/migrations/` | Database schema + RLS policies |
| `mcp-server/` | Model Context Protocol server |
| `website/` | Astro marketing site + Starlight docs (eryxon.eu) |
| `docs/` | Engineering docs (architecture, conventions, runbooks) |

## Ground rules

- **`npm run build` and `npm run test:run` must pass** before you open a PR.
- **Every user-facing string is an i18n key** (EN / NL / DE) — never hardcode
  UI text. Locales live in `src/i18n/locales/`. If you only speak one of the
  three languages, add your language and mark the others — we'll fill them in.
- **Multi-tenant first**: every table has `tenant_id` and RLS. Always consider
  tenant isolation when touching queries or edge functions.
- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `deps:`, `ci:`.
- **Module limits**: components ≤ 400 lines, hooks ≤ 200, lib ≤ 300 (see
  `docs/CONVENTIONS.md`). Extract before you exceed.
- **Design system**: solid surfaces, hairline borders, design tokens — no
  gradients, no glass effects. See `docs/DESIGN_SYSTEM.md`.
- This is a private repository: keep issues and PRs free of customer names,
  credentials, and commercial details.

## Translations

Dutch and German translations are some of the most valuable contributions for
our community of EU job shops. App strings live in
`src/i18n/locales/{en,nl,de}/`; docs pages live in
`website/src/content/docs/{nl,de}/`. Untranslated docs pages automatically
fall back to English, so partial contributions are fine.

## Reporting bugs

Use the issue templates. For anything security-related, see
[SECURITY.md](./SECURITY.md) — please don't open public issues for
vulnerabilities.

## Releases

See [Releasing](./RELEASING.md) for versioning, validation, and current deployment limits.

Use focused feature branches and pull requests. Merge after reviewing the diff
and relevant checks. Releases are explicit decisions, independent of feature
merges; dispatch the Release workflow from `main` after updating the version and
changelog. Do not create the tag first: the workflow creates it after validation.

## License

By contributing, you agree that your contributions are licensed under the
[Business Source License 1.1](./LICENSE), and that Sheet Metal Connect e.U.
may also license your contributions under the commercial (Premium) terms.
