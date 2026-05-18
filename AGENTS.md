# See .agents/README.md for full project instructions.

All agent instructions are in `.agents/` — shared equally across all AI coding tools.
Sub-agents: `.agents/supabase-db.md`, `.agents/tech-stack.md`, `.agents/repo-ops.md`

## Codex Setup

- Superpowers plugin enabled as `superpowers@claude-plugins-official` in `.codex/config.toml`
- OpenTrace knowledge graph available via the `opentrace-oss` MCP server in `.codex/config.toml`
- OpenTrace skills: `$explore-code`, `$source-command-explore`, `$source-command-graph-status`, `$source-command-interrogate`
- OpenTrace subagents: `opentrace`, `code-explorer`, `dependency-analyzer`, `find-usages`, `explain-service`

## Change reasoning rule

Before making any code change, use the knowledge graph to trace the chain of effects:
1. **1st order** — what does this directly touch?
2. **2nd order** — what depends on those things?
3. **3rd order** — could this cascade further (API contracts, imports, downstream consumers)?

Never change a shared module, type, or function signature without first running `@dependency-analyzer` or `traverse_graph` incoming on the target. Surface the blast radius proactively.
