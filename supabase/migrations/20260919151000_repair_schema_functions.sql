-- Repair two long-standing RPC failures found by schema linting.
-- Rollback: restore the preceding function bodies from migration history.

-- The hosted function predates the current output column names. PostgreSQL
-- requires a drop before an OUT-parameter contract can be corrected.
DROP FUNCTION IF EXISTS public.get_part_routing(uuid);

CREATE OR REPLACE FUNCTION public.get_part_routing(p_part_id uuid)
RETURNS TABLE(
  operation_id uuid,
  operation_name text,
  cell_id uuid,
  cell_name text,
  sequence integer,
  notes text,
  status text,
  estimated_hours numeric,
  actual_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.operation_name,
    o.cell_id,
    c.name,
    o.sequence,
    o.notes,
    o.status::text,
    o.estimated_time::numeric / 60,
    COALESCE(
      (
        SELECT sum(extract(epoch FROM (te.end_time - te.start_time)) / 3600)
        FROM public.time_entries te
        WHERE te.operation_id = o.id
          AND te.end_time IS NOT NULL
      ),
      0
    )
  FROM public.operations o
  LEFT JOIN public.cells c
    ON c.id = o.cell_id
   AND c.deleted_at IS NULL
  WHERE o.part_id = p_part_id
    AND o.tenant_id = public.get_user_tenant_id()
    AND o.deleted_at IS NULL
  ORDER BY o.sequence, o.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_tenant_data(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted_counts jsonb := '{}'::jsonb;
  v_count integer;
BEGIN
  PERFORM public.assert_tenant_admin(p_tenant_id);

  DELETE FROM public.webhook_deliveries WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhook_deliveries}', to_jsonb(v_count));

  DELETE FROM public.webhooks WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{webhooks}', to_jsonb(v_count));

  DELETE FROM public.api_keys WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{api_keys}', to_jsonb(v_count));

  DELETE FROM public.operation_resources
  WHERE operation_id IN (
    SELECT id FROM public.operations WHERE tenant_id = p_tenant_id
  );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := jsonb_set(v_deleted_counts, '{operation_resources}', to_jsonb(v_count));

  DELETE FROM public.time_entry_pauses
  WHERE time_entry_id IN (
    SELECT id FROM public.time_entries WHERE tenant_id = p_tenant_id
  );
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
    'timestamp', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_part_routing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_part_routing(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.delete_tenant_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_tenant_data(uuid) TO authenticated, service_role;
