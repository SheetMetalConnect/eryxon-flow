


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'operator',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."assignment_status" AS ENUM (
    'assigned',
    'accepted',
    'in_progress',
    'completed'
);


ALTER TYPE "public"."assignment_status" OWNER TO "postgres";


CREATE TYPE "public"."batch_status" AS ENUM (
    'draft',
    'ready',
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."batch_status" OWNER TO "postgres";


CREATE TYPE "public"."batch_type" AS ENUM (
    'laser_nesting',
    'tube_batch',
    'saw_batch',
    'finishing_batch',
    'general'
);


ALTER TYPE "public"."batch_type" OWNER TO "postgres";


CREATE TYPE "public"."exception_status" AS ENUM (
    'open',
    'acknowledged',
    'resolved',
    'dismissed'
);


ALTER TYPE "public"."exception_status" OWNER TO "postgres";


CREATE TYPE "public"."exception_type" AS ENUM (
    'late',
    'early',
    'non_occurrence',
    'exceeded',
    'under'
);


ALTER TYPE "public"."exception_type" OWNER TO "postgres";


CREATE TYPE "public"."expectation_type" AS ENUM (
    'completion_time',
    'duration',
    'quantity',
    'delivery'
);


ALTER TYPE "public"."expectation_type" OWNER TO "postgres";


CREATE TYPE "public"."integration_category" AS ENUM (
    'erp',
    'accounting',
    'crm',
    'inventory',
    'analytics',
    'other'
);


ALTER TYPE "public"."integration_category" OWNER TO "postgres";


CREATE TYPE "public"."integration_status" AS ENUM (
    'draft',
    'published',
    'deprecated',
    'archived'
);


ALTER TYPE "public"."integration_status" OWNER TO "postgres";


CREATE TYPE "public"."invoice_payment_status" AS ENUM (
    'pending',
    'sent',
    'viewed',
    'paid',
    'overdue',
    'cancelled',
    'refunded'
);


ALTER TYPE "public"."invoice_payment_status" OWNER TO "postgres";


CREATE TYPE "public"."issue_severity" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."issue_severity" OWNER TO "postgres";


CREATE TYPE "public"."issue_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'closed'
);


ALTER TYPE "public"."issue_status" OWNER TO "postgres";


CREATE TYPE "public"."issue_type" AS ENUM (
    'general',
    'ncr'
);


ALTER TYPE "public"."issue_type" OWNER TO "postgres";


CREATE TYPE "public"."job_status" AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'on_hold'
);


ALTER TYPE "public"."job_status" OWNER TO "postgres";


CREATE TYPE "public"."ncr_category" AS ENUM (
    'material_defect',
    'dimensional',
    'surface_finish',
    'process_error',
    'other'
);


ALTER TYPE "public"."ncr_category" OWNER TO "postgres";


CREATE TYPE "public"."ncr_disposition" AS ENUM (
    'scrap',
    'rework',
    'use_as_is',
    'return_to_supplier'
);


ALTER TYPE "public"."ncr_disposition" OWNER TO "postgres";


CREATE TYPE "public"."payment_provider" AS ENUM (
    'invoice',
    'stripe',
    'sumup'
);


ALTER TYPE "public"."payment_provider" OWNER TO "postgres";


CREATE TYPE "public"."payment_transaction_status" AS ENUM (
    'pending',
    'processing',
    'succeeded',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."payment_transaction_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_transaction_type" AS ENUM (
    'charge',
    'refund',
    'chargeback',
    'dispute'
);


ALTER TYPE "public"."payment_transaction_type" OWNER TO "postgres";






CREATE TYPE "public"."subscription_plan" AS ENUM (
    'free',
    'pro',
    'premium',
    'enterprise'
);


ALTER TYPE "public"."subscription_plan" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'cancelled',
    'suspended',
    'trial'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'on_hold'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";






CREATE TYPE "public"."waitlist_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'converted'
);


ALTER TYPE "public"."waitlist_status" OWNER TO "postgres";




CREATE OR REPLACE FUNCTION "public"."acknowledge_demo_mode"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE tenants
  SET demo_mode_acknowledged = true
  WHERE id = p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."acknowledge_demo_mode"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."acknowledge_demo_mode"("p_tenant_id" "uuid") IS 'User acknowledges they want to keep demo data - dismisses the banner';



CREATE OR REPLACE FUNCTION "public"."acknowledge_exception"("p_exception_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE exceptions
  SET status = 'acknowledged',
      acknowledged_at = now(),
      acknowledged_by = auth.uid()
  WHERE id = p_exception_id
    AND tenant_id = get_user_tenant_id()
    AND status = 'open';
END;
$$;


ALTER FUNCTION "public"."acknowledge_exception"("p_exception_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_close_stale_attendance"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Close any attendance entries that are still active after 16 hours
  UPDATE attendance_entries
  SET 
    clock_out = clock_in + INTERVAL '16 hours',
    duration_minutes = 16 * 60,
    status = 'auto_closed'
  WHERE status = 'active'
    AND clock_in < now() - INTERVAL '16 hours';
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."auto_close_stale_attendance"() OWNER TO "postgres";




CREATE OR REPLACE FUNCTION "public"."can_create_job"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_jobs integer;
  v_max_jobs integer;
BEGIN
  SELECT current_jobs, max_jobs
  INTO v_current_jobs, v_max_jobs
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF v_max_jobs IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN v_current_jobs < v_max_jobs;
END;
$$;


ALTER FUNCTION "public"."can_create_job"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_create_parts"("p_tenant_id" "uuid", "p_quantity" integer DEFAULT 1) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_parts integer;
  v_max_parts integer;
BEGIN
  SELECT current_parts_this_month, max_parts_per_month
  INTO v_current_parts, v_max_parts
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  IF v_max_parts IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN (v_current_parts + p_quantity) <= v_max_parts;
END;
$$;


ALTER FUNCTION "public"."can_create_parts"("p_tenant_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_upload_file"("p_tenant_id" "uuid", "p_file_size_bytes" bigint) RETURNS TABLE("allowed" boolean, "reason" "text", "current_gb" numeric, "max_gb" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_gb numeric;
  v_max_gb numeric;
  v_file_size_gb numeric;
BEGIN
  SELECT current_storage_gb, max_storage_gb
  INTO v_current_gb, v_max_gb
  FROM tenants
  WHERE id = p_tenant_id;
  
  v_file_size_gb := p_file_size_bytes::numeric / 1073741824.0;
  
  IF v_max_gb IS NULL THEN
    RETURN QUERY SELECT true, 'Unlimited storage'::text, v_current_gb, v_max_gb;
  ELSIF (v_current_gb + v_file_size_gb) <= v_max_gb THEN
    RETURN QUERY SELECT true, 'Storage available'::text, v_current_gb, v_max_gb;
  ELSE
    RETURN QUERY SELECT false, 'Storage quota exceeded'::text, v_current_gb, v_max_gb;
  END IF;
END;
$$;


ALTER FUNCTION "public"."can_upload_file"("p_tenant_id" "uuid", "p_file_size_bytes" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_invitation"("p_invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_user_tenant_id();

  -- Check permission
  IF get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can cancel invitations';
  END IF;

  -- Update invitation status
  UPDATE invitations
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_invitation_id
    AND tenant_id = v_tenant_id
    AND status = 'pending';

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."cancel_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_jobs_due_soon"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_job RECORD;
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_count INTEGER := 0;
  v_days_until_due INTEGER;
  v_severity TEXT;
BEGIN
  -- Check for jobs due within the next 7 days
  FOR v_job IN
    SELECT id, tenant_id, job_number, customer, due_date
    FROM public.jobs
    WHERE status != 'completed'
      AND due_date IS NOT NULL
      AND due_date <= (CURRENT_DATE + INTERVAL '7 days')
      AND due_date >= CURRENT_DATE
      -- Don't create duplicate notifications (check if one was created in the last 24 hours)
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE reference_type = 'job'
          AND reference_id = jobs.id
          AND type = 'job_due'
          AND created_at > now() - INTERVAL '24 hours'
      )
  LOOP
    -- Calculate days until due
    v_days_until_due := EXTRACT(DAY FROM (v_job.due_date - CURRENT_DATE));

    -- Set severity based on days until due
    IF v_days_until_due <= 1 THEN
      v_severity := 'high';
    ELSIF v_days_until_due <= 3 THEN
      v_severity := 'medium';
    ELSE
      v_severity := 'low';
    END IF;

    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = v_job.tenant_id AND role = 'admin';

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          v_job.tenant_id,
          v_admin_id,
          'job_due',
          v_severity,
          'Job Due Soon',
          'JOB-' || v_job.job_number || ' - ' || COALESCE(v_job.customer, 'No customer') ||
          ' is due in ' || v_days_until_due || ' day(s)',
          '/admin/jobs',
          'job',
          v_job.id,
          jsonb_build_object(
            'job_id', v_job.id,
            'job_number', v_job.job_number,
            'customer', v_job.customer,
            'due_date', v_job.due_date,
            'days_until_due', v_days_until_due
          )
        );
        v_count := v_count + 1;
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."check_jobs_due_soon"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_jobs_due_soon"() IS 'Checks for jobs due soon and creates notifications - can be run via cron';



CREATE OR REPLACE FUNCTION "public"."check_mcp_tool_permission"("p_key_id" "uuid", "p_tool_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_allowed_tools JSONB;
BEGIN
  SELECT allowed_tools INTO v_allowed_tools
  FROM mcp_authentication_keys
  WHERE id = p_key_id;

  IF v_allowed_tools @> '["*"]'::jsonb THEN
    RETURN true;
  END IF;

  RETURN v_allowed_tools @> to_jsonb(ARRAY[p_tool_name]);
END;
$$;


ALTER FUNCTION "public"."check_mcp_tool_permission"("p_key_id" "uuid", "p_tool_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_next_cell_capacity"("current_cell_id" "uuid", "tenant_id_param" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
  v_next_sequence INTEGER;
BEGIN
  SELECT sequence + 1 INTO v_next_sequence
  FROM cells WHERE id = current_cell_id;
  
  SELECT json_build_object(
    'has_capacity', true,
    'current_wip', COUNT(*),
    'wip_limit', MAX(c.wip_limit)
  )
  INTO v_result
  FROM operations o
  JOIN cells c ON o.cell_id = c.id
  WHERE c.sequence = v_next_sequence
    AND c.tenant_id = tenant_id_param
    AND o.status IN ('not_started', 'in_progress');
    
  RETURN COALESCE(v_result, '{"has_capacity": true, "current_wip": 0}'::json);
END;
$$;


ALTER FUNCTION "public"."check_next_cell_capacity"("current_cell_id" "uuid", "tenant_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_invitations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.invitations SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_invitations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_mqtt_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM public.mqtt_logs WHERE created_at < now() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_mqtt_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_demo_data"("p_tenant_id" "uuid") RETURNS TABLE("deleted_count" integer, "table_name" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_count INTEGER; operation_ids UUID[];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = p_tenant_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  DELETE FROM notifications WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'notifications'::TEXT, 'deleted'::TEXT;
  DELETE FROM issues WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'issues'::TEXT, 'deleted'::TEXT;
  DELETE FROM operation_quantities WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operation_quantities'::TEXT, 'deleted'::TEXT;
  DELETE FROM time_entry_pauses WHERE time_entry_id IN (SELECT id FROM time_entries WHERE tenant_id = p_tenant_id); GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'time_entry_pauses'::TEXT, 'deleted'::TEXT;
  DELETE FROM time_entries WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'time_entries'::TEXT, 'deleted'::TEXT;
  DELETE FROM substeps WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'substeps'::TEXT, 'deleted'::TEXT;
  SELECT array_agg(id) INTO operation_ids FROM operations WHERE tenant_id = p_tenant_id;
  IF operation_ids IS NOT NULL THEN
    DELETE FROM operation_resources WHERE operation_id = ANY(operation_ids); GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count, 'operation_resources'::TEXT, 'deleted'::TEXT;
  END IF;
  DELETE FROM operations WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operations'::TEXT, 'deleted'::TEXT;
  DELETE FROM parts WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'parts'::TEXT, 'deleted'::TEXT;
  DELETE FROM jobs WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'jobs'::TEXT, 'deleted'::TEXT;
  DELETE FROM cells WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'cells'::TEXT, 'deleted'::TEXT;
  DELETE FROM resources WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'resources'::TEXT, 'deleted'::TEXT;
  DELETE FROM scrap_reasons WHERE tenant_id = p_tenant_id; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'scrap_reasons'::TEXT, 'deleted'::TEXT;
  DELETE FROM profiles WHERE tenant_id = p_tenant_id AND role = 'operator' AND email LIKE 'demo.operator%@example.com'; GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'profiles'::TEXT, 'deleted'::TEXT;
  UPDATE tenants SET current_jobs = 0, current_parts_this_month = 0, demo_mode_enabled = false WHERE id = p_tenant_id;
  RETURN QUERY SELECT 1::INTEGER, 'reset'::TEXT, 'complete'::TEXT;
END; $$;


ALTER FUNCTION "public"."clear_demo_data"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."app_role" DEFAULT 'operator'::"public"."app_role", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $_$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());
  
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;
  
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant_id AND LOWER(email) = LOWER(p_email)) THEN
    RAISE EXCEPTION 'User with this email already exists in your organization';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.invitations WHERE LOWER(email) = LOWER(p_email) AND tenant_id = v_tenant_id AND status = 'pending') THEN
    RAISE EXCEPTION 'A pending invitation already exists for this email';
  END IF;
  
  v_token := replace(replace(replace(encode(extensions.gen_random_bytes(32), 'base64'), '/', '_'), '+', '-'), '=', '');
  
  INSERT INTO public.invitations (tenant_id, email, role, token, invited_by)
  VALUES (v_tenant_id, LOWER(p_email), p_role, v_token, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$_$;


ALTER FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job_completion_expectation"("p_job_id" "uuid", "p_tenant_id" "uuid", "p_due_date" timestamp with time zone, "p_source" "text" DEFAULT 'system'::"text", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_job_number TEXT;
  v_expectation_id UUID;
BEGIN
  SELECT job_number INTO v_job_number FROM jobs WHERE id = p_job_id;
  
  INSERT INTO expectations (
    tenant_id,
    entity_type,
    entity_id,
    expectation_type,
    belief_statement,
    expected_value,
    expected_at,
    source,
    created_by,
    context
  ) VALUES (
    p_tenant_id,
    'job',
    p_job_id,
    'completion_time',
    format('Job %s should be completed on time', v_job_number),
    jsonb_build_object('due_at', p_due_date),
    p_due_date,
    p_source,
    p_created_by,
    jsonb_build_object('job_number', v_job_number)
  )
  RETURNING id INTO v_expectation_id;
  
  RETURN v_expectation_id;
END;
$$;


ALTER FUNCTION "public"."create_job_completion_expectation"("p_job_id" "uuid", "p_tenant_id" "uuid", "p_due_date" timestamp with time zone, "p_source" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_mcp_endpoint"("p_name" "text", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("endpoint_id" "uuid", "endpoint_name" "text", "token" "text", "token_prefix" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_token_prefix TEXT;
  v_token_hash TEXT;
  v_endpoint_id UUID;
BEGIN
  -- Get current user and tenant
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());

  -- Only admins can create endpoints
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create MCP endpoints';
  END IF;

  -- Validate name
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Endpoint name is required';
  END IF;

  -- Check for duplicate name
  IF EXISTS (
    SELECT 1 FROM public.mcp_endpoints
    WHERE tenant_id = v_tenant_id AND LOWER(name) = LOWER(trim(p_name))
  ) THEN
    RAISE EXCEPTION 'An endpoint with this name already exists';
  END IF;

  -- Generate secure token: mcp_ + 32 random bytes as URL-safe base64
  v_token := 'mcp_' || replace(replace(replace(
    encode(extensions.gen_random_bytes(32), 'base64'),
    '/', '_'), '+', '-'), '=', '');

  v_token_prefix := substring(v_token from 1 for 12);
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  -- Create endpoint
  INSERT INTO public.mcp_endpoints (
    tenant_id,
    name,
    token_hash,
    token_prefix,
    created_by
  ) VALUES (
    v_tenant_id,
    trim(p_name),
    v_token_hash,
    v_token_prefix,
    v_user_id
  )
  RETURNING id INTO v_endpoint_id;

  -- Return the created endpoint with token (token only shown once!)
  RETURN QUERY SELECT
    v_endpoint_id,
    trim(p_name),
    v_token,
    v_token_prefix;
END;
$$;


ALTER FUNCTION "public"."create_mcp_endpoint"("p_name" "text", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_link" "text" DEFAULT NULL::"text", "p_reference_type" "text" DEFAULT NULL::"text", "p_reference_id" "uuid" DEFAULT NULL::"uuid", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    tenant_id,
    user_id,
    type,
    severity,
    title,
    message,
    link,
    reference_type,
    reference_id,
    metadata
  )
  VALUES (
    p_tenant_id,
    p_user_id,
    p_type,
    p_severity,
    p_title,
    p_message,
    p_link,
    p_reference_type,
    p_reference_id,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_operator_with_pin"("p_full_name" "text", "p_pin" "text", "p_employee_id" "text" DEFAULT NULL::"text") RETURNS TABLE("operator_id" "uuid", "employee_id" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_tenant_id UUID;
  v_new_operator_id UUID;
  v_employee_id TEXT;
  v_operator_number INTEGER;
  v_abbreviation TEXT;
  v_pin_hash TEXT;
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;

  IF p_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  v_pin_hash := extensions.crypt(p_pin, extensions.gen_salt('bf', 8));

  IF p_employee_id IS NOT NULL AND TRIM(p_employee_id) != '' THEN
    v_employee_id := UPPER(TRIM(p_employee_id));

    IF EXISTS (
      SELECT 1 FROM operators op
      WHERE op.tenant_id = v_tenant_id
      AND UPPER(op.employee_id) = v_employee_id
    ) THEN
      RAISE EXCEPTION 'Employee ID % already exists in this organization', v_employee_id;
    END IF;
  ELSE
    SELECT abbreviation, COALESCE(next_operator_number, 1)
    INTO v_abbreviation, v_operator_number
    FROM tenants WHERE id = v_tenant_id;

    IF v_abbreviation IS NULL OR v_abbreviation = '' THEN
      SELECT generate_tenant_abbreviation(COALESCE(company_name, name))
      INTO v_abbreviation
      FROM tenants WHERE id = v_tenant_id;

      UPDATE tenants SET abbreviation = v_abbreviation WHERE id = v_tenant_id;
    END IF;

    v_employee_id := v_abbreviation || LPAD(v_operator_number::TEXT, 4, '0');

    UPDATE tenants
    SET next_operator_number = COALESCE(next_operator_number, 1) + 1
    WHERE id = v_tenant_id;
  END IF;

  INSERT INTO operators (
    tenant_id, employee_id, full_name, pin_hash, created_by, active,
    failed_attempts, locked_until
  ) VALUES (
    v_tenant_id, v_employee_id, p_full_name, v_pin_hash, auth.uid(), true,
    0, NULL
  )
  RETURNING id INTO v_new_operator_id;

  RETURN QUERY SELECT v_new_operator_id, v_employee_id, 'Operator created successfully'::TEXT;
END;
$_$;


ALTER FUNCTION "public"."create_operator_with_pin"("p_full_name" "text", "p_pin" "text", "p_employee_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_operator_with_pin"("p_tenant_id" "uuid", "p_employee_id" "text", "p_full_name" "text", "p_pin" "text", "p_role" "public"."app_role" DEFAULT 'operator'::"public"."app_role") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_dummy_email TEXT;
BEGIN
  -- Validate PIN (must be 4-6 digits)
  IF p_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  -- Generate a new UUID for the operator
  v_user_id := gen_random_uuid();
  
  -- Generate username from full name
  v_username := lower(regexp_replace(p_full_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Create a dummy email (operators don't use email login)
  v_dummy_email := v_username || '@operator.local';
  
  -- Insert profile
  INSERT INTO public.profiles (
    id,
    tenant_id,
    employee_id,
    username,
    full_name,
    email,
    role,
    pin_hash,
    has_email_login,
    active
  ) VALUES (
    v_user_id,
    p_tenant_id,
    p_employee_id,
    v_username,
    p_full_name,
    v_dummy_email,
    p_role,
    crypt(p_pin, gen_salt('bf')),
    false,
    true
  );
  
  -- Create user_roles entry for RLS
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, p_role);
  
  RETURN v_user_id;
END;
$_$;


ALTER FUNCTION "public"."create_operator_with_pin"("p_tenant_id" "uuid", "p_employee_id" "text", "p_full_name" "text", "p_pin" "text", "p_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_tenant_data"("p_tenant_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_deleted_counts JSONB := '{}'::JSONB;
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only tenant admins can delete tenant data';
  END IF;

  DELETE FROM public.webhook_logs WHERE webhook_id IN (SELECT id FROM public.webhooks WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhook_logs}', to_jsonb(v_count));

  DELETE FROM public.webhooks WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhooks}', to_jsonb(v_count));

  DELETE FROM public.api_keys WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{api_keys}', to_jsonb(v_count));

  DELETE FROM public.operation_resources WHERE operation_id IN (SELECT id FROM public.operations WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operation_resources}', to_jsonb(v_count));

  DELETE FROM public.time_entry_pauses WHERE time_entry_id IN (SELECT id FROM public.time_entries WHERE tenant_id = p_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entry_pauses}', to_jsonb(v_count));

  DELETE FROM public.time_entries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entries}', to_jsonb(v_count));

  DELETE FROM public.assignments WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{assignments}', to_jsonb(v_count));

  DELETE FROM public.substeps WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{substeps}', to_jsonb(v_count));

  DELETE FROM public.issues WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{issues}', to_jsonb(v_count));

  DELETE FROM public.operations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operations}', to_jsonb(v_count));

  DELETE FROM public.parts WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{parts}', to_jsonb(v_count));

  DELETE FROM public.jobs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{jobs}', to_jsonb(v_count));

  DELETE FROM public.resources WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{resources}', to_jsonb(v_count));

  DELETE FROM public.materials WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{materials}', to_jsonb(v_count));

  DELETE FROM public.cells WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{cells}', to_jsonb(v_count));

  DELETE FROM public.monthly_reset_logs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{monthly_reset_logs}', to_jsonb(v_count));

  DELETE FROM public.profiles WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{profiles}', to_jsonb(v_count));

  DELETE FROM public.tenants WHERE id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{tenants}', to_jsonb(v_count));

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


ALTER FUNCTION "public"."delete_tenant_data"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_tenant_data"("p_tenant_id" "uuid") IS 'Deletes tenant-scoped data with fixed search_path and admin check';



CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_deleted_counts JSONB := '{}'::JSONB;
  v_count INTEGER;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Delete time entry pauses for this user's time entries
  DELETE FROM public.time_entry_pauses tep
  USING public.time_entries te
  WHERE tep.time_entry_id = te.id
    AND te.operator_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entry_pauses}', to_jsonb(v_count));

  -- Delete time entries for this user
  DELETE FROM public.time_entries WHERE operator_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{time_entries}', to_jsonb(v_count));

  -- Delete assignments involving this user
  DELETE FROM public.assignments WHERE operator_id = v_user_id OR assigned_by = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{assignments}', to_jsonb(v_count));

  -- Delete issues created/reported/reviewed by this user
  DELETE FROM public.issues WHERE created_by = v_user_id OR reported_by_id = v_user_id OR reviewed_by = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{issues}', to_jsonb(v_count));

  -- Delete role mappings
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{user_roles}', to_jsonb(v_count));

  -- Delete profile (will cascade to auth.users if FK has cascade)
  DELETE FROM public.profiles WHERE id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{profile}', to_jsonb(v_count));

  -- Ensure auth.users is also removed (defensive)
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


ALTER FUNCTION "public"."delete_user_account"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_account"() IS 'Deletes a user and their related data using correct column names and a fixed search_path';



CREATE OR REPLACE FUNCTION "public"."detect_job_completion_exception"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_expectation RECORD;
  v_deviation_minutes NUMERIC;
BEGIN
  -- Only run when job status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find the active expectation for this job
    SELECT * INTO v_expectation
    FROM expectations
    WHERE entity_type = 'job'
      AND entity_id = NEW.id
      AND expectation_type = 'completion_time'
      AND superseded_by IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND AND v_expectation.expected_at IS NOT NULL THEN
      v_deviation_minutes := EXTRACT(EPOCH FROM (now() - v_expectation.expected_at)) / 60;
      
      -- If completed late (more than 1 minute after expected)
      IF v_deviation_minutes > 1 THEN
        INSERT INTO exceptions (
          tenant_id,
          expectation_id,
          exception_type,
          status,
          actual_value,
          occurred_at,
          deviation_amount,
          deviation_unit,
          metadata
        ) VALUES (
          NEW.tenant_id,
          v_expectation.id,
          'late',
          'open',
          jsonb_build_object('completed_at', now()),
          now(),
          v_deviation_minutes,
          'minutes',
          jsonb_build_object('job_number', NEW.job_number)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."detect_job_completion_exception"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_operation_completion_exception"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_expectation RECORD;
  v_deviation_minutes NUMERIC;
BEGIN
  -- Only run when operation status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Find the active expectation for this operation
    SELECT * INTO v_expectation
    FROM expectations
    WHERE entity_type = 'operation'
      AND entity_id = NEW.id
      AND expectation_type = 'completion_time'
      AND superseded_by IS NULL
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF FOUND AND v_expectation.expected_at IS NOT NULL THEN
      v_deviation_minutes := EXTRACT(EPOCH FROM (now() - v_expectation.expected_at)) / 60;
      
      -- If completed late (more than 1 minute after expected)
      IF v_deviation_minutes > 1 THEN
        INSERT INTO exceptions (
          tenant_id,
          expectation_id,
          exception_type,
          status,
          actual_value,
          occurred_at,
          deviation_amount,
          deviation_unit,
          metadata
        ) VALUES (
          NEW.tenant_id,
          v_expectation.id,
          'late',
          'open',
          jsonb_build_object('completed_at', now()),
          now(),
          v_deviation_minutes,
          'minutes',
          jsonb_build_object('operation_name', NEW.operation_name)
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."detect_operation_completion_exception"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."disable_demo_mode"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = false,
    demo_data_seeded_at = NULL,
    demo_data_seeded_by = NULL
  WHERE id = p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."disable_demo_mode"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."disable_demo_mode"("p_tenant_id" "uuid") IS 'Removes demo mode flag from tenant, typically called after clearMockData()';



CREATE OR REPLACE FUNCTION "public"."dismiss_exception"("p_exception_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE exceptions
  SET status = 'dismissed',
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution = jsonb_build_object('dismiss_reason', p_reason)
  WHERE id = p_exception_id
    AND tenant_id = get_user_tenant_id();
END;
$$;


ALTER FUNCTION "public"."dismiss_exception"("p_exception_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.notifications
  SET dismissed = true, dismissed_at = now()
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid());
END;
$$;


ALTER FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dispatch_webhook"("p_tenant_id" "uuid", "p_event_type" "text", "p_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_supabase_url text;
BEGIN
  -- Get Supabase URL from environment
  v_supabase_url := 'https://vatgianzotsurljznsry.supabase.co';
  
  -- Call webhook-dispatch edge function via pg_net
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/webhook-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'tenant_id', p_tenant_id,
      'event_type', p_event_type,
      'data', p_data
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to dispatch webhook: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."dispatch_webhook"("p_tenant_id" "uuid", "p_event_type" "text", "p_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enable_demo_mode"("p_tenant_id" "uuid", "p_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE tenants
  SET
    demo_mode_enabled = true,
    demo_data_seeded_at = NOW(),
    demo_data_seeded_by = p_user_id
  WHERE id = p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."enable_demo_mode"("p_tenant_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enable_demo_mode"("p_tenant_id" "uuid", "p_user_id" "uuid") IS 'Marks a tenant as being in demo mode with timestamp and user tracking';



CREATE OR REPLACE FUNCTION "public"."generate_mcp_key"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_environment" "text" DEFAULT 'live'::"text", "p_allowed_tools" "jsonb" DEFAULT '["*"]'::"jsonb", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("key_id" "uuid", "api_key" "text", "key_prefix" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_key_id UUID;
  v_raw_key TEXT;
  v_key_hash TEXT;
  v_prefix TEXT;
  v_environment_prefix TEXT;
BEGIN
  IF p_environment NOT IN ('live', 'test') THEN
    RAISE EXCEPTION 'Environment must be live or test';
  END IF;

  v_environment_prefix := CASE p_environment
    WHEN 'live' THEN 'mcp_live_'
    WHEN 'test' THEN 'mcp_test_'
  END;

  v_raw_key := v_environment_prefix || encode(gen_random_bytes(24), 'base64');
  v_raw_key := replace(v_raw_key, '/', '_');
  v_raw_key := replace(v_raw_key, '+', '-');
  v_raw_key := substring(v_raw_key, 1, length(v_environment_prefix) + 32);
  v_prefix := substring(v_raw_key, 1, 12);
  v_key_hash := crypt(v_raw_key, gen_salt('bf', 10));

  INSERT INTO mcp_authentication_keys (
    tenant_id, key_hash, key_prefix, name, description, environment, allowed_tools, created_by
  ) VALUES (
    p_tenant_id, v_key_hash, v_prefix, p_name, p_description, p_environment, p_allowed_tools, p_created_by
  )
  RETURNING id INTO v_key_id;

  RETURN QUERY SELECT v_key_id, v_raw_key, v_prefix;
END;
$$;


ALTER FUNCTION "public"."generate_mcp_key"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_environment" "text", "p_allowed_tools" "jsonb", "p_created_by" "uuid") OWNER TO "postgres";




CREATE OR REPLACE FUNCTION "public"."generate_sync_hash"("payload" "jsonb") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$ SELECT md5(payload::text); $$;


ALTER FUNCTION "public"."generate_sync_hash"("payload" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tenant_abbreviation"("p_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_words TEXT[];
  v_abbr TEXT := '';
  v_word TEXT;
BEGIN
  -- Split by spaces and get first letter of each word (max 4 words)
  v_words := regexp_split_to_array(UPPER(TRIM(p_name)), '\s+');
  
  FOREACH v_word IN ARRAY v_words[1:4]
  LOOP
    IF LENGTH(v_word) > 0 THEN
      v_abbr := v_abbr || SUBSTRING(v_word FROM 1 FOR 1);
    END IF;
  END LOOP;
  
  -- Ensure at least 2 characters
  IF LENGTH(v_abbr) < 2 THEN
    v_abbr := UPPER(SUBSTRING(p_name FROM 1 FOR 3));
  END IF;
  
  RETURN v_abbr;
END;
$$;


ALTER FUNCTION "public"."generate_tenant_abbreviation"("p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_activity_logs"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0, "p_action" "text" DEFAULT NULL::"text", "p_entity_type" "text" DEFAULT NULL::"text", "p_search" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "user_email" "text", "user_name" "text", "action" "text", "entity_type" "text", "entity_id" "uuid", "entity_name" "text", "description" "text", "changes" "jsonb", "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_activity_logs"("p_limit" integer, "p_offset" integer, "p_action" "text", "p_entity_type" "text", "p_search" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_activity_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) RETURNS TABLE("total_activities" bigint, "unique_users" bigint, "activities_by_action" "jsonb", "activities_by_entity" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_activity_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_api_usage_stats"("p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("today_requests" integer, "this_month_requests" bigint, "reset_at" timestamp with time zone, "daily_limit" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID := COALESCE(p_tenant_id, public.get_user_tenant_id());
  v_plan TEXT;
  v_daily_limit INTEGER;
BEGIN
  -- Get tenant plan
  SELECT t.plan INTO v_plan
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  -- Determine daily limit based on plan
  v_daily_limit := CASE v_plan
    WHEN 'free' THEN 100
    WHEN 'pro' THEN 1000
    WHEN 'premium' THEN 10000
    WHEN 'enterprise' THEN NULL -- unlimited
    ELSE 100
  END;

  RETURN QUERY
  SELECT
    COALESCE(t.api_requests_today, 0)::INTEGER as today_requests,
    COALESCE((
      SELECT SUM(requests_count)
      FROM api_usage_logs
      WHERE tenant_id = v_tenant_id
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
    ), 0)::BIGINT as this_month_requests,
    t.api_requests_reset_at as reset_at,
    v_daily_limit as daily_limit
  FROM public.tenants t
  WHERE t.id = v_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_api_usage_stats"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cell_qrm_metrics"("cell_id_param" "uuid", "tenant_id_param" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
  v_current_wip INTEGER;
  v_wip_limit INTEGER;
  v_wip_warning_threshold INTEGER;
  v_enforce_limit BOOLEAN;
  v_show_warning BOOLEAN;
  v_cell_name TEXT;
  v_utilization_percent NUMERIC;
  v_status TEXT;
BEGIN
  -- Get cell configuration
  SELECT 
    name,
    wip_limit,
    wip_warning_threshold,
    enforce_wip_limit,
    show_capacity_warning
  INTO
    v_cell_name,
    v_wip_limit,
    v_wip_warning_threshold,
    v_enforce_limit,
    v_show_warning
  FROM public.cells
  WHERE id = cell_id_param 
    AND tenant_id = tenant_id_param
    AND active = true;

  -- If cell not found, return null
  IF v_cell_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count unique JOBS in this cell (not operations)
  -- A job is counted if it has any operation in this cell that is not completed
  SELECT COUNT(DISTINCT p.job_id)
  INTO v_current_wip
  FROM public.operations o
  INNER JOIN public.parts p ON o.part_id = p.id
  WHERE o.cell_id = cell_id_param
    AND o.tenant_id = tenant_id_param
    AND o.status IN ('not_started', 'in_progress');

  -- Calculate utilization percentage
  IF v_wip_limit IS NOT NULL AND v_wip_limit > 0 THEN
    v_utilization_percent := ROUND((v_current_wip::NUMERIC / v_wip_limit::NUMERIC) * 100, 1);
  ELSE
    v_utilization_percent := NULL;
  END IF;

  -- Determine status
  IF v_wip_limit IS NULL THEN
    v_status := 'no_limit';
  ELSIF v_current_wip >= v_wip_limit THEN
    v_status := 'at_capacity';
  ELSIF v_wip_warning_threshold IS NOT NULL AND v_current_wip >= v_wip_warning_threshold THEN
    v_status := 'warning';
  ELSIF v_wip_limit IS NOT NULL AND v_current_wip >= (v_wip_limit * 0.8) THEN
    v_status := 'warning';
  ELSE
    v_status := 'normal';
  END IF;

  -- Build result JSON
  v_result := json_build_object(
    'cell_id', cell_id_param,
    'cell_name', v_cell_name,
    'current_wip', COALESCE(v_current_wip, 0),
    'wip_limit', v_wip_limit,
    'wip_warning_threshold', v_wip_warning_threshold,
    'enforce_limit', COALESCE(v_enforce_limit, false),
    'show_warning', COALESCE(v_show_warning, true),
    'utilization_percent', v_utilization_percent,
    'status', v_status
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_cell_qrm_metrics"("cell_id_param" "uuid", "tenant_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_cell_qrm_metrics"("cell_id_param" "uuid", "tenant_id_param" "uuid") IS 'Returns QRM metrics for a cell counting unique jobs (not operations) to reflect true work-in-progress parallelization';



CREATE OR REPLACE FUNCTION "public"."get_cell_wip_count"("cell_id_param" "uuid", "tenant_id_param" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  wip_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(j.id, p.id))
  INTO wip_count
  FROM operations o
  LEFT JOIN parts p ON o.part_id = p.id
  LEFT JOIN jobs j ON p.job_id = j.id
  WHERE o.cell_id = cell_id_param
    AND o.status IN ('not_started', 'in_progress')
    AND (j.tenant_id = tenant_id_param OR p.tenant_id = tenant_id_param);

  RETURN COALESCE(wip_count, 0);
END;
$$;


ALTER FUNCTION "public"."get_cell_wip_count"("cell_id_param" "uuid", "tenant_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exception_stats"("p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("open_count" bigint, "acknowledged_count" bigint, "resolved_count" bigint, "dismissed_count" bigint, "total_count" bigint, "avg_resolution_time_hours" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := COALESCE(p_tenant_id, get_user_tenant_id());
  
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'open')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'acknowledged')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'dismissed')::BIGINT,
    COUNT(*)::BIGINT,
    ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL), 2)
  FROM exceptions
  WHERE tenant_id = v_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_exception_stats"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitation_by_token"("p_token" "text") RETURNS TABLE("id" "uuid", "email" "text", "role" "public"."app_role", "tenant_id" "uuid", "tenant_name" "text", "invited_by_name" "text", "expires_at" timestamp with time zone, "status" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT i.id, i.email, i.role, i.tenant_id, t.name as tenant_name,
         p.full_name as invited_by_name, i.expires_at, i.status
  FROM public.invitations i
  JOIN public.tenants t ON t.id = i.tenant_id
  JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.token = p_token AND i.status = 'pending' AND i.expires_at > NOW();
$$;


ALTER FUNCTION "public"."get_invitation_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_job_issue_summary"("job_id_param" "uuid") RETURNS TABLE("total_count" bigint, "pending_count" bigint, "highest_severity" "public"."issue_severity")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE i.status = 'pending')::BIGINT as pending_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE i.severity = 'critical') > 0 THEN 'critical'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'high') > 0 THEN 'high'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'medium') > 0 THEN 'medium'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'low') > 0 THEN 'low'::public.issue_severity
      ELSE NULL
    END as highest_severity
  FROM public.issues i
  INNER JOIN public.operations o ON i.operation_id = o.id
  INNER JOIN public.parts p ON o.part_id = p.id
  WHERE p.job_id = job_id_param;
$$;


ALTER FUNCTION "public"."get_job_issue_summary"("job_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_mcp_key_stats"("p_key_id" "uuid") RETURNS TABLE("total_requests" bigint, "successful_requests" bigint, "failed_requests" bigint, "avg_response_time_ms" numeric, "last_24h_requests" bigint, "most_used_tools" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE success = true)::BIGINT as successful_requests,
    COUNT(*) FILTER (WHERE success = false)::BIGINT as failed_requests,
    AVG(response_time_ms)::NUMERIC as avg_response_time_ms,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::BIGINT as last_24h_requests,
    (
      SELECT jsonb_agg(jsonb_build_object('tool', tool_name, 'count', count))
      FROM (
        SELECT tool_name, COUNT(*) as count
        FROM mcp_key_usage_logs
        WHERE key_id = p_key_id
        GROUP BY tool_name
        ORDER BY count DESC
        LIMIT 5
      ) top_tools
    ) as most_used_tools
  FROM mcp_key_usage_logs
  WHERE key_id = p_key_id;
END;
$$;


ALTER FUNCTION "public"."get_mcp_key_stats"("p_key_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_mcp_server_config"() RETURNS TABLE("id" "uuid", "server_name" "text", "server_version" "text", "enabled" boolean, "supabase_url" "text", "last_connected_at" timestamp with time zone, "features" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM profiles WHERE id = auth.uid();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User not found or has no tenant';
  END IF;

  RETURN QUERY
  SELECT msc.id, msc.server_name, msc.server_version, msc.enabled,
         msc.supabase_url, msc.last_connected_at, msc.features
  FROM mcp_server_config msc
  WHERE msc.tenant_id = v_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_mcp_server_config"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_tenant_subscription"() RETURNS TABLE("tenant_id" "uuid", "plan" "public"."subscription_plan", "status" "public"."subscription_status", "max_jobs" integer, "max_parts_per_month" integer, "max_storage_gb" numeric, "current_jobs" integer, "current_parts_this_month" integer, "current_storage_gb" numeric)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    t.id,
    t.plan,
    t.status,
    t.max_jobs,
    t.max_parts_per_month,
    t.max_storage_gb,
    t.current_jobs,
    t.current_parts_this_month,
    t.current_storage_gb
  FROM tenants t
  WHERE t.id = get_user_tenant_id();
$$;


ALTER FUNCTION "public"."get_my_tenant_subscription"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_operation_scrap_analysis"("p_operation_id" "uuid") RETURNS TABLE("scrap_reason_id" "uuid", "scrap_reason_code" "text", "scrap_reason_description" "text", "scrap_reason_category" "text", "total_quantity" integer, "occurrence_count" integer, "percentage_of_total" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_total_scrap integer;
BEGIN
    -- Get total scrap for percentage calculation
    SELECT COALESCE(SUM(quantity_scrap), 0)
    INTO v_total_scrap
    FROM public.operation_quantities
    WHERE operation_id = p_operation_id;

    RETURN QUERY
    SELECT
        sr.id as scrap_reason_id,
        sr.code as scrap_reason_code,
        sr.description as scrap_reason_description,
        sr.category as scrap_reason_category,
        COALESCE(SUM(oqsr.quantity), 0)::integer as total_quantity,
        COUNT(oqsr.id)::integer as occurrence_count,
        CASE WHEN v_total_scrap > 0
             THEN ROUND((COALESCE(SUM(oqsr.quantity), 0)::numeric / v_total_scrap * 100), 2)
             ELSE 0
        END as percentage_of_total
    FROM public.operation_quantity_scrap_reasons oqsr
    JOIN public.operation_quantities oq ON oq.id = oqsr.operation_quantity_id
    JOIN public.scrap_reasons sr ON sr.id = oqsr.scrap_reason_id
    WHERE oq.operation_id = p_operation_id
    GROUP BY sr.id, sr.code, sr.description, sr.category
    ORDER BY total_quantity DESC;
END;
$$;


ALTER FUNCTION "public"."get_operation_scrap_analysis"("p_operation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_operation_scrap_analysis"("p_operation_id" "uuid") IS 'Get detailed scrap analysis with breakdown by reason for an operation';



CREATE OR REPLACE FUNCTION "public"."get_operation_total_quantities"("p_operation_id" "uuid") RETURNS TABLE("total_produced" bigint, "total_good" bigint, "total_scrap" bigint, "total_rework" bigint, "yield_percentage" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_operation_total_quantities"("p_operation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_operator_assignments"("p_operator_id" "uuid") RETURNS TABLE("assignment_id" "uuid", "part_id" "uuid", "part_number" "text", "job_id" "uuid", "job_number" "text", "customer" "text", "assigned_by_name" "text", "assigned_at" timestamp with time zone, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM operators o
    WHERE o.id = p_operator_id AND o.tenant_id = v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Operator not found in this organization';
  END IF;

  RETURN QUERY
  SELECT
    a.id as assignment_id,
    a.part_id,
    p.part_number,
    a.job_id,
    j.job_number,
    j.customer,
    prof.full_name as assigned_by_name,
    a.created_at as assigned_at,
    a.status::TEXT
  FROM assignments a
  LEFT JOIN parts p ON p.id = a.part_id
  LEFT JOIN jobs j ON j.id = a.job_id
  LEFT JOIN profiles prof ON prof.id = a.assigned_by
  WHERE a.shop_floor_operator_id = p_operator_id
    AND a.tenant_id = v_tenant_id
    AND a.status != 'completed'
  ORDER BY a.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_operator_assignments"("p_operator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_operator_attendance_status"("p_operator_id" "uuid") RETURNS TABLE("is_clocked_in" boolean, "clock_in_time" timestamp with time zone, "current_duration_minutes" integer, "target_hours" numeric, "shift_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ae.status = 'active' AS is_clocked_in,
    ae.clock_in AS clock_in_time,
    EXTRACT(EPOCH FROM (now() - ae.clock_in))::INTEGER / 60 AS current_duration_minutes,
    ae.target_hours,
    fs.name AS shift_name
  FROM attendance_entries ae
  LEFT JOIN factory_shifts fs ON fs.id = ae.shift_id
  WHERE ae.operator_id = p_operator_id
    AND ae.status = 'active'
  ORDER BY ae.clock_in DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_operator_attendance_status"("p_operator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_part_image_url"("p_image_path" "text", "p_expires_in" integer DEFAULT 3600) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Placeholder: signed URL generation handled in Edge Function
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."get_part_image_url"("p_image_path" "text", "p_expires_in" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_part_image_url"("p_image_path" "text", "p_expires_in" integer) IS 'Placeholder for signed image URL generation with fixed search_path';



CREATE OR REPLACE FUNCTION "public"."get_part_issue_summary"("part_id_param" "uuid") RETURNS TABLE("total_count" bigint, "pending_count" bigint, "highest_severity" "public"."issue_severity")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE i.status = 'pending')::BIGINT as pending_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE i.severity = 'critical') > 0 THEN 'critical'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'high') > 0 THEN 'high'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'medium') > 0 THEN 'medium'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'low') > 0 THEN 'low'::public.issue_severity
      ELSE NULL
    END as highest_severity
  FROM public.issues i
  INNER JOIN public.operations o ON i.operation_id = o.id
  WHERE o.part_id = part_id_param;
$$;


ALTER FUNCTION "public"."get_part_issue_summary"("part_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_part_routing"("p_part_id" "uuid") RETURNS TABLE("operation_id" "uuid", "operation_name" "text", "cell_id" "uuid", "cell_name" "text", "sequence" integer, "notes" "text", "status" "text", "estimated_hours" numeric, "actual_hours" numeric)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS operation_id,
    o.operation_name,
    o.cell_id,
    c.name AS cell_name,
    o.sequence,
    o.notes,
    o.status,
    (o.estimated_time::numeric / 60) AS estimated_hours,
    COALESCE(
      (SELECT SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600)
       FROM time_entries te
       WHERE te.operation_id = o.id
         AND te.end_time IS NOT NULL),
      0
    ) AS actual_hours
  FROM operations o
  LEFT JOIN cells c ON c.id = o.cell_id
  WHERE o.part_id = p_part_id
    AND o.tenant_id = get_user_tenant_id()
  ORDER BY o.sequence ASC;
END;
$$;


ALTER FUNCTION "public"."get_part_routing"("p_part_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_part_routing"("p_part_id" "uuid") IS 'Returns the routing (sequence of operations) for a specific part with timing data';



CREATE OR REPLACE FUNCTION "public"."get_storage_quota"() RETURNS TABLE("current_mb" numeric, "max_mb" numeric, "remaining_mb" numeric, "used_percentage" numeric, "is_unlimited" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_current_gb numeric;
  v_max_gb numeric;
BEGIN
  v_tenant_id := get_user_tenant_id();
  
  SELECT current_storage_gb, max_storage_gb
  INTO v_current_gb, v_max_gb
  FROM tenants
  WHERE id = v_tenant_id;
  
  RETURN QUERY SELECT
    (v_current_gb * 1024) as current_mb,
    CASE WHEN v_max_gb IS NULL THEN NULL ELSE (v_max_gb * 1024) END as max_mb,
    CASE 
      WHEN v_max_gb IS NULL THEN NULL 
      ELSE ((v_max_gb - v_current_gb) * 1024)
    END as remaining_mb,
    CASE 
      WHEN v_max_gb IS NULL THEN 0 
      ELSE (v_current_gb / NULLIF(v_max_gb, 0)) * 100
    END as used_percentage,
    (v_max_gb IS NULL) as is_unlimited;
END;
$$;


ALTER FUNCTION "public"."get_storage_quota"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_feature_flags"("p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_flags JSONB;
  v_use_external BOOLEAN;
  v_default_flags JSONB := '{
    "analytics": true,
    "monitoring": true,
    "operatorViews": true,
    "integrations": true,
    "issues": true,
    "capacity": true,
    "assignments": true
  }'::jsonb;
BEGIN
  -- Use provided tenant_id or get from current user
  IF p_tenant_id IS NOT NULL THEN
    v_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    -- Check for active tenant override (for root admins)
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_root_admin = true
      AND active_tenant_id IS NOT NULL
    ) THEN
      SELECT active_tenant_id INTO v_tenant_id
      FROM profiles
      WHERE id = auth.uid();
    END IF;
  END IF;

  -- Get tenant's feature flag settings
  SELECT
    COALESCE(feature_flags, v_default_flags),
    COALESCE(use_external_feature_flags, false)
  INTO v_flags, v_use_external
  FROM tenants
  WHERE id = v_tenant_id;

  -- If using external service, return empty object (frontend will fetch from external)
  IF v_use_external THEN
    RETURN COALESCE(v_flags, v_default_flags);
  END IF;

  -- Return internal flags merged with defaults
  RETURN v_default_flags || COALESCE(v_flags, '{}'::jsonb);
END;
$$;


ALTER FUNCTION "public"."get_tenant_feature_flags"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_info"() RETURNS TABLE("id" "uuid", "name" "text", "company_name" "text", "plan" "public"."subscription_plan", "status" "public"."subscription_status")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    t.id,
    t.name,
    t.company_name,
    t.plan,
    t.status
  FROM public.tenants t
  WHERE t.id = public.get_user_tenant_id();
$$;


ALTER FUNCTION "public"."get_tenant_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_quota"("p_tenant_id" "uuid") RETURNS TABLE("current_jobs" integer, "max_jobs" integer, "current_parts" integer, "max_parts" integer, "current_storage" numeric, "max_storage" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.current_jobs,
    t.max_jobs,
    t.current_parts_this_month,
    t.max_parts_per_month,
    t.current_storage_gb,
    t.max_storage_gb
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_tenant_quota"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_usage_stats"() RETURNS TABLE("total_jobs" bigint, "active_jobs" bigint, "completed_jobs" bigint, "parts_this_month" bigint, "total_parts" bigint, "total_operators" bigint, "total_admins" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH tenant_id AS (
    SELECT get_user_tenant_id() as id
  )
  SELECT
    (SELECT COUNT(*) FROM jobs WHERE tenant_id = (SELECT id FROM tenant_id)) as total_jobs,
    (SELECT COUNT(*) FROM jobs WHERE tenant_id = (SELECT id FROM tenant_id) AND status IN ('not_started', 'in_progress')) as active_jobs,
    (SELECT COUNT(*) FROM jobs WHERE tenant_id = (SELECT id FROM tenant_id) AND status = 'completed') as completed_jobs,
    (SELECT COUNT(*) FROM parts 
     WHERE tenant_id = (SELECT id FROM tenant_id) 
     AND created_at >= date_trunc('month', CURRENT_DATE)) as parts_this_month,
    (SELECT COUNT(*) FROM parts WHERE tenant_id = (SELECT id FROM tenant_id)) as total_parts,
    (SELECT COUNT(*) FROM profiles WHERE tenant_id = (SELECT id FROM tenant_id) AND role = 'operator') as total_operators,
    (SELECT COUNT(*) FROM profiles WHERE tenant_id = (SELECT id FROM tenant_id) AND role = 'admin') as total_admins;
$$;


ALTER FUNCTION "public"."get_tenant_usage_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE
    WHEN public.is_root_admin() THEN
      COALESCE(
        nullif(current_setting('app.active_tenant_id', true), '')::UUID,
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
      )
    ELSE
      (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  END;
$$;


ALTER FUNCTION "public"."get_user_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_issue_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_description text;
  v_changes jsonb;
  v_action text;
  v_operation_name text;
  v_part_number text;
  v_job_number text;
  v_reporter_name text;
  v_reviewer_name text;
BEGIN
  -- Get related data
  SELECT o.operation_name, p.part_number, j.job_number
  INTO v_operation_name, v_part_number, v_job_number
  FROM operations o
  JOIN parts p ON p.id = o.part_id
  JOIN jobs j ON j.id = p.job_id
  WHERE o.id = COALESCE(NEW.operation_id, OLD.operation_id);

  IF NEW.created_by IS NOT NULL THEN
    SELECT full_name INTO v_reporter_name FROM profiles WHERE id = NEW.created_by;
  END IF;
  
  IF NEW.reviewed_by IS NOT NULL THEN
    SELECT full_name INTO v_reviewer_name FROM profiles WHERE id = NEW.reviewed_by;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := format('%s reported %s severity issue for operation "%s" on part %s (Job %s): %s', 
      COALESCE(v_reporter_name, 'Operator'), NEW.severity, v_operation_name, v_part_number, v_job_number,
      substring(NEW.description, 1, 100));
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    -- Status change
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'approved' THEN
        v_description := format('%s approved issue for operation "%s" on part %s (Job %s)', 
          COALESCE(v_reviewer_name, 'Reviewer'), v_operation_name, v_part_number, v_job_number);
      ELSIF NEW.status = 'rejected' THEN
        v_description := format('%s rejected issue for operation "%s" on part %s (Job %s)', 
          COALESCE(v_reviewer_name, 'Reviewer'), v_operation_name, v_part_number, v_job_number);
      ELSIF NEW.status = 'closed' THEN
        v_description := format('Issue closed for operation "%s" on part %s (Job %s)', 
          v_operation_name, v_part_number, v_job_number);
      ELSE
        v_description := format('Issue status changed to %s for operation "%s" on part %s (Job %s)', 
          NEW.status, v_operation_name, v_part_number, v_job_number);
      END IF;
    -- Review completed
    ELSIF OLD.reviewed_by IS NULL AND NEW.reviewed_by IS NOT NULL THEN
      v_description := format('%s reviewed issue for operation "%s" on part %s (Job %s)', 
        v_reviewer_name, v_operation_name, v_part_number, v_job_number);
    ELSE
      v_description := format('Issue updated for operation "%s" on part %s (Job %s)', 
        v_operation_name, v_part_number, v_job_number);
    END IF;
    
    v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_description := format('Issue deleted for operation "%s" on part %s (Job %s)', 
      v_operation_name, v_part_number, v_job_number);
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  PERFORM log_activity_and_webhook(
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.created_by, OLD.created_by),
    v_action,
    'issue',
    COALESCE(NEW.id, OLD.id),
    format('%s - %s (%s)', v_operation_name, v_part_number, v_job_number),
    v_description,
    v_changes,
    jsonb_build_object(
      'job_number', v_job_number,
      'part_number', v_part_number,
      'operation', v_operation_name,
      'severity', COALESCE(NEW.severity, OLD.severity),
      'status', COALESCE(NEW.status, OLD.status),
      'reporter', v_reporter_name,
      'reviewer', v_reviewer_name
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."handle_issue_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_job_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_description text;
  v_changes jsonb;
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := format('Job %s created for customer %s', NEW.job_number, COALESCE(NEW.customer, 'N/A'));
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    -- Specific descriptions for status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_description := format('Job %s status changed from %s to %s', NEW.job_number, OLD.status, NEW.status);
      
      IF NEW.status = 'in_progress' THEN
        v_description := format('Job %s started', NEW.job_number);
      ELSIF NEW.status = 'completed' THEN
        v_description := format('Job %s completed', NEW.job_number);
      ELSIF NEW.status = 'on_hold' THEN
        v_description := format('Job %s put on hold', NEW.job_number);
      END IF;
    ELSE
      v_description := format('Job %s updated', NEW.job_number);
    END IF;
    
    v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_description := format('Job %s deleted', OLD.job_number);
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  PERFORM log_activity_and_webhook(
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    v_action,
    'job',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.job_number, OLD.job_number),
    v_description,
    v_changes,
    jsonb_build_object('customer', COALESCE(NEW.customer, OLD.customer))
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."handle_job_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_company_name TEXT;
  v_username TEXT;
  v_base_username TEXT;
  v_full_name TEXT;
  v_role app_role;
  v_is_new_tenant BOOLEAN := false;
  v_counter INT := 0;
BEGIN
  -- Extract metadata
  v_base_username := COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1));
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', v_base_username);
  v_company_name := NEW.raw_user_meta_data->>'company_name';
  
  -- Check if tenant_id provided (invitation flow)
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'operator');
  ELSE
    -- New signup - create tenant first
    v_is_new_tenant := true;
    v_role := 'admin'; -- First user is always admin
    
    INSERT INTO public.tenants (
      name,
      company_name,
      plan,
      status
    ) VALUES (
      COALESCE(v_company_name, v_base_username || '''s Organization'),
      v_company_name,
      'free',
      'trial'
    )
    RETURNING id INTO v_tenant_id;
  END IF;
  
  -- Generate unique username within tenant
  v_username := v_base_username;
  WHILE EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE tenant_id = v_tenant_id AND username = v_username
  ) LOOP
    v_counter := v_counter + 1;
    v_username := v_base_username || v_counter::TEXT;
  END LOOP;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    tenant_id,
    username,
    full_name,
    email,
    role,
    is_machine,
    active,
    has_email_login
  ) VALUES (
    NEW.id,
    v_tenant_id,
    v_username,
    v_full_name,
    NEW.email,
    v_role,
    COALESCE((NEW.raw_user_meta_data->>'is_machine')::BOOLEAN, false),
    true,
    true
  );
  
  -- Create user_roles entry for RLS
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_operation_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_description text;
  v_changes jsonb;
  v_action text;
  v_part_number text;
  v_job_number text;
  v_cell_name text;
  v_operator_name text;
BEGIN
  -- Get related data
  SELECT p.part_number, j.job_number, c.name
  INTO v_part_number, v_job_number, v_cell_name
  FROM parts p
  JOIN jobs j ON j.id = p.job_id
  LEFT JOIN cells c ON c.id = COALESCE(NEW.cell_id, OLD.cell_id)
  WHERE p.id = COALESCE(NEW.part_id, OLD.part_id);

  IF NEW.assigned_operator_id IS NOT NULL THEN
    SELECT full_name INTO v_operator_name FROM profiles WHERE id = NEW.assigned_operator_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := format('Operation "%s" created for part %s (Job %s) in cell %s', 
      NEW.operation_name, v_part_number, v_job_number, v_cell_name);
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    -- Status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'in_progress' THEN
        v_description := format('Operation "%s" started on part %s (Job %s) by %s', 
          NEW.operation_name, v_part_number, v_job_number, COALESCE(v_operator_name, 'operator'));
      ELSIF NEW.status = 'completed' THEN
        v_description := format('Operation "%s" completed on part %s (Job %s) in %s minutes', 
          NEW.operation_name, v_part_number, v_job_number, COALESCE(NEW.actual_time, 0));
      ELSIF NEW.status = 'on_hold' THEN
        v_description := format('Operation "%s" put on hold for part %s (Job %s)', 
          NEW.operation_name, v_part_number, v_job_number);
      ELSE
        v_description := format('Operation "%s" status changed to %s for part %s (Job %s)', 
          NEW.operation_name, NEW.status, v_part_number, v_job_number);
      END IF;
    -- Operator assignment
    ELSIF OLD.assigned_operator_id IS DISTINCT FROM NEW.assigned_operator_id THEN
      v_description := format('Operation "%s" assigned to %s for part %s (Job %s)', 
        NEW.operation_name, COALESCE(v_operator_name, 'operator'), v_part_number, v_job_number);
    ELSE
      v_description := format('Operation "%s" updated for part %s (Job %s)', 
        NEW.operation_name, v_part_number, v_job_number);
    END IF;
    
    v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_description := format('Operation "%s" deleted from part %s (Job %s)', 
      OLD.operation_name, v_part_number, v_job_number);
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  PERFORM log_activity_and_webhook(
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    v_action,
    'operation',
    COALESCE(NEW.id, OLD.id),
    format('%s - %s (%s)', COALESCE(NEW.operation_name, OLD.operation_name), v_part_number, v_job_number),
    v_description,
    v_changes,
    jsonb_build_object(
      'job_number', v_job_number,
      'part_number', v_part_number,
      'cell', v_cell_name,
      'operator', v_operator_name
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."handle_operation_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_part_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_description text;
  v_changes jsonb;
  v_action text;
  v_job_number text;
  v_cell_name text;
BEGIN
  -- Get related data
  SELECT j.job_number, c.name
  INTO v_job_number, v_cell_name
  FROM jobs j
  LEFT JOIN cells c ON c.id = COALESCE(NEW.current_cell_id, OLD.current_cell_id)
  WHERE j.id = COALESCE(NEW.job_id, OLD.job_id);

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := format('Part %s created for Job %s - Material: %s, Quantity: %s', 
      NEW.part_number, v_job_number, NEW.material, COALESCE(NEW.quantity, 1));
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    -- Status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'in_progress' THEN
        v_description := format('Part %s (Job %s) started production in cell %s', 
          NEW.part_number, v_job_number, COALESCE(v_cell_name, 'N/A'));
      ELSIF NEW.status = 'completed' THEN
        v_description := format('Part %s (Job %s) completed', 
          NEW.part_number, v_job_number);
      ELSIF NEW.status = 'on_hold' THEN
        v_description := format('Part %s (Job %s) put on hold', 
          NEW.part_number, v_job_number);
      ELSE
        v_description := format('Part %s (Job %s) status changed to %s', 
          NEW.part_number, v_job_number, NEW.status);
      END IF;
    -- Cell movement
    ELSIF OLD.current_cell_id IS DISTINCT FROM NEW.current_cell_id THEN
      v_description := format('Part %s (Job %s) moved to cell %s', 
        NEW.part_number, v_job_number, COALESCE(v_cell_name, 'N/A'));
    ELSE
      v_description := format('Part %s (Job %s) updated', 
        NEW.part_number, v_job_number);
    END IF;
    
    v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_description := format('Part %s deleted from Job %s', 
      OLD.part_number, v_job_number);
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  PERFORM log_activity_and_webhook(
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    v_action,
    'part',
    COALESCE(NEW.id, OLD.id),
    format('%s (%s)', COALESCE(NEW.part_number, OLD.part_number), v_job_number),
    v_description,
    v_changes,
    jsonb_build_object(
      'job_number', v_job_number,
      'part_number', COALESCE(NEW.part_number, OLD.part_number),
      'material', COALESCE(NEW.material, OLD.material),
      'quantity', COALESCE(NEW.quantity, OLD.quantity),
      'cell', v_cell_name
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."handle_part_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_quantity_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_description text;
  v_changes jsonb;
  v_action text;
  v_operation_name text;
  v_part_number text;
  v_job_number text;
  v_operator_name text;
  v_scrap_reason text;
BEGIN
  -- Get related data
  SELECT o.operation_name, p.part_number, j.job_number, pr.full_name
  INTO v_operation_name, v_part_number, v_job_number, v_operator_name
  FROM operations o
  JOIN parts p ON p.id = o.part_id
  JOIN jobs j ON j.id = p.job_id
  LEFT JOIN profiles pr ON pr.id = COALESCE(NEW.recorded_by, OLD.recorded_by)
  WHERE o.id = COALESCE(NEW.operation_id, OLD.operation_id);

  IF NEW.scrap_reason_id IS NOT NULL THEN
    SELECT description INTO v_scrap_reason FROM scrap_reasons WHERE id = NEW.scrap_reason_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := format('%s reported quantities for operation "%s" on part %s (Job %s): %s produced, %s good, %s scrap, %s rework', 
      COALESCE(v_operator_name, 'Operator'), v_operation_name, v_part_number, v_job_number,
      NEW.quantity_produced, NEW.quantity_good, NEW.quantity_scrap, NEW.quantity_rework);
    
    IF NEW.quantity_scrap > 0 AND v_scrap_reason IS NOT NULL THEN
      v_description := v_description || format(' (Scrap reason: %s)', v_scrap_reason);
    END IF;
    
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_description := format('Quantities updated for operation "%s" on part %s (Job %s)', 
      v_operation_name, v_part_number, v_job_number);
    v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_description := format('Quantity record deleted for operation "%s" on part %s (Job %s)', 
      v_operation_name, v_part_number, v_job_number);
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  PERFORM log_activity_and_webhook(
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.recorded_by, OLD.recorded_by, auth.uid()),
    v_action,
    'quantity',
    COALESCE(NEW.id, OLD.id),
    format('%s - %s (%s)', v_operation_name, v_part_number, v_job_number),
    v_description,
    v_changes,
    jsonb_build_object(
      'job_number', v_job_number,
      'part_number', v_part_number,
      'operation', v_operation_name,
      'operator', v_operator_name,
      'produced', COALESCE(NEW.quantity_produced, OLD.quantity_produced),
      'good', COALESCE(NEW.quantity_good, OLD.quantity_good),
      'scrap', COALESCE(NEW.quantity_scrap, OLD.quantity_scrap),
      'rework', COALESCE(NEW.quantity_rework, OLD.quantity_rework),
      'scrap_reason', v_scrap_reason
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."handle_quantity_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_time_entry_events"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_description text;
  v_changes jsonb;
  v_action text;
  v_operation_name text;
  v_part_number text;
  v_job_number text;
  v_operator_name text;
BEGIN
  -- Get related data
  SELECT o.operation_name, p.part_number, j.job_number, pr.full_name
  INTO v_operation_name, v_part_number, v_job_number, v_operator_name
  FROM operations o
  JOIN parts p ON p.id = o.part_id
  JOIN jobs j ON j.id = p.job_id
  LEFT JOIN profiles pr ON pr.id = COALESCE(NEW.operator_id, OLD.operator_id)
  WHERE o.id = COALESCE(NEW.operation_id, OLD.operation_id);

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_description := format('%s started timing %s operation "%s" on part %s (Job %s)', 
      v_operator_name, NEW.time_type, v_operation_name, v_part_number, v_job_number);
    v_changes := jsonb_build_object('new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    
    -- Time entry completed
    IF OLD.end_time IS NULL AND NEW.end_time IS NOT NULL THEN
      v_description := format('%s completed %s time entry (%s minutes) for operation "%s" on part %s (Job %s)', 
        v_operator_name, NEW.time_type, COALESCE(NEW.duration, 0), v_operation_name, v_part_number, v_job_number);
    -- Paused/resumed
    ELSIF OLD.is_paused IS DISTINCT FROM NEW.is_paused THEN
      IF NEW.is_paused THEN
        v_description := format('%s paused timing for operation "%s" on part %s (Job %s)', 
          v_operator_name, v_operation_name, v_part_number, v_job_number);
      ELSE
        v_description := format('%s resumed timing for operation "%s" on part %s (Job %s)', 
          v_operator_name, v_operation_name, v_part_number, v_job_number);
      END IF;
    ELSE
      v_description := format('Time entry updated for operation "%s" on part %s (Job %s)', 
        v_operation_name, v_part_number, v_job_number);
    END IF;
    
    v_changes := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
    
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_description := format('Time entry deleted for operation "%s" on part %s (Job %s)', 
      v_operation_name, v_part_number, v_job_number);
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  END IF;

  PERFORM log_activity_and_webhook(
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    COALESCE(NEW.operator_id, OLD.operator_id),
    v_action,
    'time_entry',
    COALESCE(NEW.id, OLD.id),
    format('%s - %s (%s)', v_operation_name, v_part_number, v_job_number),
    v_description,
    v_changes,
    jsonb_build_object(
      'job_number', v_job_number,
      'part_number', v_part_number,
      'operation', v_operation_name,
      'operator', v_operator_name,
      'time_type', COALESCE(NEW.time_type, OLD.time_type),
      'duration', COALESCE(NEW.duration, OLD.duration)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."handle_time_entry_events"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT exists (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_api_usage"("p_tenant_id" "uuid", "p_api_key_id" "uuid" DEFAULT NULL::"uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_new_count INTEGER;
BEGIN
  -- Upsert into daily usage log
  INSERT INTO public.api_usage_logs (tenant_id, api_key_id, date, requests_count)
  VALUES (p_tenant_id, p_api_key_id, v_today, 1)
  ON CONFLICT (tenant_id, date)
  DO UPDATE SET
    requests_count = api_usage_logs.requests_count + 1,
    updated_at = NOW()
  RETURNING requests_count INTO v_new_count;

  -- Also update tenant's current day counter
  UPDATE public.tenants
  SET
    api_requests_today = CASE
      WHEN api_requests_reset_at < NOW() THEN 1
      ELSE api_requests_today + 1
    END,
    api_requests_reset_at = CASE
      WHEN api_requests_reset_at < NOW() THEN CURRENT_DATE + INTERVAL '1 day'
      ELSE api_requests_reset_at
    END
  WHERE id = p_tenant_id;

  RETURN v_new_count;
END;
$$;


ALTER FUNCTION "public"."increment_api_usage"("p_tenant_id" "uuid", "p_api_key_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_demo_mode"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(demo_mode_enabled, false)
  FROM tenants
  WHERE id = p_tenant_id;
$$;


ALTER FUNCTION "public"."is_demo_mode"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_demo_mode"("p_tenant_id" "uuid") IS 'Quick check to see if tenant has demo data active';



CREATE OR REPLACE FUNCTION "public"."is_root_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_root_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;


ALTER FUNCTION "public"."is_root_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_all_tenants"() RETURNS TABLE("id" "uuid", "name" "text", "company_name" "text", "plan" "public"."subscription_plan", "status" "public"."subscription_status", "user_count" bigint, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NOT public.is_root_admin() THEN
    RAISE EXCEPTION 'Only root administrators can list all tenants';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.company_name,
    t.plan,
    t.status,
    COUNT(p.id) as user_count,
    t.created_at
  FROM public.tenants t
  LEFT JOIN public.profiles p ON t.id = p.tenant_id
  GROUP BY t.id, t.name, t.company_name, t.plan, t.status, t.created_at
  ORDER BY t.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."list_all_tenants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_operators"() RETURNS TABLE("id" "uuid", "employee_id" "text", "full_name" "text", "active" boolean, "locked_until" timestamp with time zone, "last_login_at" timestamp with time zone, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT o.id, o.employee_id, o.full_name, COALESCE(o.active, true),
         o.locked_until, o.last_login_at, o.created_at
  FROM operators o
  WHERE o.tenant_id = v_tenant_id
  ORDER BY o.full_name;
END;
$$;


ALTER FUNCTION "public"."list_operators"() OWNER TO "postgres";


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
  
  v_action := LOWER(TG_OP);
  
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;  -- Keep as UUID
    v_changes := jsonb_build_object('old', to_jsonb(OLD));
  ELSE
    v_entity_id := NEW.id;  -- Keep as UUID
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


ALTER FUNCTION "public"."log_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity_and_webhook"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_description" "text", "p_changes" "jsonb" DEFAULT NULL::"jsonb", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_name text;
  v_user_email text;
BEGIN
  -- Get user info
  SELECT full_name, email INTO v_user_name, v_user_email
  FROM profiles
  WHERE id = p_user_id;

  -- Insert activity log
  INSERT INTO activity_log (
    tenant_id, user_id, user_name, user_email,
    action, entity_type, entity_id, entity_name,
    description, changes, metadata
  ) VALUES (
    p_tenant_id, p_user_id, v_user_name, v_user_email,
    p_action, p_entity_type, p_entity_id, p_entity_name,
    p_description, COALESCE(p_changes, '{}'::jsonb), COALESCE(p_metadata, '{}'::jsonb)
  );

  -- Dispatch webhook asynchronously
  PERFORM dispatch_webhook(
    p_tenant_id,
    p_entity_type || '.' || p_action,
    jsonb_build_object(
      'entity_type', p_entity_type,
      'entity_id', p_entity_id,
      'entity_name', p_entity_name,
      'action', p_action,
      'description', p_description,
      'user', jsonb_build_object('id', p_user_id, 'name', v_user_name, 'email', v_user_email),
      'changes', COALESCE(p_changes, '{}'::jsonb),
      'metadata', COALESCE(p_metadata, '{}'::jsonb),
      'timestamp', now()
    )
  );
END;
$$;


ALTER FUNCTION "public"."log_activity_and_webhook"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_description" "text", "p_changes" "jsonb", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_mcp_key_usage"("p_tenant_id" "uuid", "p_key_id" "uuid", "p_tool_name" "text", "p_tool_arguments" "jsonb" DEFAULT NULL::"jsonb", "p_success" boolean DEFAULT true, "p_error_message" "text" DEFAULT NULL::"text", "p_response_time_ms" integer DEFAULT NULL::integer, "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
  v_key_name TEXT;
  v_description TEXT;
BEGIN
  INSERT INTO mcp_key_usage_logs (
    tenant_id, key_id, tool_name, tool_arguments, success, error_message,
    response_time_ms, ip_address, user_agent
  ) VALUES (
    p_tenant_id, p_key_id, p_tool_name, p_tool_arguments, p_success, p_error_message,
    p_response_time_ms, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;

  SELECT name INTO v_key_name FROM mcp_authentication_keys WHERE id = p_key_id;

  v_description := 'MCP tool "' || p_tool_name || '" ' ||
    CASE WHEN p_success THEN 'executed successfully' ELSE 'failed' END ||
    ' via key "' || COALESCE(v_key_name, 'Unknown') || '"' ||
    CASE WHEN p_response_time_ms IS NOT NULL THEN ' (' || p_response_time_ms || 'ms)' ELSE '' END;

  INSERT INTO activity_log (
    tenant_id, user_id, user_email, user_name, action, entity_type, entity_id, entity_name,
    description, changes, metadata, ip_address, user_agent
  ) VALUES (
    p_tenant_id, NULL, 'MCP Server', 'MCP Server',
    CASE WHEN p_success THEN 'mcp_execute' ELSE 'mcp_error' END,
    'mcp_tool', v_log_id::TEXT, p_tool_name, v_description, NULL,
    jsonb_build_object(
      'key_id', p_key_id, 'key_name', v_key_name, 'tool_name', p_tool_name,
      'tool_arguments', p_tool_arguments, 'success', p_success,
      'error_message', p_error_message, 'response_time_ms', p_response_time_ms
    ),
    p_ip_address, p_user_agent
  );

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_mcp_key_usage"("p_tenant_id" "uuid", "p_key_id" "uuid", "p_tool_name" "text", "p_tool_arguments" "jsonb", "p_success" boolean, "p_error_message" "text", "p_response_time_ms" integer, "p_ip_address" "inet", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_mcp_server_activity"("p_tenant_id" "uuid", "p_event_type" "text", "p_message" "text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO mcp_server_logs (tenant_id, event_type, message, metadata)
  VALUES (p_tenant_id, p_event_type, p_message, p_metadata)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_mcp_server_activity"("p_tenant_id" "uuid", "p_event_type" "text", "p_message" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
    AND read = false
    AND dismissed = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid());
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_new_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_job_number TEXT;
  v_part_number TEXT;
BEGIN
  -- Get job and part details for context
  SELECT j.job_number INTO v_job_number
  FROM public.jobs j
  WHERE j.id = NEW.job_id;

  IF NEW.part_id IS NOT NULL THEN
    SELECT p.part_number INTO v_part_number
    FROM public.parts p
    WHERE p.id = NEW.part_id;
  END IF;

  -- Create notification for the assigned operator
  PERFORM public.create_notification(
    NEW.tenant_id,
    NEW.operator_id,
    'assignment',
    'medium',
    'New Assignment',
    'You have been assigned to Job ' || COALESCE(v_job_number::TEXT, 'Unknown') ||
    CASE WHEN v_part_number IS NOT NULL THEN ' - Part: ' || v_part_number ELSE '' END,
    '/operator/dashboard',
    'assignment',
    NEW.id,
    jsonb_build_object(
      'assignment_id', NEW.id,
      'job_id', NEW.job_id,
      'part_id', NEW.part_id,
      'job_number', v_job_number,
      'part_number', v_part_number
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_assignment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_new_assignment"() IS 'Automatically creates notifications when operators are assigned to jobs';



CREATE OR REPLACE FUNCTION "public"."notify_new_issue"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Get all admin user IDs for the tenant
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE tenant_id = NEW.tenant_id AND role = 'admin';

  -- Create notification for each admin
  IF v_admin_ids IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_admin_ids
    LOOP
      PERFORM public.create_notification(
        NEW.tenant_id,
        v_admin_id,
        'issue',
        NEW.severity::TEXT,
        'New Issue Reported',
        NEW.description,
        '/admin/issues',
        'issue',
        NEW.id,
        jsonb_build_object('issue_id', NEW.id, 'severity', NEW.severity)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_issue"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_new_issue"() IS 'Automatically creates notifications when new issues are reported';



CREATE OR REPLACE FUNCTION "public"."notify_new_part"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_job_number TEXT;
BEGIN
  -- Get job number for context
  SELECT job_number INTO v_job_number
  FROM public.jobs
  WHERE id = NEW.job_id;

  -- Get all admin user IDs for the tenant
  SELECT array_agg(id) INTO v_admin_ids
  FROM public.profiles
  WHERE tenant_id = NEW.tenant_id AND role = 'admin';

  -- Create notification for each admin
  IF v_admin_ids IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_admin_ids
    LOOP
      PERFORM public.create_notification(
        NEW.tenant_id,
        v_admin_id,
        'new_part',
        'low',
        'New Part Added',
        'Part ' || COALESCE(NEW.part_number, 'Unnamed') || ' added to Job ' || COALESCE(v_job_number::TEXT, 'Unknown'),
        '/admin/jobs',
        'part',
        NEW.id,
        jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_number', NEW.part_number)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_part"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_new_part"() IS 'Automatically creates notifications when new parts are added';



CREATE OR REPLACE FUNCTION "public"."notify_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
BEGIN
  -- Only notify for new non-admin users
  IF NEW.role != 'admin' THEN
    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = NEW.tenant_id AND role = 'admin' AND id != NEW.id;

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          NEW.tenant_id,
          v_admin_id,
          'new_user',
          'low',
          'New User Joined',
          COALESCE(NEW.full_name, 'A new user') || ' has joined as ' || NEW.role,
          '/admin/config/users',
          'user',
          NEW.id,
          jsonb_build_object('user_id', NEW.id, 'full_name', NEW.full_name, 'role', NEW.role)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_new_user"() IS 'Automatically creates notifications when new users join';



CREATE OR REPLACE FUNCTION "public"."notify_part_completed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_job_number TEXT;
BEGIN
  -- Only notify when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get job number for context
    SELECT job_number INTO v_job_number
    FROM public.jobs
    WHERE id = NEW.job_id;

    -- Get all admin user IDs for the tenant
    SELECT array_agg(id) INTO v_admin_ids
    FROM public.profiles
    WHERE tenant_id = NEW.tenant_id AND role = 'admin';

    -- Create notification for each admin
    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids
      LOOP
        PERFORM public.create_notification(
          NEW.tenant_id,
          v_admin_id,
          'part_completed',
          'low',
          'Part Completed',
          'Part ' || COALESCE(NEW.name, 'Unnamed') || ' for Job ' || COALESCE(v_job_number::TEXT, 'Unknown') || ' has been completed',
          '/admin/jobs',
          'part',
          NEW.id,
          jsonb_build_object('part_id', NEW.id, 'job_id', NEW.job_id, 'part_name', NEW.name)
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_part_completed"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_part_completed"() IS 'Automatically creates notifications when parts are marked as completed';



CREATE OR REPLACE FUNCTION "public"."operator_clock_in"("p_operator_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_entry_id UUID;
  v_shift_id UUID;
  v_target_hours NUMERIC(5,2);
  v_current_time TIME;
  v_current_day INTEGER;
BEGIN
  -- Get tenant_id from operator
  SELECT tenant_id INTO v_tenant_id FROM operators WHERE id = p_operator_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Operator not found';
  END IF;
  
  -- Check if already clocked in
  IF EXISTS (
    SELECT 1 FROM attendance_entries 
    WHERE operator_id = p_operator_id 
    AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Operator already clocked in';
  END IF;
  
  -- Get current time and day of week (1=Monday, 7=Sunday)
  v_current_time := CURRENT_TIME;
  v_current_day := EXTRACT(ISODOW FROM CURRENT_DATE)::INTEGER;
  
  -- Find matching active shift
  SELECT id, 
    EXTRACT(EPOCH FROM (end_time::TIME - start_time::TIME)) / 3600.0
  INTO v_shift_id, v_target_hours
  FROM factory_shifts
  WHERE tenant_id = v_tenant_id
    AND is_active = true
    AND v_current_day = ANY(active_days)
    AND v_current_time BETWEEN start_time::TIME AND end_time::TIME
  LIMIT 1;
  
  -- If no matching shift, use default 8 hours
  IF v_target_hours IS NULL THEN
    v_target_hours := 8.0;
  END IF;
  
  -- Create attendance entry
  INSERT INTO attendance_entries (
    tenant_id,
    operator_id,
    shift_id,
    target_hours,
    notes,
    status
  ) VALUES (
    v_tenant_id,
    p_operator_id,
    v_shift_id,
    v_target_hours,
    p_notes,
    'active'
  )
  RETURNING id INTO v_entry_id;
  
  -- Update operator last_login_at
  UPDATE operators SET last_login_at = now() WHERE id = p_operator_id;
  
  RETURN v_entry_id;
END;
$$;


ALTER FUNCTION "public"."operator_clock_in"("p_operator_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."operator_clock_out"("p_operator_id" "uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_entry_id UUID;
  v_clock_in TIMESTAMP WITH TIME ZONE;
  v_duration INTEGER;
BEGIN
  -- Find active attendance entry
  SELECT id, clock_in INTO v_entry_id, v_clock_in
  FROM attendance_entries
  WHERE operator_id = p_operator_id
    AND status = 'active'
  ORDER BY clock_in DESC
  LIMIT 1;
  
  IF v_entry_id IS NULL THEN
    RAISE EXCEPTION 'No active clock-in found';
  END IF;
  
  -- Calculate duration in minutes
  v_duration := EXTRACT(EPOCH FROM (now() - v_clock_in)) / 60;
  
  -- Update attendance entry
  UPDATE attendance_entries
  SET 
    clock_out = now(),
    duration_minutes = v_duration,
    status = 'completed',
    notes = COALESCE(p_notes, notes)
  WHERE id = v_entry_id;
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."operator_clock_out"("p_operator_id" "uuid", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."regenerate_mcp_token"("p_endpoint_id" "uuid") RETURNS TABLE("endpoint_id" "uuid", "endpoint_name" "text", "token" "text", "token_prefix" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_endpoint RECORD;
  v_token TEXT;
  v_token_prefix TEXT;
  v_token_hash TEXT;
BEGIN
  v_tenant_id := public.get_user_tenant_id();

  -- Only admins can regenerate tokens
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can regenerate MCP tokens';
  END IF;

  -- Get endpoint
  SELECT * INTO v_endpoint
  FROM public.mcp_endpoints
  WHERE id = p_endpoint_id AND tenant_id = v_tenant_id;

  IF v_endpoint IS NULL THEN
    RAISE EXCEPTION 'Endpoint not found';
  END IF;

  -- Generate new token
  v_token := 'mcp_' || replace(replace(replace(
    encode(extensions.gen_random_bytes(32), 'base64'),
    '/', '_'), '+', '-'), '=', '');

  v_token_prefix := substring(v_token from 1 for 12);
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  -- Update endpoint
  UPDATE public.mcp_endpoints
  SET
    token_hash = v_token_hash,
    token_prefix = v_token_prefix
  WHERE id = p_endpoint_id;

  -- Return with new token
  RETURN QUERY SELECT
    p_endpoint_id,
    v_endpoint.name,
    v_token,
    v_token_prefix;
END;
$$;


ALTER FUNCTION "public"."regenerate_mcp_token"("p_endpoint_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_monthly_parts_counters"() RETURNS TABLE("tenant_id" "uuid", "previous_count" integer, "success" boolean, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH reset_data AS (
    UPDATE public.tenants
    SET 
      current_parts_this_month = 0,
      last_parts_reset_date = now()
    WHERE status = 'active'
    RETURNING id, current_parts_this_month as prev_count
  )
  INSERT INTO public.monthly_reset_logs (tenant_id, reset_date, previous_count, reset_successful)
  SELECT id, now(), prev_count, true
  FROM reset_data
  RETURNING monthly_reset_logs.tenant_id, monthly_reset_logs.previous_count, 
            monthly_reset_logs.reset_successful, 'Reset successful'::text;
END;
$$;


ALTER FUNCTION "public"."reset_monthly_parts_counters"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_operator_pin"("p_operator_id" "uuid", "p_new_pin" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_tenant_id UUID;
  v_pin_hash TEXT;
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;

  IF p_new_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits';
  END IF;

  v_pin_hash := extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8));

  UPDATE operators
  SET pin_hash = v_pin_hash,
      failed_attempts = 0,
      locked_until = NULL
  WHERE id = p_operator_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operator not found or access denied';
  END IF;

  RETURN true;
END;
$_$;


ALTER FUNCTION "public"."reset_operator_pin"("p_operator_id" "uuid", "p_new_pin" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_exception"("p_exception_id" "uuid", "p_root_cause" "text" DEFAULT NULL::"text", "p_corrective_action" "text" DEFAULT NULL::"text", "p_preventive_action" "text" DEFAULT NULL::"text", "p_resolution" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE exceptions
  SET status = 'resolved',
      resolved_at = now(),
      resolved_by = auth.uid(),
      root_cause = COALESCE(p_root_cause, root_cause),
      corrective_action = COALESCE(p_corrective_action, corrective_action),
      preventive_action = COALESCE(p_preventive_action, preventive_action),
      resolution = COALESCE(p_resolution, resolution)
  WHERE id = p_exception_id
    AND tenant_id = get_user_tenant_id()
    AND status IN ('open', 'acknowledged');
END;
$$;


ALTER FUNCTION "public"."resolve_exception"("p_exception_id" "uuid", "p_root_cause" "text", "p_corrective_action" "text", "p_preventive_action" "text", "p_resolution" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") RETURNS TABLE("inserted_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.scrap_reasons WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Scrap reasons already exist for this tenant'::TEXT;
    RETURN;
  END IF;
  INSERT INTO public.scrap_reasons (tenant_id, code, description, category)
  VALUES
    (p_tenant_id, 'MAT-001', 'Material surface defect', 'Material'),
    (p_tenant_id, 'MAT-002', 'Material thickness out of spec', 'Material'),
    (p_tenant_id, 'MAT-003', 'Material contamination', 'Material'),
    (p_tenant_id, 'MAT-004', 'Material hardness issue', 'Material'),
    (p_tenant_id, 'MAT-005', 'Wrong material supplied', 'Material'),
    (p_tenant_id, 'PRC-001', 'Cutting burn marks', 'Process'),
    (p_tenant_id, 'PRC-002', 'Bend angle out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-003', 'Weld defect - porosity', 'Process'),
    (p_tenant_id, 'PRC-004', 'Weld defect - undercut', 'Process'),
    (p_tenant_id, 'PRC-005', 'Surface finish defect', 'Process'),
    (p_tenant_id, 'PRC-006', 'Dimensions out of tolerance', 'Process'),
    (p_tenant_id, 'PRC-007', 'Deburring incomplete', 'Process'),
    (p_tenant_id, 'PRC-008', 'Coating defect - runs/sags', 'Process'),
    (p_tenant_id, 'PRC-009', 'Coating defect - insufficient coverage', 'Process'),
    (p_tenant_id, 'EQP-001', 'Machine calibration drift', 'Equipment'),
    (p_tenant_id, 'EQP-002', 'Tool wear excessive', 'Equipment'),
    (p_tenant_id, 'EQP-003', 'Equipment malfunction', 'Equipment'),
    (p_tenant_id, 'EQP-004', 'Fixture/tooling damage', 'Equipment'),
    (p_tenant_id, 'EQP-005', 'Clamp marks on part', 'Equipment'),
    (p_tenant_id, 'OPR-001', 'Setup error', 'Operator'),
    (p_tenant_id, 'OPR-002', 'Wrong operation performed', 'Operator'),
    (p_tenant_id, 'OPR-003', 'Handling damage', 'Operator'),
    (p_tenant_id, 'OPR-004', 'Incorrect measurement', 'Operator'),
    (p_tenant_id, 'OPR-005', 'Assembly error', 'Operator'),
    (p_tenant_id, 'DSN-001', 'Design dimension error', 'Design'),
    (p_tenant_id, 'DSN-002', 'Design manufacturability issue', 'Design'),
    (p_tenant_id, 'DSN-003', 'Tolerance stack-up problem', 'Design'),
    (p_tenant_id, 'OTH-001', 'Customer specification change', 'Other'),
    (p_tenant_id, 'OTH-002', 'Prototype/first article', 'Other'),
    (p_tenant_id, 'OTH-003', 'Rework - customer request', 'Other'),
    (p_tenant_id, 'OTH-004', 'Unknown cause - investigation needed', 'Other');
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully inserted %s default scrap reasons', v_count)::TEXT;
END;
$$;


ALTER FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") IS 'Seeds standard scrap/rejection reason codes for a tenant';



CREATE OR REPLACE FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") RETURNS TABLE("created_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_operator_ids UUID[] := ARRAY[
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid(),
    gen_random_uuid()
  ];
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.profiles WHERE tenant_id = p_tenant_id AND role = 'operator' AND full_name LIKE 'Demo Operator%';
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Demo operators already exist for this tenant'::TEXT;
    RETURN;
  END IF;
  INSERT INTO public.profiles (id, tenant_id, role, full_name, email, username, active)
  VALUES
    (v_operator_ids[1], p_tenant_id, 'operator', 'Demo Operator - John Smith', 'demo.operator1@example.com', 'demo.johnsmith', true),
    (v_operator_ids[2], p_tenant_id, 'operator', 'Demo Operator - Maria Garcia', 'demo.operator2@example.com', 'demo.mariagarcia', true),
    (v_operator_ids[3], p_tenant_id, 'operator', 'Demo Operator - Wei Chen', 'demo.operator3@example.com', 'demo.weichen', true),
    (v_operator_ids[4], p_tenant_id, 'operator', 'Demo Operator - Sarah Johnson', 'demo.operator4@example.com', 'demo.sarahjohnson', true);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully created %s demo operators. Note: These are demonstration profiles only and cannot be used for actual login.', v_count)::TEXT;
END;
$$;


ALTER FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") IS 'Creates demo operator profiles for testing (without auth.users entries)';



CREATE OR REPLACE FUNCTION "public"."seed_demo_resources"("p_tenant_id" "uuid") RETURNS TABLE("created_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER;
  v_resource_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.resources WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Resources already exist for this tenant'::TEXT;
    RETURN;
  END IF;
  INSERT INTO public.resources (id, tenant_id, name, type, identifier, description, location, status, metadata)
  VALUES
    (v_resource_ids[1], p_tenant_id, 'Enclosure Mold #1', 'mold', 'MOLD-001',
     '400x300mm sheet metal enclosure mold', 'Press Station 1', 'available',
     '{"moldId": "MOLD-001", "moldName": "Enclosure Mold #1", "cavities": 1, "tonnage": 150, "setupTime": 30, "cycleTime": 45}'::jsonb),
    (v_resource_ids[2], p_tenant_id, 'Bracket Forming Die', 'mold', 'MOLD-002',
     'L-bracket forming die set', 'Press Station 2', 'available',
     '{"moldId": "MOLD-002", "moldName": "Bracket Die", "cavities": 2, "tonnage": 80, "setupTime": 20, "cycleTime": 30}'::jsonb),
    (v_resource_ids[3], p_tenant_id, 'Laser Cutting Head - Fiber 3kW', 'tooling', 'TOOL-LC-001',
     'High-precision fiber laser cutting head', 'Laser Cell', 'in_use',
     '{"toolId": "TOOL-LC-001", "toolType": "cutting", "material": "Carbide", "lifeExpectancy": 10000, "currentUses": 3250}'::jsonb),
    (v_resource_ids[4], p_tenant_id, 'V-Die Set 90° - 2mm', 'tooling', 'TOOL-BD-001',
     'Standard V-die for 90-degree bends in 2mm material', 'Bending Cell', 'available',
     '{"toolId": "TOOL-BD-001", "toolType": "forming", "diameter": 2, "length": 1000}'::jsonb),
    (v_resource_ids[5], p_tenant_id, 'Spot Welding Gun #3', 'tooling', 'TOOL-WD-003',
     'Pneumatic spot welding gun', 'Welding Cell', 'available',
     '{"toolId": "TOOL-WD-003", "toolType": "welding", "maintenanceDue": "2025-12-15"}'::jsonb),
    (v_resource_ids[6], p_tenant_id, 'Welding Fixture - Panel Assembly', 'fixture', 'FIX-001',
     'Custom fixture for panel welding alignment', 'Welding Cell', 'available',
     '{"fixtureId": "FIX-001", "fixtureType": "welding", "capacity": 10, "calibrationDue": "2025-11-30"}'::jsonb),
    (v_resource_ids[7], p_tenant_id, 'QC Inspection Gauge Set', 'fixture', 'FIX-QC-001',
     'Precision measurement gauge set for QC', 'Quality Control', 'available',
     '{"fixtureId": "FIX-QC-001", "fixtureType": "inspection", "calibrationDue": "2025-12-01", "certificationNumber": "CAL-2024-1156"}'::jsonb),
    (v_resource_ids[8], p_tenant_id, 'SS304 Sheet - 2mm', 'material', 'MAT-SS304-2',
     'Stainless steel 304 sheet stock, 2mm thickness', 'Material Storage A', 'available',
     '{"materialType": "Stainless Steel", "grade": "304", "thickness": 2, "width": 1220, "length": 2440, "finish": "2B", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-8834"}'::jsonb),
    (v_resource_ids[9], p_tenant_id, 'AL6061 Sheet - 3mm', 'material', 'MAT-AL6061-3',
     'Aluminum 6061-T6 sheet stock, 3mm thickness', 'Material Storage B', 'available',
     '{"materialType": "Aluminum", "grade": "6061-T6", "thickness": 3, "width": 1220, "length": 2440, "finish": "Mill", "supplier": "Metal Supply Co", "lotNumber": "LOT-2024-9012"}'::jsonb);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, format('Successfully created %s demo resources', v_count)::TEXT;
END;
$$;


ALTER FUNCTION "public"."seed_demo_resources"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."seed_demo_resources"("p_tenant_id" "uuid") IS 'Creates sample resources (molds, tooling, fixtures, materials) for demonstration';



CREATE OR REPLACE FUNCTION "public"."set_active_tenant"("p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_is_root_admin boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is root admin
  SELECT is_root_admin INTO v_is_root_admin
  FROM profiles
  WHERE id = v_user_id;
  
  IF NOT COALESCE(v_is_root_admin, false) THEN
    RAISE EXCEPTION 'Only root administrators can switch tenants';
  END IF;
  
  -- Verify target tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;
  
  -- Update the user's tenant_id to the target tenant
  UPDATE profiles
  SET tenant_id = p_tenant_id
  WHERE id = v_user_id;
END;
$$;


ALTER FUNCTION "public"."set_active_tenant"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."should_show_demo_banner"("p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(demo_mode_enabled, false) = true
    AND COALESCE(demo_mode_acknowledged, false) = false
  FROM tenants
  WHERE id = p_tenant_id;
$$;


ALTER FUNCTION "public"."should_show_demo_banner"("p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."should_show_demo_banner"("p_tenant_id" "uuid") IS 'Returns true if demo mode is active but not yet acknowledged - triggers banner display';



CREATE OR REPLACE FUNCTION "public"."supersede_expectation"("p_expectation_id" "uuid", "p_new_expected_value" "jsonb", "p_new_expected_at" timestamp with time zone, "p_source" "text" DEFAULT 'auto_replan'::"text", "p_created_by" "uuid" DEFAULT NULL::"uuid", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_old_exp RECORD;
  v_new_id UUID;
BEGIN
  -- Get the old expectation
  SELECT * INTO v_old_exp FROM expectations WHERE id = p_expectation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expectation not found';
  END IF;
  
  -- Create new expectation
  INSERT INTO expectations (
    tenant_id,
    entity_type,
    entity_id,
    expectation_type,
    belief_statement,
    expected_value,
    expected_at,
    version,
    source,
    created_by,
    context
  ) VALUES (
    v_old_exp.tenant_id,
    v_old_exp.entity_type,
    v_old_exp.entity_id,
    v_old_exp.expectation_type,
    v_old_exp.belief_statement || ' (replanned)',
    p_new_expected_value,
    p_new_expected_at,
    v_old_exp.version + 1,
    p_source,
    COALESCE(p_created_by, auth.uid()),
    p_context || jsonb_build_object('previous_expectation_id', p_expectation_id)
  )
  RETURNING id INTO v_new_id;
  
  -- Mark old expectation as superseded
  UPDATE expectations
  SET superseded_by = v_new_id,
      superseded_at = now()
  WHERE id = p_expectation_id;
  
  RETURN v_new_id;
END;
$$;


ALTER FUNCTION "public"."supersede_expectation"("p_expectation_id" "uuid", "p_new_expected_value" "jsonb", "p_new_expected_at" timestamp with time zone, "p_source" "text", "p_created_by" "uuid", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_notification_pin"("p_notification_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_pinned BOOLEAN;
BEGIN
  UPDATE public.notifications
  SET
    pinned = NOT pinned,
    pinned_at = CASE WHEN NOT pinned THEN now() ELSE NULL END
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  RETURNING pinned INTO v_pinned;

  RETURN v_pinned;
END;
$$;


ALTER FUNCTION "public"."toggle_notification_pin"("p_notification_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_decrement_jobs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = GREATEST(COALESCE(current_jobs, 0) - 1, 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_decrement_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_decrement_parts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = GREATEST(COALESCE(current_parts_this_month, 0) - COALESCE(OLD.quantity, 1), 0)
  WHERE id = OLD.tenant_id;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_decrement_parts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_increment_jobs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.tenants
  SET current_jobs = COALESCE(current_jobs, 0) + 1
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_increment_jobs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_increment_parts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.tenants
  SET current_parts_this_month = COALESCE(current_parts_this_month, 0) + COALESCE(NEW.quantity, 1)
  WHERE id = NEW.tenant_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_increment_parts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_operator"("p_operator_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found for current user';
  END IF;

  UPDATE operators
  SET failed_attempts = 0,
      locked_until = NULL
  WHERE id = p_operator_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operator not found or access denied';
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."unlock_operator"("p_operator_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_activity_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."update_activity_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_batch_operations_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.operation_batches 
    SET operations_count = (SELECT COUNT(*) FROM public.batch_operations WHERE batch_id = NEW.batch_id),
        updated_at = now()
    WHERE id = NEW.batch_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.operation_batches 
    SET operations_count = (SELECT COUNT(*) FROM public.batch_operations WHERE batch_id = OLD.batch_id),
        updated_at = now()
    WHERE id = OLD.batch_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_batch_operations_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_exception_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.root_cause, '') || ' ' ||
    coalesce(NEW.corrective_action, '') || ' ' ||
    coalesce(NEW.preventive_action, '')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_exception_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_expectation_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.belief_statement, '') || ' ' ||
    coalesce(NEW.entity_type, '') || ' ' ||
    coalesce(NEW.source, '')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_expectation_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_factory_calendar_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_factory_calendar_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invitations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invitations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_issues_search_vector"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.severity::text, '')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_issues_search_vector"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_mcp_server_health"("p_tenant_id" "uuid", "p_status" "text", "p_response_time_ms" integer DEFAULT NULL::integer, "p_error_message" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_health_id UUID;
BEGIN
  IF p_status NOT IN ('online', 'offline', 'degraded') THEN
    RAISE EXCEPTION 'Invalid status. Must be: online, offline, or degraded';
  END IF;

  INSERT INTO mcp_server_health (
    tenant_id, status, last_check, response_time_ms, error_message, metadata
  )
  VALUES (p_tenant_id, p_status, NOW(), p_response_time_ms, p_error_message, p_metadata)
  RETURNING id INTO v_health_id;

  IF p_status = 'online' THEN
    UPDATE mcp_server_config
    SET last_connected_at = NOW()
    WHERE tenant_id = p_tenant_id;
  END IF;

  RETURN v_health_id;
END;
$$;


ALTER FUNCTION "public"."update_mcp_server_health"("p_tenant_id" "uuid", "p_status" "text", "p_response_time_ms" integer, "p_error_message" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_mqtt_publisher_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_mqtt_publisher_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_feature_flags"("p_tenant_id" "uuid", "p_flags" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing_flags JSONB;
  v_merged_flags JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenants WHERE id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  SELECT COALESCE(feature_flags, '{}'::jsonb)
  INTO v_existing_flags
  FROM tenants
  WHERE id = p_tenant_id;

  v_merged_flags := v_existing_flags || p_flags;

  UPDATE tenants
  SET
    feature_flags = v_merged_flags,
    updated_at = now()
  WHERE id = p_tenant_id;

  RETURN v_merged_flags;
END;
$$;


ALTER FUNCTION "public"."update_tenant_feature_flags"("p_tenant_id" "uuid", "p_flags" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_storage_usage"("p_tenant_id" "uuid", "p_size_bytes" bigint, "p_operation" "text" DEFAULT 'add'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_size_gb NUMERIC;
BEGIN
  v_size_gb := p_size_bytes::NUMERIC / 1073741824.0; -- 1024^3

  IF p_operation = 'add' THEN
    UPDATE public.tenants
    SET current_storage_gb = current_storage_gb + v_size_gb
    WHERE id = p_tenant_id;
  ELSIF p_operation = 'remove' THEN
    UPDATE public.tenants
    SET current_storage_gb = GREATEST(current_storage_gb - v_size_gb, 0)
    WHERE id = p_tenant_id;
  ELSIF p_operation = 'set' THEN
    UPDATE public.tenants
    SET current_storage_gb = v_size_gb
    WHERE id = p_tenant_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_tenant_storage_usage"("p_tenant_id" "uuid", "p_size_bytes" bigint, "p_operation" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_storage_operation"("p_tenant_id" "uuid", "p_operation" "text", "p_file_path" "text", "p_file_size_bytes" bigint, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify tenant exists to prevent cross-tenant log pollution
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Invalid tenant_id: %', p_tenant_id;
  END IF;

  INSERT INTO public.activity_log (
    tenant_id,
    action,
    entity_type,
    description,
    metadata
  ) VALUES (
    p_tenant_id,
    'storage_' || p_operation,
    'storage',
    'Storage operation: ' || p_operation || ' on ' || p_file_path,
    jsonb_build_object(
      'file_path', p_file_path,
      'file_size_bytes', p_file_size_bytes,
      'operation', p_operation
    ) || p_metadata
  );
END;
$$;


ALTER FUNCTION "public"."log_storage_operation"("p_tenant_id" "uuid", "p_operation" "text", "p_file_path" "text", "p_file_size_bytes" bigint, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_tenant_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_mcp_key"("p_api_key" "text") RETURNS TABLE("tenant_id" "uuid", "key_id" "uuid", "allowed_tools" "jsonb", "rate_limit" integer, "environment" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_key_record RECORD;
BEGIN
  SELECT ak.id, ak.tenant_id, ak.allowed_tools, ak.rate_limit, ak.environment, ak.enabled
  INTO v_key_record
  FROM mcp_authentication_keys ak
  WHERE ak.key_hash = crypt(p_api_key, ak.key_hash) AND ak.enabled = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or disabled MCP key';
  END IF;

  UPDATE mcp_authentication_keys
  SET last_used_at = NOW(), usage_count = usage_count + 1, updated_at = NOW()
  WHERE id = v_key_record.id;

  RETURN QUERY SELECT v_key_record.tenant_id, v_key_record.id, v_key_record.allowed_tools,
                      v_key_record.rate_limit, v_key_record.environment;
END;
$$;


ALTER FUNCTION "public"."validate_mcp_key"("p_api_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_mcp_token"("p_token" "text") RETURNS TABLE("valid" boolean, "tenant_id" "uuid", "endpoint_id" "uuid", "endpoint_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
DECLARE
  v_token_hash TEXT;
  v_endpoint RECORD;
BEGIN
  -- Hash the provided token
  v_token_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  -- Find matching endpoint
  SELECT e.*, t.name as tenant_name
  INTO v_endpoint
  FROM public.mcp_endpoints e
  JOIN public.tenants t ON t.id = e.tenant_id
  WHERE e.token_hash = v_token_hash AND e.enabled = true;

  IF v_endpoint IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Update usage stats
  UPDATE public.mcp_endpoints
  SET
    last_used_at = now(),
    usage_count = usage_count + 1
  WHERE id = v_endpoint.id;

  RETURN QUERY SELECT
    true,
    v_endpoint.tenant_id,
    v_endpoint.id,
    v_endpoint.name;
END;
$$;


ALTER FUNCTION "public"."validate_mcp_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_operator_pin"("p_employee_id" "text", "p_pin" "text") RETURNS TABLE("success" boolean, "operator_id" "uuid", "full_name" "text", "employee_id" "text", "tenant_id" "uuid", "error_code" "text", "error_message" "text", "attempts_remaining" integer, "locked_until_ts" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_operator RECORD;
  v_max_attempts CONSTANT INTEGER := 5;
  v_lockout_minutes CONSTANT INTEGER := 15;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  v_tenant_id := get_user_tenant_id();

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID,
      'NO_TENANT'::TEXT, 'No tenant found for current session'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  SELECT o.id, o.full_name, o.employee_id, o.pin_hash, o.tenant_id,
         COALESCE(o.failed_attempts, 0) as failed_attempts,
         o.locked_until, o.active
  INTO v_operator
  FROM operators o
  WHERE o.tenant_id = v_tenant_id
    AND UPPER(TRIM(o.employee_id)) = UPPER(TRIM(p_employee_id));

  IF v_operator IS NULL THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'NOT_FOUND'::TEXT, 'Employee ID not found'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF NOT COALESCE(v_operator.active, false) THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'INACTIVE'::TEXT, 'This account has been deactivated. Contact your supervisor.'::TEXT,
      0, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  END IF;

  IF v_operator.locked_until IS NOT NULL AND v_operator.locked_until > v_now THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
      'LOCKED'::TEXT,
      'Account is temporarily locked. Try again later.'::TEXT,
      0, v_operator.locked_until;
    RETURN;
  END IF;

  IF v_operator.locked_until IS NOT NULL AND v_operator.locked_until <= v_now THEN
    UPDATE operators SET failed_attempts = 0, locked_until = NULL
    WHERE id = v_operator.id;
    v_operator.failed_attempts := 0;
  END IF;

  IF v_operator.pin_hash = extensions.crypt(p_pin, v_operator.pin_hash) THEN
    UPDATE operators
    SET failed_attempts = 0,
        locked_until = NULL,
        last_login_at = v_now
    WHERE id = v_operator.id;

    RETURN QUERY SELECT
      true, v_operator.id, v_operator.full_name, v_operator.employee_id, v_operator.tenant_id,
      NULL::TEXT, NULL::TEXT,
      v_max_attempts, NULL::TIMESTAMP WITH TIME ZONE;
    RETURN;
  ELSE
    v_operator.failed_attempts := v_operator.failed_attempts + 1;

    IF v_operator.failed_attempts >= v_max_attempts THEN
      UPDATE operators
      SET failed_attempts = v_operator.failed_attempts,
          locked_until = v_now + (v_lockout_minutes || ' minutes')::INTERVAL
      WHERE id = v_operator.id;

      RETURN QUERY SELECT
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
        'LOCKED'::TEXT,
        format('Account locked. Try again in %s minutes.', v_lockout_minutes)::TEXT,
        0, (v_now + (v_lockout_minutes || ' minutes')::INTERVAL);
      RETURN;
    ELSE
      UPDATE operators
      SET failed_attempts = v_operator.failed_attempts
      WHERE id = v_operator.id;

      RETURN QUERY SELECT
        false, NULL::UUID, NULL::TEXT, NULL::TEXT, v_tenant_id,
        'INVALID_PIN'::TEXT, 'Invalid PIN'::TEXT,
        (v_max_attempts - v_operator.failed_attempts), NULL::TIMESTAMP WITH TIME ZONE;
      RETURN;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION "public"."verify_operator_pin"("p_employee_id" "text", "p_pin" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "user_email" "text",
    "user_name" "text",
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "entity_name" "text",
    "description" "text",
    "changes" "jsonb" DEFAULT '{}'::"jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "search_vector" "tsvector"
);

ALTER TABLE ONLY "public"."activity_log" REPLICA IDENTITY FULL;


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "key_hash" "text" NOT NULL,
    "key_prefix" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone,
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "api_key_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "requests_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_usage_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operator_id" "uuid",
    "part_id" "uuid",
    "job_id" "uuid",
    "assigned_by" "uuid" NOT NULL,
    "status" "public"."assignment_status" DEFAULT 'assigned'::"public"."assignment_status",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "shop_floor_operator_id" "uuid",
    CONSTRAINT "check_operator_assigned" CHECK ((("operator_id" IS NOT NULL) OR ("shop_floor_operator_id" IS NOT NULL)))
);


ALTER TABLE "public"."assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operator_id" "uuid",
    "profile_id" "uuid",
    "clock_in" timestamp with time zone DEFAULT "now"() NOT NULL,
    "clock_out" timestamp with time zone,
    "duration_minutes" integer,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "shift_id" "uuid",
    "target_hours" numeric(5,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "attendance_entries_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'auto_closed'::"text"]))),
    CONSTRAINT "attendance_has_operator" CHECK ((("operator_id" IS NOT NULL) OR ("profile_id" IS NOT NULL)))
);


ALTER TABLE "public"."attendance_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "sequence_in_batch" integer,
    "quantity_in_batch" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."batch_operations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_name" "text" NOT NULL,
    "vat_number" "text" NOT NULL,
    "company_registration_number" "text",
    "contact_name" "text" NOT NULL,
    "contact_email" "text" NOT NULL,
    "contact_phone" "text",
    "country_code" character(2) NOT NULL,
    "industry" "text",
    "company_size" "text",
    "preferred_payment_method" "public"."payment_provider" DEFAULT 'invoice'::"public"."payment_provider",
    "interested_plan" "public"."subscription_plan" DEFAULT 'pro'::"public"."subscription_plan",
    "vat_valid" boolean DEFAULT false,
    "vat_validated_at" timestamp with time zone,
    "status" "public"."waitlist_status" DEFAULT 'pending'::"public"."waitlist_status",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billing_waitlist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cells" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text",
    "image_url" "text",
    "sequence" integer NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "wip_limit" integer,
    "wip_warning_threshold" integer,
    "enforce_wip_limit" boolean DEFAULT false,
    "show_capacity_warning" boolean DEFAULT true,
    "icon_name" character varying(100),
    "capacity_hours_per_day" numeric DEFAULT 8,
    "external_id" "text",
    "external_source" "text",
    "synced_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."cells" OWNER TO "postgres";


COMMENT ON COLUMN "public"."cells"."icon_name" IS 'Lucide-react icon name for visual representation (e.g., Factory, Settings, Wrench)';



COMMENT ON COLUMN "public"."cells"."capacity_hours_per_day" IS 'Daily capacity in hours for this cell';



CREATE TABLE IF NOT EXISTS "public"."exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "expectation_id" "uuid" NOT NULL,
    "exception_type" "public"."exception_type" NOT NULL,
    "status" "public"."exception_status" DEFAULT 'open'::"public"."exception_status" NOT NULL,
    "actual_value" "jsonb",
    "occurred_at" timestamp with time zone,
    "deviation_amount" numeric,
    "deviation_unit" "text",
    "detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "detected_by_event" "uuid",
    "acknowledged_at" timestamp with time zone,
    "acknowledged_by" "uuid",
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution" "jsonb",
    "root_cause" "text",
    "corrective_action" "text",
    "preventive_action" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "search_vector" "tsvector"
);


ALTER TABLE "public"."exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expectations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "expectation_type" "public"."expectation_type" NOT NULL,
    "belief_statement" "text" NOT NULL,
    "expected_value" "jsonb" NOT NULL,
    "expected_at" timestamp with time zone,
    "version" integer DEFAULT 1 NOT NULL,
    "superseded_by" "uuid",
    "superseded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "source" "text" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb",
    "search_vector" "tsvector",
    CONSTRAINT "expectations_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['job'::"text", 'operation'::"text", 'part'::"text"]))),

    CONSTRAINT "expectations_source_check" CHECK (("source" = ANY (ARRAY['erp_sync'::"text", 'manual'::"text", 'scheduler'::"text", 'auto_replan'::"text", 'system'::"text", 'backfill'::"text", 'job_creation'::"text", 'job_update'::"text", 'operation_creation'::"text", 'operation_update'::"text", 'due_date_change'::"text"])))
);


ALTER TABLE "public"."expectations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."factory_calendar" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "day_type" "text" DEFAULT 'working'::"text" NOT NULL,
    "name" "text",
    "opening_time" time without time zone,
    "closing_time" time without time zone,
    "capacity_multiplier" numeric DEFAULT 1.0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "factory_calendar_capacity_multiplier_check" CHECK ((("capacity_multiplier" >= (0)::numeric) AND ("capacity_multiplier" <= (1)::numeric))),
    CONSTRAINT "factory_calendar_day_type_check" CHECK (("day_type" = ANY (ARRAY['working'::"text", 'holiday'::"text", 'closure'::"text", 'half_day'::"text"])))
);


ALTER TABLE "public"."factory_calendar" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."factory_capacity_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "reason" "text",
    "capacity_multiplier" numeric(3,2) DEFAULT 1.0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."factory_capacity_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."factory_holidays" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_recurring" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."factory_holidays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."factory_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "active_days" integer[] DEFAULT '{1,2,3,4,5}'::integer[],
    "is_active" boolean DEFAULT true,
    "color" "text" DEFAULT '#3b82f6'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."factory_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."installed_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "integration_id" "uuid" NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "api_key_id" "uuid",
    "webhook_id" "uuid",
    "is_active" boolean DEFAULT true,
    "last_sync_at" timestamp with time zone,
    "installed_by" "uuid",
    "installed_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."installed_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" NOT NULL,
    "long_description" "text",
    "category" "public"."integration_category" DEFAULT 'other'::"public"."integration_category" NOT NULL,
    "status" "public"."integration_status" DEFAULT 'draft'::"public"."integration_status" NOT NULL,
    "logo_url" "text",
    "banner_url" "text",
    "screenshots" "jsonb" DEFAULT '[]'::"jsonb",
    "provider_name" "text" NOT NULL,
    "provider_url" "text",
    "provider_email" "text",
    "supported_systems" "jsonb" DEFAULT '[]'::"jsonb",
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "requirements" "jsonb" DEFAULT '{}'::"jsonb",
    "documentation_url" "text",
    "github_repo_url" "text",
    "demo_video_url" "text",
    "is_free" boolean DEFAULT true,
    "pricing_description" "text",
    "pricing_url" "text",
    "install_url" "text",
    "webhook_template" "jsonb",
    "requires_api_key" boolean DEFAULT true,
    "version" "text" DEFAULT '1.0.0'::"text",
    "min_plan_tier" "text",
    "install_count" integer DEFAULT 0,
    "rating_average" numeric(2,1) DEFAULT 0.0,
    "rating_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "published_at" timestamp with time zone
);


ALTER TABLE "public"."integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."app_role" DEFAULT 'operator'::"public"."app_role" NOT NULL,
    "token" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issue_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" character varying(20) NOT NULL,
    "description" "text" NOT NULL,
    "severity_default" character varying(20) DEFAULT 'medium'::character varying,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "issue_categories_severity_default_check" CHECK ((("severity_default")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[])))
);


ALTER TABLE "public"."issue_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "severity" "public"."issue_severity" NOT NULL,
    "status" "public"."issue_status" DEFAULT 'pending'::"public"."issue_status",
    "image_paths" "text"[],
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "search_vector" "tsvector" GENERATED ALWAYS AS (("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("description", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("resolution_notes", ''::"text")), 'B'::"char"))) STORED,
    "title" "text",
    "issue_type" "public"."issue_type" DEFAULT 'general'::"public"."issue_type",
    "reported_by_id" "uuid",
    "ncr_category" "public"."ncr_category",
    "disposition" "public"."ncr_disposition",
    "root_cause" "text",
    "corrective_action" "text",
    "preventive_action" "text",
    "affected_quantity" integer,
    "verification_required" boolean DEFAULT false
);


ALTER TABLE "public"."issues" OWNER TO "postgres";


COMMENT ON COLUMN "public"."issues"."search_vector" IS 'Full-text search vector for issues. Searches description (weight A) and resolution_notes (weight B)';



CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "job_number" "text" NOT NULL,
    "customer" "text",
    "due_date" timestamp with time zone,
    "due_date_override" timestamp with time zone,
    "status" "public"."job_status" DEFAULT 'not_started'::"public"."job_status",
    "current_cell_id" "uuid",
    "notes" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "search_vector" "tsvector" GENERATED ALWAYS AS ((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("job_number", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("customer", ''::"text")), 'A'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("notes", ''::"text")), 'B'::"char"))) STORED,
    "delivery_address" "text",
    "delivery_city" "text",
    "delivery_postal_code" "text",
    "delivery_country" "text" DEFAULT 'NL'::"text",
    "delivery_lat" numeric(10,8),
    "delivery_lng" numeric(11,8),
    "total_weight_kg" numeric(10,2),
    "total_volume_m3" numeric(10,3),
    "package_count" integer DEFAULT 1,
    "external_id" "text",
    "external_source" "text",
    "synced_at" timestamp with time zone,
    "sync_hash" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."jobs"."search_vector" IS 'Full-text search vector for jobs. Searches job_number (weight A), customer (weight A), and notes (weight B)';



CREATE TABLE IF NOT EXISTS "public"."operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "part_id" "uuid" NOT NULL,
    "cell_id" "uuid" NOT NULL,
    "assigned_operator_id" "uuid",
    "operation_name" "text" NOT NULL,
    "sequence" integer NOT NULL,
    "estimated_time" integer NOT NULL,
    "actual_time" integer DEFAULT 0,
    "status" "public"."task_status" DEFAULT 'not_started'::"public"."task_status",
    "completion_percentage" integer DEFAULT 0,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "search_vector" "tsvector" GENERATED ALWAYS AS (("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("operation_name", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("notes", ''::"text")), 'B'::"char"))) STORED,
    "metadata" "jsonb",
    "icon_name" character varying(100),
    "setup_time" numeric DEFAULT 0,
    "run_time_per_unit" numeric DEFAULT 0,
    "wait_time" numeric DEFAULT 0,
    "changeover_time" numeric DEFAULT 0,
    "planned_start" timestamp with time zone,
    "planned_end" timestamp with time zone,
    "external_id" "text",
    "external_source" "text",
    "synced_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."operations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."operations"."search_vector" IS 'Full-text search vector for operations. Searches operation_name (weight A) and notes (weight B)';



COMMENT ON COLUMN "public"."operations"."icon_name" IS 'Lucide-react icon name for operation type (e.g., Hammer, Cog, Drill)';



COMMENT ON COLUMN "public"."operations"."setup_time" IS 'Setup time in minutes';



COMMENT ON COLUMN "public"."operations"."run_time_per_unit" IS 'Run time per unit in minutes';



COMMENT ON COLUMN "public"."operations"."wait_time" IS 'Wait time in minutes';



COMMENT ON COLUMN "public"."operations"."changeover_time" IS 'Changeover time in minutes';



CREATE TABLE IF NOT EXISTS "public"."parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "parent_part_id" "uuid",
    "part_number" "text" NOT NULL,
    "material" "text" NOT NULL,
    "quantity" integer DEFAULT 1,
    "status" "public"."job_status" DEFAULT 'not_started'::"public"."job_status",
    "current_cell_id" "uuid",
    "file_paths" "text"[],
    "notes" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "image_paths" "text"[] DEFAULT '{}'::"text"[],
    "search_vector" "tsvector" GENERATED ALWAYS AS ((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("part_number", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("material", ''::"text")), 'B'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("notes", ''::"text")), 'B'::"char"))) STORED,
    "material_lot" "text",
    "material_supplier" "text",
    "material_cert_number" "text",
    "weight_kg" numeric(10,3),
    "length_mm" numeric(10,2),
    "width_mm" numeric(10,2),
    "height_mm" numeric(10,2),
    "drawing_no" "text",
    "cnc_program_name" "text",
    "is_bullet_card" boolean DEFAULT false,
    "external_id" "text",
    "external_source" "text",
    "synced_at" timestamp with time zone,
    "sync_hash" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."parts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."parts"."image_paths" IS 'Array of storage paths to part images in parts-images bucket. Format: {tenant_id}/parts/{part_id}/{timestamp}_{filename}.{ext}';



COMMENT ON COLUMN "public"."parts"."search_vector" IS 'Full-text search vector for parts. Searches part_number (weight A), material (weight B), and notes (weight B)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "active" boolean DEFAULT true,
    "is_machine" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_completed" boolean DEFAULT false,
    "onboarding_step" integer DEFAULT 0,
    "tour_completed" boolean DEFAULT false,
    "mock_data_imported" boolean DEFAULT false,
    "search_vector" "tsvector" GENERATED ALWAYS AS ((("setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("full_name", ''::"text")), 'A'::"char") || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("username", ''::"text")), 'A'::"char")) || "setweight"("to_tsvector"('"english"'::"regconfig", COALESCE("email", ''::"text")), 'B'::"char"))) STORED,
    "is_root_admin" boolean DEFAULT false,
    "has_email_login" boolean DEFAULT true,
    "employee_id" "text",
    "pin_hash" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."onboarding_completed" IS 'Indicates if user has completed the onboarding wizard';



COMMENT ON COLUMN "public"."profiles"."onboarding_step" IS 'Current step in onboarding wizard (0 = not started)';



COMMENT ON COLUMN "public"."profiles"."tour_completed" IS 'Indicates if user has completed the app tour';



COMMENT ON COLUMN "public"."profiles"."mock_data_imported" IS 'Indicates if mock data has been imported for this user';



COMMENT ON COLUMN "public"."profiles"."search_vector" IS 'Full-text search vector for users. Searches full_name (weight A), username (weight A), and email (weight B)';



CREATE OR REPLACE VIEW "public"."issues_with_context" WITH ("security_invoker"='true') AS
 SELECT "i"."id",
    "i"."tenant_id",
    "i"."operation_id",
    "i"."created_by",
    "i"."description",
    "i"."severity",
    "i"."status",
    "i"."image_paths",
    "i"."reviewed_by",
    "i"."reviewed_at",
    "i"."resolution_notes",
    "i"."created_at",
    "i"."updated_at",
    "i"."search_vector",
    "o"."operation_name",
    "o"."part_id",
    "p"."part_number",
    "p"."job_id",
    "j"."job_number",
    "j"."customer",
    "creator"."full_name" AS "creator_name",
    "reviewer"."full_name" AS "reviewer_name"
   FROM ((((("public"."issues" "i"
     JOIN "public"."operations" "o" ON (("i"."operation_id" = "o"."id")))
     JOIN "public"."parts" "p" ON (("o"."part_id" = "p"."id")))
     JOIN "public"."jobs" "j" ON (("p"."job_id" = "j"."id")))
     LEFT JOIN "public"."profiles" "creator" ON (("i"."created_by" = "creator"."id")))
     LEFT JOIN "public"."profiles" "reviewer" ON (("i"."reviewed_by" = "reviewer"."id")));


ALTER VIEW "public"."issues_with_context" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "color" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcp_authentication_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "key_hash" "text" NOT NULL,
    "key_prefix" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "environment" "text" DEFAULT 'live'::"text" NOT NULL,
    "allowed_tools" "jsonb" DEFAULT '["*"]'::"jsonb",
    "rate_limit" integer DEFAULT 100,
    "enabled" boolean DEFAULT true NOT NULL,
    "last_used_at" timestamp with time zone,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "mcp_authentication_keys_environment_check" CHECK (("environment" = ANY (ARRAY['live'::"text", 'test'::"text"])))
);


ALTER TABLE "public"."mcp_authentication_keys" OWNER TO "postgres";


COMMENT ON TABLE "public"."mcp_authentication_keys" IS 'Per-tenant MCP authentication keys with granular permissions';



CREATE TABLE IF NOT EXISTS "public"."mcp_endpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "token_hash" "text" NOT NULL,
    "token_prefix" "text" NOT NULL,
    "enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "last_used_at" timestamp with time zone,
    "usage_count" integer DEFAULT 0
);


ALTER TABLE "public"."mcp_endpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mcp_key_usage_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "key_id" "uuid",
    "tool_name" "text" NOT NULL,
    "tool_arguments" "jsonb",
    "success" boolean NOT NULL,
    "error_message" "text",
    "response_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text"
);


ALTER TABLE "public"."mcp_key_usage_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."mcp_key_usage_logs" IS 'Audit trail for MCP key usage and tool calls';



CREATE TABLE IF NOT EXISTS "public"."mcp_server_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "server_name" "text" DEFAULT 'eryxon-flow-mcp'::"text" NOT NULL,
    "server_version" "text" DEFAULT '2.1.0'::"text" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "supabase_url" "text" NOT NULL,
    "last_connected_at" timestamp with time zone,
    "features" "jsonb" DEFAULT '{"logging": true, "healthCheck": true, "autoReconnect": true}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mcp_server_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."mcp_server_config" IS 'MCP server configuration per tenant';



CREATE TABLE IF NOT EXISTS "public"."mcp_server_health" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "last_check" timestamp with time zone DEFAULT "now"(),
    "response_time_ms" integer,
    "error_message" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "mcp_server_health_status_check" CHECK (("status" = ANY (ARRAY['online'::"text", 'offline'::"text", 'degraded'::"text"])))
);


ALTER TABLE "public"."mcp_server_health" OWNER TO "postgres";


COMMENT ON TABLE "public"."mcp_server_health" IS 'MCP server health monitoring data';



CREATE TABLE IF NOT EXISTS "public"."mcp_server_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mcp_server_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."mcp_server_logs" IS 'MCP server activity logs';



CREATE TABLE IF NOT EXISTS "public"."monthly_reset_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "reset_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "previous_count" integer NOT NULL,
    "reset_successful" boolean DEFAULT true NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."monthly_reset_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mqtt_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mqtt_publisher_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "topic" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "success" boolean DEFAULT false NOT NULL,
    "error_message" "text",
    "latency_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mqtt_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mqtt_publishers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "broker_url" "text" NOT NULL,
    "port" integer DEFAULT 1883 NOT NULL,
    "username" "text",
    "password" "text",
    "topic_pattern" "text" DEFAULT '{enterprise}/{site}/{area}/{cell}/{event}'::"text" NOT NULL,
    "default_enterprise" "text" DEFAULT 'eryxon'::"text",
    "default_site" "text" DEFAULT 'main'::"text",
    "default_area" "text" DEFAULT 'production'::"text",
    "use_tls" boolean DEFAULT false,
    "events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "active" boolean DEFAULT true,
    "last_connected_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."mqtt_publishers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "severity" "text" DEFAULT 'low'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "link" "text",
    "reference_type" "text",
    "reference_id" "uuid",
    "read" boolean DEFAULT false NOT NULL,
    "pinned" boolean DEFAULT false NOT NULL,
    "dismissed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    "pinned_at" timestamp with time zone,
    "dismissed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "notifications_reference_type_check" CHECK (("reference_type" = ANY (ARRAY['issue'::"text", 'job'::"text", 'part'::"text", 'user'::"text", 'assignment'::"text", 'operation'::"text"]))),
    CONSTRAINT "notifications_severity_check" CHECK (("severity" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['issue'::"text", 'job_due'::"text", 'new_part'::"text", 'new_user'::"text", 'assignment'::"text", 'part_completed'::"text", 'operation_completed'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores user notifications with support for read/pin/dismiss states';



CREATE TABLE IF NOT EXISTS "public"."operation_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "batch_number" "text" NOT NULL,
    "batch_type" "public"."batch_type" DEFAULT 'general'::"public"."batch_type" NOT NULL,
    "status" "public"."batch_status" DEFAULT 'draft'::"public"."batch_status" NOT NULL,
    "cell_id" "uuid" NOT NULL,
    "material" "text",
    "thickness_mm" numeric(10,2),
    "notes" "text",
    "nesting_metadata" "jsonb",
    "operations_count" integer DEFAULT 0 NOT NULL,
    "estimated_time" numeric(10,2),
    "actual_time" numeric(10,2),
    "created_by" "uuid",
    "started_by" "uuid",
    "completed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "external_id" "text",
    "external_source" "text"
);


ALTER TABLE "public"."operation_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operation_day_allocations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "cell_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "hours_allocated" numeric NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "operation_day_allocations_hours_allocated_check" CHECK (("hours_allocated" > (0)::numeric))
);


ALTER TABLE "public"."operation_day_allocations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operation_quantities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "recorded_by" "uuid",
    "quantity_produced" integer DEFAULT 0 NOT NULL,
    "quantity_good" integer DEFAULT 0 NOT NULL,
    "quantity_scrap" integer DEFAULT 0 NOT NULL,
    "quantity_rework" integer DEFAULT 0 NOT NULL,
    "scrap_reason_id" "uuid",
    "material_lot" "text",
    "material_supplier" "text",
    "material_cert_number" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "operation_quantities_check" CHECK (("quantity_produced" = (("quantity_good" + "quantity_scrap") + "quantity_rework"))),
    CONSTRAINT "operation_quantities_quantity_good_check" CHECK (("quantity_good" >= 0)),
    CONSTRAINT "operation_quantities_quantity_produced_check" CHECK (("quantity_produced" >= 0)),
    CONSTRAINT "operation_quantities_quantity_rework_check" CHECK (("quantity_rework" >= 0)),
    CONSTRAINT "operation_quantities_quantity_scrap_check" CHECK (("quantity_scrap" >= 0))
);


ALTER TABLE "public"."operation_quantities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operation_quantity_scrap_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_quantity_id" "uuid" NOT NULL,
    "scrap_reason_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."operation_quantity_scrap_reasons" OWNER TO "postgres";


COMMENT ON TABLE "public"."operation_quantity_scrap_reasons" IS 'Junction table for multiple scrap reasons per operation quantity record';



COMMENT ON COLUMN "public"."operation_quantity_scrap_reasons"."quantity" IS 'Number of units scrapped for this specific reason';



CREATE TABLE IF NOT EXISTS "public"."operation_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "resource_id" "uuid" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."operation_resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "employee_id" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "pin_hash" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "failed_attempts" integer DEFAULT 0,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone
);


ALTER TABLE "public"."operators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "identifier" "text",
    "location" "text",
    "status" "text" DEFAULT 'available'::"text",
    "metadata" "jsonb",
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "external_id" "text",
    "external_source" "text",
    "synced_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."resources" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scrap_reasons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text" NOT NULL,
    "category" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scrap_reasons_category_check" CHECK (("category" = ANY (ARRAY['material'::"text", 'process'::"text", 'equipment'::"text", 'operator'::"text", 'design'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."scrap_reasons" OWNER TO "postgres";







CREATE TABLE IF NOT EXISTS "public"."subscription_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "old_plan" "public"."subscription_plan",
    "new_plan" "public"."subscription_plan",
    "old_status" "public"."subscription_status",
    "new_status" "public"."subscription_status",
    "stripe_event_id" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."substep_template_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "notes" "text",
    "sequence" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."substep_template_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."substep_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "operation_type" "text",
    "is_global" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."substep_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."substeps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sequence" integer NOT NULL,
    "status" "text" DEFAULT 'not_started'::"text",
    "notes" "text",
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "icon_name" character varying(100),
    CONSTRAINT "substeps_status_check" CHECK (("status" = ANY (ARRAY['not_started'::"text", 'in_progress'::"text", 'completed'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."substeps" OWNER TO "postgres";


COMMENT ON COLUMN "public"."substeps"."icon_name" IS 'Lucide-react icon name for substep visualization (e.g., CheckCircle, AlertTriangle)';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "plan" "public"."subscription_plan" DEFAULT 'free'::"public"."subscription_plan" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'active'::"public"."subscription_status" NOT NULL,
    "max_jobs" integer,
    "max_parts_per_month" integer,
    "max_storage_gb" numeric(10,2),
    "current_jobs" integer DEFAULT 0,
    "current_parts_this_month" integer DEFAULT 0,
    "current_storage_gb" numeric(10,2) DEFAULT 0,
    "billing_email" "text",
    "trial_ends_at" timestamp with time zone DEFAULT ("now"() + '30 days'::interval),
    "subscription_started_at" timestamp with time zone DEFAULT "now"(),
    "subscription_updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_parts_reset_date" timestamp with time zone DEFAULT "now"(),
    "company_name" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "onboarding_completed_at" timestamp with time zone,
    "demo_mode_enabled" boolean DEFAULT false,
    "demo_data_seeded_at" timestamp with time zone,
    "demo_data_seeded_by" "uuid",
    "demo_mode_acknowledged" boolean DEFAULT false,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "billing_enabled" boolean DEFAULT false,
    "vat_number" "text",
    "billing_country_code" character(2),
    "trial_end" timestamp with time zone,
    "payment_failed_at" timestamp with time zone,
    "grace_period_ends_at" timestamp with time zone,
    "preferred_payment_method" "public"."payment_provider" DEFAULT 'invoice'::"public"."payment_provider",
    "factory_opening_time" time without time zone DEFAULT '07:00:00'::time without time zone,
    "factory_closing_time" time without time zone DEFAULT '17:00:00'::time without time zone,
    "auto_stop_tracking" boolean DEFAULT false,
    "working_days_mask" integer DEFAULT 31,
    "whitelabel_enabled" boolean DEFAULT false,
    "whitelabel_logo_url" "text",
    "whitelabel_app_name" "text",
    "whitelabel_primary_color" "text",
    "whitelabel_favicon_url" "text",
    "abbreviation" "text",
    "next_operator_number" integer DEFAULT 1,
    "api_requests_today" integer DEFAULT 0,
    "api_requests_reset_at" timestamp with time zone DEFAULT (CURRENT_DATE + '1 day'::interval),
    "feature_flags" "jsonb" DEFAULT '{"issues": true, "capacity": true, "analytics": true, "monitoring": true, "assignments": true, "integrations": true, "operatorViews": true}'::"jsonb",
    "use_external_feature_flags" boolean DEFAULT false,
    "external_feature_flags_config" "jsonb"
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tenants"."demo_mode_enabled" IS 'Indicates if tenant is using demo data. Set to true when demo data is seeded, false when cleared.';



COMMENT ON COLUMN "public"."tenants"."demo_data_seeded_at" IS 'Timestamp when demo data was last seeded for this tenant.';



COMMENT ON COLUMN "public"."tenants"."demo_data_seeded_by" IS 'User ID who seeded the demo data (if available).';



COMMENT ON COLUMN "public"."tenants"."demo_mode_acknowledged" IS 'User acknowledged they are okay keeping demo data. When false, show persistent banner. When true, show subtle indicator only.';



COMMENT ON COLUMN "public"."tenants"."factory_opening_time" IS 'Factory opening time (used for scheduling)';



COMMENT ON COLUMN "public"."tenants"."factory_closing_time" IS 'Factory closing time (used to auto-stop time tracking if enabled)';



COMMENT ON COLUMN "public"."tenants"."auto_stop_tracking" IS 'If true, automatically stop time tracking at factory closing time';



COMMENT ON COLUMN "public"."tenants"."feature_flags" IS 'JSONB object storing feature flag settings. Keys: analytics, monitoring, operatorViews, integrations, issues, capacity, assignments. All default to true if not specified.';



COMMENT ON COLUMN "public"."tenants"."use_external_feature_flags" IS 'Whether to use external feature flag service (e.g., LaunchDarkly, PostHog). Default FALSE = use internal flags.';



COMMENT ON COLUMN "public"."tenants"."external_feature_flags_config" IS 'Configuration for external feature flag service (API key, project ID, etc.). Only used when use_external_feature_flags = TRUE.';



CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_time" timestamp with time zone,
    "duration" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_paused" boolean DEFAULT false,
    "time_type" "text" DEFAULT 'run'::"text" NOT NULL,
    CONSTRAINT "time_entries_time_type_check" CHECK (("time_type" = ANY (ARRAY['setup'::"text", 'run'::"text", 'rework'::"text", 'wait'::"text", 'breakdown'::"text"])))
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entry_pauses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "time_entry_id" "uuid" NOT NULL,
    "paused_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resumed_at" timestamp with time zone,
    "duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."time_entry_pauses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status_code" integer,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhook_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "events" "text"[] NOT NULL,
    "secret_key" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "operation" "text" NOT NULL DEFAULT 'upsert'::"text",
    "source" "text" DEFAULT 'api'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "record_count" integer DEFAULT 0,
    "total_records" integer DEFAULT 0,
    "created_count" integer DEFAULT 0,
    "updated_count" integer DEFAULT 0,
    "skipped_count" integer DEFAULT 0,
    "error_count" integer DEFAULT 0,
    "sync_hash" "text",
    "errors" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_imports" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_tenant_id_date_key" UNIQUE ("tenant_id", "date");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_operations"
    ADD CONSTRAINT "batch_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_operations"
    ADD CONSTRAINT "batch_operations_unique" UNIQUE ("operation_id");



ALTER TABLE ONLY "public"."billing_waitlist"
    ADD CONSTRAINT "billing_waitlist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exceptions"
    ADD CONSTRAINT "exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expectations"
    ADD CONSTRAINT "expectations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."factory_calendar"
    ADD CONSTRAINT "factory_calendar_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."factory_calendar"
    ADD CONSTRAINT "factory_calendar_tenant_id_date_key" UNIQUE ("tenant_id", "date");



ALTER TABLE ONLY "public"."factory_capacity_overrides"
    ADD CONSTRAINT "factory_capacity_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."factory_capacity_overrides"
    ADD CONSTRAINT "factory_capacity_overrides_tenant_id_date_key" UNIQUE ("tenant_id", "date");



ALTER TABLE ONLY "public"."factory_holidays"
    ADD CONSTRAINT "factory_holidays_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."factory_shifts"
    ADD CONSTRAINT "factory_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installed_integrations"
    ADD CONSTRAINT "installed_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."installed_integrations"
    ADD CONSTRAINT "installed_integrations_tenant_id_integration_id_key" UNIQUE ("tenant_id", "integration_id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integrations"
    ADD CONSTRAINT "integrations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."issue_categories"
    ADD CONSTRAINT "issue_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."issue_categories"
    ADD CONSTRAINT "issue_categories_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_tenant_id_job_number_key" UNIQUE ("tenant_id", "job_number");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials"
    ADD CONSTRAINT "materials_tenant_id_name_key" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."mcp_authentication_keys"
    ADD CONSTRAINT "mcp_authentication_keys_key_hash_key" UNIQUE ("key_hash");



ALTER TABLE ONLY "public"."mcp_authentication_keys"
    ADD CONSTRAINT "mcp_authentication_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcp_authentication_keys"
    ADD CONSTRAINT "mcp_authentication_keys_tenant_id_name_key" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."mcp_endpoints"
    ADD CONSTRAINT "mcp_endpoints_name_tenant_unique" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."mcp_endpoints"
    ADD CONSTRAINT "mcp_endpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcp_key_usage_logs"
    ADD CONSTRAINT "mcp_key_usage_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcp_server_config"
    ADD CONSTRAINT "mcp_server_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcp_server_config"
    ADD CONSTRAINT "mcp_server_config_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."mcp_server_health"
    ADD CONSTRAINT "mcp_server_health_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mcp_server_logs"
    ADD CONSTRAINT "mcp_server_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."monthly_reset_logs"
    ADD CONSTRAINT "monthly_reset_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mqtt_logs"
    ADD CONSTRAINT "mqtt_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mqtt_publishers"
    ADD CONSTRAINT "mqtt_publishers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operation_batches"
    ADD CONSTRAINT "operation_batches_batch_number_tenant_unique" UNIQUE ("tenant_id", "batch_number");



ALTER TABLE ONLY "public"."operation_batches"
    ADD CONSTRAINT "operation_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operation_day_allocations"
    ADD CONSTRAINT "operation_day_allocations_operation_id_date_key" UNIQUE ("operation_id", "date");



ALTER TABLE ONLY "public"."operation_day_allocations"
    ADD CONSTRAINT "operation_day_allocations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operation_quantities"
    ADD CONSTRAINT "operation_quantities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operation_quantity_scrap_reasons"
    ADD CONSTRAINT "operation_quantity_scrap_reas_operation_quantity_id_scrap_r_key" UNIQUE ("operation_quantity_id", "scrap_reason_id");



ALTER TABLE ONLY "public"."operation_quantity_scrap_reasons"
    ADD CONSTRAINT "operation_quantity_scrap_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operation_resources"
    ADD CONSTRAINT "operation_resources_operation_id_resource_id_key" UNIQUE ("operation_id", "resource_id");



ALTER TABLE ONLY "public"."operation_resources"
    ADD CONSTRAINT "operation_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_tenant_id_employee_id_key" UNIQUE ("tenant_id", "employee_id");



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_tenant_id_part_number_key" UNIQUE ("tenant_id", "part_number");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_username_key" UNIQUE ("tenant_id", "username");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_tenant_id_name_key" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."scrap_reasons"
    ADD CONSTRAINT "scrap_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scrap_reasons"
    ADD CONSTRAINT "scrap_reasons_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."cells"
    ADD CONSTRAINT "stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_stripe_event_id_key" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."substep_template_items"
    ADD CONSTRAINT "substep_template_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."substep_templates"
    ADD CONSTRAINT "substep_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."substeps"
    ADD CONSTRAINT "substeps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_imports"
    ADD CONSTRAINT "sync_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entry_pauses"
    ADD CONSTRAINT "time_entry_pauses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."substep_template_items"
    ADD CONSTRAINT "unique_sequence_per_template" UNIQUE ("template_id", "sequence");



ALTER TABLE ONLY "public"."substep_templates"
    ADD CONSTRAINT "unique_template_name_per_tenant" UNIQUE ("tenant_id", "name");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_log_action" ON "public"."activity_log" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "idx_activity_log_created_at" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_log_entity" ON "public"."activity_log" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_activity_log_entity_id" ON "public"."activity_log" USING "btree" ("entity_id");



CREATE INDEX "idx_activity_log_entity_type" ON "public"."activity_log" USING "btree" ("entity_type");



CREATE INDEX "idx_activity_log_search" ON "public"."activity_log" USING "gin" ("search_vector");



CREATE INDEX "idx_activity_log_tenant_action" ON "public"."activity_log" USING "btree" ("tenant_id", "action");



CREATE INDEX "idx_activity_log_tenant_created" ON "public"."activity_log" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_tenant_id" ON "public"."activity_log" USING "btree" ("tenant_id");



CREATE INDEX "idx_activity_log_user_created" ON "public"."activity_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_activity_log_user_id" ON "public"."activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_api_keys_hash" ON "public"."api_keys" USING "btree" ("key_hash") WHERE ("active" = true);



CREATE INDEX "idx_api_keys_prefix" ON "public"."api_keys" USING "btree" ("key_prefix") WHERE ("active" = true);



CREATE INDEX "idx_api_keys_tenant" ON "public"."api_keys" USING "btree" ("tenant_id");



CREATE INDEX "idx_api_keys_tenant_active" ON "public"."api_keys" USING "btree" ("tenant_id", "active");



CREATE INDEX "idx_api_usage_logs_tenant_date" ON "public"."api_usage_logs" USING "btree" ("tenant_id", "date" DESC);



CREATE INDEX "idx_assignments_operator" ON "public"."assignments" USING "btree" ("operator_id");



CREATE INDEX "idx_assignments_shop_floor_operator" ON "public"."assignments" USING "btree" ("shop_floor_operator_id");



CREATE INDEX "idx_attendance_entries_clock_in" ON "public"."attendance_entries" USING "btree" ("clock_in");



CREATE INDEX "idx_attendance_entries_operator_id" ON "public"."attendance_entries" USING "btree" ("operator_id");



CREATE INDEX "idx_attendance_entries_profile_id" ON "public"."attendance_entries" USING "btree" ("profile_id");



CREATE INDEX "idx_attendance_entries_status" ON "public"."attendance_entries" USING "btree" ("status");



CREATE INDEX "idx_attendance_entries_tenant_id" ON "public"."attendance_entries" USING "btree" ("tenant_id");



CREATE INDEX "idx_batch_operations_batch" ON "public"."batch_operations" USING "btree" ("batch_id");



CREATE INDEX "idx_batch_operations_operation" ON "public"."batch_operations" USING "btree" ("operation_id");



CREATE INDEX "idx_batch_operations_tenant" ON "public"."batch_operations" USING "btree" ("tenant_id");



CREATE INDEX "idx_cells_active" ON "public"."cells" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_cells_external_sync" ON "public"."cells" USING "btree" ("tenant_id", "external_source", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_cells_icon_name" ON "public"."cells" USING "btree" ("icon_name") WHERE ("icon_name" IS NOT NULL);



CREATE INDEX "idx_cells_sequence" ON "public"."cells" USING "btree" ("sequence");



CREATE INDEX "idx_cells_tenant_id" ON "public"."cells" USING "btree" ("tenant_id");



CREATE INDEX "idx_exceptions_detected" ON "public"."exceptions" USING "btree" ("detected_at" DESC);



CREATE INDEX "idx_exceptions_expectation" ON "public"."exceptions" USING "btree" ("expectation_id");



CREATE INDEX "idx_exceptions_open" ON "public"."exceptions" USING "btree" ("tenant_id") WHERE ("status" = 'open'::"public"."exception_status");



CREATE INDEX "idx_exceptions_search" ON "public"."exceptions" USING "gin" ("search_vector");



CREATE INDEX "idx_exceptions_status" ON "public"."exceptions" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_exceptions_tenant" ON "public"."exceptions" USING "btree" ("tenant_id");



CREATE INDEX "idx_expectations_active" ON "public"."expectations" USING "btree" ("tenant_id", "superseded_by") WHERE ("superseded_by" IS NULL);



CREATE INDEX "idx_expectations_entity" ON "public"."expectations" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_expectations_expected_at" ON "public"."expectations" USING "btree" ("expected_at") WHERE ("superseded_by" IS NULL);



CREATE INDEX "idx_expectations_search" ON "public"."expectations" USING "gin" ("search_vector");



CREATE INDEX "idx_expectations_tenant" ON "public"."expectations" USING "btree" ("tenant_id");



CREATE INDEX "idx_factory_calendar_tenant_date" ON "public"."factory_calendar" USING "btree" ("tenant_id", "date");



CREATE INDEX "idx_installed_integrations_tenant" ON "public"."installed_integrations" USING "btree" ("tenant_id");



CREATE INDEX "idx_integrations_category" ON "public"."integrations" USING "btree" ("category");



CREATE INDEX "idx_integrations_slug" ON "public"."integrations" USING "btree" ("slug");



CREATE INDEX "idx_integrations_status" ON "public"."integrations" USING "btree" ("status");



CREATE INDEX "idx_invitations_expires_at" ON "public"."invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_invitations_status" ON "public"."invitations" USING "btree" ("status");



CREATE INDEX "idx_invitations_tenant_id" ON "public"."invitations" USING "btree" ("tenant_id");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE UNIQUE INDEX "idx_invitations_unique_pending" ON "public"."invitations" USING "btree" ("tenant_id", "email") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_issue_categories_active" ON "public"."issue_categories" USING "btree" ("tenant_id", "active");



CREATE INDEX "idx_issue_categories_tenant" ON "public"."issue_categories" USING "btree" ("tenant_id");



CREATE INDEX "idx_issues_created_by" ON "public"."issues" USING "btree" ("created_by");



CREATE INDEX "idx_issues_operation" ON "public"."issues" USING "btree" ("operation_id");



CREATE INDEX "idx_issues_search_vector" ON "public"."issues" USING "gin" ("search_vector");



CREATE INDEX "idx_issues_status" ON "public"."issues" USING "btree" ("status");



CREATE INDEX "idx_issues_tenant" ON "public"."issues" USING "btree" ("tenant_id");



CREATE INDEX "idx_issues_tenant_severity" ON "public"."issues" USING "btree" ("tenant_id", "severity");



CREATE INDEX "idx_issues_tenant_status" ON "public"."issues" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_jobs_active" ON "public"."jobs" USING "btree" ("tenant_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_jobs_customer" ON "public"."jobs" USING "btree" ("tenant_id", "customer") WHERE ("customer" IS NOT NULL);



CREATE INDEX "idx_jobs_delivery_city" ON "public"."jobs" USING "btree" ("delivery_city");



CREATE INDEX "idx_jobs_delivery_postal" ON "public"."jobs" USING "btree" ("delivery_postal_code");



CREATE UNIQUE INDEX "idx_jobs_external_sync" ON "public"."jobs" USING "btree" ("tenant_id", "external_source", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_jobs_number_customer" ON "public"."jobs" USING "btree" ("job_number", "customer") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_jobs_search_vector" ON "public"."jobs" USING "gin" ("search_vector");



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_jobs_tenant" ON "public"."jobs" USING "btree" ("tenant_id");



CREATE INDEX "idx_jobs_tenant_created" ON "public"."jobs" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_jobs_tenant_due_date" ON "public"."jobs" USING "btree" ("tenant_id", "due_date") WHERE ("due_date" IS NOT NULL);



CREATE INDEX "idx_jobs_tenant_status" ON "public"."jobs" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_materials_active" ON "public"."materials" USING "btree" ("tenant_id", "active");



CREATE INDEX "idx_materials_tenant_id" ON "public"."materials" USING "btree" ("tenant_id");



CREATE INDEX "idx_mcp_auth_keys_enabled" ON "public"."mcp_authentication_keys" USING "btree" ("enabled") WHERE ("enabled" = true);



CREATE INDEX "idx_mcp_auth_keys_hash" ON "public"."mcp_authentication_keys" USING "btree" ("key_hash");



CREATE INDEX "idx_mcp_auth_keys_tenant" ON "public"."mcp_authentication_keys" USING "btree" ("tenant_id");



CREATE INDEX "idx_mcp_endpoints_tenant" ON "public"."mcp_endpoints" USING "btree" ("tenant_id");



CREATE INDEX "idx_mcp_endpoints_token_prefix" ON "public"."mcp_endpoints" USING "btree" ("token_prefix");



CREATE INDEX "idx_mcp_server_health_last_check" ON "public"."mcp_server_health" USING "btree" ("last_check" DESC);



CREATE INDEX "idx_mcp_server_health_tenant_id" ON "public"."mcp_server_health" USING "btree" ("tenant_id");



CREATE INDEX "idx_mcp_server_logs_created_at" ON "public"."mcp_server_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_mcp_server_logs_event_type" ON "public"."mcp_server_logs" USING "btree" ("event_type");



CREATE INDEX "idx_mcp_server_logs_tenant_id" ON "public"."mcp_server_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_mcp_usage_logs_key" ON "public"."mcp_key_usage_logs" USING "btree" ("key_id", "created_at" DESC);



CREATE INDEX "idx_mcp_usage_logs_tenant" ON "public"."mcp_key_usage_logs" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_mcp_usage_logs_tool" ON "public"."mcp_key_usage_logs" USING "btree" ("tool_name", "created_at" DESC);



CREATE INDEX "idx_mqtt_logs_created" ON "public"."mqtt_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_mqtt_logs_event_type" ON "public"."mqtt_logs" USING "btree" ("event_type");



CREATE INDEX "idx_mqtt_logs_publisher" ON "public"."mqtt_logs" USING "btree" ("mqtt_publisher_id");



CREATE INDEX "idx_mqtt_publishers_active" ON "public"."mqtt_publishers" USING "btree" ("tenant_id", "active") WHERE ("active" = true);



CREATE INDEX "idx_mqtt_publishers_tenant" ON "public"."mqtt_publishers" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_dismissed" ON "public"."notifications" USING "btree" ("dismissed");



CREATE INDEX "idx_notifications_pinned" ON "public"."notifications" USING "btree" ("pinned");



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_reference" ON "public"."notifications" USING "btree" ("reference_type", "reference_id");



CREATE INDEX "idx_notifications_tenant_id" ON "public"."notifications" USING "btree" ("tenant_id");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_op_qty_scrap_reasons_qty" ON "public"."operation_quantity_scrap_reasons" USING "btree" ("operation_quantity_id");



CREATE INDEX "idx_op_qty_scrap_reasons_reason" ON "public"."operation_quantity_scrap_reasons" USING "btree" ("scrap_reason_id");



CREATE INDEX "idx_operation_batches_cell" ON "public"."operation_batches" USING "btree" ("cell_id");



CREATE INDEX "idx_operation_batches_created_at" ON "public"."operation_batches" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_operation_batches_material" ON "public"."operation_batches" USING "btree" ("material", "thickness_mm");



CREATE INDEX "idx_operation_batches_status" ON "public"."operation_batches" USING "btree" ("status");



CREATE INDEX "idx_operation_batches_tenant" ON "public"."operation_batches" USING "btree" ("tenant_id");



CREATE INDEX "idx_operation_day_allocations_cell_date" ON "public"."operation_day_allocations" USING "btree" ("cell_id", "date");



CREATE INDEX "idx_operation_day_allocations_date" ON "public"."operation_day_allocations" USING "btree" ("tenant_id", "date");



CREATE INDEX "idx_operation_day_allocations_operation" ON "public"."operation_day_allocations" USING "btree" ("operation_id");



CREATE INDEX "idx_operation_quantities_material_lot" ON "public"."operation_quantities" USING "btree" ("material_lot");



CREATE INDEX "idx_operation_quantities_operation_id" ON "public"."operation_quantities" USING "btree" ("operation_id");



CREATE INDEX "idx_operation_quantities_recorded_at" ON "public"."operation_quantities" USING "btree" ("recorded_at" DESC);



CREATE INDEX "idx_operation_quantities_recorded_by" ON "public"."operation_quantities" USING "btree" ("recorded_by");



CREATE INDEX "idx_operation_quantities_scrap_reason_id" ON "public"."operation_quantities" USING "btree" ("scrap_reason_id");



CREATE INDEX "idx_operation_quantities_tenant_id" ON "public"."operation_quantities" USING "btree" ("tenant_id");



CREATE INDEX "idx_operation_resources_operation_id" ON "public"."operation_resources" USING "btree" ("operation_id");



CREATE INDEX "idx_operation_resources_resource_id" ON "public"."operation_resources" USING "btree" ("resource_id");



CREATE INDEX "idx_operations_active" ON "public"."operations" USING "btree" ("tenant_id", "part_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_operations_assigned" ON "public"."operations" USING "btree" ("assigned_operator_id") WHERE ("assigned_operator_id" IS NOT NULL);



CREATE INDEX "idx_operations_assigned_operator_id" ON "public"."operations" USING "btree" ("assigned_operator_id");



CREATE INDEX "idx_operations_cell_id" ON "public"."operations" USING "btree" ("cell_id");



CREATE UNIQUE INDEX "idx_operations_external_sync" ON "public"."operations" USING "btree" ("tenant_id", "external_source", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_operations_icon_name" ON "public"."operations" USING "btree" ("icon_name") WHERE ("icon_name" IS NOT NULL);



CREATE INDEX "idx_operations_metadata" ON "public"."operations" USING "gin" ("metadata");



CREATE INDEX "idx_operations_part_id" ON "public"."operations" USING "btree" ("part_id");



CREATE INDEX "idx_operations_search_vector" ON "public"."operations" USING "gin" ("search_vector");



CREATE INDEX "idx_operations_sequence" ON "public"."operations" USING "btree" ("part_id", "sequence");



CREATE INDEX "idx_operations_status" ON "public"."operations" USING "btree" ("status");



CREATE INDEX "idx_operations_tenant_cell" ON "public"."operations" USING "btree" ("tenant_id", "cell_id");



CREATE INDEX "idx_operations_tenant_id" ON "public"."operations" USING "btree" ("tenant_id");



CREATE INDEX "idx_operations_tenant_part" ON "public"."operations" USING "btree" ("tenant_id", "part_id");



CREATE INDEX "idx_operations_tenant_status" ON "public"."operations" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_operators_employee_id" ON "public"."operators" USING "btree" ("tenant_id", "employee_id");



CREATE INDEX "idx_operators_security" ON "public"."operators" USING "btree" ("tenant_id", "employee_id", "active") WHERE ("active" = true);



CREATE INDEX "idx_parts_active" ON "public"."parts" USING "btree" ("tenant_id", "job_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_parts_cnc_program_name" ON "public"."parts" USING "btree" ("tenant_id", "cnc_program_name") WHERE ("cnc_program_name" IS NOT NULL);



CREATE UNIQUE INDEX "idx_parts_external_sync" ON "public"."parts" USING "btree" ("tenant_id", "external_source", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_parts_image_paths" ON "public"."parts" USING "gin" ("image_paths");



CREATE INDEX "idx_parts_is_bullet_card" ON "public"."parts" USING "btree" ("tenant_id", "is_bullet_card") WHERE ("is_bullet_card" = true);



CREATE INDEX "idx_parts_job" ON "public"."parts" USING "btree" ("job_id");



CREATE INDEX "idx_parts_material" ON "public"."parts" USING "btree" ("material");



CREATE INDEX "idx_parts_material_lot" ON "public"."parts" USING "btree" ("material_lot");



CREATE INDEX "idx_parts_number_material" ON "public"."parts" USING "btree" ("part_number", "material") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_parts_parent" ON "public"."parts" USING "btree" ("parent_part_id");



CREATE INDEX "idx_parts_search_vector" ON "public"."parts" USING "gin" ("search_vector");



CREATE INDEX "idx_parts_tenant" ON "public"."parts" USING "btree" ("tenant_id");



CREATE INDEX "idx_parts_tenant_job" ON "public"."parts" USING "btree" ("tenant_id", "job_id");



CREATE INDEX "idx_parts_tenant_material" ON "public"."parts" USING "btree" ("tenant_id", "material");



CREATE INDEX "idx_parts_tenant_status" ON "public"."parts" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_parts_with_images" ON "public"."parts" USING "btree" ((
CASE
    WHEN ("array_length"("image_paths", 1) > 0) THEN true
    ELSE false
END));



CREATE INDEX "idx_profiles_email_username" ON "public"."profiles" USING "btree" ("email", "username") WHERE ("tenant_id" IS NOT NULL);



CREATE INDEX "idx_profiles_employee_id" ON "public"."profiles" USING "btree" ("employee_id") WHERE ("employee_id" IS NOT NULL);



CREATE INDEX "idx_profiles_onboarding_completed" ON "public"."profiles" USING "btree" ("onboarding_completed");



CREATE INDEX "idx_profiles_search_vector" ON "public"."profiles" USING "gin" ("search_vector");



CREATE INDEX "idx_profiles_tenant" ON "public"."profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_resources_active" ON "public"."resources" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_resources_external_sync" ON "public"."resources" USING "btree" ("tenant_id", "external_source", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "idx_resources_status" ON "public"."resources" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_resources_tenant_id" ON "public"."resources" USING "btree" ("tenant_id");



CREATE INDEX "idx_resources_type" ON "public"."resources" USING "btree" ("tenant_id", "type");



CREATE INDEX "idx_scrap_reasons_active" ON "public"."scrap_reasons" USING "btree" ("active");



CREATE INDEX "idx_scrap_reasons_category" ON "public"."scrap_reasons" USING "btree" ("category");



CREATE INDEX "idx_scrap_reasons_tenant_id" ON "public"."scrap_reasons" USING "btree" ("tenant_id");



CREATE INDEX "idx_substep_template_items_sequence" ON "public"."substep_template_items" USING "btree" ("template_id", "sequence");



CREATE INDEX "idx_substep_template_items_template_id" ON "public"."substep_template_items" USING "btree" ("template_id");



CREATE INDEX "idx_substep_templates_is_global" ON "public"."substep_templates" USING "btree" ("is_global");



CREATE INDEX "idx_substep_templates_operation_type" ON "public"."substep_templates" USING "btree" ("operation_type");



CREATE INDEX "idx_substep_templates_tenant_id" ON "public"."substep_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_substeps_icon_name" ON "public"."substeps" USING "btree" ("icon_name") WHERE ("icon_name" IS NOT NULL);



CREATE INDEX "idx_substeps_operation" ON "public"."substeps" USING "btree" ("operation_id", "sequence");



CREATE INDEX "idx_substeps_operation_id" ON "public"."substeps" USING "btree" ("operation_id");



CREATE INDEX "idx_substeps_status" ON "public"."substeps" USING "btree" ("status");



CREATE INDEX "idx_substeps_tenant" ON "public"."substeps" USING "btree" ("tenant_id");



CREATE INDEX "idx_substeps_tenant_id" ON "public"."substeps" USING "btree" ("tenant_id");



CREATE INDEX "idx_tasks_operator" ON "public"."operations" USING "btree" ("assigned_operator_id");



CREATE INDEX "idx_tasks_part" ON "public"."operations" USING "btree" ("part_id");



CREATE INDEX "idx_tasks_stage" ON "public"."operations" USING "btree" ("cell_id");



CREATE INDEX "idx_tasks_status" ON "public"."operations" USING "btree" ("status");



CREATE INDEX "idx_tasks_tenant" ON "public"."operations" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenants_demo_mode" ON "public"."tenants" USING "btree" ("demo_mode_enabled") WHERE ("demo_mode_enabled" = true);



CREATE INDEX "idx_tenants_plan" ON "public"."tenants" USING "btree" ("plan");



CREATE INDEX "idx_tenants_status" ON "public"."tenants" USING "btree" ("status");



CREATE INDEX "idx_time_entries_active" ON "public"."time_entries" USING "btree" ("end_time") WHERE ("end_time" IS NULL);



CREATE INDEX "idx_time_entries_operation_time_type" ON "public"."time_entries" USING "btree" ("operation_id", "time_type");



CREATE INDEX "idx_time_entries_operator" ON "public"."time_entries" USING "btree" ("operator_id");



CREATE INDEX "idx_time_entries_tenant" ON "public"."time_entries" USING "btree" ("tenant_id");



CREATE INDEX "idx_time_entries_time_type" ON "public"."time_entries" USING "btree" ("time_type");



CREATE INDEX "idx_time_entry_pauses_resumed_at" ON "public"."time_entry_pauses" USING "btree" ("resumed_at") WHERE ("resumed_at" IS NULL);



CREATE INDEX "idx_time_entry_pauses_time_entry_id" ON "public"."time_entry_pauses" USING "btree" ("time_entry_id");



CREATE INDEX "idx_webhook_logs_created" ON "public"."webhook_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_webhook_logs_webhook" ON "public"."webhook_logs" USING "btree" ("webhook_id");



CREATE INDEX "idx_webhooks_tenant" ON "public"."webhooks" USING "btree" ("tenant_id");



CREATE OR REPLACE TRIGGER "activity_log_search_vector_trigger" BEFORE INSERT OR UPDATE ON "public"."activity_log" FOR EACH ROW EXECUTE FUNCTION "public"."update_activity_search_vector"();




CREATE OR REPLACE TRIGGER "batch_operations_count_trigger" AFTER INSERT OR DELETE ON "public"."batch_operations" FOR EACH ROW EXECUTE FUNCTION "public"."update_batch_operations_count"();



CREATE OR REPLACE TRIGGER "cells_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."cells" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "detect_job_completion_exception_trigger" AFTER UPDATE OF "status" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."detect_job_completion_exception"();



CREATE OR REPLACE TRIGGER "detect_operation_completion_exception_trigger" AFTER UPDATE OF "status" ON "public"."operations" FOR EACH ROW EXECUTE FUNCTION "public"."detect_operation_completion_exception"();



CREATE OR REPLACE TRIGGER "factory_calendar_updated_at" BEFORE UPDATE ON "public"."factory_calendar" FOR EACH ROW EXECUTE FUNCTION "public"."update_factory_calendar_updated_at"();



CREATE OR REPLACE TRIGGER "issue_events_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."issues" FOR EACH ROW EXECUTE FUNCTION "public"."handle_issue_events"();



CREATE OR REPLACE TRIGGER "job_events_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_job_events"();



CREATE OR REPLACE TRIGGER "jobs_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "jobs_decrement_count" AFTER DELETE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_decrement_jobs"();



CREATE OR REPLACE TRIGGER "jobs_increment_count" AFTER INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_increment_jobs"();



CREATE OR REPLACE TRIGGER "mqtt_publishers_updated_at" BEFORE UPDATE ON "public"."mqtt_publishers" FOR EACH ROW EXECUTE FUNCTION "public"."update_mqtt_publisher_updated_at"();



-- REMOVED: Trigger with hardcoded credentials
-- TODO: Recreate this trigger using environment variables or Supabase secrets
-- CREATE OR REPLACE TRIGGER "notify-new-signup" AFTER INSERT OR DELETE OR UPDATE ON "public"."tenants"
-- FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request(...);



CREATE OR REPLACE TRIGGER "operation_events_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."operations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_operation_events"();



CREATE OR REPLACE TRIGGER "operations_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."operations" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "part_events_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."parts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_part_events"();



CREATE OR REPLACE TRIGGER "parts_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."parts" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "parts_decrement_count" AFTER DELETE ON "public"."parts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_decrement_parts"();



CREATE OR REPLACE TRIGGER "parts_increment_count" AFTER INSERT ON "public"."parts" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_increment_parts"();



CREATE OR REPLACE TRIGGER "profiles_activity_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."log_activity"();



CREATE OR REPLACE TRIGGER "quantity_events_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."operation_quantities" FOR EACH ROW EXECUTE FUNCTION "public"."handle_quantity_events"();



CREATE OR REPLACE TRIGGER "set_tenant_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."update_tenant_updated_at"();



CREATE OR REPLACE TRIGGER "time_entry_events_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."handle_time_entry_events"();



CREATE OR REPLACE TRIGGER "trigger_invitations_updated_at" BEFORE UPDATE ON "public"."invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_invitations_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_notify_new_assignment" AFTER INSERT ON "public"."assignments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_assignment"();



CREATE OR REPLACE TRIGGER "trigger_notify_new_issue" AFTER INSERT ON "public"."issues" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_issue"();



CREATE OR REPLACE TRIGGER "trigger_notify_new_part" AFTER INSERT ON "public"."parts" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_part"();



CREATE OR REPLACE TRIGGER "trigger_notify_new_user" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."notify_new_user"();



CREATE OR REPLACE TRIGGER "trigger_notify_part_completed" AFTER UPDATE ON "public"."parts" FOR EACH ROW EXECUTE FUNCTION "public"."notify_part_completed"();



CREATE OR REPLACE TRIGGER "trigger_update_batch_operations_count" AFTER INSERT OR DELETE ON "public"."batch_operations" FOR EACH ROW EXECUTE FUNCTION "public"."update_batch_operations_count"();



CREATE OR REPLACE TRIGGER "update_attendance_entries_updated_at" BEFORE UPDATE ON "public"."attendance_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_tenant_updated_at"();



CREATE OR REPLACE TRIGGER "update_batch_operations_updated_at" BEFORE UPDATE ON "public"."batch_operations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_exception_search_vector_trigger" BEFORE INSERT OR UPDATE ON "public"."exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_exception_search_vector"();



CREATE OR REPLACE TRIGGER "update_expectation_search_vector_trigger" BEFORE INSERT OR UPDATE ON "public"."expectations" FOR EACH ROW EXECUTE FUNCTION "public"."update_expectation_search_vector"();



CREATE OR REPLACE TRIGGER "update_issues_search_vector" BEFORE INSERT OR UPDATE ON "public"."issues" FOR EACH ROW EXECUTE FUNCTION "public"."update_issues_search_vector"();



CREATE OR REPLACE TRIGGER "update_operation_batches_updated_at" BEFORE UPDATE ON "public"."operation_batches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."api_usage_logs"
    ADD CONSTRAINT "api_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id");



ALTER TABLE ONLY "public"."assignments"
    ADD CONSTRAINT "assignments_shop_floor_operator_id_fkey" FOREIGN KEY ("shop_floor_operator_id") REFERENCES "public"."operators"("id");



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."factory_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attendance_entries"
    ADD CONSTRAINT "attendance_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_operations"
    ADD CONSTRAINT "batch_operations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "public"."operation_batches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_operations"
    ADD CONSTRAINT "batch_operations_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_operations"
    ADD CONSTRAINT "batch_operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cells"
    ADD CONSTRAINT "cells_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."exceptions"
    ADD CONSTRAINT "exceptions_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."exceptions"
    ADD CONSTRAINT "exceptions_expectation_id_fkey" FOREIGN KEY ("expectation_id") REFERENCES "public"."expectations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exceptions"
    ADD CONSTRAINT "exceptions_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."exceptions"
    ADD CONSTRAINT "exceptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expectations"
    ADD CONSTRAINT "expectations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."expectations"
    ADD CONSTRAINT "expectations_superseded_by_fkey" FOREIGN KEY ("superseded_by") REFERENCES "public"."expectations"("id");



ALTER TABLE ONLY "public"."expectations"
    ADD CONSTRAINT "expectations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."factory_calendar"
    ADD CONSTRAINT "factory_calendar_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."factory_capacity_overrides"
    ADD CONSTRAINT "factory_capacity_overrides_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."factory_holidays"
    ADD CONSTRAINT "factory_holidays_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."factory_shifts"
    ADD CONSTRAINT "factory_shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installed_integrations"
    ADD CONSTRAINT "installed_integrations_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."installed_integrations"
    ADD CONSTRAINT "installed_integrations_installed_by_fkey" FOREIGN KEY ("installed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."installed_integrations"
    ADD CONSTRAINT "installed_integrations_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installed_integrations"
    ADD CONSTRAINT "installed_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."installed_integrations"
    ADD CONSTRAINT "installed_integrations_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issue_categories"
    ADD CONSTRAINT "issue_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."issues"
    ADD CONSTRAINT "issues_task_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_current_stage_id_fkey" FOREIGN KEY ("current_cell_id") REFERENCES "public"."cells"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mcp_authentication_keys"
    ADD CONSTRAINT "mcp_authentication_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mcp_authentication_keys"
    ADD CONSTRAINT "mcp_authentication_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcp_endpoints"
    ADD CONSTRAINT "mcp_endpoints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mcp_endpoints"
    ADD CONSTRAINT "mcp_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcp_key_usage_logs"
    ADD CONSTRAINT "mcp_key_usage_logs_key_id_fkey" FOREIGN KEY ("key_id") REFERENCES "public"."mcp_authentication_keys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mcp_key_usage_logs"
    ADD CONSTRAINT "mcp_key_usage_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcp_server_config"
    ADD CONSTRAINT "mcp_server_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcp_server_health"
    ADD CONSTRAINT "mcp_server_health_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mcp_server_logs"
    ADD CONSTRAINT "mcp_server_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."monthly_reset_logs"
    ADD CONSTRAINT "monthly_reset_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mqtt_logs"
    ADD CONSTRAINT "mqtt_logs_mqtt_publisher_id_fkey" FOREIGN KEY ("mqtt_publisher_id") REFERENCES "public"."mqtt_publishers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mqtt_publishers"
    ADD CONSTRAINT "mqtt_publishers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mqtt_publishers"
    ADD CONSTRAINT "mqtt_publishers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_batches"
    ADD CONSTRAINT "operation_batches_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "public"."cells"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_batches"
    ADD CONSTRAINT "operation_batches_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operation_batches"
    ADD CONSTRAINT "operation_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operation_batches"
    ADD CONSTRAINT "operation_batches_started_by_fkey" FOREIGN KEY ("started_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operation_batches"
    ADD CONSTRAINT "operation_batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_day_allocations"
    ADD CONSTRAINT "operation_day_allocations_cell_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "public"."cells"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_day_allocations"
    ADD CONSTRAINT "operation_day_allocations_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_day_allocations"
    ADD CONSTRAINT "operation_day_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_quantities"
    ADD CONSTRAINT "operation_quantities_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_quantities"
    ADD CONSTRAINT "operation_quantities_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operation_quantities"
    ADD CONSTRAINT "operation_quantities_scrap_reason_id_fkey" FOREIGN KEY ("scrap_reason_id") REFERENCES "public"."scrap_reasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."operation_quantities"
    ADD CONSTRAINT "operation_quantities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_quantity_scrap_reasons"
    ADD CONSTRAINT "operation_quantity_scrap_reasons_operation_quantity_id_fkey" FOREIGN KEY ("operation_quantity_id") REFERENCES "public"."operation_quantities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_quantity_scrap_reasons"
    ADD CONSTRAINT "operation_quantity_scrap_reasons_scrap_reason_id_fkey" FOREIGN KEY ("scrap_reason_id") REFERENCES "public"."scrap_reasons"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."operation_resources"
    ADD CONSTRAINT "operation_resources_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_resources"
    ADD CONSTRAINT "operation_resources_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "operations_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operators"
    ADD CONSTRAINT "operators_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_current_stage_id_fkey" FOREIGN KEY ("current_cell_id") REFERENCES "public"."cells"("id");



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."parts"
    ADD CONSTRAINT "parts_parent_part_id_fkey" FOREIGN KEY ("parent_part_id") REFERENCES "public"."parts"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resources"
    ADD CONSTRAINT "resources_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."scrap_reasons"
    ADD CONSTRAINT "scrap_reasons_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_events"
    ADD CONSTRAINT "subscription_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."substep_template_items"
    ADD CONSTRAINT "substep_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."substep_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."substep_templates"
    ADD CONSTRAINT "substep_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."substep_templates"
    ADD CONSTRAINT "substep_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sync_imports"
    ADD CONSTRAINT "sync_imports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "tasks_assigned_operator_id_fkey" FOREIGN KEY ("assigned_operator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "tasks_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "public"."parts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "tasks_stage_id_fkey" FOREIGN KEY ("cell_id") REFERENCES "public"."cells"("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_demo_data_seeded_by_fkey" FOREIGN KEY ("demo_data_seeded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."time_entry_pauses"
    ADD CONSTRAINT "time_entry_pauses_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_logs"
    ADD CONSTRAINT "webhook_logs_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create MCP keys" ON "public"."mcp_authentication_keys" FOR INSERT WITH CHECK ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can create exceptions" ON "public"."exceptions" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can create expectations" ON "public"."expectations" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can create invitations in their tenant" ON "public"."invitations" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can delete MCP keys" ON "public"."mcp_authentication_keys" FOR DELETE USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can delete attendance in their tenant" ON "public"."attendance_entries" FOR DELETE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can delete exceptions" ON "public"."exceptions" FOR DELETE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can delete invitations in their tenant" ON "public"."invitations" FOR DELETE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can delete issue categories" ON "public"."issue_categories" FOR DELETE USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete mqtt publishers" ON "public"."mqtt_publishers" FOR DELETE USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete notifications" ON "public"."notifications" FOR DELETE USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can delete operation quantities" ON "public"."operation_quantities" FOR DELETE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can delete their tenant's calendar" ON "public"."factory_calendar" FOR DELETE USING ((("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can insert issue categories" ON "public"."issue_categories" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert mqtt publishers" ON "public"."mqtt_publishers" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can insert their tenant's calendar" ON "public"."factory_calendar" FOR INSERT WITH CHECK ((("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can manage API keys in their tenant" ON "public"."api_keys" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage all roles in their tenant" ON "public"."user_roles" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage all time entries in their tenant" ON "public"."time_entries" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))) WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage assignments in their tenant" ON "public"."assignments" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage capacity overrides" ON "public"."factory_capacity_overrides" USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage factory shifts" ON "public"."factory_shifts" USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage holidays" ON "public"."factory_holidays" USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage installed integrations" ON "public"."installed_integrations" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))) WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage issues in their tenant" ON "public"."issues" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage jobs in their tenant" ON "public"."jobs" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage materials" ON "public"."materials" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage operation_resources" ON "public"."operation_resources" USING ((("operation_id" IN ( SELECT "operations"."id"
   FROM "public"."operations"
  WHERE ("operations"."tenant_id" = "public"."get_user_tenant_id"()))) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage operators" ON "public"."operators" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage parts in their tenant" ON "public"."parts" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage profiles in their tenant" ON "public"."profiles" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage resources" ON "public"."resources" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage scrap reasons" ON "public"."scrap_reasons" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage stages in their tenant" ON "public"."cells" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage substeps in their tenant" ON "public"."substeps" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage tasks in their tenant" ON "public"."operations" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage template items" ON "public"."substep_template_items" USING (("template_id" IN ( SELECT "substep_templates"."id"
   FROM "public"."substep_templates"
  WHERE ((("substep_templates"."tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR ("substep_templates"."is_global" = true))))) WITH CHECK (("template_id" IN ( SELECT "substep_templates"."id"
   FROM "public"."substep_templates"
  WHERE (("substep_templates"."tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can manage tenant templates" ON "public"."substep_templates" USING (((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")) OR ("is_global" = true))) WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage their tenant's MCP config" ON "public"."mcp_server_config" USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can manage webhooks in their tenant" ON "public"."webhooks" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can update MCP keys" ON "public"."mcp_authentication_keys" FOR UPDATE USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can update attendance in their tenant" ON "public"."attendance_entries" FOR UPDATE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can update exceptions" ON "public"."exceptions" FOR UPDATE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can update expectations (supersede only)" ON "public"."expectations" FOR UPDATE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can update invitations in their tenant" ON "public"."invitations" FOR UPDATE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."app_role")));



CREATE POLICY "Admins can update issue categories" ON "public"."issue_categories" FOR UPDATE USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update mqtt publishers" ON "public"."mqtt_publishers" FOR UPDATE USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role")))));



CREATE POLICY "Admins can update their tenant" ON "public"."tenants" FOR UPDATE USING ((("id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"))) WITH CHECK ((("id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



COMMENT ON POLICY "Admins can update their tenant" ON "public"."tenants" IS 'Allows admin users to update their own tenant configuration, including onboarding status';



CREATE POLICY "Admins can update their tenant's calendar" ON "public"."factory_calendar" FOR UPDATE USING ((("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can view api_keys in their tenant" ON "public"."api_keys" FOR SELECT TO "authenticated" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Admins can view their tenant's MCP usage logs" ON "public"."mcp_key_usage_logs" FOR SELECT USING ((("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."app_role"))))));



CREATE POLICY "Admins can view webhook logs in their tenant" ON "public"."webhook_logs" FOR SELECT USING ((("webhook_id" IN ( SELECT "webhooks"."id"
   FROM "public"."webhooks"
  WHERE ("webhooks"."tenant_id" = "public"."get_user_tenant_id"()))) AND "public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role")));



CREATE POLICY "Anyone can view published integrations" ON "public"."integrations" FOR SELECT USING (("status" = 'published'::"public"."integration_status"));



CREATE POLICY "Operators can create issues" ON "public"."issues" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Operators can manage their own time entries" ON "public"."time_entries" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("operator_id" = "auth"."uid"())));



CREATE POLICY "Operators can update substeps for their operations" ON "public"."substeps" FOR UPDATE TO "authenticated" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("operation_id" IN ( SELECT "operations"."id"
   FROM "public"."operations"
  WHERE ("operations"."assigned_operator_id" = "auth"."uid"())))));



CREATE POLICY "Operators can update their assigned tasks" ON "public"."operations" FOR UPDATE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("assigned_operator_id" = "auth"."uid"())));



CREATE POLICY "Operators can update their own assignments" ON "public"."assignments" FOR UPDATE USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("operator_id" = "auth"."uid"())));



CREATE POLICY "Service role can insert MCP health" ON "public"."mcp_server_health" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert MCP logs" ON "public"."mcp_server_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert MCP usage logs" ON "public"."mcp_key_usage_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can insert mqtt logs" ON "public"."mqtt_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage API usage" ON "public"."api_usage_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage reset logs" ON "public"."monthly_reset_logs" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role can manage tenants" ON "public"."tenants" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can insert activity logs" ON "public"."activity_log" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) OR (CURRENT_USER = 'postgres'::"name")));



CREATE POLICY "System can insert expectations" ON "public"."expectations" FOR INSERT WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) OR (CURRENT_USER = 'postgres'::"name")));



CREATE POLICY "System can manage allocations" ON "public"."operation_day_allocations" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "System can manage exceptions" ON "public"."exceptions" USING ((("tenant_id" = "public"."get_user_tenant_id"()) OR (CURRENT_USER = 'postgres'::"name"))) WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) OR (CURRENT_USER = 'postgres'::"name")));



CREATE POLICY "Users can create batch operations in their tenant" ON "public"."batch_operations" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create batches in their tenant" ON "public"."operation_batches" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create notifications for their tenant" ON "public"."notifications" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete batch operations in their tenant" ON "public"."batch_operations" FOR DELETE USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete batches in their tenant" ON "public"."operation_batches" FOR DELETE USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert attendance in their tenant" ON "public"."attendance_entries" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can insert operation quantities" ON "public"."operation_quantities" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can manage their own pauses" ON "public"."time_entry_pauses" USING (("time_entry_id" IN ( SELECT "time_entries"."id"
   FROM "public"."time_entries"
  WHERE ("time_entries"."operator_id" = "auth"."uid"()))));



CREATE POLICY "Users can update batch operations in their tenant" ON "public"."batch_operations" FOR UPDATE USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update batches in their tenant" ON "public"."operation_batches" FOR UPDATE USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their notifications" ON "public"."notifications" FOR UPDATE USING ((("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their tenant's operation quantities" ON "public"."operation_quantities" FOR UPDATE USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view activity logs in their tenant" ON "public"."activity_log" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view assignments in their tenant" ON "public"."assignments" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view attendance in their tenant" ON "public"."attendance_entries" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view batch operations in their tenant" ON "public"."batch_operations" FOR SELECT USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view batches in their tenant" ON "public"."operation_batches" FOR SELECT USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view capacity overrides" ON "public"."factory_capacity_overrides" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view exceptions in their tenant" ON "public"."exceptions" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view expectations in their tenant" ON "public"."expectations" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view factory shifts" ON "public"."factory_shifts" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view holidays" ON "public"."factory_holidays" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view installed integrations" ON "public"."installed_integrations" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view invitations in their tenant" ON "public"."invitations" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view issues in their tenant" ON "public"."issues" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view jobs in their tenant" ON "public"."jobs" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view materials in their tenant" ON "public"."materials" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view operation_resources in their tenant" ON "public"."operation_resources" FOR SELECT USING (("operation_id" IN ( SELECT "operations"."id"
   FROM "public"."operations"
  WHERE ("operations"."tenant_id" = "public"."get_user_tenant_id"()))));



CREATE POLICY "Users can view operators in their tenant" ON "public"."operators" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view own tenant API usage" ON "public"."api_usage_logs" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view parts in their tenant" ON "public"."parts" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view profiles in their tenant" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view resources in their tenant" ON "public"."resources" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view stages in their tenant" ON "public"."cells" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view substeps in their tenant" ON "public"."substeps" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view tasks in their tenant" ON "public"."operations" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view template items" ON "public"."substep_template_items" FOR SELECT USING (("template_id" IN ( SELECT "substep_templates"."id"
   FROM "public"."substep_templates"
  WHERE (("substep_templates"."tenant_id" = "public"."get_user_tenant_id"()) OR ("substep_templates"."is_global" = true)))));



CREATE POLICY "Users can view templates" ON "public"."substep_templates" FOR SELECT USING ((("tenant_id" = "public"."get_user_tenant_id"()) OR ("is_global" = true)));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their tenant" ON "public"."tenants" FOR SELECT USING (("id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view their tenant activity logs" ON "public"."activity_log" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("tenant_id" = "public"."get_user_tenant_id"())));



CREATE POLICY "Users can view their tenant's MCP config" ON "public"."mcp_server_config" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's MCP health" ON "public"."mcp_server_health" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's MCP keys" ON "public"."mcp_authentication_keys" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's MCP logs" ON "public"."mcp_server_logs" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's activity logs" ON "public"."activity_log" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("tenant_id" = "public"."get_user_tenant_id"())));



CREATE POLICY "Users can view their tenant's allocations" ON "public"."operation_day_allocations" FOR SELECT USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's calendar" ON "public"."factory_calendar" FOR SELECT USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's issue categories" ON "public"."issue_categories" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's mqtt logs" ON "public"."mqtt_logs" FOR SELECT USING (("mqtt_publisher_id" IN ( SELECT "mqtt_publishers"."id"
   FROM "public"."mqtt_publishers"
  WHERE ("mqtt_publishers"."tenant_id" = ( SELECT "profiles"."tenant_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their tenant's mqtt publishers" ON "public"."mqtt_publishers" FOR SELECT USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's notifications" ON "public"."notifications" FOR SELECT USING ((("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their tenant's operation quantities" ON "public"."operation_quantities" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view their tenant's scrap reasons" ON "public"."scrap_reasons" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



CREATE POLICY "Users can view time entries in their tenant" ON "public"."time_entries" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attendance_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."batch_operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_waitlist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cells" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_select" ON "public"."subscription_events" FOR SELECT TO "authenticated" USING (("tenant_id" = "public"."get_user_tenant_id"()));



ALTER TABLE "public"."exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expectations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."factory_calendar" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."factory_capacity_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."factory_holidays" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."factory_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."installed_integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."integrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."issue_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."issues" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcp_authentication_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcp_endpoints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "mcp_endpoints_admin_all" ON "public"."mcp_endpoints" TO "authenticated" USING ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."app_role"))) WITH CHECK ((("tenant_id" = "public"."get_user_tenant_id"()) AND ("public"."get_user_role"() = 'admin'::"public"."app_role")));



ALTER TABLE "public"."mcp_key_usage_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcp_server_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcp_server_health" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mcp_server_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."monthly_reset_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mqtt_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mqtt_publishers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "op_qty_scrap_reasons_service_role" ON "public"."operation_quantity_scrap_reasons" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "op_qty_scrap_reasons_tenant_isolation" ON "public"."operation_quantity_scrap_reasons" USING (("operation_quantity_id" IN ( SELECT "operation_quantities"."id"
   FROM "public"."operation_quantities"
  WHERE ("operation_quantities"."tenant_id" = ( SELECT "profiles"."tenant_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."operation_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operation_day_allocations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operation_quantities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operation_quantity_scrap_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operation_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."operators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scrap_reasons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."substep_template_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."substep_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."substeps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entry_pauses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waitlist_insert" ON "public"."billing_waitlist" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."webhook_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_imports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sync_imports_tenant_isolation" ON "public"."sync_imports" FOR SELECT USING (("tenant_id" = "public"."get_user_tenant_id"()));


CREATE POLICY "sync_imports_service_role" ON "public"."sync_imports" TO "service_role" USING (true) WITH CHECK (true);




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."activity_log";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."issues";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."jobs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."operations";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."parts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_entries";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
















































































































































































GRANT ALL ON FUNCTION "public"."acknowledge_demo_mode"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."acknowledge_demo_mode"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acknowledge_demo_mode"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."acknowledge_exception"("p_exception_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."acknowledge_exception"("p_exception_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acknowledge_exception"("p_exception_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_close_stale_attendance"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_close_stale_attendance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_stale_attendance"() TO "service_role";




GRANT ALL ON FUNCTION "public"."can_create_job"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_job"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_job"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_create_parts"("p_tenant_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."can_create_parts"("p_tenant_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_parts"("p_tenant_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_upload_file"("p_tenant_id" "uuid", "p_file_size_bytes" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."can_upload_file"("p_tenant_id" "uuid", "p_file_size_bytes" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_upload_file"("p_tenant_id" "uuid", "p_file_size_bytes" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_jobs_due_soon"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_jobs_due_soon"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_jobs_due_soon"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_mcp_tool_permission"("p_key_id" "uuid", "p_tool_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_mcp_tool_permission"("p_key_id" "uuid", "p_tool_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_mcp_tool_permission"("p_key_id" "uuid", "p_tool_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_next_cell_capacity"("current_cell_id" "uuid", "tenant_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_next_cell_capacity"("current_cell_id" "uuid", "tenant_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_next_cell_capacity"("current_cell_id" "uuid", "tenant_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_invitations"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invitations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_invitations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_mqtt_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_mqtt_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_mqtt_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clear_demo_data"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clear_demo_data"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_demo_data"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_role" "public"."app_role", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_job_completion_expectation"("p_job_id" "uuid", "p_tenant_id" "uuid", "p_due_date" timestamp with time zone, "p_source" "text", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_job_completion_expectation"("p_job_id" "uuid", "p_tenant_id" "uuid", "p_due_date" timestamp with time zone, "p_source" "text", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job_completion_expectation"("p_job_id" "uuid", "p_tenant_id" "uuid", "p_due_date" timestamp with time zone, "p_source" "text", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_mcp_endpoint"("p_name" "text", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_mcp_endpoint"("p_name" "text", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_mcp_endpoint"("p_name" "text", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_type" "text", "p_severity" "text", "p_title" "text", "p_message" "text", "p_link" "text", "p_reference_type" "text", "p_reference_id" "uuid", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_operator_with_pin"("p_full_name" "text", "p_pin" "text", "p_employee_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_operator_with_pin"("p_full_name" "text", "p_pin" "text", "p_employee_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_operator_with_pin"("p_full_name" "text", "p_pin" "text", "p_employee_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_operator_with_pin"("p_tenant_id" "uuid", "p_employee_id" "text", "p_full_name" "text", "p_pin" "text", "p_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."create_operator_with_pin"("p_tenant_id" "uuid", "p_employee_id" "text", "p_full_name" "text", "p_pin" "text", "p_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_operator_with_pin"("p_tenant_id" "uuid", "p_employee_id" "text", "p_full_name" "text", "p_pin" "text", "p_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_tenant_data"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tenant_data"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tenant_data"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_job_completion_exception"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_job_completion_exception"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_job_completion_exception"() TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_operation_completion_exception"() TO "anon";
GRANT ALL ON FUNCTION "public"."detect_operation_completion_exception"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_operation_completion_exception"() TO "service_role";



GRANT ALL ON FUNCTION "public"."disable_demo_mode"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."disable_demo_mode"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."disable_demo_mode"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."dismiss_exception"("p_exception_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."dismiss_exception"("p_exception_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dismiss_exception"("p_exception_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dismiss_notification"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."dispatch_webhook"("p_tenant_id" "uuid", "p_event_type" "text", "p_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."dispatch_webhook"("p_tenant_id" "uuid", "p_event_type" "text", "p_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dispatch_webhook"("p_tenant_id" "uuid", "p_event_type" "text", "p_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."enable_demo_mode"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."enable_demo_mode"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enable_demo_mode"("p_tenant_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_mcp_key"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_environment" "text", "p_allowed_tools" "jsonb", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_mcp_key"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_environment" "text", "p_allowed_tools" "jsonb", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_mcp_key"("p_tenant_id" "uuid", "p_name" "text", "p_description" "text", "p_environment" "text", "p_allowed_tools" "jsonb", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_sync_hash"("payload" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_sync_hash"("payload" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_sync_hash"("payload" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_tenant_abbreviation"("p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tenant_abbreviation"("p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tenant_abbreviation"("p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_activity_logs"("p_limit" integer, "p_offset" integer, "p_action" "text", "p_entity_type" "text", "p_search" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_activity_logs"("p_limit" integer, "p_offset" integer, "p_action" "text", "p_entity_type" "text", "p_search" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_activity_logs"("p_limit" integer, "p_offset" integer, "p_action" "text", "p_entity_type" "text", "p_search" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_activity_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_activity_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_activity_stats"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_api_usage_stats"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_api_usage_stats"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_api_usage_stats"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cell_qrm_metrics"("cell_id_param" "uuid", "tenant_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cell_qrm_metrics"("cell_id_param" "uuid", "tenant_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cell_qrm_metrics"("cell_id_param" "uuid", "tenant_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cell_wip_count"("cell_id_param" "uuid", "tenant_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cell_wip_count"("cell_id_param" "uuid", "tenant_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cell_wip_count"("cell_id_param" "uuid", "tenant_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exception_stats"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exception_stats"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exception_stats"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_by_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_job_issue_summary"("job_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_job_issue_summary"("job_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_job_issue_summary"("job_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_mcp_key_stats"("p_key_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_mcp_key_stats"("p_key_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_mcp_key_stats"("p_key_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_mcp_server_config"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_mcp_server_config"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_mcp_server_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_tenant_subscription"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_tenant_subscription"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_tenant_subscription"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_operation_scrap_analysis"("p_operation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_operation_scrap_analysis"("p_operation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_operation_scrap_analysis"("p_operation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_operation_total_quantities"("p_operation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_operation_total_quantities"("p_operation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_operation_total_quantities"("p_operation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_operator_assignments"("p_operator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_operator_assignments"("p_operator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_operator_assignments"("p_operator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_operator_attendance_status"("p_operator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_operator_attendance_status"("p_operator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_operator_attendance_status"("p_operator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_part_image_url"("p_image_path" "text", "p_expires_in" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_part_image_url"("p_image_path" "text", "p_expires_in" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_part_image_url"("p_image_path" "text", "p_expires_in" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_part_issue_summary"("part_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_part_issue_summary"("part_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_part_issue_summary"("part_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_part_routing"("p_part_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_part_routing"("p_part_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_part_routing"("p_part_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_storage_quota"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_storage_quota"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_storage_quota"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_feature_flags"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_feature_flags"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_feature_flags"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_quota"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_quota"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_quota"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_tenant_usage_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_tenant_usage_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_usage_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_issue_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_issue_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_issue_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_job_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_job_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_job_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_operation_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_operation_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_operation_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_part_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_part_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_part_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_quantity_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_quantity_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_quantity_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_time_entry_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_time_entry_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_time_entry_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_api_usage"("p_tenant_id" "uuid", "p_api_key_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_api_usage"("p_tenant_id" "uuid", "p_api_key_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_api_usage"("p_tenant_id" "uuid", "p_api_key_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_demo_mode"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_demo_mode"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_demo_mode"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_root_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_root_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_root_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_all_tenants"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_all_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_all_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."list_operators"() TO "anon";
GRANT ALL ON FUNCTION "public"."list_operators"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_operators"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_activity_and_webhook"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_description" "text", "p_changes" "jsonb", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity_and_webhook"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_description" "text", "p_changes" "jsonb", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity_and_webhook"("p_tenant_id" "uuid", "p_user_id" "uuid", "p_action" "text", "p_entity_type" "text", "p_entity_id" "uuid", "p_entity_name" "text", "p_description" "text", "p_changes" "jsonb", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_mcp_key_usage"("p_tenant_id" "uuid", "p_key_id" "uuid", "p_tool_name" "text", "p_tool_arguments" "jsonb", "p_success" boolean, "p_error_message" "text", "p_response_time_ms" integer, "p_ip_address" "inet", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_mcp_key_usage"("p_tenant_id" "uuid", "p_key_id" "uuid", "p_tool_name" "text", "p_tool_arguments" "jsonb", "p_success" boolean, "p_error_message" "text", "p_response_time_ms" integer, "p_ip_address" "inet", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_mcp_key_usage"("p_tenant_id" "uuid", "p_key_id" "uuid", "p_tool_name" "text", "p_tool_arguments" "jsonb", "p_success" boolean, "p_error_message" "text", "p_response_time_ms" integer, "p_ip_address" "inet", "p_user_agent" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_mcp_server_activity"("p_tenant_id" "uuid", "p_event_type" "text", "p_message" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_mcp_server_activity"("p_tenant_id" "uuid", "p_event_type" "text", "p_message" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_mcp_server_activity"("p_tenant_id" "uuid", "p_event_type" "text", "p_message" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_issue"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_issue"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_issue"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_part"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_part"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_part"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_part_completed"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_part_completed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_part_completed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."operator_clock_in"("p_operator_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."operator_clock_in"("p_operator_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."operator_clock_in"("p_operator_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."operator_clock_out"("p_operator_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."operator_clock_out"("p_operator_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."operator_clock_out"("p_operator_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regenerate_mcp_token"("p_endpoint_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."regenerate_mcp_token"("p_endpoint_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regenerate_mcp_token"("p_endpoint_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_monthly_parts_counters"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_monthly_parts_counters"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_monthly_parts_counters"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_operator_pin"("p_operator_id" "uuid", "p_new_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_operator_pin"("p_operator_id" "uuid", "p_new_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_operator_pin"("p_operator_id" "uuid", "p_new_pin" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_exception"("p_exception_id" "uuid", "p_root_cause" "text", "p_corrective_action" "text", "p_preventive_action" "text", "p_resolution" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_exception"("p_exception_id" "uuid", "p_root_cause" "text", "p_corrective_action" "text", "p_preventive_action" "text", "p_resolution" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_exception"("p_exception_id" "uuid", "p_root_cause" "text", "p_corrective_action" "text", "p_preventive_action" "text", "p_resolution" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_scrap_reasons"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_demo_resources"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_demo_resources"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_demo_resources"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_active_tenant"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_active_tenant"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_active_tenant"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."should_show_demo_banner"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."should_show_demo_banner"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."should_show_demo_banner"("p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."supersede_expectation"("p_expectation_id" "uuid", "p_new_expected_value" "jsonb", "p_new_expected_at" timestamp with time zone, "p_source" "text", "p_created_by" "uuid", "p_context" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."supersede_expectation"("p_expectation_id" "uuid", "p_new_expected_value" "jsonb", "p_new_expected_at" timestamp with time zone, "p_source" "text", "p_created_by" "uuid", "p_context" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."supersede_expectation"("p_expectation_id" "uuid", "p_new_expected_value" "jsonb", "p_new_expected_at" timestamp with time zone, "p_source" "text", "p_created_by" "uuid", "p_context" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_notification_pin"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_notification_pin"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_notification_pin"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_decrement_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_decrement_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_decrement_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_decrement_parts"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_decrement_parts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_decrement_parts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_increment_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_increment_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_increment_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_increment_parts"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_increment_parts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_increment_parts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlock_operator"("p_operator_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_operator"("p_operator_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_operator"("p_operator_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_activity_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_activity_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_activity_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_batch_operations_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_batch_operations_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_batch_operations_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_exception_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_exception_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_exception_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_expectation_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_expectation_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_expectation_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_factory_calendar_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_factory_calendar_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_factory_calendar_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invitations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invitations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invitations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_issues_search_vector"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_issues_search_vector"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_issues_search_vector"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_mcp_server_health"("p_tenant_id" "uuid", "p_status" "text", "p_response_time_ms" integer, "p_error_message" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_mcp_server_health"("p_tenant_id" "uuid", "p_status" "text", "p_response_time_ms" integer, "p_error_message" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_mcp_server_health"("p_tenant_id" "uuid", "p_status" "text", "p_response_time_ms" integer, "p_error_message" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_mqtt_publisher_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_mqtt_publisher_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_mqtt_publisher_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tenant_feature_flags"("p_tenant_id" "uuid", "p_flags" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_tenant_feature_flags"("p_tenant_id" "uuid", "p_flags" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tenant_feature_flags"("p_tenant_id" "uuid", "p_flags" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_tenant_storage_usage"("p_tenant_id" "uuid", "p_size_bytes" bigint, "p_operation" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_tenant_storage_usage"("p_tenant_id" "uuid", "p_size_bytes" bigint, "p_operation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tenant_storage_usage"("p_tenant_id" "uuid", "p_size_bytes" bigint, "p_operation" "text") TO "service_role";


GRANT ALL ON FUNCTION "public"."log_storage_operation"("p_tenant_id" "uuid", "p_operation" "text", "p_file_path" "text", "p_file_size_bytes" bigint, "p_metadata" "jsonb") TO "service_role";


GRANT ALL ON FUNCTION "public"."update_tenant_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_tenant_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_tenant_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_mcp_key"("p_api_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_mcp_key"("p_api_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_mcp_key"("p_api_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_mcp_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_mcp_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_mcp_token"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_operator_pin"("p_employee_id" "text", "p_pin" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_operator_pin"("p_employee_id" "text", "p_pin" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_operator_pin"("p_employee_id" "text", "p_pin" "text") TO "service_role";
























GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."api_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."api_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."api_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."assignments" TO "anon";
GRANT ALL ON TABLE "public"."assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."assignments" TO "service_role";



GRANT ALL ON TABLE "public"."attendance_entries" TO "anon";
GRANT ALL ON TABLE "public"."attendance_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."attendance_entries" TO "service_role";



GRANT ALL ON TABLE "public"."batch_operations" TO "anon";
GRANT ALL ON TABLE "public"."batch_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_operations" TO "service_role";



GRANT ALL ON TABLE "public"."billing_waitlist" TO "anon";
GRANT ALL ON TABLE "public"."billing_waitlist" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_waitlist" TO "service_role";



GRANT ALL ON TABLE "public"."cells" TO "anon";
GRANT ALL ON TABLE "public"."cells" TO "authenticated";
GRANT ALL ON TABLE "public"."cells" TO "service_role";



GRANT ALL ON TABLE "public"."exceptions" TO "anon";
GRANT ALL ON TABLE "public"."exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."expectations" TO "anon";
GRANT ALL ON TABLE "public"."expectations" TO "authenticated";
GRANT ALL ON TABLE "public"."expectations" TO "service_role";



GRANT ALL ON TABLE "public"."factory_calendar" TO "anon";
GRANT ALL ON TABLE "public"."factory_calendar" TO "authenticated";
GRANT ALL ON TABLE "public"."factory_calendar" TO "service_role";



GRANT ALL ON TABLE "public"."factory_capacity_overrides" TO "anon";
GRANT ALL ON TABLE "public"."factory_capacity_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."factory_capacity_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."factory_holidays" TO "anon";
GRANT ALL ON TABLE "public"."factory_holidays" TO "authenticated";
GRANT ALL ON TABLE "public"."factory_holidays" TO "service_role";



GRANT ALL ON TABLE "public"."factory_shifts" TO "anon";
GRANT ALL ON TABLE "public"."factory_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."factory_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."installed_integrations" TO "anon";
GRANT ALL ON TABLE "public"."installed_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."installed_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."integrations" TO "anon";
GRANT ALL ON TABLE "public"."integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."integrations" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."issue_categories" TO "anon";
GRANT ALL ON TABLE "public"."issue_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."issue_categories" TO "service_role";



GRANT ALL ON TABLE "public"."issues" TO "anon";
GRANT ALL ON TABLE "public"."issues" TO "authenticated";
GRANT ALL ON TABLE "public"."issues" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."operations" TO "anon";
GRANT ALL ON TABLE "public"."operations" TO "authenticated";
GRANT ALL ON TABLE "public"."operations" TO "service_role";



GRANT ALL ON TABLE "public"."parts" TO "anon";
GRANT ALL ON TABLE "public"."parts" TO "authenticated";
GRANT ALL ON TABLE "public"."parts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."issues_with_context" TO "anon";
GRANT ALL ON TABLE "public"."issues_with_context" TO "authenticated";
GRANT ALL ON TABLE "public"."issues_with_context" TO "service_role";



GRANT ALL ON TABLE "public"."materials" TO "anon";
GRANT ALL ON TABLE "public"."materials" TO "authenticated";
GRANT ALL ON TABLE "public"."materials" TO "service_role";



GRANT ALL ON TABLE "public"."mcp_authentication_keys" TO "anon";
GRANT ALL ON TABLE "public"."mcp_authentication_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."mcp_authentication_keys" TO "service_role";



GRANT ALL ON TABLE "public"."mcp_endpoints" TO "anon";
GRANT ALL ON TABLE "public"."mcp_endpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."mcp_endpoints" TO "service_role";



GRANT ALL ON TABLE "public"."mcp_key_usage_logs" TO "anon";
GRANT ALL ON TABLE "public"."mcp_key_usage_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."mcp_key_usage_logs" TO "service_role";



GRANT ALL ON TABLE "public"."mcp_server_config" TO "anon";
GRANT ALL ON TABLE "public"."mcp_server_config" TO "authenticated";
GRANT ALL ON TABLE "public"."mcp_server_config" TO "service_role";



GRANT ALL ON TABLE "public"."mcp_server_health" TO "anon";
GRANT ALL ON TABLE "public"."mcp_server_health" TO "authenticated";
GRANT ALL ON TABLE "public"."mcp_server_health" TO "service_role";



GRANT ALL ON TABLE "public"."mcp_server_logs" TO "anon";
GRANT ALL ON TABLE "public"."mcp_server_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."mcp_server_logs" TO "service_role";



GRANT ALL ON TABLE "public"."monthly_reset_logs" TO "anon";
GRANT ALL ON TABLE "public"."monthly_reset_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."monthly_reset_logs" TO "service_role";



GRANT ALL ON TABLE "public"."mqtt_logs" TO "anon";
GRANT ALL ON TABLE "public"."mqtt_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."mqtt_logs" TO "service_role";



GRANT ALL ON TABLE "public"."mqtt_publishers" TO "anon";
GRANT ALL ON TABLE "public"."mqtt_publishers" TO "authenticated";
GRANT ALL ON TABLE "public"."mqtt_publishers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."operation_batches" TO "anon";
GRANT ALL ON TABLE "public"."operation_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."operation_batches" TO "service_role";



GRANT ALL ON TABLE "public"."operation_day_allocations" TO "anon";
GRANT ALL ON TABLE "public"."operation_day_allocations" TO "authenticated";
GRANT ALL ON TABLE "public"."operation_day_allocations" TO "service_role";



GRANT ALL ON TABLE "public"."operation_quantities" TO "anon";
GRANT ALL ON TABLE "public"."operation_quantities" TO "authenticated";
GRANT ALL ON TABLE "public"."operation_quantities" TO "service_role";



GRANT ALL ON TABLE "public"."operation_quantity_scrap_reasons" TO "anon";
GRANT ALL ON TABLE "public"."operation_quantity_scrap_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."operation_quantity_scrap_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."operation_resources" TO "anon";
GRANT ALL ON TABLE "public"."operation_resources" TO "authenticated";
GRANT ALL ON TABLE "public"."operation_resources" TO "service_role";



GRANT ALL ON TABLE "public"."operators" TO "anon";
GRANT ALL ON TABLE "public"."operators" TO "authenticated";
GRANT ALL ON TABLE "public"."operators" TO "service_role";



GRANT ALL ON TABLE "public"."resources" TO "anon";
GRANT ALL ON TABLE "public"."resources" TO "authenticated";
GRANT ALL ON TABLE "public"."resources" TO "service_role";



GRANT ALL ON TABLE "public"."scrap_reasons" TO "anon";
GRANT ALL ON TABLE "public"."scrap_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."scrap_reasons" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_events" TO "anon";
GRANT ALL ON TABLE "public"."subscription_events" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_events" TO "service_role";



GRANT ALL ON TABLE "public"."substep_template_items" TO "anon";
GRANT ALL ON TABLE "public"."substep_template_items" TO "authenticated";
GRANT ALL ON TABLE "public"."substep_template_items" TO "service_role";



GRANT ALL ON TABLE "public"."substep_templates" TO "anon";
GRANT ALL ON TABLE "public"."substep_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."substep_templates" TO "service_role";



GRANT ALL ON TABLE "public"."substeps" TO "anon";
GRANT ALL ON TABLE "public"."substeps" TO "authenticated";
GRANT ALL ON TABLE "public"."substeps" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."time_entry_pauses" TO "anon";
GRANT ALL ON TABLE "public"."time_entry_pauses" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entry_pauses" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_logs" TO "anon";
GRANT ALL ON TABLE "public"."webhook_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_logs" TO "service_role";



GRANT ALL ON TABLE "public"."webhooks" TO "anon";
GRANT ALL ON TABLE "public"."webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."sync_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_imports" TO "service_role";








ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































