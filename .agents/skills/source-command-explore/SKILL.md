---
name: "source-command-explore"
description: "Explore a named component in the OpenTrace knowledge graph."
---

# source-command-explore

Use this skill when the user asks to explore a component in the OpenTrace knowledge graph. Treat the current user request as the component or topic to explore.

## Workflow

1. `search_graph` with the requested component or topic to find matching nodes
2. `get_node` on the best match for full details + neighbors
3. Present: type, name, key properties, relationships, connected nodes

If it has a `path` property, offer to read the source.
If it's a service/class, show upstream callers and downstream deps via `traverse_graph`.
