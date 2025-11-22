-- ============================================================================
-- CONSOLIDATED MIGRATION: All pending backend migrations
-- Includes: Activity Log, Icon Fields, User Roles, QRM Functions, 
--           Production Tracking, Resources, Invitations System
-- ============================================================================

-- ============================================================================
-- 1. ACTIVITY LOG SYSTEM
-- ============================================================================

-- Create activity_log table
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

-- Indexes for activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_id ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_search ON activity_log USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_created ON activity_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_action ON activity_log(tenant_id, action);

-- Enable RLS on activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_log
DROP POLICY IF EXISTS "Users can view their tenant's activity logs" ON activity_log;
CREATE POLICY "Users can view their tenant's activity logs"
  ON activity_log FOR SELECT
  USING (auth.uid() IS NOT NULL AND tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "System can insert activity logs" ON activity_log;
CREATE POLICY "System can insert activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id() OR current_user = 'postgres');

-- Activity log search vector function
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

DROP TRIGGER IF EXISTS activity_log_search_vector_trigger ON activity_log;
CREATE TRIGGER activity_log_search_vector_trigger
  BEFORE INSERT OR UPDATE ON activity_log
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_search_vector();

-- Activity logging function
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
  v_user_id := auth.uid();
  
  SELECT email, full_name, tenant_id
  INTO v_user_email, v_user_name, v_tenant_id
  FROM profiles WHERE id = v_user_id;
  
  IF v_tenant_id IS NULL THEN
    v_tenant_id := COALESCE((CASE WHEN TG_OP = 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END), NULL);
  END IF;
  
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_action := LOWER(TG_OP);
  
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::TEXT;
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    v_entity_id := NEW.id::TEXT;
    IF TG_OP = 'UPDATE' THEN
      v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    ELSE
      v_changes := jsonb_build_object('new', to_jsonb(NEW));
    END IF;
  END IF;
  
  v_description := v_action || ' ' || TG_TABLE_NAME;
  
  INSERT INTO activity_log (
    tenant_id, user_id, user_email, user_name, action, entity_type,
    entity_id, entity_name, description, changes, metadata
  ) VALUES (
    v_tenant_id, v_user_id, v_user_email, v_user_name, v_action, TG_TABLE_NAME,
    v_entity_id, v_entity_id, v_description, v_changes,
    jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA)
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activity log triggers
DROP TRIGGER IF EXISTS jobs_activity_trigger ON jobs;
CREATE TRIGGER jobs_activity_trigger AFTER INSERT OR UPDATE OR DELETE ON jobs FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS parts_activity_trigger ON parts;
CREATE TRIGGER parts_activity_trigger AFTER INSERT OR UPDATE OR DELETE ON parts FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS operations_activity_trigger ON operations;
CREATE TRIGGER operations_activity_trigger AFTER INSERT OR UPDATE OR DELETE ON operations FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS cells_activity_trigger ON cells;
CREATE TRIGGER cells_activity_trigger AFTER INSERT OR UPDATE OR DELETE ON cells FOR EACH ROW EXECUTE FUNCTION log_activity();

DROP TRIGGER IF EXISTS profiles_activity_trigger ON profiles;
CREATE TRIGGER profiles_activity_trigger AFTER INSERT OR UPDATE OR DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Activity query functions
CREATE OR REPLACE FUNCTION get_activity_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_action TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID, user_email TEXT, user_name TEXT, action TEXT, entity_type TEXT,
  entity_id TEXT, entity_name TEXT, description TEXT, changes JSONB,
  metadata JSONB, created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT al.id, al.user_email, al.user_name, al.action, al.entity_type,
         al.entity_id, al.entity_name, al.description, al.changes,
         al.metadata, al.created_at
  FROM activity_log al
  WHERE al.tenant_id = get_user_tenant_id()
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_search IS NULL OR 
         al.description ILIKE '%' || p_search || '%' OR
         al.user_name ILIKE '%' || p_search || '%')
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_activity_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_activities BIGINT, unique_users BIGINT,
  activities_by_action JSONB, activities_by_entity JSONB
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_activities,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    jsonb_object_agg(COALESCE(action, 'unknown'), action_count) as activities_by_action,
    jsonb_object_agg(COALESCE(entity_type, 'unknown'), entity_count) as activities_by_entity
  FROM (
    SELECT action, entity_type, user_id,
      COUNT(*) FILTER (WHERE action IS NOT NULL) OVER (PARTITION BY action) as action_count,
      COUNT(*) FILTER (WHERE entity_type IS NOT NULL) OVER (PARTITION BY entity_type) as entity_count
    FROM activity_log
    WHERE tenant_id = get_user_tenant_id()
      AND created_at BETWEEN p_start_date AND p_end_date
  ) stats LIMIT 1;
END;
$$;

GRANT SELECT ON activity_log TO authenticated;
GRANT INSERT ON activity_log TO authenticated;

-- ============================================================================
-- 2. ICON FIELDS
-- ============================================================================

ALTER TABLE cells ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);
ALTER TABLE substeps ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_cells_icon_name ON cells(icon_name) WHERE icon_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_icon_name ON operations(icon_name) WHERE icon_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_substeps_icon_name ON substeps(icon_name) WHERE icon_name IS NOT NULL;

-- ============================================================================
-- 3. USER ROLES SECURITY FIX
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Migrate existing roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all roles in their tenant" ON public.user_roles;
CREATE POLICY "Admins can manage all roles in their tenant" ON public.user_roles
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND public.has_role(auth.uid(), 'admin'::app_role)));

-- ============================================================================
-- 4. QRM FUNCTIONS (updated to fix zero values)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cell_qrm_metrics(
  cell_id_param UUID, tenant_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSON;
  cell_record RECORD;
  wip_count INTEGER;
  utilization NUMERIC;
  qrm_status TEXT;
  jobs_array JSON;
BEGIN
  SELECT id, name, wip_limit, wip_warning_threshold,
         COALESCE(enforce_wip_limit, false) as enforce_wip_limit,
         COALESCE(show_capacity_warning, true) as show_capacity_warning
  INTO cell_record
  FROM cells
  WHERE id = cell_id_param AND tenant_id = tenant_id_param;
  
  IF cell_record IS NULL THEN RETURN NULL; END IF;
  
  SELECT COUNT(DISTINCT j.id)
  INTO wip_count
  FROM operations o
  INNER JOIN parts p ON o.part_id = p.id
  INNER JOIN jobs j ON p.job_id = j.id
  WHERE o.cell_id = cell_id_param
    AND o.status IN ('not_started', 'in_progress')
    AND o.tenant_id = tenant_id_param;
  
  wip_count := COALESCE(wip_count, 0);
  
  IF cell_record.wip_limit IS NOT NULL AND cell_record.wip_limit > 0 THEN
    utilization := (wip_count::NUMERIC / cell_record.wip_limit::NUMERIC) * 100;
  ELSE
    utilization := NULL;
  END IF;
  
  IF cell_record.wip_limit IS NULL THEN
    qrm_status := 'no_limit';
  ELSIF wip_count >= cell_record.wip_limit THEN
    qrm_status := 'at_capacity';
  ELSIF cell_record.wip_warning_threshold IS NOT NULL AND wip_count >= cell_record.wip_warning_threshold THEN
    qrm_status := 'warning';
  ELSIF wip_count >= (cell_record.wip_limit * 0.8) THEN
    qrm_status := 'warning';
  ELSE
    qrm_status := 'normal';
  END IF;
  
  SELECT COALESCE(json_agg(json_build_object('job_id', j.id, 'job_number', j.job_number)), '[]'::json)
  INTO jobs_array
  FROM (
    SELECT DISTINCT j.id, j.job_number
    FROM operations o
    INNER JOIN parts p ON o.part_id = p.id
    INNER JOIN jobs j ON p.job_id = j.id
    WHERE o.cell_id = cell_id_param
      AND o.status IN ('not_started', 'in_progress')
      AND o.tenant_id = tenant_id_param
    ORDER BY j.job_number LIMIT 10
  ) j;
  
  result := json_build_object(
    'cell_id', cell_record.id,
    'cell_name', cell_record.name,
    'current_wip', wip_count,
    'wip_limit', cell_record.wip_limit,
    'wip_warning_threshold', cell_record.wip_warning_threshold,
    'enforce_limit', cell_record.enforce_wip_limit,
    'show_warning', cell_record.show_capacity_warning,
    'utilization_percent', utilization,
    'status', qrm_status,
    'jobs_in_cell', jobs_array
  );
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_cell_qrm_metrics(UUID, UUID) TO authenticated;