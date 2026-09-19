-- Keep demo resets complete and operation expectations aligned with replanning.
-- Rollback: restore the preceding function bodies from migration history.

CREATE OR REPLACE FUNCTION public.auto_create_operation_expectation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing public.expectations%ROWTYPE;
  v_new_id uuid;
  v_expected_value jsonb;
  v_context jsonb;
BEGIN
  IF NEW.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_expected_value := jsonb_build_object(
    'status', 'completed',
    'operation_name', NEW.operation_name
  );
  v_context := jsonb_build_object(
    'operation_id', NEW.id,
    'operation_name', NEW.operation_name
  );

  SELECT * INTO v_existing
  FROM public.expectations
  WHERE tenant_id = NEW.tenant_id
    AND entity_type = 'operation'
    AND entity_id = NEW.id
    AND expectation_type = 'completion_time'
    AND superseded_by IS NULL
  ORDER BY version DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NEW.planned_end IS NULL THEN
    IF TG_OP = 'INSERT' OR NOT FOUND OR v_existing.expected_at IS NULL THEN
      RETURN NEW;
    END IF;

    v_expected_value := v_expected_value || jsonb_build_object('planned', false);
    INSERT INTO public.expectations (
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
      NEW.tenant_id,
      'operation',
      NEW.id,
      'completion_time',
      format('Operation %s has no planned completion date', NEW.operation_name),
      v_expected_value,
      NULL,
      v_existing.version + 1,
      'operation_update',
      auth.uid(),
      v_context || jsonb_build_object('previous_expectation_id', v_existing.id)
    )
    RETURNING id INTO v_new_id;

    UPDATE public.expectations
    SET superseded_by = v_new_id,
        superseded_at = now()
    WHERE id = v_existing.id;
  ELSIF NOT FOUND THEN
    INSERT INTO public.expectations (
      tenant_id,
      entity_type,
      entity_id,
      expectation_type,
      belief_statement,
      expected_value,
      expected_at,
      source,
      context
    ) VALUES (
      NEW.tenant_id,
      'operation',
      NEW.id,
      'completion_time',
      format(
        'Operation %s should complete by %s',
        NEW.operation_name,
        to_char(NEW.planned_end, 'YYYY-MM-DD HH24:MI')
      ),
      v_expected_value,
      NEW.planned_end,
      CASE WHEN TG_OP = 'INSERT' THEN 'operation_creation' ELSE 'operation_update' END,
      v_context
    );
  ELSIF v_existing.expected_at IS DISTINCT FROM NEW.planned_end
     OR v_existing.expected_value IS DISTINCT FROM v_expected_value THEN
    INSERT INTO public.expectations (
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
      NEW.tenant_id,
      'operation',
      NEW.id,
      'completion_time',
      format(
        'Operation %s should complete by %s',
        NEW.operation_name,
        to_char(NEW.planned_end, 'YYYY-MM-DD HH24:MI')
      ),
      v_expected_value,
      NEW.planned_end,
      v_existing.version + 1,
      'operation_update',
      auth.uid(),
      v_context || jsonb_build_object('previous_expectation_id', v_existing.id)
    )
    RETURNING id INTO v_new_id;

    UPDATE public.expectations
    SET superseded_by = v_new_id,
        superseded_at = now()
    WHERE id = v_existing.id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  v_trigger record;
BEGIN
  FOR v_trigger IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'public.operations'::regclass
      AND tgfoid = 'public.auto_create_operation_expectation()'::regprocedure
      AND NOT tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.operations', v_trigger.tgname);
  END LOOP;
END;
$$;

CREATE TRIGGER operations_auto_create_expectation
AFTER INSERT OR UPDATE OF planned_start, planned_end, status
ON public.operations
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_operation_expectation();

CREATE OR REPLACE FUNCTION public.clear_demo_data(p_tenant_id uuid)
RETURNS TABLE(deleted_count integer, table_name text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);

  DELETE FROM public.notifications WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'notifications'::text, 'deleted'::text;

  DELETE FROM public.exceptions WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'exceptions'::text, 'deleted'::text;

  DELETE FROM public.expectations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'expectations'::text, 'deleted'::text;

  DELETE FROM public.issues WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'issues'::text, 'deleted'::text;

  DELETE FROM public.assignments WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'assignments'::text, 'deleted'::text;

  DELETE FROM public.batch_requirements WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'batch_requirements'::text, 'deleted'::text;

  DELETE FROM public.batch_operations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'batch_operations'::text, 'deleted'::text;

  DELETE FROM public.operation_batches WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operation_batches'::text, 'deleted'::text;

  DELETE FROM public.operation_quantity_scrap_reasons
  WHERE operation_quantity_id IN (
    SELECT id FROM public.operation_quantities WHERE tenant_id = p_tenant_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operation_quantity_scrap_reasons'::text, 'deleted'::text;

  DELETE FROM public.operation_quantities WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operation_quantities'::text, 'deleted'::text;

  DELETE FROM public.time_entry_pauses
  WHERE time_entry_id IN (
    SELECT id FROM public.time_entries WHERE tenant_id = p_tenant_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'time_entry_pauses'::text, 'deleted'::text;

  DELETE FROM public.time_entries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'time_entries'::text, 'deleted'::text;

  DELETE FROM public.substeps WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'substeps'::text, 'deleted'::text;

  DELETE FROM public.operation_day_allocations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operation_day_allocations'::text, 'deleted'::text;

  DELETE FROM public.part_placements WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'part_placements'::text, 'deleted'::text;

  DELETE FROM public.operation_resources
  WHERE operation_id IN (
    SELECT id FROM public.operations WHERE tenant_id = p_tenant_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operation_resources'::text, 'deleted'::text;

  DELETE FROM public.operations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operations'::text, 'deleted'::text;

  DELETE FROM public.parts WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'parts'::text, 'deleted'::text;

  DELETE FROM public.jobs WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'jobs'::text, 'deleted'::text;

  DELETE FROM public.resource_cell_memberships WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'resource_cell_memberships'::text, 'deleted'::text;

  DELETE FROM public.storage_locations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'storage_locations'::text, 'deleted'::text;

  DELETE FROM public.cells WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'cells'::text, 'deleted'::text;

  DELETE FROM public.resources WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'resources'::text, 'deleted'::text;

  DELETE FROM public.scrap_reasons WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'scrap_reasons'::text, 'deleted'::text;

  DELETE FROM public.materials WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'materials'::text, 'deleted'::text;

  DELETE FROM public.substep_template_items
  WHERE template_id IN (
    SELECT id FROM public.substep_templates WHERE tenant_id = p_tenant_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'substep_template_items'::text, 'deleted'::text;

  DELETE FROM public.substep_templates WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'substep_templates'::text, 'deleted'::text;

  DELETE FROM public.operator_sessions WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operator_sessions'::text, 'deleted'::text;

  DELETE FROM public.attendance_entries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'attendance_entries'::text, 'deleted'::text;

  DELETE FROM public.operators
  WHERE tenant_id = p_tenant_id AND employee_id LIKE 'DEMO%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'operators'::text, 'deleted'::text;

  DELETE FROM public.factory_calendar WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'factory_calendar'::text, 'deleted'::text;

  DELETE FROM public.activity_log WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count, 'activity_log'::text, 'deleted'::text;

  UPDATE public.tenants
  SET current_jobs = 0,
      current_parts_this_month = 0,
      demo_mode_enabled = false,
      demo_data_seeded_at = NULL,
      demo_data_seeded_by = NULL
  WHERE id = p_tenant_id;

  RETURN QUERY SELECT 1, 'reset'::text, 'complete'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_demo_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_demo_data(uuid) TO authenticated, service_role;
