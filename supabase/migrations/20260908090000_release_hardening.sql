-- Follow-up to the 0.10.0 review: storage paths, tenant settings, actor checks,
-- operation state preconditions, cheaper job refreshes and authenticated
-- database-side webhook dispatch. Rollback: re-apply the 20260907 definitions.

-- Part images are stored under parts/<part_id>/...; accept them for the part's tenant.
CREATE OR REPLACE FUNCTION public.owns_storage_object(p_bucket text, p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    split_part(p_name, '/', 1) = public.get_user_tenant_id()::text
    OR (p_bucket = 'batch-images' AND EXISTS (
      SELECT 1 FROM public.operation_batches b
      WHERE b.id::text = split_part(p_name, '/', 1)
        AND b.tenant_id = public.get_user_tenant_id()
    ))
    OR (p_bucket = 'parts-images' AND split_part(p_name, '/', 1) = 'parts' AND EXISTS (
      SELECT 1 FROM public.parts p
      WHERE p.id::text = split_part(p_name, '/', 2)
        AND p.tenant_id = public.get_user_tenant_id()
    ))
  );
$$;

-- Whitelabeling is an organisation setting, not a subscription field.
CREATE OR REPLACE FUNCTION public.protect_tenant_subscription()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  editable text[] := ARRAY[
    'name','company_name','billing_email','timezone','updated_at',
    'onboarding_completed_at','demo_mode_acknowledged','vat_number','billing_country_code',
    'preferred_payment_method','factory_opening_time','factory_closing_time',
    'auto_stop_tracking','working_days_mask','whitelabel_enabled','whitelabel_logo_url',
    'whitelabel_app_name','whitelabel_primary_color','whitelabel_favicon_url','abbreviation',
    'feature_flags','use_external_feature_flags','location_tracking_enabled'];
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND (to_jsonb(NEW) - editable) IS DISTINCT FROM (to_jsonb(OLD) - editable) THEN
    RAISE EXCEPTION 'Subscription and usage fields require privileged administration' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- The service API may act for a PIN operator's timer, and admins may close timers
-- of deactivated accounts.
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
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id=p_operator_id AND tenant_id=p_tenant_id)
     OR EXISTS (SELECT 1 FROM public.operators WHERE id=p_operator_id AND tenant_id=p_tenant_id) THEN
    IF auth.role()='service_role' OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin')) THEN RETURN; END IF;
  END IF;
  RAISE EXCEPTION 'Active operator verification required for this tenant' USING ERRCODE = '42501';
END;
$$;

-- Only rewrite parts and jobs whose derived state actually changes.
CREATE OR REPLACE FUNCTION public.refresh_production_job(p_tenant_id uuid, p_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.jobs WHERE id = p_job_id AND tenant_id = p_tenant_id FOR UPDATE;
  UPDATE public.parts p SET status = n.status, current_cell_id = n.cell_id
  FROM (
    SELECT p.id,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.operations o WHERE o.part_id = p.id AND o.deleted_at IS NULL)
         AND NOT EXISTS (SELECT 1 FROM public.operations o WHERE o.part_id = p.id AND o.deleted_at IS NULL AND o.status <> 'completed')
          THEN 'completed'::public.job_status
        WHEN EXISTS (SELECT 1 FROM public.operations o WHERE o.part_id = p.id AND o.deleted_at IS NULL AND o.status = 'in_progress')
          THEN 'in_progress'::public.job_status
        ELSE p.status END AS status,
      (SELECT o.cell_id FROM public.operations o JOIN public.cells c ON c.id = o.cell_id
        WHERE o.part_id = p.id AND o.tenant_id = p_tenant_id AND o.deleted_at IS NULL AND o.status = 'in_progress'
        ORDER BY c.sequence, o.sequence, o.id LIMIT 1) AS cell_id
    FROM public.parts p
    WHERE p.job_id = p_job_id AND p.tenant_id = p_tenant_id AND p.deleted_at IS NULL
  ) n
  WHERE n.id = p.id AND (p.status, p.current_cell_id) IS DISTINCT FROM (n.status, n.cell_id);
  UPDATE public.jobs j SET status = n.status, current_cell_id = n.cell_id
  FROM (
    SELECT j.id,
      CASE
        WHEN EXISTS (SELECT 1 FROM public.parts p WHERE p.job_id = j.id AND p.deleted_at IS NULL)
         AND NOT EXISTS (SELECT 1 FROM public.parts p WHERE p.job_id = j.id AND p.deleted_at IS NULL AND p.status <> 'completed')
          THEN 'completed'::public.job_status
        WHEN EXISTS (SELECT 1 FROM public.parts p WHERE p.job_id = j.id AND p.deleted_at IS NULL AND p.status = 'in_progress')
          THEN 'in_progress'::public.job_status
        ELSE j.status END AS status,
      (SELECT p.current_cell_id FROM public.parts p JOIN public.cells c ON c.id = p.current_cell_id
        WHERE p.job_id = j.id AND p.tenant_id = p_tenant_id AND p.deleted_at IS NULL
        ORDER BY c.sequence, p.id LIMIT 1) AS cell_id
    FROM public.jobs j WHERE j.id = p_job_id AND j.tenant_id = p_tenant_id
  ) n
  WHERE n.id = j.id AND (j.status, j.current_cell_id) IS DISTINCT FROM (n.status, n.cell_id);
END;
$$;

-- State preconditions and one operations write per transition.
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

-- Database-side webhook dispatch authenticates with the same internal secret as the
-- Edge Functions. Store it with: SELECT vault.create_secret('<secret>', 'internal_service_secret');
-- and the project URL with: SELECT vault.create_secret('https://<project>.supabase.co', 'project_url');
CREATE OR REPLACE FUNCTION public.dispatch_webhook(p_tenant_id uuid, p_event_type text, p_data jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1;
  IF NULLIF(v_url, '') IS NULL OR NULLIF(v_secret, '') IS NULL THEN
    RAISE WARNING 'dispatch_webhook: vault secrets project_url and internal_service_secret are required; skipped %', p_event_type;
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/webhook-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object('tenant_id', p_tenant_id, 'event_type', p_event_type, 'data', p_data)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to dispatch webhook: %', SQLERRM;
END;
$$;
