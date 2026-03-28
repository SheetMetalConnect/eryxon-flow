---
name: interrogate
description: Answer a question about the codebase without making any changes.
allowed-tools: Read, Glob, Grep, mcp__opentrace_oss__search_graph, mcp__opentrace_oss__get_node, mcp__opentrace_oss__traverse_graph, mcp__opentrace_oss__list_nodes, mcp__opentrace_oss__get_stats
---

Answer the user's question. **Do NOT make any changes** — read-only.

Question: $ARGUMENTS

1. Use OpenTrace graph tools + file reading to build a complete answer
2. Reference specific files and line numbers
3. Show relationships between components if applicable
4. Stay read-only — no edits, no new files, no git operations
