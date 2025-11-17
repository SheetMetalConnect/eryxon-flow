# Database Migrations

This folder contains Supabase database migrations for the Eryxon Flow MES system.

## Migration History

### Current Migrations

1. **20251117200000_add_fulltext_search_indexes.sql** - Adds full-text search capabilities to jobs, parts, operations, profiles, and issues tables using PostgreSQL GIN indexes
2. **20251117200001_create_notifications_system.sql** - Creates the notifications system with interactive states (read, pinned, dismissed)
3. **20251117200100_create_notification_triggers.sql** - Sets up database triggers for automatic notification creation

### Archived Migrations (Removed)

The archived migrations folder has been removed as those migrations have already been applied to the production database. The archive contained incremental schema changes including:
- Initial schema setup (profiles, cells, jobs, parts, operations)
- Renaming stages to cells
- Renaming tasks to operations
- Adding substeps table
- Adding tenants and subscriptions
- Adding materials and resources tables
- Adding onboarding tracking
- Adding usage tracking and plan limits
- Adding parts images bucket

For fresh database deployments, refer to the Supabase dashboard schema or export the current schema from an existing database.

## Running Migrations

Migrations are automatically applied by Supabase when pushing to linked projects:

```bash
supabase db push
```

Or locally:

```bash
supabase migration up
```

## Creating New Migrations

```bash
supabase migration new <migration_name>
```
