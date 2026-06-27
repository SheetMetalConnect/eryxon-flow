# See .agents/README.md for full project instructions.

All agent instructions are in `.agents/` — shared equally across all AI coding tools.
Sub-agents: `.agents/supabase-db.md`, `.agents/tech-stack.md`, `.agents/repo-ops.md`

## Code quality — required for every change

High code quality is non-negotiable. Use these skills as part of normal work, not as an afterthought:

- **`/ponytail:ponytail`** (default working mode) — laziest solution that *works*: stdlib/native before dependencies, one line before fifty, delete before add, no speculative abstractions. Shortest correct diff wins.
- **`/deslop`** — run on the diff **before every commit**. Strip AI slop: needless comments, defensive try/catch on trusted paths, `any` casts that paper over types, deep nesting that should be early returns, anything inconsistent with the surrounding file.
- **`/code-review`** — run on the diff **before merging**; fix the findings (use `/code-review ultra` for branch-wide cloud review).
- **`/simplify`** — quality-only pass for reuse/simplification/efficiency when not hunting bugs.
- **Superpowers**: `systematic-debugging` (root cause before any fix), `test-driven-development` (test-first for features/bugfixes), `verification-before-completion` (run the command and show real output before claiming done), `requesting-code-review` before merge.

Standing bar (enforced, not optional):
- **No hardcoded config in this open-source code** — no vendor domains, URLs, secrets, or environment-specific values in source. Config comes from env vars (e.g. `ALLOWED_ORIGIN`); keep hosted and self-hosted modes cleanly separated.
- **i18n for all UI text** (EN/NL/DE) — never hardcode user-facing strings.
- **`npm run build` and `npm run test:run` green before commit.** Verify, don't assume.

## Documentation belongs on the website — not in `docs/`

There is **no product documentation in the repo `docs/` folder.** Everything that
explains how the app *works or operates* — for operators, admins, self-hosters, or
evaluators — lives in `website/` (Astro/Starlight: `docs/` guides + features, blog,
release-notes). The `docs/` folder at the repo root is **only** for contributor/coding
internals that have no place on a public site: ADRs, code conventions, the DB schema
diagram, route/hook maps, the design-system tooling.

Rules:
- **Never** write a feature explanation, user/admin/operator flow, setup/operations guide,
  troubleshooting, glossary, or "how X works" page into repo `docs/`. It goes on the website.
- If you **find** such a page in `docs/`, that is a bug: move and rewrite it into the
  website, update links, and delete the source. Do not leave it.
- A repo `docs/` file is allowed only if it would be out of place on a public docs site
  (an ADR, a coding convention, build internals). When in doubt, it belongs on the website.

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
