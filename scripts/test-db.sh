#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project=$(sed -n 's/^project_id *= *"\([^"]*\)".*/\1/p' supabase/config.toml)
project=${project:-$(basename "$PWD")}
container="supabase_db_$project"
printf 'Testing local database container: %s\n' "$container"
test_log=$(mktemp)
trap 'rm -f "$test_log"' EXIT
for test_file in supabase/tests/*.sql; do
  printf 'Running %s\n' "$test_file"
  if ! docker exec -i "$container" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$test_file" > "$test_log" 2>&1; then
    cat "$test_log"
    exit 1
  fi
  printf 'PASS %s\n' "$test_file"
done

LOCAL_SUPABASE_DB_CONTAINER="$container" node scripts/test-production-concurrency.mjs
