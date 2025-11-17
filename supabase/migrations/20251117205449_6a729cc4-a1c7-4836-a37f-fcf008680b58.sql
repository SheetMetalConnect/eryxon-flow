-- Add activity log query functions
CREATE OR REPLACE FUNCTION get_activity_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_action TEXT DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_email TEXT,
  user_name TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  description TEXT,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_email,
    al.user_name,
    al.action,
    al.entity_type,
    al.entity_id,
    al.entity_name,
    al.description,
    al.changes,
    al.metadata,
    al.created_at
  FROM activity_log al
  WHERE al.tenant_id = (SELECT get_user_tenant_id())
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_search IS NULL OR 
         al.description ILIKE '%' || p_search || '%' OR
         al.user_name ILIKE '%' || p_search || '%' OR
         al.user_email ILIKE '%' || p_search || '%' OR
         al.entity_name ILIKE '%' || p_search || '%')
  ORDER BY al.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_activity_stats(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_activities BIGINT,
  unique_users BIGINT,
  activities_by_action JSONB,
  activities_by_entity JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_activities,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    jsonb_object_agg(
      COALESCE(action, 'unknown'),
      action_count
    ) as activities_by_action,
    jsonb_object_agg(
      COALESCE(entity_type, 'unknown'),
      entity_count
    ) as activities_by_entity
  FROM (
    SELECT
      action,
      entity_type,
      user_id,
      COUNT(*) FILTER (WHERE action IS NOT NULL) OVER (PARTITION BY action) as action_count,
      COUNT(*) FILTER (WHERE entity_type IS NOT NULL) OVER (PARTITION BY entity_type) as entity_count
    FROM activity_log
    WHERE tenant_id = (SELECT get_user_tenant_id())
      AND created_at BETWEEN p_start_date AND p_end_date
  ) stats
  LIMIT 1;
END;
$$;