#!/usr/bin/env bash
# SessionStart hook: inject OpenTrace graph awareness into the session.

set -euo pipefail

DB_PATH=""
CURRENT="$(pwd)"
for _ in $(seq 1 10); do
  if [ -f "$CURRENT/.opentrace/index.db" ]; then
    DB_PATH="$(cd "$CURRENT/.opentrace" && pwd)/index.db"
    break
  fi
  PARENT="$(dirname "$CURRENT")"
  [ "$PARENT" = "$CURRENT" ] && break
  [ -e "$CURRENT/.git" ] && break
  CURRENT="$PARENT"
done

if [ -z "$DB_PATH" ]; then
  exit 0
fi

GRAPH_STATS=""
if command -v opentraceai &>/dev/null; then
  GRAPH_STATS=$(timeout 10 opentraceai stats 2>/dev/null || true)
elif command -v uvx &>/dev/null; then
  GRAPH_STATS=$(timeout 10 uvx opentraceai stats 2>/dev/null || true)
fi

json_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

if [ -n "$GRAPH_STATS" ]; then
  SAFE_STATS=$(json_escape "${GRAPH_STATS}")
  CONTEXT="OpenTrace knowledge graph is available (${SAFE_STATS}). Use @opentrace for ANY codebase question. Specialist agents: @code-explorer, @dependency-analyzer, @find-usages, @explain-service. Commands: /explore <name>, /graph-status. Prefer the graph over ls/find/Glob for structural questions."
else
  SAFE_DB_PATH=$(json_escape "${DB_PATH}")
  CONTEXT="OpenTrace knowledge graph is available (index: ${SAFE_DB_PATH}). Use @opentrace for ANY codebase question. Commands: /explore <name>, /graph-status. Call get_stats to see what is indexed."
fi

cat <<EOF
{
  "additionalContext": "${CONTEXT}"
}
EOF
