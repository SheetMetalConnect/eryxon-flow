-- One database transaction owns each production transition and its time records.
-- Rollback: remove RPC grants/functions after restoring callers. No historical
-- time entries or production states are rewritten by applying this migration.
CREATE OR REPLACE FUNCTION public.assert_production_actor(p_tenant_id uuid, p_operator_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF auth.uid() IS NULL OR p_tenant_id IS DISTINCT FROM public.get_user_tenant_id() THEN
      RAISE EXCEPTION 'Tenant access denied' USING ERRCODE = '42501';
    END IF;
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      IF EXISTS (
        SELECT 1 FROM public.operator_sessions s
        JOIN public.operators o ON o.id=s.operator_id AND o.tenant_id=s.tenant_id AND o.active
        WHERE s.user_id=auth.uid() AND s.session_id=NULLIF(auth.jwt()->>'session_id','')::uuid
          AND s.tenant_id=p_tenant_id AND s.expires_at>now()
          AND (p_operator_id IS NULL OR p_operator_id=s.operator_id)
      ) THEN RETURN; END IF;
      RAISE EXCEPTION 'Active operator verification required for this tenant' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF p_operator_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=p_operator_id AND tenant_id=p_tenant_id AND active) THEN
    IF auth.role()='service_role' OR public.has_role(auth.uid(),'admin') THEN RETURN; END IF;
  ELSIF EXISTS (SELECT 1 FROM public.operators WHERE id=p_operator_id AND tenant_id=p_tenant_id AND active) THEN
    -- A service-role API has no authenticated terminal profile for attribution.
    IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin') THEN RETURN; END IF;
  END IF;
  RAISE EXCEPTION 'Active operator verification required for this tenant' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.assert_production_actor(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_production_actor(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_production_write()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN COALESCE(NEW,OLD); END IF;
  IF TG_OP<>'INSERT' THEN PERFORM public.assert_production_actor(OLD.tenant_id); END IF;
  IF TG_OP<>'DELETE' THEN PERFORM public.assert_production_actor(NEW.tenant_id); END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE OR REPLACE TRIGGER protect_production_write BEFORE INSERT OR UPDATE OR DELETE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.protect_production_write();
CREATE OR REPLACE TRIGGER protect_production_write BEFORE INSERT OR UPDATE OR DELETE ON public.operation_batches
  FOR EACH ROW EXECUTE FUNCTION public.protect_production_write();

CREATE OR REPLACE FUNCTION public.production_profile_id(p_operator_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN EXISTS(SELECT 1 FROM public.operators WHERE id=p_operator_id)
    THEN auth.uid() ELSE p_operator_id END;
$$;
REVOKE ALL ON FUNCTION public.production_profile_id(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.production_shop_floor_id(p_operator_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id FROM public.operators WHERE id=p_operator_id;
$$;
REVOKE ALL ON FUNCTION public.production_shop_floor_id(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.protect_time_entry_actor()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN COALESCE(NEW,OLD); END IF;
  IF TG_OP<>'INSERT' THEN
    PERFORM public.assert_production_actor(OLD.tenant_id,COALESCE(OLD.shop_floor_operator_id,OLD.operator_id));
  END IF;
  IF TG_OP<>'DELETE' THEN
    PERFORM public.assert_production_actor(NEW.tenant_id,COALESCE(NEW.shop_floor_operator_id,NEW.operator_id));
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE OR REPLACE TRIGGER protect_time_entry_actor BEFORE INSERT OR UPDATE OR DELETE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.protect_time_entry_actor();

CREATE OR REPLACE FUNCTION public.protect_time_entry_pause_actor()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_entry public.time_entries%ROWTYPE;
BEGIN
  IF current_user IN ('postgres','service_role','supabase_admin') THEN RETURN COALESCE(NEW,OLD); END IF;
  IF TG_OP<>'INSERT' THEN
    SELECT * INTO v_entry FROM public.time_entries WHERE id=OLD.time_entry_id;
    PERFORM public.assert_production_actor(v_entry.tenant_id,COALESCE(v_entry.shop_floor_operator_id,v_entry.operator_id));
  END IF;
  IF TG_OP<>'DELETE' THEN
    SELECT * INTO v_entry FROM public.time_entries WHERE id=NEW.time_entry_id;
    PERFORM public.assert_production_actor(v_entry.tenant_id,COALESCE(v_entry.shop_floor_operator_id,v_entry.operator_id));
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE OR REPLACE TRIGGER protect_time_entry_pause_actor BEFORE INSERT OR UPDATE OR DELETE ON public.time_entry_pauses
  FOR EACH ROW EXECUTE FUNCTION public.protect_time_entry_pause_actor();

CREATE OR REPLACE FUNCTION public.close_production_timer(p_entry_id uuid, p_ended_at timestamptz)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_entry public.time_entries%ROWTYPE; v_paused_seconds numeric; v_minutes integer;
BEGIN
  SELECT * INTO STRICT v_entry FROM public.time_entries WHERE id = p_entry_id FOR UPDATE;
  IF v_entry.end_time IS NOT NULL THEN RETURN COALESCE(v_entry.duration, 0); END IF;
  UPDATE public.time_entry_pauses
    SET resumed_at = p_ended_at,
        duration = GREATEST(0, round(extract(epoch FROM p_ended_at - paused_at)))::integer
    WHERE time_entry_id = p_entry_id AND resumed_at IS NULL;
  SELECT COALESCE(sum(duration), 0) INTO v_paused_seconds
    FROM public.time_entry_pauses WHERE time_entry_id = p_entry_id;
  v_minutes := GREATEST(0, round((extract(epoch FROM p_ended_at - v_entry.start_time) - v_paused_seconds) / 60))::integer;
  UPDATE public.time_entries SET end_time = p_ended_at, duration = v_minutes, is_paused = false
    WHERE id = p_entry_id;
  RETURN v_minutes;
END;
$$;
REVOKE ALL ON FUNCTION public.close_production_timer(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_production_job(p_tenant_id uuid, p_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Serialize sibling completions before calculating the aggregate state.
  PERFORM 1 FROM public.jobs WHERE id = p_job_id AND tenant_id = p_tenant_id FOR UPDATE;
  UPDATE public.parts p SET
    status = CASE
      WHEN EXISTS (SELECT 1 FROM public.operations o WHERE o.part_id = p.id AND o.deleted_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM public.operations o WHERE o.part_id = p.id AND o.deleted_at IS NULL AND o.status <> 'completed')
        THEN 'completed'::public.job_status
      WHEN EXISTS (SELECT 1 FROM public.operations o WHERE o.part_id = p.id AND o.deleted_at IS NULL AND o.status = 'in_progress')
        THEN 'in_progress'::public.job_status
      ELSE p.status END,
    current_cell_id = (
      SELECT o.cell_id FROM public.operations o JOIN public.cells c ON c.id = o.cell_id
      WHERE o.part_id = p.id AND o.tenant_id = p_tenant_id AND o.deleted_at IS NULL AND o.status = 'in_progress'
      ORDER BY c.sequence, o.sequence, o.id LIMIT 1
    )
  WHERE p.job_id = p_job_id AND p.tenant_id = p_tenant_id AND p.deleted_at IS NULL;
  UPDATE public.jobs j SET
    status = CASE
      WHEN EXISTS (SELECT 1 FROM public.parts p WHERE p.job_id = j.id AND p.deleted_at IS NULL)
       AND NOT EXISTS (SELECT 1 FROM public.parts p WHERE p.job_id = j.id AND p.deleted_at IS NULL AND p.status <> 'completed')
        THEN 'completed'::public.job_status
      WHEN EXISTS (SELECT 1 FROM public.parts p WHERE p.job_id = j.id AND p.deleted_at IS NULL AND p.status = 'in_progress')
        THEN 'in_progress'::public.job_status
      ELSE j.status END,
    current_cell_id = (
      SELECT p.current_cell_id FROM public.parts p JOIN public.cells c ON c.id = p.current_cell_id
      WHERE p.job_id = j.id AND p.tenant_id = p_tenant_id AND p.deleted_at IS NULL
      ORDER BY c.sequence, p.id LIMIT 1
    )
  WHERE j.id = p_job_id AND j.tenant_id = p_tenant_id;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_production_job(uuid, uuid) FROM PUBLIC, anon, authenticated;

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
    IF EXISTS (SELECT 1 FROM public.issues WHERE operation_id = v_op.id AND tenant_id = p_tenant_id
        AND causes_standstill AND status = 'pending') THEN
      RAISE EXCEPTION 'Resolve the active standstill before restarting' USING ERRCODE = '22023';
    END IF;
    IF p_operator_id IS NULL AND auth.role() IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Operator is required' USING ERRCODE = '22023';
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
    IF p_action IN ('complete','finish') THEN
      v_changed := v_changed OR v_op.status <> 'completed';
      UPDATE public.operations SET status='completed',completion_percentage=100,
        completed_at=COALESCE(completed_at,v_now) WHERE id=v_op.id;
    ELSIF p_action = 'pause' THEN
      v_changed := v_changed OR v_op.status <> 'on_hold';
      UPDATE public.operations SET status='on_hold',paused_at=v_now WHERE id=v_op.id;
    END IF;
  END IF;
  SELECT COALESCE(sum(duration),0)::integer INTO v_total FROM public.time_entries
    WHERE operation_id = v_op.id AND tenant_id = p_tenant_id AND end_time IS NOT NULL;
  UPDATE public.operations SET actual_time=v_total WHERE id=v_op.id;
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

CREATE OR REPLACE FUNCTION public.time_entry_action(p_tenant_id uuid,p_time_entry_id uuid,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_entry public.time_entries%ROWTYPE; v_now timestamptz := now(); v_changed boolean := false;
BEGIN
  SELECT * INTO v_entry FROM public.time_entries WHERE id=p_time_entry_id AND tenant_id=p_tenant_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Time entry not found' USING ERRCODE='P0002'; END IF;
  PERFORM public.assert_production_actor(p_tenant_id,COALESCE(v_entry.shop_floor_operator_id,v_entry.operator_id));
  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(v_entry.shop_floor_operator_id,v_entry.operator_id)::text,0));
  PERFORM 1 FROM public.operations WHERE id=v_entry.operation_id FOR UPDATE;
  SELECT * INTO v_entry FROM public.time_entries WHERE id=p_time_entry_id FOR UPDATE;
  IF p_action NOT IN ('stop','pause','resume') THEN RAISE EXCEPTION 'Invalid timer action' USING ERRCODE='22023'; END IF;
  IF v_entry.end_time IS NULL THEN
    IF p_action='stop' THEN
      PERFORM public.close_production_timer(v_entry.id,v_now);
      UPDATE public.operations SET actual_time=(SELECT COALESCE(sum(duration),0) FROM public.time_entries
        WHERE operation_id=v_entry.operation_id AND end_time IS NOT NULL) WHERE id=v_entry.operation_id;
      v_changed := true;
    ELSIF p_action='pause' AND NOT COALESCE(v_entry.is_paused,false) THEN
      INSERT INTO public.time_entry_pauses(time_entry_id,paused_at) VALUES(v_entry.id,v_now);
      UPDATE public.time_entries SET is_paused=true WHERE id=v_entry.id;
      v_changed := true;
    ELSIF p_action='resume' AND v_entry.is_paused THEN
      UPDATE public.time_entry_pauses SET resumed_at=v_now,
        duration=GREATEST(0,round(extract(epoch FROM v_now-paused_at)))::integer
        WHERE time_entry_id=v_entry.id AND resumed_at IS NULL;
      UPDATE public.time_entries SET is_paused=false WHERE id=v_entry.id;
      v_changed := true;
    END IF;
  END IF;
  SELECT * INTO v_entry FROM public.time_entries WHERE id=p_time_entry_id;
  RETURN to_jsonb(v_entry)||jsonb_build_object('changed',v_changed);
END;
$$;
REVOKE ALL ON FUNCTION public.time_entry_action(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.time_entry_action(uuid, uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.transition_batch(
  p_tenant_id uuid,p_batch_id uuid,p_action text,p_operator_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_batch public.operation_batches%ROWTYPE;
  v_op public.operations%ROWTYPE;
  v_entry public.time_entries%ROWTYPE;
  v_now timestamptz := now();
  v_ids uuid[];
  v_count integer;
  v_total integer := 0;
  v_weight numeric;
  v_prefix numeric := 0;
  v_prior integer := 0;
  v_minutes integer;
  v_index integer := 0;
  v_entries integer;
  v_entry_index integer;
  v_job_id uuid;
  v_method text;
  v_distribution jsonb := '[]'::jsonb;
  v_timer_ids uuid[];
  v_net_minutes integer;
BEGIN
  PERFORM public.assert_production_actor(p_tenant_id,p_operator_id);
  IF p_action NOT IN ('start','stop') THEN RAISE EXCEPTION 'Invalid batch action' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_batch FROM public.operation_batches
    WHERE id=p_batch_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found' USING ERRCODE='P0002'; END IF;
  IF p_operator_id IS NULL AND (v_batch.production_mode <> 'automated' OR v_batch.batch_type <> 'laser_nesting') THEN
    RAISE EXCEPTION 'Operator is required for manual batches' USING ERRCODE='22023';
  END IF;
  IF (p_action='start' AND v_batch.status='in_progress') OR (p_action='stop' AND v_batch.status='completed') THEN
    RETURN jsonb_build_object('batch_id',v_batch.id,'status',v_batch.status,'changed',false,
      'started_at',v_batch.started_at,'completed_at',v_batch.completed_at,'total_minutes',COALESCE(v_batch.actual_time,0),
      'operations','[]'::jsonb,'operations_started',v_batch.operations_count);
  END IF;
  IF (p_action='start' AND v_batch.status NOT IN ('draft','ready')) OR (p_action='stop' AND v_batch.status<>'in_progress') THEN
    RAISE EXCEPTION 'Batch state does not allow this transition' USING ERRCODE='22023';
  END IF;
  IF p_operator_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_operator_id::text,0));
  END IF;
  SELECT array_agg(operation_id ORDER BY operation_id) INTO v_ids FROM public.batch_operations
    WHERE batch_id=v_batch.id AND tenant_id=p_tenant_id;
  v_count := COALESCE(cardinality(v_ids),0);
  IF v_count=0 THEN RAISE EXCEPTION 'Batch has no operations' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.operations WHERE id=ANY(v_ids) AND tenant_id=p_tenant_id ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.operations WHERE id=ANY(v_ids) AND tenant_id=p_tenant_id AND deleted_at IS NULL) <> v_count THEN
    RAISE EXCEPTION 'Batch contains unavailable operations' USING ERRCODE='22023';
  END IF;

  IF p_action='start' THEN
    IF EXISTS(SELECT 1 FROM public.operations WHERE id=ANY(v_ids) AND status<>'not_started') THEN
      RAISE EXCEPTION 'Batch operations must be not started' USING ERRCODE='22023';
    END IF;
    IF EXISTS(SELECT 1 FROM public.time_entries WHERE tenant_id=p_tenant_id AND end_time IS NULL
      AND (operation_id=ANY(v_ids) OR COALESCE(shop_floor_operator_id,operator_id)=p_operator_id)) THEN
      RAISE EXCEPTION 'Stop active work before starting this batch' USING ERRCODE='22023';
    END IF;
    IF p_operator_id IS NOT NULL THEN
      INSERT INTO public.time_entries(tenant_id,operation_id,operator_id,shop_floor_operator_id,start_time,notes)
        SELECT p_tenant_id,id,public.production_profile_id(p_operator_id),public.production_shop_floor_id(p_operator_id),v_now,'batch:'||p_batch_id::text FROM public.operations WHERE id=ANY(v_ids);
    END IF;
    UPDATE public.operations SET status='in_progress',started_at=COALESCE(started_at,v_now) WHERE id=ANY(v_ids);
    UPDATE public.operation_batches SET status='in_progress',started_at=v_now,started_by=public.production_profile_id(p_operator_id),started_by_shop_floor_operator_id=public.production_shop_floor_id(p_operator_id) WHERE id=v_batch.id;
  ELSE
    SELECT array_agg(id) INTO v_timer_ids FROM public.time_entries
      WHERE operation_id=ANY(v_ids) AND end_time IS NULL;
    IF v_timer_ids IS NOT NULL THEN
      FOR v_entry IN SELECT * FROM public.time_entries WHERE id=ANY(v_timer_ids) ORDER BY id FOR UPDATE LOOP
        PERFORM public.assert_production_actor(p_tenant_id,COALESCE(v_entry.shop_floor_operator_id,v_entry.operator_id));
        v_net_minutes := public.close_production_timer(v_entry.id,v_now);
        v_total := GREATEST(v_total,v_net_minutes);
      END LOOP;
    ELSIF v_batch.production_mode='automated' THEN
      v_total := GREATEST(0,round(extract(epoch FROM v_now-v_batch.started_at)/60))::integer;
    END IF;
    SELECT CASE WHEN bool_and(estimated_time>0) THEN sum(estimated_time) ELSE NULL END INTO v_weight
      FROM public.operations WHERE id=ANY(v_ids);
    v_method := CASE WHEN v_weight>0 THEN 'weighted' ELSE 'equal' END;
    FOR v_op IN SELECT * FROM public.operations WHERE id=ANY(v_ids) ORDER BY sequence,id LOOP
      v_index := v_index+1;
      IF v_method='weighted' THEN
        v_prefix := v_prefix+v_op.estimated_time;
        v_minutes := floor(v_total*v_prefix/v_weight)::integer-v_prior;
        v_prior := v_prior+v_minutes;
      ELSE
        v_minutes := v_total/v_count + CASE WHEN v_index <= v_total%v_count THEN 1 ELSE 0 END;
      END IF;
      SELECT count(*) INTO v_entries FROM public.time_entries WHERE operation_id=v_op.id AND id=ANY(v_timer_ids);
      v_entry_index := 0;
      FOR v_entry IN SELECT * FROM public.time_entries WHERE operation_id=v_op.id AND id=ANY(v_timer_ids) ORDER BY id FOR UPDATE LOOP
        v_entry_index := v_entry_index+1;
        UPDATE public.time_entries SET duration=v_minutes/v_entries + CASE WHEN v_entry_index<=v_minutes%v_entries THEN 1 ELSE 0 END
          WHERE id=v_entry.id;
      END LOOP;
      UPDATE public.operations SET status='completed',completion_percentage=100,completed_at=v_now,
        actual_time=CASE WHEN v_entries>0 THEN
          (SELECT COALESCE(sum(duration),0) FROM public.time_entries WHERE operation_id=v_op.id AND end_time IS NOT NULL)
          ELSE COALESCE(actual_time,0)+v_minutes END
        WHERE id=v_op.id;
      v_distribution := v_distribution||jsonb_build_array(jsonb_build_object('id',v_op.id,'minutes',v_minutes));
    END LOOP;
    UPDATE public.operation_batches SET status='completed',completed_at=v_now,completed_by=public.production_profile_id(p_operator_id),completed_by_shop_floor_operator_id=public.production_shop_floor_id(p_operator_id),actual_time=v_total WHERE id=v_batch.id;
  END IF;
  FOR v_job_id IN SELECT DISTINCT p.job_id FROM public.parts p JOIN public.operations o ON o.part_id=p.id
    WHERE o.id=ANY(v_ids) ORDER BY p.job_id LOOP
    PERFORM public.refresh_production_job(p_tenant_id,v_job_id);
  END LOOP;
  SELECT * INTO v_batch FROM public.operation_batches WHERE id=p_batch_id;
  RETURN jsonb_build_object('batch_id',v_batch.id,'status',v_batch.status,'changed',true,
    'started_at',v_batch.started_at,'completed_at',v_batch.completed_at,'total_minutes',v_total,
    'distribution_method',v_method,'operations',v_distribution,'operations_started',v_count,
    'operations_completed',CASE WHEN p_action='stop' THEN v_count ELSE 0 END,
    'monitoring_source',CASE WHEN p_operator_id IS NULL THEN 'machine' ELSE 'operator' END);
END;
$$;
REVOKE ALL ON FUNCTION public.transition_batch(uuid, uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_batch(uuid, uuid, text, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_batch_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_batch_id uuid; v_operation_id uuid; v_tenant_id uuid; v_status public.batch_status;
BEGIN
  v_batch_id := CASE WHEN TG_OP='DELETE' THEN OLD.batch_id ELSE NEW.batch_id END;
  v_operation_id := CASE WHEN TG_OP='DELETE' THEN OLD.operation_id ELSE NEW.operation_id END;
  v_tenant_id := CASE WHEN TG_OP='DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END;
  IF TG_OP='UPDATE' AND NEW.batch_id IS DISTINCT FROM OLD.batch_id THEN
    RAISE EXCEPTION 'Remove a batch operation before assigning it elsewhere' USING ERRCODE='22023';
  END IF;
  SELECT status INTO v_status FROM public.operation_batches WHERE id=v_batch_id FOR UPDATE;
  IF NOT FOUND AND TG_OP='DELETE' THEN RETURN OLD; END IF; -- Parent deletion cascade.
  IF v_status NOT IN ('draft','ready') THEN
    RAISE EXCEPTION 'Batch membership can only change before production starts' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.operations WHERE id=v_operation_id AND tenant_id=v_tenant_id FOR UPDATE;
  IF TG_OP<>'DELETE' AND EXISTS (
    SELECT 1 FROM public.batch_operations bo JOIN public.operation_batches b ON b.id=bo.batch_id
    WHERE bo.operation_id=v_operation_id AND bo.batch_id<>v_batch_id AND b.status NOT IN ('completed','cancelled')
  ) THEN
    RAISE EXCEPTION 'Operation already belongs to another active batch' USING ERRCODE='22023';
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE OR REPLACE TRIGGER protect_batch_membership BEFORE INSERT OR UPDATE OR DELETE ON public.batch_operations
  FOR EACH ROW EXECUTE FUNCTION public.protect_batch_membership();

CREATE OR REPLACE FUNCTION public.add_batch_operations(p_tenant_id uuid,p_batch_id uuid,p_operation_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_status public.batch_status; v_ids uuid[]; v_added integer; v_sequence integer;
BEGIN
  PERFORM public.assert_production_actor(p_tenant_id);
  SELECT status INTO v_status FROM public.operation_batches WHERE id=p_batch_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Batch not found' USING ERRCODE='P0002'; END IF;
  IF v_status NOT IN ('draft','ready') THEN RAISE EXCEPTION 'Batch has already started' USING ERRCODE='22023'; END IF;
  SELECT array_agg(DISTINCT id ORDER BY id) INTO v_ids FROM unnest(p_operation_ids) id WHERE id IS NOT NULL;
  IF COALESCE(cardinality(v_ids),0)=0 OR cardinality(v_ids)>1000 THEN
    RAISE EXCEPTION 'Supply between 1 and 1000 operation IDs' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.operations WHERE id=ANY(v_ids) AND tenant_id=p_tenant_id ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.operations WHERE id=ANY(v_ids) AND tenant_id=p_tenant_id AND deleted_at IS NULL)<>cardinality(v_ids) THEN
    RAISE EXCEPTION 'Operation unavailable in this tenant' USING ERRCODE='42501';
  END IF;
  SELECT COALESCE(max(sequence_in_batch),0) INTO v_sequence FROM public.batch_operations WHERE batch_id=p_batch_id;
  INSERT INTO public.batch_operations(tenant_id,batch_id,operation_id,sequence_in_batch)
    SELECT p_tenant_id,p_batch_id,requested.operation_id,v_sequence+row_number() OVER(ORDER BY requested.operation_id)
    FROM unnest(v_ids) AS requested(operation_id) WHERE NOT EXISTS(
      SELECT 1 FROM public.batch_operations bo WHERE bo.batch_id=p_batch_id AND bo.operation_id=requested.operation_id
    );
  GET DIAGNOSTICS v_added=ROW_COUNT;
  RETURN jsonb_build_object('batch_id',p_batch_id,'operations_added',v_added);
END;
$$;
REVOKE ALL ON FUNCTION public.add_batch_operations(uuid,uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_batch_operations(uuid,uuid,uuid[]) TO authenticated,service_role;
