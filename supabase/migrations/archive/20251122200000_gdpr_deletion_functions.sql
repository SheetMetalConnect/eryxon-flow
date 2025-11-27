-- GDPR Compliance: Account and Tenant Deletion Functions
-- This migration adds functions to support user account deletion and tenant deletion

-- Function to delete all data for a specific tenant
-- This is used when a tenant admin wants to delete their entire organization
CREATE OR REPLACE FUNCTION delete_tenant_data(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_counts JSONB := '{}'::JSONB;
  v_count INTEGER;
BEGIN
  -- Verify the caller has permission (must be admin of the tenant)
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND tenant_id = p_tenant_id
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only tenant admins can delete tenant data';
  END IF;

  -- Delete data in order (respecting foreign key constraints)
  -- Most child tables already have CASCADE DELETE, but we'll be explicit

  -- Delete webhook logs
  DELETE FROM webhook_logs WHERE webhook_id IN (SELECT id FROM webhooks WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhook_logs}', to_jsonb(v_count));

  -- Delete webhooks
  DELETE FROM webhooks WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhooks}', to_jsonb(v_count));

  -- Delete API keys
  DELETE FROM api_keys WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{api_keys}', to_jsonb(v_count));

  -- Delete operation resources (junction table)
  DELETE FROM operation_resources WHERE operation_id IN (SELECT id FROM operations WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operation_resources}', to_jsonb(v_count));

  -- Delete time entry pauses
  DELETE FROM time_entry_pauses WHERE time_entry_id IN (SELECT id FROM time_entries WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entry_pauses}', to_jsonb(v_count));

  -- Delete time entries
  DELETE FROM time_entries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entries}', to_jsonb(v_count));

  -- Delete assignments
  DELETE FROM assignments WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{assignments}', to_jsonb(v_count));

  -- Delete substeps
  DELETE FROM substeps WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{substeps}', to_jsonb(v_count));

  -- Delete issues
  DELETE FROM issues WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{issues}', to_jsonb(v_count));

  -- Delete operations
  DELETE FROM operations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operations}', to_jsonb(v_count));

  -- Delete parts
  DELETE FROM parts WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{parts}', to_jsonb(v_count));

  -- Delete jobs
  DELETE FROM jobs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{jobs}', to_jsonb(v_count));

  -- Delete resources
  DELETE FROM resources WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{resources}', to_jsonb(v_count));

  -- Delete materials
  DELETE FROM materials WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{materials}', to_jsonb(v_count));

  -- Delete cells
  DELETE FROM cells WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{cells}', to_jsonb(v_count));

  -- Delete monthly reset logs (if table exists)
  DELETE FROM monthly_reset_logs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{monthly_reset_logs}', to_jsonb(v_count));

  -- Delete user profiles (this will also delete from auth.users via CASCADE)
  DELETE FROM profiles WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{profiles}', to_jsonb(v_count));

  -- Finally, delete the tenant itself
  DELETE FROM tenants WHERE id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{tenants}', to_jsonb(v_count));

  -- Return summary of deleted records
  RETURN jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'deleted_counts', v_deleted_counts,
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting tenant data: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_tenant_data(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_tenant_data(UUID) IS
'GDPR Compliance: Deletes all data associated with a tenant. Can only be executed by tenant admins. Returns summary of deleted records.';


-- Function to delete a single user account
-- This is used when an individual user wants to delete their account
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_deleted_counts JSONB := '{}'::JSONB;
  v_count INTEGER;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Delete user-specific data

  -- Delete time entry pauses for this user
  DELETE FROM time_entry_pauses
  WHERE time_entry_id IN (SELECT id FROM time_entries WHERE user_id = v_user_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entry_pauses}', to_jsonb(v_count));

  -- Delete time entries
  DELETE FROM time_entries WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entries}', to_jsonb(v_count));

  -- Delete assignments
  DELETE FROM assignments WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{assignments}', to_jsonb(v_count));

  -- Delete issues created by this user (or set created_by to NULL if you want to keep the issue)
  -- For GDPR, we'll delete issues created by the user
  DELETE FROM issues WHERE created_by_user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{issues}', to_jsonb(v_count));

  -- Delete the profile (this will cascade to auth.users)
  DELETE FROM profiles WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{profile}', to_jsonb(v_count));

  -- Delete from auth.users (Supabase will handle this via CASCADE from profiles)
  -- Note: Deleting from auth.users will automatically sign out the user
  DELETE FROM auth.users WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{auth_user}', to_jsonb(v_count));

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'deleted_counts', v_deleted_counts,
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting user account: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_account() IS
'GDPR Compliance: Allows a user to delete their own account and all associated personal data. User will be automatically signed out.';
