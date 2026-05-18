---
name: "explore-code"
description: "Explore code structure and relationships using the OpenTrace knowledge graph."
---

Use the OpenTrace knowledge graph to answer the user's codebase question. Treat the current user request as the query.

## Instructions

1. **Orient** — `get_stats` to see indexed node types and counts
2. **Search** — `search_graph` with `nodeTypes` filter:
   - Code → "Class,Function"
   - Files → "File,Directory"
   - Dependencies → "Package"
3. **Inspect** — `get_node` for full details + neighbors
4. **Trace** — `traverse_graph`:
   - "What calls X?" → incoming
   - "What does X depend on?" → outgoing
   - "What's in X?" → outgoing (CONTAINS)
5. **List** — `list_nodes` for "all X" queries
6. **Read source** — `Read` when nodes have a `path` property

Lead with a clear answer. Show relationships as `A --CALLS--> B`. Fall back to Glob/Grep if graph doesn't cover it.
