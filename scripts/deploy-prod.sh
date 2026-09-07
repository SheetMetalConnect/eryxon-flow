#!/usr/bin/env bash
set -euo pipefail
repository=SheetMetalConnect/eryxon-flow
project_ref=${1:?Usage: scripts/deploy-prod.sh EXPECTED_PROJECT_REF [--migrations]}
migrations=false
if [ "${2:-}" = --migrations ]; then migrations=true; elif [ "$#" -ne 1 ]; then exit 1; fi
printf 'Target: %s / main; Supabase: %s; migrations: %s\n' "$repository" "$project_ref" "$migrations"
read -r -p 'Type go to publish and deploy this release: ' answer
[ "$answer" = go ] || exit 1
gh workflow run release.yml --repo "$repository" --ref main \
  -f deploy_production=true -f deploy_functions=true \
  -f run_migrations="$migrations" -f project_ref="$project_ref"
