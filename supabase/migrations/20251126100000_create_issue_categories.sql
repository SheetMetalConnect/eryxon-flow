-- Create issue_categories table for configurable issue types
CREATE TABLE IF NOT EXISTS issue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  severity_default VARCHAR(20) DEFAULT 'medium' CHECK (severity_default IN ('low', 'medium', 'high', 'critical')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- Enable RLS
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant's issue categories"
  ON issue_categories FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert issue categories"
  ON issue_categories FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update issue categories"
  ON issue_categories FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete issue categories"
  ON issue_categories FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Index for performance
CREATE INDEX idx_issue_categories_tenant ON issue_categories(tenant_id);
CREATE INDEX idx_issue_categories_active ON issue_categories(tenant_id, active);

-- Add to realtime publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE issue_categories;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
