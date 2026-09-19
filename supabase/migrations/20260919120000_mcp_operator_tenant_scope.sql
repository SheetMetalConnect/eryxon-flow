-- Service integrations use an explicit tenant because service-role requests have
-- no auth.uid(). Browser callers keep using the existing user-scoped overloads.
CREATE OR REPLACE FUNCTION public.create_operator_with_pin(
  p_tenant_id uuid,
  p_employee_id text,
  p_full_name text,
  p_pin text,
  p_role public.app_role DEFAULT 'operator'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id uuid;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  IF p_role <> 'operator' THEN
    RAISE EXCEPTION 'Shop-floor PIN accounts must use the operator role' USING ERRCODE = '22023';
  END IF;
  IF p_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.operators (tenant_id, employee_id, full_name, pin_hash, active, created_by)
  VALUES (
    p_tenant_id,
    upper(trim(p_employee_id)),
    trim(p_full_name),
    extensions.crypt(p_pin, extensions.gen_salt('bf', 8)),
    true,
    auth.uid()
  )
  RETURNING id INTO v_operator_id;

  RETURN v_operator_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_operator_pin(
  p_tenant_id uuid,
  p_operator_id uuid,
  p_new_pin text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  IF p_new_pin !~ '^\d{4,6}$' THEN
    RAISE EXCEPTION 'PIN must be 4-6 digits' USING ERRCODE = '22023';
  END IF;

  UPDATE public.operators
  SET pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 8)),
      failed_attempts = 0,
      locked_until = NULL
  WHERE id = p_operator_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operator not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_operator(
  p_tenant_id uuid,
  p_operator_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  UPDATE public.operators
  SET failed_attempts = 0, locked_until = NULL
  WHERE id = p_operator_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operator not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_operator_with_pin(uuid, text, text, text, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reset_operator_pin(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlock_operator(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_operator_with_pin(uuid, text, text, text, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_operator_pin(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlock_operator(uuid, uuid) TO authenticated, service_role;
