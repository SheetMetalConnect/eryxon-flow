-- Sequential release: when tenants.feature_flags->>'sequentialRelease' is true, an
-- operation cannot start before every earlier operation of the same part is completed.
CREATE OR REPLACE FUNCTION public.transition_operation(
  p_tenant_id uuid, p_operation_id uuid, p_action text,
  p_operator_id uuid DEFAULT NULL, p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_op public.operations%ROWTYPE;
  v_entry public.time_entries%ROWTYPE;
  v_now timestamptz := now();
  v_job_id uuid;
  v_changed boolean := false;
  v_entry_id uuid;
  v_total integer;
  v_previous_status public.task_status;
BEGIN
  PERFORM public.assert_production_actor(p_tenant_id, p_operator_id);
  IF p_action NOT IN ('start','resume','stop','pause','complete','finish') THEN
    RAISE EXCEPTION 'Invalid operation action' USING ERRCODE = '22023';
  END IF;
  IF p_operator_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_operator_id::text, 0));
  END IF;
  SELECT * INTO v_op FROM public.operations
    WHERE id = p_operation_id AND tenant_id = p_tenant_id AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Operation not found' USING ERRCODE = 'P0002'; END IF;
  v_previous_status := v_op.status;
  SELECT job_id INTO v_job_id FROM public.parts WHERE id = v_op.part_id AND tenant_id = p_tenant_id;

  IF p_action IN ('start','resume') THEN
    IF v_op.status = 'completed' THEN RAISE EXCEPTION 'Completed operation cannot start' USING ERRCODE = '22023'; END IF;
    IF p_action = 'resume' AND v_op.status <> 'on_hold' THEN
      RAISE EXCEPTION 'Only a paused operation can resume' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.issues WHERE operation_id = v_op.id AND tenant_id = p_tenant_id
        AND causes_standstill AND status = 'pending') THEN
      RAISE EXCEPTION 'Resolve the active standstill before restarting' USING ERRCODE = '22023';
    END IF;
    IF p_operator_id IS NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Operator is required' USING ERRCODE = '22023';
    END IF;
    IF p_action = 'start' AND v_op.status = 'not_started'
      AND COALESCE((SELECT (feature_flags->>'sequentialRelease')::boolean FROM public.tenants WHERE id = p_tenant_id), false)
      AND EXISTS (SELECT 1 FROM public.operations WHERE part_id = v_op.part_id AND tenant_id = p_tenant_id
        AND sequence < v_op.sequence AND deleted_at IS NULL AND status <> 'completed') THEN
      RAISE EXCEPTION 'Previous operation must be completed first' USING ERRCODE = '22023';
    END IF;
    IF p_operator_id IS NOT NULL THEN
      SELECT id INTO v_entry_id FROM public.time_entries
        WHERE tenant_id = p_tenant_id AND operation_id = v_op.id AND COALESCE(shop_floor_operator_id,operator_id) = p_operator_id AND end_time IS NULL;
      IF v_entry_id IS NULL THEN
        IF EXISTS (SELECT 1 FROM public.time_entries WHERE tenant_id = p_tenant_id AND COALESCE(shop_floor_operator_id,operator_id) = p_operator_id AND end_time IS NULL) THEN
          RAISE EXCEPTION 'Stop active work before starting another operation' USING ERRCODE = '22023';
        END IF;
        INSERT INTO public.time_entries(tenant_id,operation_id,operator_id,shop_floor_operator_id,start_time,notes)
          VALUES(p_tenant_id,v_op.id,public.production_profile_id(p_operator_id),public.production_shop_floor_id(p_operator_id),v_now,p_notes) RETURNING id INTO v_entry_id;
        v_changed := true;
      END IF;
    END IF;
    v_changed := v_changed OR v_op.status <> 'in_progress';
    UPDATE public.operations SET status = 'in_progress', started_at = COALESCE(started_at,v_now),
      resumed_at = CASE WHEN p_action = 'resume' THEN v_now ELSE resumed_at END
      WHERE id = v_op.id;
  ELSE
    IF p_action = 'pause' AND v_op.status <> 'in_progress' THEN
      RAISE EXCEPTION 'Only an operation in progress can pause' USING ERRCODE = '22023';
    END IF;
    IF p_action IN ('complete','finish') AND v_op.status = 'not_started' THEN
      RAISE EXCEPTION 'Start the operation before completing it' USING ERRCODE = '22023';
    END IF;
    IF p_action = 'complete' AND EXISTS (SELECT 1 FROM public.time_entries WHERE operation_id = v_op.id AND end_time IS NULL) THEN
      RAISE EXCEPTION 'Stop active time entries before completing' USING ERRCODE = '22023';
    END IF;
    FOR v_entry IN SELECT * FROM public.time_entries
      WHERE operation_id = v_op.id AND tenant_id = p_tenant_id AND end_time IS NULL
        AND (p_action IN ('pause','finish') OR p_operator_id IS NULL OR COALESCE(shop_floor_operator_id,operator_id) = p_operator_id)
      ORDER BY id FOR UPDATE
    LOOP
      PERFORM public.assert_production_actor(p_tenant_id,COALESCE(v_entry.shop_floor_operator_id,v_entry.operator_id));
      PERFORM public.close_production_timer(v_entry.id,v_now);
      v_changed := true;
    END LOOP;
    SELECT COALESCE(sum(duration),0)::integer INTO v_total FROM public.time_entries
      WHERE operation_id = v_op.id AND tenant_id = p_tenant_id AND end_time IS NOT NULL;
    IF p_action IN ('complete','finish') THEN
      v_changed := v_changed OR v_op.status <> 'completed';
      UPDATE public.operations SET status='completed',completion_percentage=100,
        completed_at=COALESCE(completed_at,v_now),actual_time=v_total WHERE id=v_op.id;
    ELSIF p_action = 'pause' THEN
      v_changed := v_changed OR v_op.status <> 'on_hold';
      UPDATE public.operations SET status='on_hold',paused_at=v_now,actual_time=v_total WHERE id=v_op.id;
    ELSIF v_changed THEN
      UPDATE public.operations SET actual_time=v_total WHERE id=v_op.id;
    END IF;
  END IF;
  PERFORM public.refresh_production_job(p_tenant_id,v_job_id);
  SELECT * INTO v_op FROM public.operations WHERE id=p_operation_id;
  RETURN jsonb_build_object('operation_id',v_op.id,'status',v_op.status,'previous_status',v_previous_status,'changed',v_changed,
    'time_entry_id',v_entry_id,'started_at',v_op.started_at,'completed_at',v_op.completed_at,
    'actual_time',v_op.actual_time,'part_id',v_op.part_id,'job_id',v_job_id,'cell_id',v_op.cell_id,
    'operation_name',v_op.operation_name,'estimated_time',v_op.estimated_time,'operator_id',p_operator_id,
    'operator_name',COALESCE((SELECT full_name FROM public.operators WHERE id=p_operator_id),(SELECT full_name FROM public.profiles WHERE id=p_operator_id)),
    'part_number',(SELECT part_number FROM public.parts WHERE id=v_op.part_id),
    'job_number',(SELECT job_number FROM public.jobs WHERE id=v_job_id));
END;
$$;
REVOKE ALL ON FUNCTION public.transition_operation(uuid, uuid, text, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_operation(uuid, uuid, text, uuid, text) TO authenticated, service_role;
