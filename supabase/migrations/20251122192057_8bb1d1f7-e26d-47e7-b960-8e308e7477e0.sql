-- ================================================================
-- Clear ALL demo data for test tenant 11111111-1111-1111-1111-111111111111
-- Run this in Supabase SQL Editor to completely wipe and reset
-- ================================================================

-- Set the tenant ID
DO $$
DECLARE
  test_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
  operation_ids UUID[];
BEGIN
  RAISE NOTICE 'Starting cleanup for tenant: %', test_tenant_id;

  -- 1. Delete issues
  DELETE FROM issues WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted issues';

  -- 2. Delete operation_quantities
  DELETE FROM operation_quantities WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted operation quantities';

  -- 3. Delete time_entry_pauses (via time_entries)
  DELETE FROM time_entry_pauses 
  WHERE time_entry_id IN (
    SELECT id FROM time_entries WHERE tenant_id = test_tenant_id
  );
  RAISE NOTICE '✓ Deleted time entry pauses';

  -- 4. Delete time_entries
  DELETE FROM time_entries WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted time entries';

  -- 5. Delete substeps
  DELETE FROM substeps WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted substeps';

  -- 6. Delete operation_resources (must get operation IDs first)
  SELECT array_agg(id) INTO operation_ids 
  FROM operations WHERE tenant_id = test_tenant_id;
  
  IF operation_ids IS NOT NULL THEN
    DELETE FROM operation_resources WHERE operation_id = ANY(operation_ids);
    RAISE NOTICE '✓ Deleted operation resources';
  END IF;

  -- 7. Delete operations
  DELETE FROM operations WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted operations';

  -- 8. Delete parts
  DELETE FROM parts WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted parts';

  -- 9. Delete jobs
  DELETE FROM jobs WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted jobs';

  -- 10. Delete cells
  DELETE FROM cells WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted cells';

  -- 11. Delete resources
  DELETE FROM resources WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted resources';

  -- 12. Delete scrap_reasons
  DELETE FROM scrap_reasons WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted scrap reasons';

  -- 13. Delete assignments
  DELETE FROM assignments WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted assignments';

  -- 14. Delete notifications
  DELETE FROM notifications WHERE tenant_id = test_tenant_id;
  RAISE NOTICE '✓ Deleted notifications';

  -- 15. Delete demo operator profiles
  DELETE FROM user_roles 
  WHERE user_id IN (
    SELECT id FROM profiles 
    WHERE tenant_id = test_tenant_id 
    AND role = 'operator'
    AND email LIKE '%@sheetmetalconnect.nl'
  );
  
  DELETE FROM profiles 
  WHERE tenant_id = test_tenant_id 
  AND role = 'operator'
  AND email LIKE '%@sheetmetalconnect.nl';
  RAISE NOTICE '✓ Deleted demo operators';

  -- 16. Reset tenant counters
  UPDATE tenants 
  SET 
    current_jobs = 0,
    current_parts_this_month = 0,
    demo_mode_enabled = false,
    demo_mode_acknowledged = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = test_tenant_id;
  RAISE NOTICE '✓ Reset tenant counters and demo mode flags';

  RAISE NOTICE '✅ Cleanup complete! Tenant is ready for fresh demo data.';
END $$;