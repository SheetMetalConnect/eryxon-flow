# Database Migrations

## Applying Migrations

This project stores migrations in the `archive/` subdirectory for organizational purposes.

### Latest Migration: MCP Server Configuration (2025-11-22)

**File:** `20251122195800_mcp_server_configuration.sql`

This migration adds MCP (Model Context Protocol) server infrastructure:

**Tables:**
- `mcp_server_config` - Server configuration per tenant (name, version, features, enabled status)
- `mcp_server_health` - Health monitoring (status, response time, tools count, error tracking)
- `mcp_server_logs` - Activity logs (tool calls, duration, success/failure)

**Functions:**
- `get_mcp_server_config()` - Retrieves config with latest health status
- `update_mcp_server_health()` - Updates health metrics and consecutive failure tracking
- `log_mcp_server_activity()` - Logs MCP server operations for debugging

**Security:**
- RLS policies for multi-tenant isolation
- Admin-only configuration updates
- Service role access for health monitoring

**UI Integration:**
- Settings page at `/admin/config/mcp-server`
- Real-time connection status indicator in admin sidebar
- Health monitoring with automatic refresh

---

### Previous Migration: Seed Functions (2025-11-22)

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
