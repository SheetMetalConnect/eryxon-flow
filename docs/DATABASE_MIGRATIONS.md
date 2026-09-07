# Database migrations

Active migrations live directly in [supabase/migrations](../supabase/migrations/).
The CLI applies those files in timestamp order. The `archive/` subdirectory holds
historical migrations from before schema consolidation; do not apply them to a
current installation.

## Contributing a schema change

Create a new timestamped migration with the lockfile-installed Supabase CLI. Use
`YYYYMMDDHHMMSS_description.sql` and keep each change focused. Preserve already
released migrations so existing installations and fresh replays share the same
history.

Before deployment, replay the full migration sequence on a disposable local
Supabase stack and run the database checks in
[RELEASING.md](../RELEASING.md#required-checks). Those checks cover tenant isolation,
PIN sessions, lifecycle transactions, and concurrency. Regenerate
[src/integrations/supabase/types.ts](../src/integrations/supabase/types.ts) from the
tested schema when its public contract changes.

Production target verification, backups, rollout order, and recovery are documented
in [the release runbook](../RELEASING.md#optional-production-rollout). Do not bypass
migration history by pasting an archived script into a production SQL editor.

## Historical context

The [January 2026 baseline](../supabase/migrations/20260121175020_remote_schema.sql)
and [post-schema setup](../supabase/migrations/20260127230000_post_schema_setup.sql)
consolidated the earlier schema and initialization work.

The archived [November 2025 seed-functions migration](../supabase/migrations/archive/20251122000000_add_seed_functions.sql)
records the introduction of scrap-reason, demo-operator, and demo-resource seeding,
and part-routing queries. It is historical context, not an additional installation
step; current definitions and permissions come from the active migration sequence.
