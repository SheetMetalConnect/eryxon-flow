-- Switching work is one transaction: either the old timer closes and the new
-- operation starts, or neither change is committed.
CREATE OR REPLACE FUNCTION public.switch_operation(
  p_tenant_id uuid,
  p_from_operation_id uuid,
  p_to_operation_id uuid,
  p_operator_id uuid,
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stopped jsonb;
  v_started jsonb;
BEGIN
  PERFORM public.assert_production_actor(p_tenant_id, p_operator_id);

  IF p_from_operation_id = p_to_operation_id THEN
    RAISE EXCEPTION 'Source and target operation must differ' USING ERRCODE = '22023';
  END IF;

  v_stopped := public.transition_operation(
    p_tenant_id,
    p_from_operation_id,
    'stop',
    p_operator_id,
    NULL
  );
  v_started := public.transition_operation(
    p_tenant_id,
    p_to_operation_id,
    'start',
    p_operator_id,
    p_notes
  );

  RETURN jsonb_build_object('stopped', v_stopped, 'started', v_started);
END;
$$;

REVOKE ALL ON FUNCTION public.switch_operation(uuid, uuid, uuid, uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_operation(uuid, uuid, uuid, uuid, text)
  TO authenticated, service_role;
