# Database Migrations

## Applying Migrations

This project stores migrations in the `archive/` subdirectory for organizational purposes.

### Latest Migration: Seed Functions (2025-11-22)

**File:** `20251122000000_add_seed_functions.sql`

This migration adds essential seed functions for demo data:
- `seed_default_scrap_reasons()` - Seeds standard scrap/rejection codes
- `seed_demo_operators()` - Creates 4 demo operator profiles
- `seed_demo_resources()` - Creates 9 sample resources (molds, tooling, fixtures, materials)
- `get_part_routing()` - Returns routing sequence for parts (used by QRM metrics)

### How to Apply

#### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `20251122000000_add_seed_functions.sql`
4. Paste and run the SQL

#### Option 2: Supabase CLI
```bash
# If you have the Supabase CLI installed
supabase db push

# Or apply specific migration
cat supabase/migrations/20251122000000_add_seed_functions.sql | supabase db execute
```

### Using the Seed Functions

After applying the migration, you can seed your tenant with demo data:

```sql
-- Seed scrap reasons
SELECT * FROM seed_default_scrap_reasons('your-tenant-id');

-- Seed demo operators
SELECT * FROM seed_demo_operators('your-tenant-id');

-- Seed demo resources
SELECT * FROM seed_demo_resources('your-tenant-id');
```

**Note:** These functions are also called automatically when you import sample data through the onboarding wizard in the UI.

### Migration History

All applied migrations are stored in `archive/` for reference. The migrations are numbered chronologically:
- Format: `YYYYMMDDHHMMSS_description.sql`
- Example: `20251122000000_add_seed_functions.sql`
