# AI Agent Setup — Eryxon Flow

> How to set up AI coding agents for maximum effectiveness on this codebase.

## Quick Start

1. Read `.agents/README.md` — universal instructions for all AI tools
2. Read `docs/ARCHITECTURE.md` — system overview with Mermaid graphs
3. Run `npm install && npm run dev` — dev server at localhost:8080

## MCP Servers (Optional, Recommended)

Three MCP servers provide runtime-queryable code intelligence:

### 1. CodeGraphContext (Graph Database)

Indexes the codebase into a KuzuDB graph database. Agents can query call chains, dependencies, and symbol locations at runtime.

```bash
# Install
pip install codegraphcontext
pip install kuzu

# Index the repo (first time, ~5-10 minutes)
cgc config set DEFAULT_DATABASE kuzudb
cgc config set IGNORE_DIRS "node_modules,dist,.venv,website,public,.git"
cgc index .

# Add to Claude Code
claude mcp add code-graph -- cgc mcp start
```

**What it gives agents:** `find_code`, `analyze_code_relationships` (callers/callees), `execute_cypher_query` tools.

### 2. RepoMapper (Structural Map)

Uses tree-sitter + PageRank to generate a ranked map of the most important symbols in the codebase.

```bash
# Install
git clone https://github.com/pdavis68/RepoMapper.git ~/.local/share/RepoMapper
cd ~/.local/share/RepoMapper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Add to Claude Code
claude mcp add repomap -- ~/.local/share/RepoMapper/.venv/bin/python3 ~/.local/share/RepoMapper/repomap_server.py
```

**What it gives agents:** Structural overview of the codebase's key functions, classes, and their relationships.

### 3. Repomix (Full Repo Context)

Packs the entire repo into a single AI-friendly file with optional AST-aware compression.

```bash
# Add to Claude Code (no install needed, uses npx)
claude mcp add repomix -- npx -y repomix --mcp
```

**What it gives agents:** `pack_codebase` (full or filtered context), `grep_repomix_output` (search packed output).

## Documentation Index

Agents should consult these docs for context:

| Document | When to Read |
|----------|-------------|
| `docs/ARCHITECTURE.md` | Understanding system structure |
| `docs/API_CATALOG.md` | Working on Edge Functions / API |
| `docs/ROUTE_MAP.md` | Adding or modifying frontend routes |
| `docs/HOOK_MAP.md` | Understanding data flow and real-time subscriptions |
| `docs/CONVENTIONS.md` | Creating new files (naming, patterns, templates) |
| `docs/GLOSSARY.md` | Understanding manufacturing domain terms |
| `docs/TROUBLESHOOTING.md` | Debugging common issues |
| `docs/decisions/` | Understanding why architectural choices were made |
| `docs/DATABASE_DIAGRAM.dbml` | Working with database schema |
| `docs/dependency-graph.json` | Understanding frontend import relationships |

## Tooling

```bash
make dev              # Start dev server
make build            # Production build
make test             # Run tests
make deps-graph       # Regenerate dependency graph
make deps-circular    # Check for circular dependencies
make new-endpoint NAME=api-widgets    # Scaffold new Edge Function
make new-adr NUM=006 TITLE=my-title   # Create new ADR from template
make check            # Full health check (build + test + lint + circular deps)
```
