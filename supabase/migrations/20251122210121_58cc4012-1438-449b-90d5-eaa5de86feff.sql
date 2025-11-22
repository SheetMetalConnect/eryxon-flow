-- Fix get_cell_qrm_metrics to count unique jobs instead of operations
-- QRM WIP should reflect how many jobs are in parallel at a cell, not operation count

CREATE OR REPLACE FUNCTION public.get_cell_qrm_metrics(
  cell_id_param UUID,
  tenant_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_current_wip INTEGER;
  v_wip_limit INTEGER;
  v_wip_warning_threshold INTEGER;
  v_enforce_limit BOOLEAN;
  v_show_warning BOOLEAN;
  v_cell_name TEXT;
  v_utilization_percent NUMERIC;
  v_status TEXT;
BEGIN
  -- Get cell configuration
  SELECT 
    name,
    wip_limit,
    wip_warning_threshold,
    enforce_wip_limit,
    show_capacity_warning
  INTO
    v_cell_name,
    v_wip_limit,
    v_wip_warning_threshold,
    v_enforce_limit,
    v_show_warning
  FROM public.cells
  WHERE id = cell_id_param 
    AND tenant_id = tenant_id_param
    AND active = true;

  -- If cell not found, return null
  IF v_cell_name IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count unique JOBS in this cell (not operations)
  -- A job is counted if it has any operation in this cell that is not completed
  SELECT COUNT(DISTINCT p.job_id)
  INTO v_current_wip
  FROM public.operations o
  INNER JOIN public.parts p ON o.part_id = p.id
  WHERE o.cell_id = cell_id_param
    AND o.tenant_id = tenant_id_param
    AND o.status IN ('not_started', 'in_progress');

  -- Calculate utilization percentage
  IF v_wip_limit IS NOT NULL AND v_wip_limit > 0 THEN
    v_utilization_percent := ROUND((v_current_wip::NUMERIC / v_wip_limit::NUMERIC) * 100, 1);
  ELSE
    v_utilization_percent := NULL;
  END IF;

  -- Determine status
  IF v_wip_limit IS NULL THEN
    v_status := 'no_limit';
  ELSIF v_current_wip >= v_wip_limit THEN
    v_status := 'at_capacity';
  ELSIF v_wip_warning_threshold IS NOT NULL AND v_current_wip >= v_wip_warning_threshold THEN
    v_status := 'warning';
  ELSIF v_wip_limit IS NOT NULL AND v_current_wip >= (v_wip_limit * 0.8) THEN
    v_status := 'warning';
  ELSE
    v_status := 'normal';
  END IF;

  -- Build result JSON
  v_result := json_build_object(
    'cell_id', cell_id_param,
    'cell_name', v_cell_name,
    'current_wip', COALESCE(v_current_wip, 0),
    'wip_limit', v_wip_limit,
    'wip_warning_threshold', v_wip_warning_threshold,
    'enforce_limit', COALESCE(v_enforce_limit, false),
    'show_warning', COALESCE(v_show_warning, true),
    'utilization_percent', v_utilization_percent,
    'status', v_status
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_cell_qrm_metrics(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.get_cell_qrm_metrics IS 'Returns QRM metrics for a cell counting unique jobs (not operations) to reflect true work-in-progress parallelization';