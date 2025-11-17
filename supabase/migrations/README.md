# Database Migrations

This folder contains Supabase database migrations for the Eryxon Flow MES system.

## Migration History

### Active Migrations

1. **20251117200000_add_fulltext_search_indexes.sql** - Adds full-text search capabilities to jobs, parts, operations, profiles, and issues tables using PostgreSQL GIN indexes
2. **20251117200001_create_notifications_system.sql** - Creates the notifications system with interactive states (read, pinned, dismissed)
3. **20251117200100_create_notification_triggers.sql** - Sets up database triggers for automatic notification creation

### Archived Migrations (archive/)

**IMPORTANT:** The `archive/` folder contains essential base schema migrations that must be preserved for fresh database setup. These migrations include:

- **20251109191500** - Initial schema setup (profiles, cells/stages, jobs, parts, operations/tasks, time_entries, issues, assignments)
- **20251112203610** - Rename stages→cells, tasks→operations, add substeps table
- **20251117120000** - Add tenants and subscriptions system
- **20251117153200** - Add materials table
- **20251117153634** - Add resources system
- **20251117170000** - Add onboarding tracking
- **20251117180000** - Add usage tracking and plan limits
- **20251117190000** - Create parts images bucket

These migrations have been applied to production but are kept in the archive for:
1. Fresh database initialization (`supabase db reset`)
2. New developer environment setup
3. CI/CD pipeline database creation
4. Reference and documentation

**Do not delete the archive folder** - it contains the complete schema definition required to bootstrap the application from scratch.

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
