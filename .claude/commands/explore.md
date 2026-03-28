Explore a component in the OpenTrace knowledge graph.

The user wants to explore: $ARGUMENTS

1. `search_graph` with "$ARGUMENTS" to find matching nodes
2. `get_node` on the best match for full details + neighbors
3. Present: type, name, key properties, relationships, connected nodes

If it has a `path` property, offer to read the source.
If it's a service/class, show upstream callers and downstream deps via `traverse_graph`.
