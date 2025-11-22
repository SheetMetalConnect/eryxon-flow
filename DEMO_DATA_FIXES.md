# Demo Data Import Fixes

## Overview
Fixed critical bugs preventing demo data from being properly cleared and re-imported for tenants.

## Bugs Fixed

### 1. Email Mismatch in clearMockData (CRITICAL)
**Problem**: The `clearMockData()` function in `/src/lib/mockDataGenerator.ts` was trying to delete demo operators with incorrect email addresses.

- **Expected**: `demo.operator1@example.com`, `demo.operator2@example.com`, etc.
- **Was using**: `jan.devries@sheetmetalconnect.nl`, `emma.bakker@sheetmetalconnect.nl`, etc.

**Impact**: Demo operators were never deleted, causing foreign key conflicts when re-importing demo data.

**Fix**: Updated email addresses in `clearMockData()` to match those created by the `seed_demo_operators()` SQL function.

### 2. Missing Table Deletions
**Problem**: Several tables were not being cleared during demo data cleanup.

**Missing tables**:
- `notifications` - User notifications
- `assignments` - Task/operation assignments
- `substeps` - Operation substeps
- `time_entry_pauses` - Pause records for time entries
- `materials` - Material records

**Fix**: Added deletion for all missing tables in the correct dependency order.

### 3. Incorrect Deletion Order
**Problem**: Tables were not always deleted in the correct order to respect foreign key constraints.

**Fix**: Reorganized deletion order to ensure child records are deleted before parent records:
1. Notifications
2. Issues
3. Operation quantities
4. Time entry pauses (via time_entries)
5. Time entries
6. Assignments
7. Substeps
8. Operation resources (via operations)
9. Operations
10. Parts
11. Jobs
12. Cells
13. Resources
14. Materials
15. Scrap reasons
16. Demo operators

## New Features

### Database Function for Reliable Cleanup
Created a new SQL function `clear_demo_data(p_tenant_id UUID)` that:
- Runs entirely in the database for better reliability
- **Security**: Only callable by tenant admins for their own tenant
- Handles all foreign key constraints properly
- Returns detailed deletion summary
- Resets tenant counters and demo mode flags

**Location**: `/supabase/migrations/20251122210000_add_clear_demo_data_function.sql`

### Enhanced clearMockData Function
Updated the TypeScript `clearMockData()` function to:
- Use the database function by default (more reliable)
- Fall back to client-side deletion if database function fails
- Accept optional `useDatabaseFunction` parameter

**Signature**:
```typescript
export async function clearMockData(
  tenantId: string,
  useDatabaseFunction: boolean = true
): Promise<{ success: boolean; error?: string }>
```

## Security

The `clear_demo_data()` database function includes strict authorization checks:
- **Tenant Isolation**: Users can only clear data for their own tenant
- **Role Requirement**: Only users with `admin` role can clear demo data
- **Permission Denied**: Throws an error if unauthorized user attempts to call the function

This prevents any authenticated user from clearing another tenant's data.

## How to Use

### For Users
The demo data import/clear functionality in the UI will now work correctly:

1. **Import Demo Data**: Click "Import Sample Data" in onboarding or settings
2. **Clear Demo Data**: Click "Clear Demo Data" in admin settings
3. **Re-import**: Use "Reset & Reimport" button in onboarding

### For Developers

#### Clear demo data via JavaScript:
```typescript
import { clearMockData } from '@/lib/mockDataGenerator';

// Using database function (recommended)
const result = await clearMockData(tenantId);

// Using client-side deletion (fallback)
const result = await clearMockData(tenantId, false);
```

#### Clear demo data via SQL:
```sql
-- Call the database function directly
SELECT * FROM clear_demo_data('your-tenant-uuid-here');

-- Returns detailed summary of deleted records
```

#### Using the existing SQL script:
```bash
# For test tenant 11111111-1111-1111-1111-111111111111
# Run in Supabase SQL Editor:
cat scripts/clear-test-tenant-data.sql
```

## Testing

### Verify the Fix
1. Log in as admin for your tenant
2. Navigate to Settings
3. Click "Clear Demo Data" (should complete without errors)
4. Click "Import Sample Data" (should create fresh demo data)
5. Verify data appears correctly in dashboard

### Check Database
```sql
-- Verify demo mode is enabled after import
SELECT demo_mode_enabled, demo_data_seeded_at
FROM tenants
WHERE id = 'your-tenant-id';

-- Verify demo operators exist
SELECT id, full_name, email
FROM profiles
WHERE tenant_id = 'your-tenant-id'
  AND role = 'operator';

-- After clearing, verify everything is gone
SELECT
  (SELECT COUNT(*) FROM jobs WHERE tenant_id = 'your-tenant-id') as jobs,
  (SELECT COUNT(*) FROM parts WHERE tenant_id = 'your-tenant-id') as parts,
  (SELECT COUNT(*) FROM operations WHERE tenant_id = 'your-tenant-id') as operations,
  (SELECT COUNT(*) FROM cells WHERE tenant_id = 'your-tenant-id') as cells;
```

## Migration Required

After pulling these changes, you must apply the new migration:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration directly in Supabase Dashboard > SQL Editor
# Run the contents of:
# supabase/migrations/20251122210000_add_clear_demo_data_function.sql
```

## Files Changed

### Modified
- `/src/lib/mockDataGenerator.ts` - Fixed clearMockData function
  - Fixed demo operator email addresses
  - Added missing table deletions
  - Added database function support
  - Improved deletion order

### Created
- `/supabase/migrations/20251122210000_add_clear_demo_data_function.sql` - New database function
- `/DEMO_DATA_FIXES.md` - This documentation

## Breaking Changes
None - all changes are backwards compatible. Existing code will automatically use the improved deletion logic.

## Known Limitations
- Demo operators are "shadow" profiles without `auth.users` entries
- They cannot be used for actual login
- Demo data is for exploration/testing only

## Support
If you encounter issues:
1. Check browser console for error messages
2. Check Supabase logs for database errors
3. Verify migration was applied successfully
4. Try using SQL function directly: `SELECT * FROM clear_demo_data('tenant-id')`

## Related Files
- `/docs/HOW-THE-APP-WORKS.md` - App architecture
- `/src/components/onboarding/MockDataImport.tsx` - Onboarding UI
- `/src/pages/admin/Settings.tsx` - Settings page with clear button
- `/supabase/migrations/20251122000000_add_seed_functions.sql` - Seed functions
- `/supabase/migrations/20251122191344_add_demo_mode_tracking.sql` - Demo mode tracking
