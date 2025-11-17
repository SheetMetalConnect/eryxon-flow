-- Migration: Add QRM (Quick Response Manufacturing) Visual Indicators
-- This migration adds WIP limits, capacity tracking, and routing visualization support

-- Add WIP limit fields to cells table
ALTER TABLE cells
ADD COLUMN IF NOT EXISTS wip_limit INTEGER,
ADD COLUMN IF NOT EXISTS wip_warning_threshold INTEGER,
ADD COLUMN IF NOT EXISTS enforce_wip_limit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_capacity_warning BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN cells.wip_limit IS 'Maximum work-in-progress items allowed in this cell (null = unlimited)';
COMMENT ON COLUMN cells.wip_warning_threshold IS 'Show warning when WIP count reaches this threshold (null = use 80% of wip_limit)';
COMMENT ON COLUMN cells.enforce_wip_limit IS 'Prevent starting new work when WIP limit is reached';
COMMENT ON COLUMN cells.show_capacity_warning IS 'Show visual warnings when approaching WIP limit';

-- Function to calculate current WIP count for a cell
CREATE OR REPLACE FUNCTION get_cell_wip_count(cell_id_param UUID, tenant_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  wip_count INTEGER;
BEGIN
  -- Count jobs and parts currently in this cell
  SELECT COUNT(DISTINCT COALESCE(j.id, p.id))
  INTO wip_count
  FROM operations o
  LEFT JOIN parts p ON o.part_id = p.id
  LEFT JOIN jobs j ON p.job_id = j.id
  WHERE o.cell_id = cell_id_param
    AND o.status IN ('not_started', 'in_progress')
    AND (j.tenant_id = tenant_id_param OR p.tenant_id = tenant_id_param);

  RETURN COALESCE(wip_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if next cell has capacity
CREATE OR REPLACE FUNCTION check_next_cell_capacity(current_cell_id UUID, tenant_id_param UUID)
RETURNS JSON AS $$
DECLARE
  next_cell RECORD;
  current_wip INTEGER;
  result JSON;
BEGIN
  -- Find the next cell in sequence
  SELECT c.* INTO next_cell
  FROM cells c
  WHERE c.tenant_id = tenant_id_param
    AND c.sequence > (SELECT sequence FROM cells WHERE id = current_cell_id)
    AND c.active = true
  ORDER BY c.sequence ASC
  LIMIT 1;

  -- If no next cell found, return null
  IF next_cell IS NULL THEN
    RETURN json_build_object(
      'has_capacity', true,
      'next_cell_id', null,
      'message', 'No next cell in sequence'
    );
  END IF;

  -- Get current WIP count for next cell
  current_wip := get_cell_wip_count(next_cell.id, tenant_id_param);

  -- Check capacity
  IF next_cell.wip_limit IS NULL THEN
    -- No limit set
    result := json_build_object(
      'has_capacity', true,
      'next_cell_id', next_cell.id,
      'next_cell_name', next_cell.name,
      'current_wip', current_wip,
      'wip_limit', null,
      'message', 'No WIP limit set'
    );
  ELSIF current_wip >= next_cell.wip_limit THEN
    -- At or over limit
    result := json_build_object(
      'has_capacity', false,
      'next_cell_id', next_cell.id,
      'next_cell_name', next_cell.name,
      'current_wip', current_wip,
      'wip_limit', next_cell.wip_limit,
      'enforce_limit', next_cell.enforce_wip_limit,
      'message', 'Next cell at capacity'
    );
  ELSIF current_wip >= COALESCE(next_cell.wip_warning_threshold, (next_cell.wip_limit * 0.8)::INTEGER) THEN
    -- Approaching limit (warning)
    result := json_build_object(
      'has_capacity', true,
      'warning', true,
      'next_cell_id', next_cell.id,
      'next_cell_name', next_cell.name,
      'current_wip', current_wip,
      'wip_limit', next_cell.wip_limit,
      'message', 'Next cell approaching capacity'
    );
  ELSE
    -- Has capacity
    result := json_build_object(
      'has_capacity', true,
      'next_cell_id', next_cell.id,
      'next_cell_name', next_cell.name,
      'current_wip', current_wip,
      'wip_limit', next_cell.wip_limit,
      'message', 'Next cell has capacity'
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get routing for a part (sequence of cells)
CREATE OR REPLACE FUNCTION get_part_routing(part_id_param UUID)
RETURNS JSON AS $$
DECLARE
  routing JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'cell_id', c.id,
      'cell_name', c.name,
      'cell_color', c.color,
      'sequence', c.sequence,
      'operation_count', COUNT(o.id),
      'completed_operations', COUNT(o.id) FILTER (WHERE o.status = 'completed')
    ) ORDER BY c.sequence
  )
  INTO routing
  FROM operations o
  JOIN cells c ON o.cell_id = c.id
  WHERE o.part_id = part_id_param
  GROUP BY c.id, c.name, c.color, c.sequence;

  RETURN COALESCE(routing, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get routing for a job (all parts combined)
CREATE OR REPLACE FUNCTION get_job_routing(job_id_param UUID)
RETURNS JSON AS $$
DECLARE
  routing JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'cell_id', c.id,
      'cell_name', c.name,
      'cell_color', c.color,
      'sequence', c.sequence,
      'operation_count', COUNT(o.id),
      'completed_operations', COUNT(o.id) FILTER (WHERE o.status = 'completed'),
      'parts_in_cell', COUNT(DISTINCT o.part_id)
    ) ORDER BY c.sequence
  )
  INTO routing
  FROM operations o
  JOIN cells c ON o.cell_id = c.id
  JOIN parts p ON o.part_id = p.id
  WHERE p.job_id = job_id_param
  GROUP BY c.id, c.name, c.color, c.sequence;

  RETURN COALESCE(routing, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comprehensive QRM metrics for a cell
CREATE OR REPLACE FUNCTION get_cell_qrm_metrics(cell_id_param UUID, tenant_id_param UUID)
RETURNS JSON AS $$
DECLARE
  metrics JSON;
  wip_count INTEGER;
  cell_info RECORD;
BEGIN
  -- Get cell info
  SELECT * INTO cell_info FROM cells WHERE id = cell_id_param;

  -- Get WIP count
  wip_count := get_cell_wip_count(cell_id_param, tenant_id_param);

  -- Build metrics
  metrics := json_build_object(
    'cell_id', cell_info.id,
    'cell_name', cell_info.name,
    'current_wip', wip_count,
    'wip_limit', cell_info.wip_limit,
    'wip_warning_threshold', COALESCE(
      cell_info.wip_warning_threshold,
      (cell_info.wip_limit * 0.8)::INTEGER
    ),
    'enforce_limit', cell_info.enforce_wip_limit,
    'show_warning', cell_info.show_capacity_warning,
    'utilization_percent', CASE
      WHEN cell_info.wip_limit IS NULL OR cell_info.wip_limit = 0 THEN NULL
      ELSE (wip_count::FLOAT / cell_info.wip_limit * 100)::INTEGER
    END,
    'status', CASE
      WHEN cell_info.wip_limit IS NULL THEN 'no_limit'
      WHEN wip_count >= cell_info.wip_limit THEN 'at_capacity'
      WHEN wip_count >= COALESCE(cell_info.wip_warning_threshold, (cell_info.wip_limit * 0.8)::INTEGER) THEN 'warning'
      ELSE 'normal'
    END,
    'jobs_in_cell', (
      SELECT json_agg(DISTINCT json_build_object(
        'job_id', j.id,
        'job_number', j.job_number
      ))
      FROM operations o
      JOIN parts p ON o.part_id = p.id
      JOIN jobs j ON p.job_id = j.id
      WHERE o.cell_id = cell_id_param
        AND o.status IN ('not_started', 'in_progress')
        AND j.tenant_id = tenant_id_param
    )
  );

  RETURN metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for faster WIP queries
CREATE INDEX IF NOT EXISTS idx_operations_cell_status
ON operations(cell_id, status)
WHERE status IN ('not_started', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_jobs_current_cell
ON jobs(current_cell_id, tenant_id)
WHERE current_cell_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parts_current_cell
ON parts(current_cell_id, tenant_id)
WHERE current_cell_id IS NOT NULL;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_cell_wip_count TO authenticated;
GRANT EXECUTE ON FUNCTION check_next_cell_capacity TO authenticated;
GRANT EXECUTE ON FUNCTION get_part_routing TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_routing TO authenticated;
GRANT EXECUTE ON FUNCTION get_cell_qrm_metrics TO authenticated;
