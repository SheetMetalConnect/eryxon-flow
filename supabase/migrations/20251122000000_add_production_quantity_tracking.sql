-- Migration: Add Production Quantity Tracking and MES Data Fields
-- Description: Adds comprehensive production tracking including quantities (produced/good/scrap/rework),
--              scrap reason codes, setup vs run time tracking, and material lot traceability
-- Phase: 1 (Critical Production Tracking)

-- ============================================================================
-- 1. SCRAP REASONS TABLE
-- ============================================================================
-- Standardized scrap/defect reason codes for quality tracking

CREATE TABLE IF NOT EXISTS scrap_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Reason identification
  code TEXT NOT NULL,                             -- e.g., "MATL-001", "PROC-002"
  description TEXT NOT NULL,                       -- Human-readable description
  category TEXT NOT NULL CHECK (
    category IN ('material', 'process', 'equipment', 'operator', 'design', 'other')
  ),

  -- Active flag for soft deletes
  active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique codes per tenant
  UNIQUE(tenant_id, code)
);

-- Add comments
COMMENT ON TABLE scrap_reasons IS 'Standardized scrap and defect reason codes for quality tracking';
COMMENT ON COLUMN scrap_reasons.code IS 'Unique code identifier (e.g., MATL-001, PROC-002)';
COMMENT ON COLUMN scrap_reasons.category IS 'Category: material, process, equipment, operator, design, other';
COMMENT ON COLUMN scrap_reasons.active IS 'Soft delete flag - false means reason code is retired';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scrap_reasons_tenant_id ON scrap_reasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scrap_reasons_category ON scrap_reasons(category);
CREATE INDEX IF NOT EXISTS idx_scrap_reasons_active ON scrap_reasons(active);
CREATE INDEX IF NOT EXISTS idx_scrap_reasons_tenant_code ON scrap_reasons(tenant_id, code);

-- Enable Row Level Security
ALTER TABLE scrap_reasons ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's scrap reasons"
  ON scrap_reasons
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage scrap reasons"
  ON scrap_reasons
  FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- ============================================================================
-- 2. OPERATION QUANTITIES TABLE
-- ============================================================================
-- Tracks actual production quantities (produced, good, scrap, rework) per operation

CREATE TABLE IF NOT EXISTS operation_quantities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Quantity tracking
  quantity_produced INTEGER NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
  quantity_good INTEGER NOT NULL DEFAULT 0 CHECK (quantity_good >= 0),
  quantity_scrap INTEGER NOT NULL DEFAULT 0 CHECK (quantity_scrap >= 0),
  quantity_rework INTEGER NOT NULL DEFAULT 0 CHECK (quantity_rework >= 0),

  -- Scrap reason linking
  scrap_reason_id UUID REFERENCES scrap_reasons(id) ON DELETE SET NULL,

  -- Material traceability
  material_lot TEXT,                              -- Material lot/heat number used
  material_supplier TEXT,                         -- Material supplier
  material_cert_number TEXT,                      -- Material certification number

  -- Timing
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Notes
  notes TEXT,

  -- Metadata for extensibility (e.g., shift info, workstation, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Validation: quantity_produced should equal good + scrap + rework
  CHECK (quantity_produced = quantity_good + quantity_scrap + quantity_rework)
);

-- Add comments
COMMENT ON TABLE operation_quantities IS 'Tracks actual production quantities per operation execution';
COMMENT ON COLUMN operation_quantities.quantity_produced IS 'Total quantity produced (good + scrap + rework)';
COMMENT ON COLUMN operation_quantities.quantity_good IS 'Number of good/accepted parts';
COMMENT ON COLUMN operation_quantities.quantity_scrap IS 'Number of scrapped parts';
COMMENT ON COLUMN operation_quantities.quantity_rework IS 'Number of parts requiring rework';
COMMENT ON COLUMN operation_quantities.material_lot IS 'Material lot/heat number for traceability';
COMMENT ON COLUMN operation_quantities.recorded_at IS 'When the quantity was recorded (may differ from created_at)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operation_quantities_tenant_id ON operation_quantities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_operation_id ON operation_quantities(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_recorded_by ON operation_quantities(recorded_by);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_scrap_reason_id ON operation_quantities(scrap_reason_id);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_recorded_at ON operation_quantities(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_material_lot ON operation_quantities(material_lot);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_operation_quantities_tenant_recorded
  ON operation_quantities(tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_tenant_operation
  ON operation_quantities(tenant_id, operation_id);

-- Enable Row Level Security
ALTER TABLE operation_quantities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's operation quantities"
  ON operation_quantities
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can insert operation quantities"
  ON operation_quantities
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can update their tenant's operation quantities"
  ON operation_quantities
  FOR UPDATE
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can delete operation quantities"
  ON operation_quantities
  FOR DELETE
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- ============================================================================
-- 3. ADD TIME TYPE TO TIME ENTRIES
-- ============================================================================
-- Distinguish between setup, run, rework, wait, and breakdown time

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS time_type TEXT NOT NULL DEFAULT 'run'
  CHECK (time_type IN ('setup', 'run', 'rework', 'wait', 'breakdown'));

COMMENT ON COLUMN time_entries.time_type IS 'Type of time: setup, run, rework, wait, breakdown';

-- Create index for filtering by time type
CREATE INDEX IF NOT EXISTS idx_time_entries_time_type ON time_entries(time_type);

-- Composite index for common queries (operation + time type)
CREATE INDEX IF NOT EXISTS idx_time_entries_operation_time_type
  ON time_entries(operation_id, time_type);

-- ============================================================================
-- 4. ADD MATERIAL LOT FIELDS TO PARTS TABLE
-- ============================================================================
-- Material traceability at the part level

ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS material_lot TEXT,
  ADD COLUMN IF NOT EXISTS material_supplier TEXT,
  ADD COLUMN IF NOT EXISTS material_cert_number TEXT;

COMMENT ON COLUMN parts.material_lot IS 'Primary material lot/heat number for this part';
COMMENT ON COLUMN parts.material_supplier IS 'Material supplier name';
COMMENT ON COLUMN parts.material_cert_number IS 'Material certification/mill test report number';

-- Create index for material lot searches
CREATE INDEX IF NOT EXISTS idx_parts_material_lot ON parts(material_lot);

-- ============================================================================
-- 5. HELPER FUNCTIONS FOR QUANTITY AGGREGATION
-- ============================================================================

-- Function to get total quantities for an operation
CREATE OR REPLACE FUNCTION get_operation_total_quantities(p_operation_id UUID)
RETURNS TABLE(
  total_produced BIGINT,
  total_good BIGINT,
  total_scrap BIGINT,
  total_rework BIGINT,
  yield_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(quantity_produced), 0)::BIGINT as total_produced,
    COALESCE(SUM(quantity_good), 0)::BIGINT as total_good,
    COALESCE(SUM(quantity_scrap), 0)::BIGINT as total_scrap,
    COALESCE(SUM(quantity_rework), 0)::BIGINT as total_rework,
    CASE
      WHEN COALESCE(SUM(quantity_produced), 0) > 0
      THEN ROUND((SUM(quantity_good)::NUMERIC / SUM(quantity_produced)::NUMERIC) * 100, 2)
      ELSE 0
    END as yield_percentage
  FROM operation_quantities
  WHERE operation_id = p_operation_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_operation_total_quantities IS 'Get aggregated production quantities and yield for an operation';

-- Function to get scrap summary by reason for a tenant
CREATE OR REPLACE FUNCTION get_scrap_summary_by_reason(
  p_tenant_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE(
  scrap_reason_id UUID,
  scrap_reason_code TEXT,
  scrap_reason_description TEXT,
  scrap_reason_category TEXT,
  total_scrap_quantity BIGINT,
  scrap_percentage NUMERIC
) AS $$
DECLARE
  v_total_scrap BIGINT;
BEGIN
  -- Get total scrap for percentage calculation
  SELECT COALESCE(SUM(quantity_scrap), 0)
  INTO v_total_scrap
  FROM operation_quantities
  WHERE tenant_id = p_tenant_id
    AND (p_from_date IS NULL OR recorded_at >= p_from_date)
    AND (p_to_date IS NULL OR recorded_at <= p_to_date);

  RETURN QUERY
  SELECT
    sr.id as scrap_reason_id,
    sr.code as scrap_reason_code,
    sr.description as scrap_reason_description,
    sr.category as scrap_reason_category,
    COALESCE(SUM(oq.quantity_scrap), 0)::BIGINT as total_scrap_quantity,
    CASE
      WHEN v_total_scrap > 0
      THEN ROUND((SUM(oq.quantity_scrap)::NUMERIC / v_total_scrap::NUMERIC) * 100, 2)
      ELSE 0
    END as scrap_percentage
  FROM scrap_reasons sr
  LEFT JOIN operation_quantities oq ON oq.scrap_reason_id = sr.id
    AND oq.tenant_id = p_tenant_id
    AND (p_from_date IS NULL OR oq.recorded_at >= p_from_date)
    AND (p_to_date IS NULL OR oq.recorded_at <= p_to_date)
  WHERE sr.tenant_id = p_tenant_id
  GROUP BY sr.id, sr.code, sr.description, sr.category
  HAVING COALESCE(SUM(oq.quantity_scrap), 0) > 0
  ORDER BY total_scrap_quantity DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_scrap_summary_by_reason IS 'Get scrap summary grouped by reason code with percentages';

-- ============================================================================
-- 6. SEED STANDARD SCRAP REASON CODES
-- ============================================================================
-- Insert standard scrap reasons for metal fabrication (only if tenant exists)
-- Note: This is an example - actual seeding should be done per-tenant via API

CREATE OR REPLACE FUNCTION seed_default_scrap_reasons(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Only insert if no scrap reasons exist for this tenant
  IF NOT EXISTS (SELECT 1 FROM scrap_reasons WHERE tenant_id = p_tenant_id LIMIT 1) THEN

    -- Material defects
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
    (p_tenant_id, 'MATL-001', 'Raw material defect/damage', 'material'),
    (p_tenant_id, 'MATL-002', 'Wrong material used', 'material'),
    (p_tenant_id, 'MATL-003', 'Material thickness out of tolerance', 'material'),
    (p_tenant_id, 'MATL-004', 'Material hardness issue', 'material'),
    (p_tenant_id, 'MATL-005', 'Surface defects (rust, scratches, dents)', 'material');

    -- Process defects
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
    (p_tenant_id, 'PROC-001', 'Incorrect dimensions', 'process'),
    (p_tenant_id, 'PROC-002', 'Surface finish defect', 'process'),
    (p_tenant_id, 'PROC-003', 'Burrs/sharp edges excessive', 'process'),
    (p_tenant_id, 'PROC-004', 'Weld defect (porosity, cracks, undercut)', 'process'),
    (p_tenant_id, 'PROC-005', 'Bend angle out of tolerance', 'process'),
    (p_tenant_id, 'PROC-006', 'Hole position incorrect', 'process'),
    (p_tenant_id, 'PROC-007', 'Threading defect', 'process'),
    (p_tenant_id, 'PROC-008', 'Heat treatment issue', 'process'),
    (p_tenant_id, 'PROC-009', 'Coating/finish defect', 'process');

    -- Equipment issues
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
    (p_tenant_id, 'EQUIP-001', 'Machine malfunction', 'equipment'),
    (p_tenant_id, 'EQUIP-002', 'Tool wear/breakage', 'equipment'),
    (p_tenant_id, 'EQUIP-003', 'Equipment calibration error', 'equipment'),
    (p_tenant_id, 'EQUIP-004', 'Fixture/tooling issue', 'equipment');

    -- Operator errors
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
    (p_tenant_id, 'OPER-001', 'Setup error', 'operator'),
    (p_tenant_id, 'OPER-002', 'Programming error (CNC/laser)', 'operator'),
    (p_tenant_id, 'OPER-003', 'Handling damage', 'operator'),
    (p_tenant_id, 'OPER-004', 'Assembly error', 'operator'),
    (p_tenant_id, 'OPER-005', 'Measurement error', 'operator');

    -- Design issues
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
    (p_tenant_id, 'DESIGN-001', 'Drawing error/ambiguity', 'design'),
    (p_tenant_id, 'DESIGN-002', 'Design cannot be manufactured', 'design'),
    (p_tenant_id, 'DESIGN-003', 'Tolerance too tight/unrealistic', 'design'),
    (p_tenant_id, 'DESIGN-004', 'Engineering change during production', 'design');

    -- Other
    INSERT INTO scrap_reasons (tenant_id, code, description, category) VALUES
    (p_tenant_id, 'OTHER-001', 'Customer change request', 'other'),
    (p_tenant_id, 'OTHER-002', 'Obsolete/superseded part', 'other'),
    (p_tenant_id, 'OTHER-003', 'Unknown/unclassified', 'other');

  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_default_scrap_reasons IS 'Seeds default scrap reason codes for a tenant (call once per tenant setup)';

-- ============================================================================
-- 7. UPDATE TRIGGERS FOR updated_at
-- ============================================================================

-- Trigger for scrap_reasons
CREATE OR REPLACE FUNCTION update_scrap_reasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scrap_reasons_updated_at_trigger
  BEFORE UPDATE ON scrap_reasons
  FOR EACH ROW
  EXECUTE FUNCTION update_scrap_reasons_updated_at();

-- Trigger for operation_quantities
CREATE OR REPLACE FUNCTION update_operation_quantities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER operation_quantities_updated_at_trigger
  BEFORE UPDATE ON operation_quantities
  FOR EACH ROW
  EXECUTE FUNCTION update_operation_quantities_updated_at();

-- ============================================================================
-- 8. ADD ACTIVITY LOG TRIGGERS FOR NEW TABLES
-- ============================================================================

-- Activity log trigger for scrap_reasons (if log_activity function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_activity') THEN
    DROP TRIGGER IF EXISTS scrap_reasons_activity_trigger ON scrap_reasons;
    CREATE TRIGGER scrap_reasons_activity_trigger
      AFTER INSERT OR UPDATE OR DELETE ON scrap_reasons
      FOR EACH ROW
      EXECUTE FUNCTION log_activity();
  END IF;
END $$;

-- Activity log trigger for operation_quantities (if log_activity function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_activity') THEN
    DROP TRIGGER IF EXISTS operation_quantities_activity_trigger ON operation_quantities;
    CREATE TRIGGER operation_quantities_activity_trigger
      AFTER INSERT OR UPDATE OR DELETE ON operation_quantities
      FOR EACH ROW
      EXECUTE FUNCTION log_activity();
  END IF;
END $$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON scrap_reasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON operation_quantities TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary:
-- - Added scrap_reasons table for standardized scrap tracking
-- - Added operation_quantities table for production quantity tracking
-- - Added time_type to time_entries for setup vs run time
-- - Added material lot fields to parts for traceability
-- - Added helper functions for quantity aggregation and scrap reporting
-- - Added seed function for default scrap reason codes
-- - Added appropriate indexes, RLS policies, and triggers
-- ============================================================================
