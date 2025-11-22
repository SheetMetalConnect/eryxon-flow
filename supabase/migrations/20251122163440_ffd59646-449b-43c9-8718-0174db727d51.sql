-- Fix get_activity_logs function to return correct types
DROP FUNCTION IF EXISTS get_activity_logs(integer, integer, text, text, text);

CREATE OR REPLACE FUNCTION get_activity_logs(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_action text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  user_email text,
  user_name text,
  action text,
  entity_type text,
  entity_id uuid,  -- Changed from text to uuid
  entity_name text,
  description text,
  changes jsonb,
  metadata jsonb,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  WHERE al.tenant_id = get_user_tenant_id()
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
    AND (p_search IS NULL OR 
         al.description ILIKE '%' || p_search || '%' OR
         al.user_name ILIKE '%' || p_search || '%' OR
         al.user_email ILIKE '%' || p_search || '%')
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;