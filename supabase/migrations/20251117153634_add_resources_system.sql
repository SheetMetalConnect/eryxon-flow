-- Create resources table for reusable resources (tooling, fixtures, molds, etc.)
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'tooling', 'fixture', 'mold', 'material', 'other'
  description TEXT,
  identifier TEXT, -- Serial number, part number, or other identifier
  location TEXT, -- Storage location
  status TEXT DEFAULT 'available', -- 'available', 'in_use', 'maintenance', 'retired'
  metadata JSONB, -- Custom fields for specific resource types
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create operation_resources junction table to link operations to required resources
CREATE TABLE IF NOT EXISTS operation_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) DEFAULT 1, -- How many of this resource are needed
  notes TEXT, -- Special instructions for this resource on this operation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(operation_id, resource_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_resources_tenant_id ON resources(tenant_id);
CREATE INDEX idx_resources_type ON resources(tenant_id, type);
CREATE INDEX idx_resources_status ON resources(tenant_id, status);
CREATE INDEX idx_operation_resources_operation_id ON operation_resources(operation_id);
CREATE INDEX idx_operation_resources_resource_id ON operation_resources(resource_id);

-- Enable RLS on resources
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
CREATE POLICY "Users can view resources in their tenant"
  ON resources FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can insert resources"
  ON resources FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update resources"
  ON resources FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete resources"
  ON resources FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enable RLS on operation_resources
ALTER TABLE operation_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operation_resources
CREATE POLICY "Users can view operation_resources in their tenant"
  ON operation_resources FOR SELECT
  USING (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

CREATE POLICY "Admins can insert operation_resources"
  ON operation_resources FOR INSERT
  WITH CHECK (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

CREATE POLICY "Admins can update operation_resources"
  ON operation_resources FOR UPDATE
  USING (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

CREATE POLICY "Admins can delete operation_resources"
  ON operation_resources FOR DELETE
  USING (
    operation_id IN (
      SELECT o.id FROM operations o
      JOIN profiles p ON p.tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
      WHERE o.tenant_id = p.tenant_id
    )
  );

-- Add updated_at trigger for resources
CREATE TRIGGER set_resources_updated_at
  BEFORE UPDATE ON resources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
