#!/usr/bin/env bash
# Hosted rollout in the required order: migrations, Edge Functions, frontend.
# Always runs from the repository root, whatever directory it is invoked from.
set -euo pipefail
cd "$(dirname "$0")/.."
ref=$(cat supabase/.temp/project-ref 2>/dev/null || true)
[ -n "$ref" ] || { echo 'Link the hosted Supabase project first: npx supabase link --project-ref <ref>' >&2; exit 1; }
[ -f .vercel/project.json ] || npx vercel link --yes
printf 'Target: Supabase project %s, Vercel project %s\n' "$ref" "$(sed -n 's/.*"projectName":"\([^"]*\)".*/\1/p' .vercel/project.json)"
npx supabase db push
npx supabase functions deploy
npx vercel --prod --yes
