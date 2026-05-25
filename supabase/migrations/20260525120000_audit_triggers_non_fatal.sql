-- HOTFIX (P0): audit logging must never abort the operation it records.
--
-- v0.6 added audit triggers that INSERT into activity_log:
--   * log_activity()        — on profiles (+ business tables)
--   * log_admin_activity()  — on admin/security tables (ERY-20)
-- activity_log has FKs tenant_id->tenants (NOT NULL) and user_id->profiles.
-- For orphaned references (e.g. a profile whose tenant row was removed) the
-- INSERT raised a foreign-key violation. Because the insert ran inside the
-- triggering transaction, login (profiles UPDATE) and user deletion aborted
-- with a 500 — locking out ALL users on the hosted deployment.
--
-- Fix: wrap the activity_log INSERT in an exception handler so a logging
-- failure degrades to a skipped audit row (RAISE WARNING) instead of failing
-- the business transaction. Audit coverage is best-effort by design.
--
-- NOTE (self-hosting): this admin/security audit logging is a hosted/managed
-- pilot feature and is not required for self-hosted deployments. See
-- docs/SELF_HOSTING.md — self-host installs may drop the *_admin_audit_trigger
-- triggers entirely. Kept enabled (and now non-fatal) on hosted.

CREATE OR REPLACE FUNCTION public.log_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Audit insert must never break the audited operation.
  BEGIN
    INSERT INTO activity_log (
      tenant_id, user_id, user_email, user_name, action, entity_type,
      entity_id, entity_name, description, changes, metadata
    ) VALUES (
      v_tenant_id, v_user_id, v_user_email, v_user_name, v_action, TG_TABLE_NAME,
      v_entity_id, v_entity_id::TEXT, v_description, v_changes,
      jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'log_activity: skipped audit row for %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_admin_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  secret_keys TEXT[] := ARRAY['key_hash', 'secret_key', 'token', 'config'];
BEGIN
  v_user_id := auth.uid();

  v_old := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) ELSE NULL END;
  v_new := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) ELSE NULL END;
  v_rec := COALESCE(v_new, v_old);

  IF TG_TABLE_NAME = 'tenants' THEN
    v_tenant_id := NULLIF(v_rec->>'id', '')::UUID;
  ELSE
    v_tenant_id := NULLIF(v_rec->>'tenant_id', '')::UUID;
  END IF;

  IF v_tenant_id IS NULL AND (v_rec ? 'user_id') THEN
    SELECT tenant_id INTO v_tenant_id
    FROM profiles WHERE id = NULLIF(v_rec->>'user_id', '')::UUID;
  END IF;

  IF v_tenant_id IS NULL AND v_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT email, full_name INTO v_user_email, v_user_name
  FROM profiles WHERE id = v_user_id;

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

  -- Audit insert must never break the audited operation.
  BEGIN
    INSERT INTO activity_log (
      tenant_id, user_id, user_email, user_name, action, entity_type,
      entity_id, entity_name, description, changes, metadata
    ) VALUES (
      v_tenant_id, v_user_id, v_user_email, v_user_name, v_action, TG_TABLE_NAME,
      v_entity_id, v_entity_name, v_action || ' ' || TG_TABLE_NAME, v_changes,
      jsonb_build_object('table', TG_TABLE_NAME, 'schema', TG_TABLE_SCHEMA, 'admin_audit', true)
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'log_admin_activity: skipped audit row for %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
