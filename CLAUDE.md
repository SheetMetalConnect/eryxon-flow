# CLAUDE.md — Instructions for Claude Code

This file provides context and instructions for Claude Code (Anthropic's CLI agent) when working on this repository.

## Project Overview

Eryxon Flow is a Manufacturing Execution System (MES) for job shops and make-to-order manufacturers. It is a Next.js-style frontend (React + Vite + TypeScript) with a Supabase backend, deployed on Vercel.

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
public/           # Static assets
docs/             # Documentation
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

## Agent Workflows

Claude Code has access to the **Superpowers** plugin which provides structured workflows:

- `/brainstorm` — Before any creative or feature work
- `/write-plan` — Before multi-step implementations
- `/execute-plan` — Run implementation plans with review checkpoints
- `/tdd` — Test-driven development workflow
- `/commit` — Structured git commits
- `/review-pr` — Code review before merging

Use these skills via the `/skill` command to maintain quality and consistency.

## Specialized Agents

This project includes specialized agents in `.agents/` (symlinked into `.claude/agents/`) for focused tasks:

- **`supabase-db`** — Database work: migrations, RLS policies, Edge Functions, schema changes
- **`tech-stack`** — Tech stack questions, dependency management, build config, architecture decisions
- **`repo-ops`** — Repository operations: issues, PRs, branches, releases, project organization

These agents are automatically available via the Agent tool when their description matches the task at hand.

## Important Notes

- Never commit `.env` files or secrets
- Run `npm run build` to verify changes compile before committing
- Supabase migrations must be tested locally before pushing
- The app supports multi-tenant SaaS with row-level security — always consider tenant isolation
