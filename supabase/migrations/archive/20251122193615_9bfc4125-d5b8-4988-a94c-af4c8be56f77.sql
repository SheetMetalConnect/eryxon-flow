-- Wipe tenant data again for fresh seed with assembly relationships
DO $$
DECLARE
  test_tenant_id UUID := '11111111-1111-1111-1111-111111111111';
  operation_ids UUID[];
BEGIN
  -- Delete operation_resources first
  SELECT array_agg(id) INTO operation_ids 
  FROM operations WHERE tenant_id = test_tenant_id;
  
  IF operation_ids IS NOT NULL THEN
    DELETE FROM operation_resources WHERE operation_id = ANY(operation_ids);
  END IF;

  -- Delete in dependency order
  DELETE FROM issues WHERE tenant_id = test_tenant_id;
  DELETE FROM operation_quantities WHERE tenant_id = test_tenant_id;
  DELETE FROM time_entry_pauses WHERE time_entry_id IN (SELECT id FROM time_entries WHERE tenant_id = test_tenant_id);
  DELETE FROM time_entries WHERE tenant_id = test_tenant_id;
  DELETE FROM substeps WHERE tenant_id = test_tenant_id;
  DELETE FROM operations WHERE tenant_id = test_tenant_id;
  DELETE FROM parts WHERE tenant_id = test_tenant_id;
  DELETE FROM jobs WHERE tenant_id = test_tenant_id;
  DELETE FROM cells WHERE tenant_id = test_tenant_id;
  DELETE FROM resources WHERE tenant_id = test_tenant_id;
  DELETE FROM scrap_reasons WHERE tenant_id = test_tenant_id;
  DELETE FROM assignments WHERE tenant_id = test_tenant_id;
  DELETE FROM notifications WHERE tenant_id = test_tenant_id;
  
  DELETE FROM user_roles WHERE user_id IN (
    SELECT id FROM profiles WHERE tenant_id = test_tenant_id AND role = 'operator' AND email LIKE '%@sheetmetalconnect.nl'
  );
  DELETE FROM profiles WHERE tenant_id = test_tenant_id AND role = 'operator' AND email LIKE '%@sheetmetalconnect.nl';
  
  UPDATE tenants SET 
    current_jobs = 0,
    current_parts_this_month = 0,
    demo_mode_enabled = false,
    demo_mode_acknowledged = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = test_tenant_id;

  RAISE NOTICE '✅ Tenant data wiped and ready for fresh seed';
END $$;