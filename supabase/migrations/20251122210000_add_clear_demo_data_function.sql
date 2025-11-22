-- =====================================================
-- Migration: Add Clear Demo Data Function
-- =====================================================
-- This migration adds a database function to safely clear all demo data
-- for a tenant, including demo operators and all associated records.
-- This function ensures proper deletion order and tenant isolation.

-- Function to clear all demo data for a tenant
CREATE OR REPLACE FUNCTION public.clear_demo_data(p_tenant_id UUID)
RETURNS TABLE(
  deleted_count INTEGER,
  table_name TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  operation_ids UUID[];
  time_entry_ids UUID[];
BEGIN
  RAISE NOTICE 'Starting demo data cleanup for tenant: %', p_tenant_id;

  -- =====================================================
  -- STEP 1: Delete child records (order matters!)
  -- =====================================================

  -- 1. Delete notifications
  DELETE FROM notifications WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'notifications'::TEXT, format('Deleted %s notifications', v_count)::TEXT;

  -- 2. Delete issues
  DELETE FROM issues WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'issues'::TEXT, format('Deleted %s issues', v_count)::TEXT;

  -- 3. Delete operation_quantities
  DELETE FROM operation_quantities WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operation_quantities'::TEXT, format('Deleted %s quantity records', v_count)::TEXT;

  -- 4. Delete time_entry_pauses (via time_entries - no tenant_id on pauses table)
  SELECT array_agg(id) INTO time_entry_ids FROM time_entries WHERE tenant_id = p_tenant_id;
  IF time_entry_ids IS NOT NULL THEN
    DELETE FROM time_entry_pauses WHERE time_entry_id = ANY(time_entry_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count, 'time_entry_pauses'::TEXT, format('Deleted %s time entry pauses', v_count)::TEXT;
  END IF;

  -- 5. Delete time_entries
  DELETE FROM time_entries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'time_entries'::TEXT, format('Deleted %s time entries', v_count)::TEXT;

  -- 6. Delete assignments
  DELETE FROM assignments WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'assignments'::TEXT, format('Deleted %s assignments', v_count)::TEXT;

  -- 7. Delete substeps
  DELETE FROM substeps WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'substeps'::TEXT, format('Deleted %s substeps', v_count)::TEXT;

  -- 8. Delete operation_resources (via operations - no tenant_id on junction table)
  SELECT array_agg(id) INTO operation_ids FROM operations WHERE tenant_id = p_tenant_id;
  IF operation_ids IS NOT NULL THEN
    DELETE FROM operation_resources WHERE operation_id = ANY(operation_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count, 'operation_resources'::TEXT, format('Deleted %s operation resource links', v_count)::TEXT;
  END IF;

  -- 9. Delete operations
  DELETE FROM operations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operations'::TEXT, format('Deleted %s operations', v_count)::TEXT;

  -- 10. Delete parts
  DELETE FROM parts WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'parts'::TEXT, format('Deleted %s parts', v_count)::TEXT;

  -- 11. Delete jobs
  DELETE FROM jobs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'jobs'::TEXT, format('Deleted %s jobs', v_count)::TEXT;

  -- 12. Delete cells
  DELETE FROM cells WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'cells'::TEXT, format('Deleted %s cells', v_count)::TEXT;

  -- 13. Delete resources
  DELETE FROM resources WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'resources'::TEXT, format('Deleted %s resources', v_count)::TEXT;

  -- 14. Delete materials (if any)
  DELETE FROM materials WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'materials'::TEXT, format('Deleted %s materials', v_count)::TEXT;

  -- 15. Delete scrap_reasons
  DELETE FROM scrap_reasons WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'scrap_reasons'::TEXT, format('Deleted %s scrap reasons', v_count)::TEXT;

  -- =====================================================
  -- STEP 2: Delete demo operators
  -- =====================================================
  -- CRITICAL: Only delete demo operators created by seed_demo_operators function
  -- These have specific email addresses: demo.operator1@example.com, etc.

  DELETE FROM profiles
  WHERE tenant_id = p_tenant_id
    AND role = 'operator'
    AND email IN (
      'demo.operator1@example.com',
      'demo.operator2@example.com',
      'demo.operator3@example.com',
      'demo.operator4@example.com'
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'profiles (demo operators)'::TEXT, format('Deleted %s demo operators', v_count)::TEXT;

  -- =====================================================
  -- STEP 3: Reset tenant counters and flags
  -- =====================================================
  UPDATE tenants
  SET
    current_jobs = 0,
    current_parts_this_month = 0,
    demo_mode_enabled = false,
    demo_mode_acknowledged = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = p_tenant_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'tenants (reset)'::TEXT, 'Reset tenant counters and demo mode flags'::TEXT;

  -- Final success message
  RETURN QUERY SELECT 0::INTEGER, 'COMPLETE'::TEXT, '✅ Demo data cleanup completed successfully'::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error clearing demo data: %', SQLERRM;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.clear_demo_data(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.clear_demo_data IS
'Safely clears all demo data for a tenant including jobs, parts, operations, resources, and demo operators. Returns detailed deletion summary.';
