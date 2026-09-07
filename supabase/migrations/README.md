# Database Migrations

## Structure

| Migration | Purpose |
|-----------|---------|
| `20260121175020_remote_schema.sql` | Consolidated schema baseline (all tables, functions, triggers, RLS, indexes) |
| `20260127230000_post_schema_setup.sql` | Storage buckets, RLS policies, auth triggers, default tenant |
| `20260329000000_fix_batch_operations_rls.sql` | Fix RLS for service role SELECT on batch_operations |
| `20260331000000_fix_root_admin_tenant_switching.sql` | Add active_tenant_id for root admin tenant switching |

## Adding New Migrations

New migrations should be small, incremental, and named with timestamps:

```bash
supabase migration new <description>
```

Then edit the generated file in `supabase/migrations/`.

## Compatibility exception: 20260525130000

`20260525130000_hosted_trial_limits.sql` contains one historical replay repair.
The earlier `20260127230000_post_schema_setup.sql` removes the optional
`notify-new-signup` trigger. The original trial migration then unconditionally
disables that trigger, so a fresh replay fails with PostgreSQL `42704` before
any newer migration can execute.

The repair guards only the trigger disable/enable statements with an existence
check. When the trigger exists, the original disable/backfill/enable sequence,
column defaults, and tenant backfill remain unchanged. When it is absent, the
migration skips those two trigger operations without creating a placeholder.

Databases that already recorded this version as applied need no corrective
migration and must not rerun its backfill: doing so would restart existing free
tenants' 30-day trial windows. Do not modify migration history to force a replay
or insert a backdated migration. Future schema and data changes still require
new timestamped migrations; this exception covers only this optional-trigger
replay failure.

Validation used a clean local PostgreSQL replay and a rollback-only comparison
of the original migration from commit `2c2ced5` with the guarded file. The
original reproduced `42704` without the trigger; the guarded version completed.
With a test trigger present, both versions produced identical defaults, limits,
and trial dates, suppressed webhook calls during the backfill, and reenabled the
trigger for the next update. The transaction rolled back all fixtures and changes.

## Archive

The `archive/` directory contains 84 pre-consolidation migrations (Nov-Dec 2025) preserved for historical reference. These are NOT executed by `supabase db push` — only files in the root `migrations/` directory are applied.

## Deployment

Follow [RELEASING.md](../../RELEASING.md) for a verified target, backups, migration
checks, and the matching backend/frontend rollout. Replay schema changes on a
disposable local database before applying them remotely. Do not repair migration
history or reset a production database as a routine deployment step.

## Signup Notifications

Signup notifications (new tenant created) are handled by the `notify-new-signup` edge function, configured as a Database Webhook in the Supabase dashboard (not via SQL trigger). This replaced an earlier hardcoded trigger that was removed for security reasons.
