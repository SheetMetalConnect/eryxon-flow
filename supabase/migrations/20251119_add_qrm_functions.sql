-- Create QRM (Quick Response Manufacturing) database functions
-- These functions support the QRM Dashboard for WIP tracking

-- Function to get QRM metrics for a specific cell
CREATE OR REPLACE FUNCTION get_cell_qrm_metrics(
  cell_id_param UUID,
  tenant_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  cell_record RECORD;
  wip_count INTEGER;
  utilization NUMERIC;
  qrm_status TEXT;
  jobs_array JSON;
BEGIN
  -- Get cell details
  SELECT
    id,
    name,
    wip_limit,
    wip_warning_threshold,
    COALESCE(enforce_wip_limit, false) as enforce_wip_limit,
    COALESCE(show_capacity_warning, false) as show_capacity_warning
  INTO cell_record
  FROM cells
  WHERE id = cell_id_param
    AND tenant_id = tenant_id_param
    AND active = true;

  -- Return null if cell not found
  IF cell_record IS NULL THEN
    RETURN NULL;
  END IF;

  -- Count current WIP (operations that are in_progress in this cell)
  SELECT COUNT(*)
  INTO wip_count
  FROM operations o
  WHERE o.cell_id = cell_id_param
    AND o.tenant_id = tenant_id_param
    AND o.status = 'in_progress';

  -- Calculate utilization percentage
  IF cell_record.wip_limit IS NOT NULL AND cell_record.wip_limit > 0 THEN
    utilization := ROUND((wip_count::NUMERIC / cell_record.wip_limit::NUMERIC) * 100, 1);
  ELSE
    utilization := NULL;
  END IF;

  -- Determine QRM status
  IF cell_record.wip_limit IS NULL THEN
    qrm_status := 'no_limit';
  ELSIF wip_count >= cell_record.wip_limit THEN
    qrm_status := 'at_capacity';
  ELSIF wip_count >= COALESCE(cell_record.wip_warning_threshold, FLOOR(cell_record.wip_limit * 0.8)) THEN
    qrm_status := 'warning';
  ELSE
    qrm_status := 'normal';
  END IF;

  -- Get jobs currently in this cell (distinct jobs from in-progress operations)
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'job_id', j.id,
        'job_number', j.job_number
      )
    ),
    '[]'::json
  )
  INTO jobs_array
  FROM (
    SELECT DISTINCT j.id, j.job_number
    FROM operations o
    JOIN parts p ON o.part_id = p.id
    JOIN jobs j ON p.job_id = j.id
    WHERE o.cell_id = cell_id_param
      AND o.tenant_id = tenant_id_param
      AND o.status = 'in_progress'
    ORDER BY j.job_number
  ) j;

  -- Build result JSON
  result := json_build_object(
    'cell_id', cell_record.id,
    'cell_name', cell_record.name,
    'current_wip', wip_count,
    'wip_limit', cell_record.wip_limit,
    'wip_warning_threshold', cell_record.wip_warning_threshold,
    'enforce_limit', cell_record.enforce_wip_limit,
    'show_warning', cell_record.show_capacity_warning,
    'utilization_percent', utilization,
    'status', qrm_status,
    'jobs_in_cell', jobs_array
  );

  RETURN result;
END;
$$;

-- Function to get WIP count for a cell (simpler version for quick checks)
CREATE OR REPLACE FUNCTION get_cell_wip_count(
  cell_id_param UUID,
  tenant_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wip_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO wip_count
  FROM operations
  WHERE cell_id = cell_id_param
    AND tenant_id = tenant_id_param
    AND status = 'in_progress';

  RETURN COALESCE(wip_count, 0);
END;
$$;

-- Function to check next cell capacity (for workflow transitions)
CREATE OR REPLACE FUNCTION check_next_cell_capacity(
  current_cell_id UUID,
  tenant_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  current_sequence INTEGER;
  next_cell RECORD;
  next_wip_count INTEGER;
  has_capacity BOOLEAN;
  is_warning BOOLEAN;
  message TEXT;
BEGIN
  -- Get current cell sequence
  SELECT sequence INTO current_sequence
  FROM cells
  WHERE id = current_cell_id AND tenant_id = tenant_id_param;

  -- Find next cell in sequence
  SELECT
    id,
    name,
    wip_limit,
    wip_warning_threshold,
    COALESCE(enforce_wip_limit, false) as enforce_wip_limit
  INTO next_cell
  FROM cells
  WHERE tenant_id = tenant_id_param
    AND active = true
    AND sequence > current_sequence
  ORDER BY sequence
  LIMIT 1;

  -- If no next cell, return success
  IF next_cell IS NULL THEN
    result := json_build_object(
      'has_capacity', true,
      'warning', false,
      'next_cell_id', NULL,
      'message', 'No next cell in sequence'
    );
    RETURN result;
  END IF;

  -- Get WIP count for next cell
  SELECT get_cell_wip_count(next_cell.id, tenant_id_param) INTO next_wip_count;

  -- Determine capacity
  IF next_cell.wip_limit IS NULL THEN
    has_capacity := true;
    is_warning := false;
    message := 'Next cell has no WIP limit';
  ELSIF next_wip_count >= next_cell.wip_limit THEN
    has_capacity := NOT next_cell.enforce_wip_limit;
    is_warning := false;
    message := format('Cell "%s" is at capacity (%s/%s)', next_cell.name, next_wip_count, next_cell.wip_limit);
  ELSIF next_wip_count >= COALESCE(next_cell.wip_warning_threshold, FLOOR(next_cell.wip_limit * 0.8)) THEN
    has_capacity := true;
    is_warning := true;
    message := format('Cell "%s" is approaching capacity (%s/%s)', next_cell.name, next_wip_count, next_cell.wip_limit);
  ELSE
    has_capacity := true;
    is_warning := false;
    message := format('Cell "%s" has capacity (%s/%s)', next_cell.name, next_wip_count, next_cell.wip_limit);
  END IF;

  result := json_build_object(
    'has_capacity', has_capacity,
    'warning', is_warning,
    'next_cell_id', next_cell.id,
    'next_cell_name', next_cell.name,
    'current_wip', next_wip_count,
    'wip_limit', next_cell.wip_limit,
    'enforce_limit', next_cell.enforce_wip_limit,
    'message', message
  );

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_cell_qrm_metrics(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cell_wip_count(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_next_cell_capacity(UUID, UUID) TO authenticated;
