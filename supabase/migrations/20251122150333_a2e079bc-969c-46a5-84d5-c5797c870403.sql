-- ============================================================================
-- PART 2: PRODUCTION QUANTITY TRACKING
-- ============================================================================

-- Scrap reasons table
CREATE TABLE IF NOT EXISTS scrap_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('material', 'process', 'equipment', 'operator', 'design', 'other')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_scrap_reasons_tenant_id ON scrap_reasons(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scrap_reasons_category ON scrap_reasons(category);
CREATE INDEX IF NOT EXISTS idx_scrap_reasons_active ON scrap_reasons(active);

ALTER TABLE scrap_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's scrap reasons" ON scrap_reasons;
CREATE POLICY "Users can view their tenant's scrap reasons" ON scrap_reasons
FOR SELECT USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage scrap reasons" ON scrap_reasons;
CREATE POLICY "Admins can manage scrap reasons" ON scrap_reasons
FOR ALL USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- Operation quantities table
CREATE TABLE IF NOT EXISTS operation_quantities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  quantity_produced INTEGER NOT NULL DEFAULT 0 CHECK (quantity_produced >= 0),
  quantity_good INTEGER NOT NULL DEFAULT 0 CHECK (quantity_good >= 0),
  quantity_scrap INTEGER NOT NULL DEFAULT 0 CHECK (quantity_scrap >= 0),
  quantity_rework INTEGER NOT NULL DEFAULT 0 CHECK (quantity_rework >= 0),
  scrap_reason_id UUID REFERENCES scrap_reasons(id) ON DELETE SET NULL,
  material_lot TEXT,
  material_supplier TEXT,
  material_cert_number TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quantity_produced = quantity_good + quantity_scrap + quantity_rework)
);

CREATE INDEX IF NOT EXISTS idx_operation_quantities_tenant_id ON operation_quantities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_operation_id ON operation_quantities(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_recorded_by ON operation_quantities(recorded_by);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_scrap_reason_id ON operation_quantities(scrap_reason_id);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_recorded_at ON operation_quantities(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_quantities_material_lot ON operation_quantities(material_lot);

ALTER TABLE operation_quantities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's operation quantities" ON operation_quantities;
CREATE POLICY "Users can view their tenant's operation quantities" ON operation_quantities
FOR SELECT USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Users can insert operation quantities" ON operation_quantities;
CREATE POLICY "Users can insert operation quantities" ON operation_quantities
FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Users can update their tenant's operation quantities" ON operation_quantities;
CREATE POLICY "Users can update their tenant's operation quantities" ON operation_quantities
FOR UPDATE USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can delete operation quantities" ON operation_quantities;
CREATE POLICY "Admins can delete operation quantities" ON operation_quantities
FOR DELETE USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- Add time_type to time_entries
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS time_type TEXT NOT NULL DEFAULT 'run'
  CHECK (time_type IN ('setup', 'run', 'rework', 'wait', 'breakdown'));

CREATE INDEX IF NOT EXISTS idx_time_entries_time_type ON time_entries(time_type);
CREATE INDEX IF NOT EXISTS idx_time_entries_operation_time_type ON time_entries(operation_id, time_type);

-- Add material lot fields to parts
ALTER TABLE parts
  ADD COLUMN IF NOT EXISTS material_lot TEXT,
  ADD COLUMN IF NOT EXISTS material_supplier TEXT,
  ADD COLUMN IF NOT EXISTS material_cert_number TEXT;

CREATE INDEX IF NOT EXISTS idx_parts_material_lot ON parts(material_lot);

-- Helper functions for quantity aggregation
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

GRANT SELECT, INSERT, UPDATE, DELETE ON scrap_reasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON operation_quantities TO authenticated;