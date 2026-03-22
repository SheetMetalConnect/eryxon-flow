# CODEX.md — Instructions for OpenAI Codex

This file provides context and instructions for OpenAI Codex agents when working on this repository.

## Project Overview

Eryxon Flow is a Manufacturing Execution System (MES) for job shops and make-to-order manufacturers. It is a React + TypeScript frontend with a Supabase backend.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + Row-Level Security)
- **3D Viewer:** STEP file parser (browser-based CAD viewing)
- **Deployment:** Vercel (frontend), Supabase (backend)
- **Package Manager:** npm

## Key Directories

```
src/              # Frontend source (React components, hooks, pages)
src/components/   # UI components (shadcn/ui based)
src/pages/        # Route pages
src/hooks/        # Custom React hooks
src/lib/          # Utilities, Supabase client, helpers
supabase/         # Supabase migrations, edge functions, config
services/         # Backend services
mcp-server/       # MCP server integration
scripts/          # Build and utility scripts
```

## Common Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

## Conventions

- Use TypeScript strict mode
- Follow existing shadcn/ui component patterns
- Use Tailwind CSS for styling (no custom CSS unless necessary)
- Supabase RLS policies must be maintained for all tables
- Multi-language support: English, Dutch, German (use i18n keys)
- Toast notifications via sonner (standardized pattern)
- All API calls go through the Supabase client in `src/lib/`

## Agent Best Practices

When working as a Codex agent on this repo:

1. **Read before writing** — Always read existing files before modifying them
2. **Follow existing patterns** — Match the code style already in use
3. **Build check** — Run `npm run build` to verify changes compile
4. **Test RLS** — Any database changes must respect row-level security policies
5. **i18n** — UI text must use translation keys, not hardcoded strings
6. **Small changes** — Prefer focused, minimal diffs

## Codex-Specific Setup

Codex can use the **Superpowers** skill system. See `.codex/INSTALL.md` for setup instructions:

```bash
# Install superpowers globally
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers

# Link skills for discovery
mkdir -p ~/.agents/skills
ln -s ~/.codex/superpowers/skills ~/.agents/skills/superpowers
```

## Architecture Notes

- The app uses Supabase Auth with Turnstile captcha protection
- WebSocket connections provide real-time updates to dashboards
- The 3D STEP viewer runs client-side (no server-side rendering for CAD)
- Multi-tenant isolation is enforced at the database level via RLS

## Important Notes

- Never commit `.env` files or secrets
- Supabase migrations must be tested locally before pushing
- The app supports multi-tenant SaaS — always consider tenant isolation
