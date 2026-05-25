# See .agents/README.md for full project instructions.

All agent instructions are in `.agents/` — shared equally across all AI coding tools.
Sub-agents: `.agents/supabase-db.md`, `.agents/tech-stack.md`, `.agents/repo-ops.md`

## Claude-specific

- Superpowers plugin enabled via `.claude/settings.json`
- OpenTrace knowledge graph available via `.claude/mcp.json` — use `/explore`, `/graph-status`, `/interrogate`
- OpenTrace agents: `@opentrace`, `@code-explorer`, `@dependency-analyzer`, `@find-usages`, `@explain-service`

## Change reasoning rule

Before making any code change, use the knowledge graph to trace the chain of effects:
1. **1st order** — what does this directly touch?
2. **2nd order** — what depends on those things?
3. **3rd order** — could this cascade further (API contracts, imports, downstream consumers)?

Never change a shared module, type, or function signature without first running `@dependency-analyzer` or `traverse_graph` incoming on the target. Surface the blast radius proactively.

## Workspace isolation

- Preferred local worktree directory: `.worktrees/` at the repo root. It is gitignored and safe for agent-created worktrees.
- Agents may create local worktrees and local branches without asking for approval, as long as they stay off `main`, keep repo-visible content technical-only, and do not expose internal or sensitive information.
- Prefer local work over pushing by default. Push or open PRs only when the task needs remote review, collaboration, or an explicit approval path.

## Linear & GitHub are dev-only

GitHub issues in this repo (and any synced Linear issues, project descriptions, PR descriptions, commit messages) contain **only technical content needed for dev work**. Never put customer names, pricing, contracts, hiring decisions, or business/HR info anywhere visible on GitHub or in synced Linear surfaces. Internal/commercial concerns and the operational tools they live in stay outside this repo.

If unsure: would this be appropriate if the repo flipped public or the customer themselves opened this view? If no, it does not belong here.
