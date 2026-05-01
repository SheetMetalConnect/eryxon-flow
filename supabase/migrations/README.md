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

## Archive

The `archive/` directory contains 84 pre-consolidation migrations (Nov-Dec 2025) preserved for historical reference. These are NOT executed by `supabase db push` — only files in the root `migrations/` directory are applied.

## Deployment

```bash
# Push all migrations to remote
supabase db push --include-all

# Or use the automated setup script
./scripts/automate_self_hosting.sh
```

## Signup Notifications

Signup notifications (new tenant created) are handled by the `notify-new-signup` edge function, configured as a Database Webhook in the Supabase dashboard (not via SQL trigger). This replaced an earlier hardcoded trigger that was removed for security reasons.
