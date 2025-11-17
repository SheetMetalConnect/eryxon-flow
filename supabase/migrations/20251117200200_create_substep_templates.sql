-- Create substep templates table for storing reusable operation templates
CREATE TABLE substep_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  operation_type text, -- Optional categorization (e.g., 'cutting', 'welding', 'bending')
  is_global boolean DEFAULT false, -- If true, available to all tenants (admin templates)
  created_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_template_name_per_tenant UNIQUE (tenant_id, name)
);

-- Create substep template items table for storing individual steps within templates
CREATE TABLE substep_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES substep_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  sequence integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unique_sequence_per_template UNIQUE (template_id, sequence)
);

-- Create indexes for performance
CREATE INDEX idx_substep_templates_tenant_id ON substep_templates(tenant_id);
CREATE INDEX idx_substep_templates_operation_type ON substep_templates(operation_type);
CREATE INDEX idx_substep_templates_is_global ON substep_templates(is_global);
CREATE INDEX idx_substep_template_items_template_id ON substep_template_items(template_id);
CREATE INDEX idx_substep_template_items_sequence ON substep_template_items(template_id, sequence);

-- Enable Row Level Security
ALTER TABLE substep_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE substep_template_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for substep_templates

-- Admins can do everything with their tenant's templates
CREATE POLICY "Admins can manage tenant templates"
  ON substep_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = substep_templates.tenant_id
      AND profiles.role = 'admin'
    )
    OR (is_global = true) -- Can view global templates
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = substep_templates.tenant_id
      AND profiles.role = 'admin'
    )
  );

-- Operators can view templates from their tenant and global templates
CREATE POLICY "Operators can view templates"
  ON substep_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = substep_templates.tenant_id
    )
    OR is_global = true
  );

-- Read-only users can view templates from their tenant and global templates
CREATE POLICY "Read-only users can view templates"
  ON substep_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = substep_templates.tenant_id
      AND profiles.role = 'read_only'
    )
    OR is_global = true
  );

-- RLS Policies for substep_template_items

-- Admins can manage template items for their tenant's templates
CREATE POLICY "Admins can manage template items"
  ON substep_template_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM substep_templates st
      JOIN profiles p ON p.tenant_id = st.tenant_id
      WHERE st.id = substep_template_items.template_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM substep_templates st
      WHERE st.id = substep_template_items.template_id
      AND st.is_global = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM substep_templates st
      JOIN profiles p ON p.tenant_id = st.tenant_id
      WHERE st.id = substep_template_items.template_id
      AND p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Operators and read-only users can view template items
CREATE POLICY "Users can view template items"
  ON substep_template_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM substep_templates st
      JOIN profiles p ON p.tenant_id = st.tenant_id
      WHERE st.id = substep_template_items.template_id
      AND p.id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM substep_templates st
      WHERE st.id = substep_template_items.template_id
      AND st.is_global = true
    )
  );

-- Add updated_at trigger function if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_substep_templates_updated_at
  BEFORE UPDATE ON substep_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_substep_template_items_updated_at
  BEFORE UPDATE ON substep_template_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed with existing hardcoded templates
-- Insert global templates (is_global = true, tenant_id = first tenant in system)
DO $$
DECLARE
  system_tenant_id uuid;
BEGIN
  -- Get the first tenant ID to use for global templates
  SELECT id INTO system_tenant_id FROM tenants LIMIT 1;

  IF system_tenant_id IS NOT NULL THEN
    -- Cutting template
    INSERT INTO substep_templates (id, tenant_id, name, description, operation_type, is_global)
    VALUES (
      gen_random_uuid(),
      system_tenant_id,
      'Cutting (Laser/Plasma/Waterjet)',
      'Standard cutting operation workflow',
      'cutting',
      true
    )
    RETURNING id INTO system_tenant_id; -- Reuse variable for template_id

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (system_tenant_id, 'Review cutting plan and material specifications', NULL, 1),
      (system_tenant_id, 'Prepare and load material onto cutting table', NULL, 2),
      (system_tenant_id, 'Setup cutting equipment and load program', NULL, 3),
      (system_tenant_id, 'Perform first article inspection', NULL, 4),
      (system_tenant_id, 'Execute cutting operation', NULL, 5),
      (system_tenant_id, 'Quality check completed parts', NULL, 6),
      (system_tenant_id, 'Sign off and move to next operation', NULL, 7);
  END IF;
END
$$;

DO $$
DECLARE
  system_tenant_id uuid;
  template_id uuid;
BEGIN
  SELECT id INTO system_tenant_id FROM tenants LIMIT 1;

  IF system_tenant_id IS NOT NULL THEN
    -- Bending template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'Bending (Press Brake)',
      'Standard press brake bending workflow',
      'bending',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Review bend angles and sequence', NULL, 1),
      (template_id, 'Select and install correct tooling', NULL, 2),
      (template_id, 'Setup press brake and load program', NULL, 3),
      (template_id, 'Perform test bend and verify angles', NULL, 4),
      (template_id, 'Execute bending operation', NULL, 5),
      (template_id, 'Inspect bend angles and tolerances', NULL, 6),
      (template_id, 'Sign off and move to next operation', NULL, 7);

    -- Welding template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'Welding',
      'Standard welding operation workflow',
      'welding',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Review welding procedure specification (WPS)', NULL, 1),
      (template_id, 'Prepare and fit-up joints', NULL, 2),
      (template_id, 'Setup welding equipment and verify settings', NULL, 3),
      (template_id, 'Tack weld components', NULL, 4),
      (template_id, 'Execute welding per WPS', NULL, 5),
      (template_id, 'Visual inspection of welds', NULL, 6),
      (template_id, 'Cleanup and remove spatter', NULL, 7),
      (template_id, 'Document weld parameters and sign off', NULL, 8);

    -- Machining template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'Machining (CNC/Manual)',
      'Standard machining operation workflow',
      'machining',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Review machining program and setup sheet', NULL, 1),
      (template_id, 'Verify material and locate datums', NULL, 2),
      (template_id, 'Setup machine and install tooling', NULL, 3),
      (template_id, 'Run first article inspection', NULL, 4),
      (template_id, 'Execute machining operation', NULL, 5),
      (template_id, 'Perform in-process quality checks', NULL, 6),
      (template_id, 'Final inspection and documentation', NULL, 7),
      (template_id, 'Clean machine and workpiece', NULL, 8);

    -- Finishing template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'Finishing (Powder Coat/Paint)',
      'Standard finishing operation workflow',
      'finishing',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Review finish specifications and color', NULL, 1),
      (template_id, 'Prepare surface (clean, degrease, mask)', NULL, 2),
      (template_id, 'Verify equipment setup and parameters', NULL, 3),
      (template_id, 'Apply finish coating', NULL, 4),
      (template_id, 'Cure/dry per specifications', NULL, 5),
      (template_id, 'Inspect coating coverage and quality', NULL, 6),
      (template_id, 'Sign off and prepare for shipment', NULL, 7);

    -- Assembly template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'Assembly',
      'Standard assembly operation workflow',
      'assembly',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Verify all components are available', NULL, 1),
      (template_id, 'Review assembly drawing and BOM', NULL, 2),
      (template_id, 'Prepare tools and fixtures', NULL, 3),
      (template_id, 'Fit and align components', NULL, 4),
      (template_id, 'Install fasteners per torque specs', NULL, 5),
      (template_id, 'Perform function test', NULL, 6),
      (template_id, 'Final inspection and sign off', NULL, 7);

    -- Inspection template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'Inspection (QC)',
      'Standard quality control inspection workflow',
      'inspection',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Gather inspection documents and drawings', NULL, 1),
      (template_id, 'Prepare measuring equipment', NULL, 2),
      (template_id, 'Measure critical dimensions', NULL, 3),
      (template_id, 'Perform visual inspection', NULL, 4),
      (template_id, 'Document results and measurements', NULL, 5),
      (template_id, 'Sign off inspection report', NULL, 6);

    -- Packaging template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'Packaging & Shipping Prep',
      'Standard packaging and shipping preparation workflow',
      'packaging',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Verify part quantity matches order', NULL, 1),
      (template_id, 'Perform final quality check', NULL, 2),
      (template_id, 'Prepare packaging materials', NULL, 3),
      (template_id, 'Pack parts securely', NULL, 4),
      (template_id, 'Label packages with job/part info', NULL, 5),
      (template_id, 'Update inventory and shipping docs', NULL, 6),
      (template_id, 'Mark job complete in system', NULL, 7);

    -- General template
    INSERT INTO substep_templates (tenant_id, name, description, operation_type, is_global)
    VALUES (
      system_tenant_id,
      'General Operation',
      'Generic workflow template for any operation',
      'general',
      true
    )
    RETURNING id INTO template_id;

    INSERT INTO substep_template_items (template_id, name, notes, sequence) VALUES
      (template_id, 'Review work order and specifications', NULL, 1),
      (template_id, 'Prepare materials and equipment', NULL, 2),
      (template_id, 'Execute operation', NULL, 3),
      (template_id, 'Perform quality check', NULL, 4),
      (template_id, 'Sign off and document completion', NULL, 5);
  END IF;
END
$$;

-- Add helpful comment
COMMENT ON TABLE substep_templates IS 'Reusable templates for substeps that can be applied to operations';
COMMENT ON TABLE substep_template_items IS 'Individual steps within a substep template';
