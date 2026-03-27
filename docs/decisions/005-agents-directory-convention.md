# ADR-005: `.agents/` Directory for Universal AI Instructions

**Status:** Accepted
**Date:** 2025-03-27
**Context:** Developer Experience, AI Tooling

## Decision

All AI agent instructions live in `.agents/` as the single source of truth. Tool-specific configs (`.claude/`, `.codex/`, `.gemini/`, `.cursorrules`) use symlinks or references pointing back to `.agents/`. `AGENTS.md` at repo root symlinks to `.agents/README.md`.

## Context

The codebase is maintained by AI agents across multiple tools (Claude Code, Codex, Gemini, Cursor, Copilot, Windsurf, Cline, Aider). Each tool has its own config convention. Maintaining separate instruction files per tool caused drift and duplication.

## Consequences

**Positive:**
- Single source of truth — edit `.agents/README.md`, all tools see the update
- Supports multiple instruction files (sub-agents: `supabase-db.md`, `tech-stack.md`, `repo-ops.md`)
- `AGENTS.md` at root follows the emerging universal standard for agent discovery
- Tool-specific config directories still exist for tool-specific settings (not instructions)

**Negative:**
- Symlinks can confuse some tools or break in certain git operations
- New AI tools may not discover `.agents/` without the `AGENTS.md` pointer

## Alternatives Considered

1. **Single `AGENTS.md` at root** — rejected, can't support sub-agent files without the directory
2. **Per-tool config files** — rejected, caused drift and duplication
3. **CLAUDE.md as canonical** — rejected, tool-specific naming limits adoption
