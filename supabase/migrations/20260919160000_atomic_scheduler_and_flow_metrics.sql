-- Commit a generated schedule as one tenant-scoped transaction, expose all
-- cell flow metrics in one call, and repair stale planning expectations.

CREATE OR REPLACE FUNCTION public.apply_schedule_plan(
  p_tenant_id uuid,
  p_operations jsonb,
  p_allocations jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation_count integer;
  v_allocation_count integer;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);

  IF jsonb_typeof(p_operations) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_allocations) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Schedule operations and allocations must be arrays'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_operations) AS item(
      id uuid,
      planned_start timestamptz,
      planned_end timestamptz,
      expected_updated_at timestamptz
    )
    WHERE item.id IS NULL
       OR item.planned_start IS NULL
       OR item.planned_end IS NULL
       OR item.expected_updated_at IS NULL
       OR item.planned_end < item.planned_start
  ) THEN
    RAISE EXCEPTION 'Invalid scheduled operation payload' USING ERRCODE = '22023';
  END IF;

  SELECT count(*) INTO v_operation_count
  FROM jsonb_to_recordset(p_operations) AS item(
    id uuid,
    planned_start timestamptz,
    planned_end timestamptz,
    expected_updated_at timestamptz
  );

  IF v_operation_count <> (
    SELECT count(DISTINCT item.id)
    FROM jsonb_to_recordset(p_operations) AS item(
      id uuid,
      planned_start timestamptz,
      planned_end timestamptz,
      expected_updated_at timestamptz
    )
  ) THEN
    RAISE EXCEPTION 'Schedule contains duplicate operations' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant_id::text, 0));

  -- Serialize against updates to allocations already present for this tenant.
  PERFORM 1
  FROM public.operation_day_allocations allocation
  WHERE allocation.tenant_id = p_tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.operations operation
  JOIN jsonb_to_recordset(p_operations) AS item(id uuid) ON item.id = operation.id
  WHERE operation.tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_operation_count <> (
    SELECT count(*)
    FROM public.operations operation
    JOIN jsonb_to_recordset(p_operations) AS item(
      id uuid,
      planned_start timestamptz,
      planned_end timestamptz,
      expected_updated_at timestamptz
    ) ON item.id = operation.id
    WHERE operation.tenant_id = p_tenant_id
      AND operation.deleted_at IS NULL
      AND operation.status = 'not_started'
      AND operation.updated_at IS NOT DISTINCT FROM item.expected_updated_at
  ) THEN
    RAISE EXCEPTION 'Schedule input changed; refresh and try again'
      USING ERRCODE = '40001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_allocations) AS allocation(
      operation_id uuid,
      cell_id uuid,
      date date,
      hours_allocated numeric,
      start_time time,
      end_time time
    )
    LEFT JOIN public.operations operation
      ON operation.id = allocation.operation_id
     AND operation.tenant_id = p_tenant_id
    LEFT JOIN public.cells cell
      ON cell.id = allocation.cell_id
     AND cell.tenant_id = p_tenant_id
     AND cell.deleted_at IS NULL
    WHERE allocation.operation_id IS NULL
       OR allocation.cell_id IS NULL
       OR allocation.date IS NULL
       OR allocation.hours_allocated <= 0
       OR allocation.start_time IS NULL
       OR allocation.end_time IS NULL
       OR allocation.end_time <= allocation.start_time
       OR operation.id IS NULL
       OR operation.cell_id IS DISTINCT FROM allocation.cell_id
       OR cell.id IS NULL
       OR NOT EXISTS (
         SELECT 1
         FROM jsonb_to_recordset(p_operations) AS scheduled(id uuid)
         WHERE scheduled.id = allocation.operation_id
       )
  ) THEN
    RAISE EXCEPTION 'Invalid schedule allocation payload' USING ERRCODE = '22023';
  END IF;

  -- Re-check capacity inside the transaction. The browser calculation is only
  -- a preview and can be stale by the time the plan reaches the database.
  IF EXISTS (
    WITH scheduled AS (
      SELECT item.id
      FROM jsonb_to_recordset(p_operations) AS item(id uuid)
    ),
    proposed AS (
      SELECT
        allocation.cell_id,
        allocation.date,
        allocation.hours_allocated
      FROM jsonb_to_recordset(p_allocations) AS allocation(
        operation_id uuid,
        cell_id uuid,
        date date,
        hours_allocated numeric,
        start_time time,
        end_time time
      )
    ),
    proposed_days AS (
      SELECT DISTINCT cell_id, date FROM proposed
    ),
    combined AS (
      SELECT proposed.cell_id, proposed.date, proposed.hours_allocated FROM proposed
      UNION ALL
      SELECT existing.cell_id, existing.date, existing.hours_allocated
      FROM public.operation_day_allocations existing
      JOIN proposed_days day
        ON day.cell_id = existing.cell_id
       AND day.date = existing.date
      WHERE existing.tenant_id = p_tenant_id
        AND NOT EXISTS (
          SELECT 1 FROM scheduled WHERE scheduled.id = existing.operation_id
        )
    ),
    totals AS (
      SELECT cell_id, date, sum(hours_allocated) AS used_hours
      FROM combined
      GROUP BY cell_id, date
    )
    SELECT 1
    FROM totals
    JOIN public.cells cell
      ON cell.id = totals.cell_id
     AND cell.tenant_id = p_tenant_id
    JOIN public.tenants tenant ON tenant.id = p_tenant_id
    LEFT JOIN public.factory_calendar calendar
      ON calendar.tenant_id = p_tenant_id
     AND calendar.date = totals.date
    WHERE totals.used_hours > COALESCE(cell.capacity_hours_per_day, 8)::numeric *
      CASE
        WHEN calendar.id IS NOT NULL THEN
          CASE
            WHEN calendar.day_type IN ('working', 'half_day')
              THEN COALESCE(calendar.capacity_multiplier, 1)::numeric
            ELSE 0::numeric
          END
        WHEN (
          COALESCE(tenant.working_days_mask, 31) &
          CASE extract(dow FROM totals.date)::integer
            WHEN 0 THEN 64
            WHEN 1 THEN 1
            WHEN 2 THEN 2
            WHEN 3 THEN 4
            WHEN 4 THEN 8
            WHEN 5 THEN 16
            WHEN 6 THEN 32
          END
        ) <> 0 THEN 1::numeric
        ELSE 0::numeric
      END + 0.001
  ) THEN
    RAISE EXCEPTION 'Schedule exceeds available cell capacity'
      USING ERRCODE = '40001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_operations) AS scheduled(id uuid)
    JOIN public.operations operation ON operation.id = scheduled.id
    LEFT JOIN (
      SELECT allocation.operation_id, sum(allocation.hours_allocated) AS hours
      FROM jsonb_to_recordset(p_allocations) AS allocation(
        operation_id uuid,
        cell_id uuid,
        date date,
        hours_allocated numeric,
        start_time time,
        end_time time
      )
      GROUP BY allocation.operation_id
    ) allocated ON allocated.operation_id = scheduled.id
    WHERE abs(
      COALESCE(allocated.hours, 0)
      - CASE WHEN operation.estimated_time > 0 THEN operation.estimated_time::numeric / 60 ELSE 1 END
    ) > 0.001
  ) THEN
    RAISE EXCEPTION 'Allocated hours do not match operation duration'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.operations operation
  SET planned_start = item.planned_start,
      planned_end = item.planned_end,
      updated_at = now()
  FROM jsonb_to_recordset(p_operations) AS item(
    id uuid,
    planned_start timestamptz,
    planned_end timestamptz,
    expected_updated_at timestamptz
  )
  WHERE operation.id = item.id
    AND operation.tenant_id = p_tenant_id;

  DELETE FROM public.operation_day_allocations allocation
  USING jsonb_to_recordset(p_operations) AS item(id uuid)
  WHERE allocation.operation_id = item.id
    AND allocation.tenant_id = p_tenant_id;

  INSERT INTO public.operation_day_allocations(
    operation_id,
    tenant_id,
    cell_id,
    date,
    hours_allocated,
    start_time,
    end_time
  )
  SELECT
    allocation.operation_id,
    p_tenant_id,
    allocation.cell_id,
    allocation.date,
    allocation.hours_allocated,
    allocation.start_time,
    allocation.end_time
  FROM jsonb_to_recordset(p_allocations) AS allocation(
    operation_id uuid,
    cell_id uuid,
    date date,
    hours_allocated numeric,
    start_time time,
    end_time time
  );
  GET DIAGNOSTICS v_allocation_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated_operations', v_operation_count,
    'saved_allocations', v_allocation_count,
    'applied_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_schedule_plan(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_schedule_plan(uuid, jsonb, jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_all_cell_qrm_metrics(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.assert_production_actor(p_tenant_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'cell_id', cell.id,
    'cell_name', cell.name,
    'current_wip', COALESCE(wip.current_wip, 0),
    'wip_limit', cell.wip_limit,
    'wip_warning_threshold', cell.wip_warning_threshold,
    'enforce_limit', COALESCE(cell.enforce_wip_limit, false),
    'show_warning', COALESCE(cell.show_capacity_warning, true),
    'jobs_in_cell', COALESCE(wip.jobs_in_cell, '[]'::jsonb),
    'utilization_percent', CASE
      WHEN cell.wip_limit > 0
        THEN round(COALESCE(wip.current_wip, 0)::numeric / cell.wip_limit * 100, 1)
      ELSE NULL
    END,
    'status', CASE
      WHEN cell.wip_limit IS NULL THEN 'no_limit'
      WHEN COALESCE(wip.current_wip, 0) >= cell.wip_limit THEN 'at_capacity'
      WHEN cell.wip_warning_threshold IS NOT NULL
        AND COALESCE(wip.current_wip, 0) >= cell.wip_warning_threshold THEN 'warning'
      WHEN COALESCE(wip.current_wip, 0) >= cell.wip_limit * 0.8 THEN 'warning'
      ELSE 'normal'
    END
  ) ORDER BY cell.sequence, cell.id), '[]'::jsonb)
  INTO v_result
  FROM public.cells cell
  LEFT JOIN LATERAL (
    SELECT
      count(*)::integer AS current_wip,
      jsonb_agg(jsonb_build_object('job_id', jobs.id, 'job_number', jobs.job_number) ORDER BY jobs.job_number) AS jobs_in_cell
    FROM (
      SELECT DISTINCT job.id, job.job_number
      FROM public.operations operation
      JOIN public.parts part ON part.id = operation.part_id
      JOIN public.jobs job ON job.id = part.job_id
      WHERE operation.cell_id = cell.id
        AND operation.tenant_id = p_tenant_id
        AND operation.deleted_at IS NULL
        AND operation.status IN ('not_started', 'in_progress', 'on_hold')
    ) jobs
  ) wip ON true
  WHERE cell.tenant_id = p_tenant_id
    AND cell.active
    AND cell.deleted_at IS NULL;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_cell_qrm_metrics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_all_cell_qrm_metrics(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_cell_qrm_metrics(cell_id_param uuid, tenant_id_param uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metric jsonb;
BEGIN
  SELECT metric INTO v_metric
  FROM jsonb_array_elements(public.get_all_cell_qrm_metrics(tenant_id_param)) metric
  WHERE metric->>'cell_id' = cell_id_param::text;
  RETURN v_metric::json;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cell_qrm_metrics(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cell_qrm_metrics(uuid, uuid) TO authenticated, service_role;

DROP FUNCTION public.get_tenant_info();
CREATE FUNCTION public.get_tenant_info()
RETURNS TABLE(
  id uuid,
  name text,
  company_name text,
  plan public.subscription_plan,
  status public.subscription_status,
  trial_ends_at timestamptz,
  working_days_mask integer,
  factory_opening_time time,
  factory_closing_time time,
  timezone text,
  whitelabel_enabled boolean,
  whitelabel_logo_url text,
  whitelabel_app_name text,
  whitelabel_primary_color text,
  whitelabel_favicon_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tenant.id,
    tenant.name,
    tenant.company_name,
    tenant.plan,
    tenant.status,
    tenant.trial_ends_at,
    tenant.working_days_mask,
    tenant.factory_opening_time,
    tenant.factory_closing_time,
    tenant.timezone,
    COALESCE(tenant.whitelabel_enabled, false),
    tenant.whitelabel_logo_url,
    tenant.whitelabel_app_name,
    tenant.whitelabel_primary_color,
    tenant.whitelabel_favicon_url
  FROM public.tenants tenant
  WHERE tenant.id = public.get_user_tenant_id();
$$;

REVOKE ALL ON FUNCTION public.get_tenant_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_info() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.report_client_error(
  p_component text,
  p_event_type text,
  p_error_code text DEFAULT NULL,
  p_route text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_profile public.profiles%ROWTYPE;
BEGIN
  v_tenant_id := public.get_user_tenant_id();
  IF auth.uid() IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated tenant required' USING ERRCODE = '42501';
  END IF;
  IF length(COALESCE(p_component, '')) NOT BETWEEN 1 AND 80
     OR length(COALESCE(p_event_type, '')) NOT BETWEEN 1 AND 80
     OR length(COALESCE(p_error_code, '')) > 80
     OR length(COALESCE(p_route, '')) > 200 THEN
    RAISE EXCEPTION 'Invalid client error metadata' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = auth.uid() AND tenant_id = v_tenant_id;

  INSERT INTO public.activity_log(
    tenant_id, user_id, user_email, user_name, action, entity_type,
    entity_name, description, metadata
  ) VALUES (
    v_tenant_id, auth.uid(), v_profile.email, v_profile.full_name,
    'client.error', 'application', p_component, 'Client error reported',
    jsonb_build_object(
      'event_type', p_event_type,
      'error_code', NULLIF(p_error_code, ''),
      'route', NULLIF(p_route, ''),
      'severity', 'error'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.report_client_error(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_client_error(text, text, text, text) TO authenticated, service_role;

-- Name-only changes must version the human-readable expectation as well,
-- including operations that currently have no planned end.
CREATE OR REPLACE FUNCTION public.auto_create_operation_expectation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_expected_value := v_expected_value || jsonb_build_object('planned', false);
    IF TG_OP = 'INSERT'
       OR NOT FOUND
       OR (
         v_existing.expected_at IS NULL
         AND v_existing.expected_value IS NOT DISTINCT FROM v_expected_value
       ) THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.expectations(
      tenant_id, entity_type, entity_id, expectation_type,
      belief_statement, expected_value, expected_at, version,
      source, created_by, context
    ) VALUES (
      NEW.tenant_id, 'operation', NEW.id, 'completion_time',
      format('Operation %s has no planned completion date', NEW.operation_name),
      v_expected_value, NULL, v_existing.version + 1,
      'operation_update', auth.uid(),
      v_context || jsonb_build_object('previous_expectation_id', v_existing.id)
    ) RETURNING id INTO v_new_id;

    UPDATE public.expectations
    SET superseded_by = v_new_id,
        superseded_at = now()
    WHERE id = v_existing.id;
  ELSIF NOT FOUND THEN
    INSERT INTO public.expectations(
      tenant_id, entity_type, entity_id, expectation_type,
      belief_statement, expected_value, expected_at, source, context
    ) VALUES (
      NEW.tenant_id, 'operation', NEW.id, 'completion_time',
      format(
        'Operation %s should complete by %s',
        NEW.operation_name,
        to_char(NEW.planned_end, 'YYYY-MM-DD HH24:MI')
      ),
      v_expected_value, NEW.planned_end,
      CASE WHEN TG_OP = 'INSERT' THEN 'operation_creation' ELSE 'operation_update' END,
      v_context
    );
  ELSIF v_existing.expected_at IS DISTINCT FROM NEW.planned_end
     OR v_existing.expected_value IS DISTINCT FROM v_expected_value THEN
    INSERT INTO public.expectations(
      tenant_id, entity_type, entity_id, expectation_type,
      belief_statement, expected_value, expected_at, version,
      source, created_by, context
    ) VALUES (
      NEW.tenant_id, 'operation', NEW.id, 'completion_time',
      format(
        'Operation %s should complete by %s',
        NEW.operation_name,
        to_char(NEW.planned_end, 'YYYY-MM-DD HH24:MI')
      ),
      v_expected_value, NEW.planned_end, v_existing.version + 1,
      'operation_update', auth.uid(),
      v_context || jsonb_build_object('previous_expectation_id', v_existing.id)
    ) RETURNING id INTO v_new_id;

    UPDATE public.expectations
    SET superseded_by = v_new_id,
        superseded_at = now()
    WHERE id = v_existing.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS operations_auto_create_expectation ON public.operations;
CREATE TRIGGER operations_auto_create_expectation
AFTER INSERT OR UPDATE OF planned_start, planned_end, status, operation_name
ON public.operations
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_operation_expectation();

-- Repair active expectations created before operation replanning was versioned.
DO $$
DECLARE
  v record;
  v_new_id uuid;
  v_value jsonb;
  v_context jsonb;
BEGIN
  FOR v IN
    SELECT
      expectation.id AS expectation_id,
      expectation.version,
      operation.id AS operation_id,
      operation.tenant_id,
      operation.operation_name,
      operation.planned_end
    FROM public.expectations expectation
    JOIN public.operations operation
      ON operation.id = expectation.entity_id
     AND operation.tenant_id = expectation.tenant_id
    WHERE expectation.entity_type = 'operation'
      AND expectation.expectation_type = 'completion_time'
      AND expectation.superseded_by IS NULL
      AND operation.status <> 'completed'
      AND (
        expectation.expected_at IS DISTINCT FROM operation.planned_end
        OR expectation.expected_value IS DISTINCT FROM jsonb_build_object(
          'status', 'completed',
          'operation_name', operation.operation_name
        )
      )
    ORDER BY expectation.id
    FOR UPDATE OF expectation
  LOOP
    v_value := jsonb_build_object(
      'status', 'completed',
      'operation_name', v.operation_name
    );
    v_context := jsonb_build_object(
      'operation_id', v.operation_id,
      'operation_name', v.operation_name,
      'previous_expectation_id', v.expectation_id,
      'repair', 'planned_end_alignment'
    );
    IF v.planned_end IS NULL THEN
      v_value := v_value || jsonb_build_object('planned', false);
    END IF;

    INSERT INTO public.expectations(
      tenant_id, entity_type, entity_id, expectation_type,
      belief_statement, expected_value, expected_at, version,
      source, context
    ) VALUES (
      v.tenant_id, 'operation', v.operation_id, 'completion_time',
      CASE
        WHEN v.planned_end IS NULL
          THEN format('Operation %s has no planned completion date', v.operation_name)
        ELSE format(
          'Operation %s should complete by %s',
          v.operation_name,
          to_char(v.planned_end, 'YYYY-MM-DD HH24:MI')
        )
      END,
      v_value, v.planned_end, v.version + 1,
      'backfill', v_context
    ) RETURNING id INTO v_new_id;

    UPDATE public.expectations
    SET superseded_by = v_new_id,
        superseded_at = now()
    WHERE id = v.expectation_id;
  END LOOP;
END;
$$;

-- Some older hosted projects still contain the legacy batches table. Wrap the
-- existing cleanup RPC so those rows are removed without making fresh installs
-- depend on a table that is no longer part of the current schema.
ALTER FUNCTION public.clear_demo_data(uuid) RENAME TO clear_demo_data_without_legacy_batches;

CREATE FUNCTION public.clear_demo_data(p_tenant_id uuid)
RETURNS TABLE(deleted_count integer, table_name text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);

  IF to_regclass('public.batches') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.batches WHERE tenant_id = $1' USING p_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count, 'batches'::text, 'deleted'::text;
  END IF;

  RETURN QUERY
  SELECT * FROM public.clear_demo_data_without_legacy_batches(p_tenant_id);
END;
$$;

REVOKE ALL ON FUNCTION public.clear_demo_data_without_legacy_batches(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_demo_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_demo_data(uuid) TO authenticated, service_role;

-- Tenant deletion reuses the tested child-first cleanup order before removing
-- account and integration rows. This avoids profile FK failures from active
-- expectations, invitations, or shop-floor operators.
CREATE OR REPLACE FUNCTION public.delete_tenant_data(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_counts jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);
  PERFORM * FROM public.clear_demo_data(p_tenant_id);

  DELETE FROM public.webhook_deliveries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhook_deliveries}', to_jsonb(v_count));

  DELETE FROM public.webhooks WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhooks}', to_jsonb(v_count));

  DELETE FROM public.api_keys WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{api_keys}', to_jsonb(v_count));

  DELETE FROM public.invitations WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{invitations}', to_jsonb(v_count));

  DELETE FROM public.operators WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operators}', to_jsonb(v_count));

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
    'timestamp', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_tenant_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_tenant_data(uuid) TO authenticated, service_role;
