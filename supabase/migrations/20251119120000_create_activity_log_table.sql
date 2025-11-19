-- Migration: Create activity_log table and activity logging triggers
-- Description: Creates the activity_log table for tenant-wide audit trail and triggers to populate it

-- Create the activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  description TEXT,
  changes JSONB,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add comments
COMMENT ON TABLE activity_log IS 'Audit trail for all tenant activities';
COMMENT ON COLUMN activity_log.action IS 'Action type: create, update, delete, login, logout, etc.';
COMMENT ON COLUMN activity_log.entity_type IS 'Type of entity: job, part, operation, user, etc.';
COMMENT ON COLUMN activity_log.changes IS 'JSON diff of what changed (old vs new values)';
COMMENT ON COLUMN activity_log.metadata IS 'Additional context-specific data';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_search ON activity_log USING GIN(search_vector);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_created ON activity_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_action ON activity_log(tenant_id, action);

-- Enable Row Level Security
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see activities from their own tenant
CREATE POLICY "Users can view their tenant's activity logs"
  ON activity_log
  FOR SELECT
  USING (tenant_id = (SELECT get_user_tenant_id()));

CREATE POLICY "System can insert activity logs"
  ON activity_log
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT get_user_tenant_id()) OR current_user = 'postgres');

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_activity_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.user_name, '') || ' ' ||
    coalesce(NEW.user_email, '') || ' ' ||
    coalesce(NEW.action, '') || ' ' ||
    coalesce(NEW.entity_type, '') || ' ' ||
    coalesce(NEW.entity_name, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_log_search_vector_trigger
  BEFORE INSERT OR UPDATE ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_search_vector();

-- Function to log activity from triggers
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_tenant_id UUID;
  v_action TEXT;
  v_entity_name TEXT;
  v_description TEXT;
  v_changes JSONB;
  v_entity_id TEXT;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();

  -- Get user details from profiles
  SELECT email, full_name, tenant_id
  INTO v_user_email, v_user_name, v_tenant_id
  FROM profiles
  WHERE id = v_user_id;

  -- If no tenant found from user, try to get from the record
  IF v_tenant_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      v_tenant_id := OLD.tenant_id;
    ELSE
      v_tenant_id := NEW.tenant_id;
    END IF;
  END IF;

  -- Skip if no tenant (shouldn't happen but safety check)
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Determine action
  v_action := LOWER(TG_OP);

  -- Get entity ID and name based on operation
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::TEXT;
    -- Try to get name from common columns
    IF TG_TABLE_NAME = 'jobs' THEN
      v_entity_name := OLD.name;
    ELSIF TG_TABLE_NAME = 'parts' THEN
      v_entity_name := OLD.part_number;
    ELSIF TG_TABLE_NAME = 'operations' THEN
      v_entity_name := OLD.name;
    ELSIF TG_TABLE_NAME = 'cells' THEN
      v_entity_name := OLD.name;
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      v_entity_name := OLD.full_name;
    ELSE
      v_entity_name := OLD.id::TEXT;
    END IF;
  ELSE
    v_entity_id := NEW.id::TEXT;
    -- Try to get name from common columns
    IF TG_TABLE_NAME = 'jobs' THEN
      v_entity_name := NEW.name;
    ELSIF TG_TABLE_NAME = 'parts' THEN
      v_entity_name := NEW.part_number;
    ELSIF TG_TABLE_NAME = 'operations' THEN
      v_entity_name := NEW.name;
    ELSIF TG_TABLE_NAME = 'cells' THEN
      v_entity_name := NEW.name;
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      v_entity_name := NEW.full_name;
    ELSE
      v_entity_name := NEW.id::TEXT;
    END IF;
  END IF;

  -- Build description
  v_description := v_action || ' ' || TG_TABLE_NAME;
  IF v_entity_name IS NOT NULL THEN
    v_description := v_description || ': ' || v_entity_name;
  END IF;

  -- Calculate changes for updates
  IF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  -- Insert activity log
  INSERT INTO activity_log (
    tenant_id,
    user_id,
    user_email,
    user_name,
    action,
    entity_type,
    entity_id,
    entity_name,
    description,
    changes,
    metadata
  ) VALUES (
    v_tenant_id,
    v_user_id,
    v_user_email,
    v_user_name,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    v_entity_name,
    v_description,
    v_changes,
    jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for key tables

-- Jobs table
DROP TRIGGER IF EXISTS jobs_activity_trigger ON jobs;
CREATE TRIGGER jobs_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Parts table
DROP TRIGGER IF EXISTS parts_activity_trigger ON parts;
CREATE TRIGGER parts_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Operations table
DROP TRIGGER IF EXISTS operations_activity_trigger ON operations;
CREATE TRIGGER operations_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON operations
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Cells table
DROP TRIGGER IF EXISTS cells_activity_trigger ON cells;
CREATE TRIGGER cells_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON cells
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Profiles table (user management)
DROP TRIGGER IF EXISTS profiles_activity_trigger ON profiles;
CREATE TRIGGER profiles_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Assignments table
DROP TRIGGER IF EXISTS assignments_activity_trigger ON assignments;
CREATE TRIGGER assignments_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Time entries table
DROP TRIGGER IF EXISTS time_entries_activity_trigger ON time_entries;
CREATE TRIGGER time_entries_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Substeps table
DROP TRIGGER IF EXISTS substeps_activity_trigger ON substeps;
CREATE TRIGGER substeps_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON substeps
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Grant necessary permissions
GRANT SELECT ON activity_log TO authenticated;
GRANT INSERT ON activity_log TO authenticated;
