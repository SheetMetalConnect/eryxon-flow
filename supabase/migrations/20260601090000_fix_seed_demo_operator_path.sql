-- Ensure hosted seed path works with the post-2026 operator model (PIN-based no-email ops).
--
-- Prior versions of `seed_demo_operators()` inserted random-profile IDs into public.profiles.
-- That fails once `profiles.id` is required to reference a valid `auth.users` row.
-- This migration re-aligns the seed RPC to create rows in public.operators instead,
-- preserving operator-mode testability without email sign-in.

DROP FUNCTION IF EXISTS public.seed_demo_operators(uuid);

CREATE OR REPLACE FUNCTION public.seed_demo_operators(p_tenant_id uuid)
RETURNS TABLE(created_count integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_admin uuid;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.operators
  WHERE tenant_id = p_tenant_id
    AND employee_id LIKE 'DEMO%';

  IF v_count > 0 THEN
    RETURN QUERY SELECT 0::integer, 'Demo operators already exist for this tenant'::text;
    RETURN;
  END IF;

  SELECT id
  INTO v_admin
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at
  LIMIT 1;

  INSERT INTO public.operators (
    tenant_id,
    employee_id,
    full_name,
    pin_hash,
    active,
    created_by
  )
  VALUES
    (p_tenant_id, 'DEMO1', 'Demo Operator - John Smith', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO2', 'Demo Operator - Maria Garcia', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO3', 'Demo Operator - Wei Chen', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin),
    (p_tenant_id, 'DEMO4', 'Demo Operator - Sarah Johnson', extensions.crypt('1234', extensions.gen_salt('bf')), true, v_admin);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY
    SELECT
      v_count,
      format(
        'Created %s demo operators. Terminal login: employee IDs DEMO1-DEMO4, PIN 1234.',
        v_count
      )::text;
END;
$$;

ALTER FUNCTION public.seed_demo_operators(p_tenant_id uuid) OWNER TO postgres;
COMMENT ON FUNCTION public.seed_demo_operators(p_tenant_id uuid)
  IS 'Creates demo shop-floor operators in public.operators (PIN path) for demo/pilot seeding.';

GRANT ALL ON FUNCTION public.seed_demo_operators(p_tenant_id uuid) TO anon;
GRANT ALL ON FUNCTION public.seed_demo_operators(p_tenant_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.seed_demo_operators(p_tenant_id uuid) TO service_role;

-- Ensure a seeded tenant can take a minimal operator-flow step by assigning one
-- job/part to a demo operator (shop-floor assignment target column).
CREATE OR REPLACE FUNCTION public.seed_demo_operator_assignment(p_tenant_id uuid)
RETURNS TABLE(assignment_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_operator uuid;
  v_part uuid;
  v_job uuid;
  v_admin uuid;
  v_existing uuid;
  v_new uuid;
BEGIN
  SELECT a.id INTO v_existing
  FROM public.assignments a
  WHERE a.tenant_id = p_tenant_id
    AND a.shop_floor_operator_id IS NOT NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT v_existing, 'Tenant already has a shop-floor assignment'::text;
    RETURN;
  END IF;

  SELECT id INTO v_operator
  FROM public.operators
  WHERE tenant_id = p_tenant_id
    AND employee_id LIKE 'DEMO%'
    AND active
  ORDER BY employee_id
  LIMIT 1;

  IF v_operator IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'No demo operator found - run seed_demo_operators first'::text;
    RETURN;
  END IF;

  SELECT id INTO v_admin
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at
  LIMIT 1;

  IF v_admin IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'No tenant profile available to record assigned_by'::text;
    RETURN;
  END IF;

  SELECT p.id, p.job_id
  INTO v_part, v_job
  FROM public.parts p
  WHERE p.tenant_id = p_tenant_id
  ORDER BY p.created_at
  LIMIT 1;

  IF v_part IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, 'No part available to assign'::text;
    RETURN;
  END IF;

  INSERT INTO public.assignments (
    tenant_id,
    part_id,
    job_id,
    assigned_by,
    shop_floor_operator_id,
    status
  )
  VALUES (p_tenant_id, v_part, v_job, v_admin, v_operator, 'assigned')
  RETURNING id INTO v_new;

  RETURN QUERY SELECT v_new, 'Created 1 shop-floor assignment for operator testing'::text;
END;
$$;

ALTER FUNCTION public.seed_demo_operator_assignment(p_tenant_id uuid) OWNER TO postgres;
GRANT ALL ON FUNCTION public.seed_demo_operator_assignment(p_tenant_id uuid) TO anon;
GRANT ALL ON FUNCTION public.seed_demo_operator_assignment(p_tenant_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.seed_demo_operator_assignment(p_tenant_id uuid) TO service_role;
