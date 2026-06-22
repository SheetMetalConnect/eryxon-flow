-- Fix demo operator seeding for demo/pilot tenants (ERY-35)
--
-- Problem: seed_demo_operators() inserted into public.profiles with random UUIDs.
-- That path errors before creating any operator because:
--   1. profiles.username is NOT NULL (deployed function omitted it) -> 23502, and
--   2. profiles.id has a FK to auth.users(id), so a random UUID violates it -> 23503.
-- Seeded tenants therefore fell back to unassigned work.
--
-- Fix: seed demo operators into the supported no-email PIN path (public.operators),
-- the same table verify_operator_pin / list_operators / terminal login already use.
-- Add a companion RPC that guarantees a seeded tenant holds >=1 assigned operation
-- via assignments.shop_floor_operator_id (the operators-backed assignment column).

-- 1. Seed demo operators into public.operators (PIN-login, no auth.users / no email needed).
CREATE OR REPLACE FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid")
  RETURNS TABLE("created_count" integer, "message" text)
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_count INTEGER := 0;
  v_admin UUID;
BEGIN
  -- Idempotent: skip if demo operators already exist for this tenant.
  SELECT COUNT(*) INTO v_count
  FROM public.operators
  WHERE tenant_id = p_tenant_id AND employee_id LIKE 'DEMO%';

  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::INTEGER, 'Demo operators already exist for this tenant'::TEXT;
    RETURN;
  END IF;

  -- created_by is a nullable audit column; attribute to any existing tenant profile if present.
  SELECT id INTO v_admin
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO public.operators (tenant_id, employee_id, full_name, pin_hash, active, created_by)
  VALUES
    (p_tenant_id, 'DEMO1', 'Demo Operator - John Smith',    extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO2', 'Demo Operator - Maria Garcia',  extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO3', 'Demo Operator - Wei Chen',      extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO4', 'Demo Operator - Sarah Johnson', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin);

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count,
    format('Created %s demo operators. Terminal login: employee IDs DEMO1-DEMO4, PIN 1234.', v_count)::TEXT;
END;
$$;

ALTER FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid")
  IS 'Creates demo shop-floor operators in public.operators (PIN login, no auth.users/email). Employee IDs DEMO1-DEMO4, PIN 1234.';

GRANT ALL ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_demo_operators"("p_tenant_id" "uuid") TO "service_role";

-- 2. Guarantee a seeded tenant holds at least one assigned operation for operator testing.
CREATE OR REPLACE FUNCTION "public"."seed_demo_operator_assignment"("p_tenant_id" "uuid")
  RETURNS TABLE("assignment_id" "uuid", "message" text)
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
  AS $$
DECLARE
  v_operator UUID;
  v_part UUID;
  v_job UUID;
  v_admin UUID;
  v_existing UUID;
  v_new UUID;
BEGIN
  -- Idempotent: reuse an existing shop-floor assignment if one is already present.
  SELECT a.id INTO v_existing
  FROM public.assignments a
  WHERE a.tenant_id = p_tenant_id AND a.shop_floor_operator_id IS NOT NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing, 'Tenant already has a shop-floor assignment'::TEXT;
    RETURN;
  END IF;

  SELECT id INTO v_operator
  FROM public.operators
  WHERE tenant_id = p_tenant_id AND employee_id LIKE 'DEMO%' AND active
  ORDER BY employee_id
  LIMIT 1;

  IF v_operator IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'No demo operator found - run seed_demo_operators first'::TEXT;
    RETURN;
  END IF;

  -- assigned_by is NOT NULL and references profiles(id); use an existing tenant profile.
  SELECT id INTO v_admin
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'No tenant profile available to record assigned_by'::TEXT;
    RETURN;
  END IF;

  SELECT p.id, p.job_id INTO v_part, v_job
  FROM public.parts p
  WHERE p.tenant_id = p_tenant_id
  ORDER BY p.created_at
  LIMIT 1;

  IF v_part IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'No part available to assign'::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.assignments (tenant_id, part_id, job_id, assigned_by, shop_floor_operator_id, status)
  VALUES (p_tenant_id, v_part, v_job, v_admin, v_operator, 'assigned')
  RETURNING id INTO v_new;

  RETURN QUERY SELECT v_new, 'Created 1 shop-floor assignment for operator testing'::TEXT;
END;
$$;

ALTER FUNCTION "public"."seed_demo_operator_assignment"("p_tenant_id" "uuid") OWNER TO "postgres";
COMMENT ON FUNCTION "public"."seed_demo_operator_assignment"("p_tenant_id" "uuid")
  IS 'Creates one assignments.shop_floor_operator_id assignment for a seeded demo operator so the tenant can be exercised in operator/terminal flows.';

GRANT ALL ON FUNCTION "public"."seed_demo_operator_assignment"("p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_demo_operator_assignment"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_demo_operator_assignment"("p_tenant_id" "uuid") TO "service_role";
