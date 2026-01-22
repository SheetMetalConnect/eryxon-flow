-- Fix activity_log trigger to handle cases where tenant doesn't exist yet
-- This prevents FK violation during signup when profile is created before tenant is fully committed

CREATE OR REPLACE FUNCTION "public"."log_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  v_entity_id UUID;
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

  -- Skip activity logging if tenant doesn't exist yet (e.g., during initial signup)
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = v_tenant_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_action := LOWER(TG_OP);

  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    v_entity_id := NEW.id;
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
    v_entity_id, v_entity_id::TEXT, v_description, v_changes,
    jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION "public"."log_activity"() IS 'Logs activity for auditing. Skips logging if tenant does not exist (handles signup race condition).';
