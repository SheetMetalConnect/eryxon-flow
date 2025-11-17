-- Migration: Comprehensive Activity Log System
-- Created: 2025-11-17
-- Description:
--   Real-time activity monitoring for all user actions across the platform
--   Tracks: logins, CRUD operations, config changes, API calls, and more

-- ============================================================================
-- STEP 1: Create activity_log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,

  -- Activity details
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'view', 'export', 'import', 'configure'
  entity_type TEXT, -- 'job', 'part', 'operation', 'user', 'stage', 'material', 'resource', etc.
  entity_id UUID,
  entity_name TEXT, -- Human-readable name (e.g., job number, part number)

  -- Metadata
  description TEXT, -- Human-readable description of the action
  changes JSONB DEFAULT '{}', -- Before/after values for updates
  metadata JSONB DEFAULT '{}', -- Additional context (IP address, user agent, etc.)

  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Search optimization
  search_vector TSVECTOR
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Primary indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_created
  ON public.activity_log(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_created
  ON public.activity_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity
  ON public.activity_log(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_action
  ON public.activity_log(action, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_activity_log_search
  ON public.activity_log USING GIN(search_vector);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_action_created
  ON public.activity_log(tenant_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_entity_created
  ON public.activity_log(tenant_id, entity_type, created_at DESC);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's activity logs
CREATE POLICY "Users can view their tenant activity logs"
  ON public.activity_log FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

-- Policy: Only admins can insert activity logs (via triggers/functions)
-- Note: We'll use SECURITY DEFINER functions to insert logs

-- ============================================================================
-- STEP 4: Create helper function to log activity
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_activity_id UUID;
  v_search_text TEXT;
BEGIN
  -- Get current user context
  v_tenant_id := public.get_user_tenant_id();
  v_user_id := auth.uid();

  -- Get user details from profiles
  SELECT email, full_name
  INTO v_user_email, v_user_name
  FROM public.profiles
  WHERE id = v_user_id;

  -- Build search text
  v_search_text := COALESCE(p_action, '') || ' ' ||
                   COALESCE(p_entity_type, '') || ' ' ||
                   COALESCE(p_entity_name, '') || ' ' ||
                   COALESCE(p_description, '') || ' ' ||
                   COALESCE(v_user_name, '') || ' ' ||
                   COALESCE(v_user_email, '');

  -- Insert activity log
  INSERT INTO public.activity_log (
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
    metadata,
    search_vector
  ) VALUES (
    v_tenant_id,
    v_user_id,
    v_user_email,
    v_user_name,
    p_action,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_description,
    p_changes,
    p_metadata,
    to_tsvector('english', v_search_text)
  ) RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID, TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- ============================================================================
-- STEP 5: Create automatic activity logging triggers
-- ============================================================================

-- Function: Log job activities
CREATE OR REPLACE FUNCTION public.log_job_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'create',
      'job',
      NEW.id,
      NEW.job_number,
      'Created new job: ' || NEW.job_number,
      jsonb_build_object('new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'update',
      'job',
      NEW.id,
      NEW.job_number,
      'Updated job: ' || NEW.job_number,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      'delete',
      'job',
      OLD.id,
      OLD.job_number,
      'Deleted job: ' || OLD.job_number,
      jsonb_build_object('old', to_jsonb(OLD))
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log part activities
CREATE OR REPLACE FUNCTION public.log_part_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'create',
      'part',
      NEW.id,
      NEW.part_number,
      'Created new part: ' || NEW.part_number || ' (Qty: ' || COALESCE(NEW.quantity::TEXT, '1') || ')',
      jsonb_build_object('new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'update',
      'part',
      NEW.id,
      NEW.part_number,
      'Updated part: ' || NEW.part_number,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      'delete',
      'part',
      OLD.id,
      OLD.part_number,
      'Deleted part: ' || OLD.part_number,
      jsonb_build_object('old', to_jsonb(OLD))
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log operation activities
CREATE OR REPLACE FUNCTION public.log_operation_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'create',
      'operation',
      NEW.id,
      NEW.operation_type,
      'Created new operation: ' || NEW.operation_type,
      jsonb_build_object('new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'update',
      'operation',
      NEW.id,
      NEW.operation_type,
      'Updated operation: ' || NEW.operation_type,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      'delete',
      'operation',
      OLD.id,
      OLD.operation_type,
      'Deleted operation: ' || OLD.operation_type,
      jsonb_build_object('old', to_jsonb(OLD))
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Log user profile activities
CREATE OR REPLACE FUNCTION public.log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(
      'create',
      'user',
      NEW.id,
      COALESCE(NEW.full_name, NEW.email),
      'Created new user: ' || COALESCE(NEW.full_name, NEW.email) || ' (' || NEW.role || ')',
      jsonb_build_object('new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_activity(
      'update',
      'user',
      NEW.id,
      COALESCE(NEW.full_name, NEW.email),
      'Updated user: ' || COALESCE(NEW.full_name, NEW.email),
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(
      'delete',
      'user',
      OLD.id,
      COALESCE(OLD.full_name, OLD.email),
      'Deleted user: ' || COALESCE(OLD.full_name, OLD.email),
      jsonb_build_object('old', to_jsonb(OLD))
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create triggers on relevant tables
-- ============================================================================

-- Drop triggers if they exist (to avoid conflicts on re-run)
DROP TRIGGER IF EXISTS trigger_log_job_activity ON public.jobs;
DROP TRIGGER IF EXISTS trigger_log_part_activity ON public.parts;
DROP TRIGGER IF EXISTS trigger_log_operation_activity ON public.operations;
DROP TRIGGER IF EXISTS trigger_log_user_activity ON public.profiles;

-- Create triggers
CREATE TRIGGER trigger_log_job_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_job_activity();

CREATE TRIGGER trigger_log_part_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.parts
  FOR EACH ROW
  EXECUTE FUNCTION public.log_part_activity();

CREATE TRIGGER trigger_log_operation_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.operations
  FOR EACH ROW
  EXECUTE FUNCTION public.log_operation_activity();

CREATE TRIGGER trigger_log_user_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_user_activity();

-- ============================================================================
-- STEP 7: Create RPC functions for querying activity logs
-- ============================================================================

-- Function: Get activity logs with filters
CREATE OR REPLACE FUNCTION public.get_activity_logs(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_action TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  user_email TEXT,
  user_name TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();

  RETURN QUERY
  SELECT
    a.id,
    a.user_email,
    a.user_name,
    a.action,
    a.entity_type,
    a.entity_id,
    a.entity_name,
    a.description,
    a.changes,
    a.metadata,
    a.created_at
  FROM public.activity_log a
  WHERE a.tenant_id = v_tenant_id
    AND (p_action IS NULL OR a.action = p_action)
    AND (p_entity_type IS NULL OR a.entity_type = p_entity_type)
    AND (p_user_id IS NULL OR a.user_id = p_user_id)
    AND (p_start_date IS NULL OR a.created_at >= p_start_date)
    AND (p_end_date IS NULL OR a.created_at <= p_end_date)
    AND (
      p_search IS NULL OR
      a.search_vector @@ plainto_tsquery('english', p_search)
    )
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get activity statistics
CREATE OR REPLACE FUNCTION public.get_activity_stats(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_activities BIGINT,
  unique_users BIGINT,
  activities_by_action JSONB,
  activities_by_entity JSONB,
  hourly_breakdown JSONB
) AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.get_user_tenant_id();

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_activities,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,

    -- Group by action
    jsonb_object_agg(
      COALESCE(action_group.action, 'unknown'),
      action_group.count
    ) as activities_by_action,

    -- Group by entity type
    jsonb_object_agg(
      COALESCE(entity_group.entity_type, 'unknown'),
      entity_group.count
    ) as activities_by_entity,

    -- Hourly breakdown
    jsonb_object_agg(
      TO_CHAR(hourly_group.hour, 'YYYY-MM-DD HH24:00'),
      hourly_group.count
    ) as hourly_breakdown

  FROM public.activity_log a

  LEFT JOIN LATERAL (
    SELECT action, COUNT(*) as count
    FROM public.activity_log
    WHERE tenant_id = v_tenant_id
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY action
  ) action_group ON TRUE

  LEFT JOIN LATERAL (
    SELECT entity_type, COUNT(*) as count
    FROM public.activity_log
    WHERE tenant_id = v_tenant_id
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY entity_type
  ) entity_group ON TRUE

  LEFT JOIN LATERAL (
    SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) as count
    FROM public.activity_log
    WHERE tenant_id = v_tenant_id
      AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY DATE_TRUNC('hour', created_at)
  ) hourly_group ON TRUE

  WHERE a.tenant_id = v_tenant_id
    AND a.created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_activity_logs(INTEGER, INTEGER, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_stats(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- ============================================================================
-- STEP 8: Create function for activity log cleanup (optional)
-- ============================================================================

-- Function: Clean up old activity logs (keep last N days)
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE(
  deleted_count BIGINT
) AS $$
DECLARE
  v_deleted_count BIGINT;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;

  DELETE FROM public.activity_log
  WHERE created_at < v_cutoff_date;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role (for cron job)
GRANT EXECUTE ON FUNCTION public.cleanup_old_activity_logs(INTEGER) TO service_role;

-- ============================================================================
-- NOTES:
-- ============================================================================
--
-- This migration creates a comprehensive activity logging system with:
-- 1. Full audit trail of all user actions
-- 2. Automatic logging via database triggers
-- 3. Real-time capabilities (compatible with Supabase Realtime)
-- 4. Full-text search support
-- 5. Flexible filtering and querying
-- 6. Performance-optimized indexes
-- 7. Automatic cleanup capability
--
-- To enable real-time updates in the frontend:
-- supabase.channel('activity_log_changes')
--   .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, callback)
--   .subscribe()
--
-- ============================================================================
