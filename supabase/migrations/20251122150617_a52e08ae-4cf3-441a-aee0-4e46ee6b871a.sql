-- Fix security issues identified by linter

-- 1. Fix issues_with_context view to use security_invoker
ALTER VIEW public.issues_with_context SET (security_invoker = true);

-- 2. Fix get_operation_total_quantities function to set search_path
CREATE OR REPLACE FUNCTION public.get_operation_total_quantities(p_operation_id uuid)
RETURNS TABLE(total_produced bigint, total_good bigint, total_scrap bigint, total_rework bigint, yield_percentage numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(quantity_produced), 0)::BIGINT as total_produced,
    COALESCE(SUM(quantity_good), 0)::BIGINT as total_good,
    COALESCE(SUM(quantity_scrap), 0)::BIGINT as total_scrap,
    COALESCE(SUM(quantity_rework), 0)::BIGINT as total_rework,
    CASE
      WHEN COALESCE(SUM(quantity_produced), 0) > 0
      THEN ROUND((SUM(quantity_good)::NUMERIC / SUM(quantity_produced)::NUMERIC) * 100, 2)
      ELSE 0
    END as yield_percentage
  FROM operation_quantities
  WHERE operation_id = p_operation_id;
END;
$$;

-- 3. Fix log_activity trigger function to set search_path (already has it but ensure it's correct)
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;