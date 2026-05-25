-- ERY-20 Flow supportability baseline: audit coverage for critical admin/security actions.
--
-- The existing `log_activity()` trigger covers business data (cells, jobs, operations,
-- parts, profiles) but NOT the admin/security-sensitive tables a managed pilot must be
-- able to investigate after the fact: API keys, role grants, invitations, webhooks,
-- integration installs, and MCP credentials/config.
--
-- This migration adds a dedicated `log_admin_activity()` trigger function that:
--   * resolves tenant_id robustly, including tables without a tenant_id column
--     (e.g. user_roles -> via profiles.user_id; tenants -> the row id itself),
--   * redacts secret columns (key_hash, secret_key, token, config) before writing
--     the diff into activity_log.changes, and
--   * tags rows with metadata.admin_audit = true for filtering.
--
-- Rows land in the same `activity_log` table, so the existing RLS (tenant-scoped
-- SELECT, system INSERT) and the get_activity_logs() reader apply unchanged.

CREATE OR REPLACE FUNCTION "public"."log_admin_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
  v_tenant_id UUID;
  v_action TEXT;
  v_entity_id UUID;
  v_entity_name TEXT;
  v_old JSONB;
  v_new JSONB;
  v_rec JSONB;
  v_changes JSONB;
  k TEXT;
  -- Columns whose values must never reach the audit log in cleartext.
  secret_keys TEXT[] := ARRAY['key_hash', 'secret_key', 'token', 'config'];
BEGIN
  v_user_id := auth.uid();

  v_old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  v_rec := COALESCE(v_new, v_old);

  -- Tenant resolution, in priority order.
  IF TG_TABLE_NAME = 'tenants' THEN
    v_tenant_id := NULLIF(v_rec->>'id', '')::UUID;
  ELSE
    v_tenant_id := NULLIF(v_rec->>'tenant_id', '')::UUID;
  END IF;

  -- Tables without a tenant_id (e.g. user_roles) carry a user_id we can map.
  IF v_tenant_id IS NULL AND (v_rec ? 'user_id') THEN
    SELECT tenant_id INTO v_tenant_id
    FROM profiles WHERE id = NULLIF(v_rec->>'user_id', '')::UUID;
  END IF;

  -- Last resort: attribute to the acting user's tenant.
  IF v_tenant_id IS NULL AND v_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  END IF;

  -- Cannot attribute the action to a tenant; skip rather than write an orphan row.
  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT email, full_name INTO v_user_email, v_user_name
  FROM profiles WHERE id = v_user_id;

  -- Redact secret columns from both sides of the diff.
  FOREACH k IN ARRAY secret_keys LOOP
    IF v_new IS NOT NULL AND (v_new ? k) THEN
      v_new := jsonb_set(v_new, ARRAY[k], '"[redacted]"'::jsonb);
    END IF;
    IF v_old IS NOT NULL AND (v_old ? k) THEN
      v_old := jsonb_set(v_old, ARRAY[k], '"[redacted]"'::jsonb);
    END IF;
  END LOOP;

  v_action := LOWER(TG_OP);
  v_entity_id := NULLIF(v_rec->>'id', '')::UUID;
  v_entity_name := COALESCE(v_rec->>'name', v_rec->>'email', v_entity_id::TEXT);

  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object('new', v_new);
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object('old', v_old);
  ELSE
    v_changes := jsonb_build_object('old', v_old, 'new', v_new);
  END IF;

  INSERT INTO activity_log (
    tenant_id, user_id, user_email, user_name, action, entity_type,
    entity_id, entity_name, description, changes, metadata
  ) VALUES (
    v_tenant_id, v_user_id, v_user_email, v_user_name, v_action, TG_TABLE_NAME,
    v_entity_id, v_entity_name, v_action || ' ' || TG_TABLE_NAME, v_changes,
    jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA, 'admin_audit', true)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

ALTER FUNCTION "public"."log_admin_activity"() OWNER TO "postgres";

-- Attach the trigger to each critical admin/security table.
-- CREATE OR REPLACE so re-running the migration is idempotent.
CREATE OR REPLACE TRIGGER "api_keys_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."api_keys"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

CREATE OR REPLACE TRIGGER "user_roles_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."user_roles"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

CREATE OR REPLACE TRIGGER "invitations_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."invitations"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

CREATE OR REPLACE TRIGGER "webhooks_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."webhooks"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

CREATE OR REPLACE TRIGGER "installed_integrations_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."installed_integrations"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

CREATE OR REPLACE TRIGGER "mcp_authentication_keys_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."mcp_authentication_keys"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

CREATE OR REPLACE TRIGGER "mcp_server_config_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."mcp_server_config"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

CREATE OR REPLACE TRIGGER "tenants_admin_audit_trigger"
  AFTER INSERT OR UPDATE OR DELETE ON "public"."tenants"
  FOR EACH ROW EXECUTE FUNCTION "public"."log_admin_activity"();

COMMENT ON FUNCTION "public"."log_admin_activity"() IS
  'ERY-20 supportability baseline: audit trigger for admin/security tables. Writes redacted diffs to activity_log with metadata.admin_audit=true.';
