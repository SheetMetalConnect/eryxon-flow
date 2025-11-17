-- Create integrations marketplace tables
-- This supports an app store where users can discover and install pre-built integrations

-- Integration categories enum
CREATE TYPE integration_category AS ENUM (
  'erp',
  'accounting',
  'crm',
  'inventory',
  'shipping',
  'analytics',
  'other'
);

-- Integration status for moderation
CREATE TYPE integration_status AS ENUM (
  'draft',
  'published',
  'deprecated',
  'archived'
);

-- Integrations catalog (global, not tenant-specific)
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name text NOT NULL,
  slug text UNIQUE NOT NULL, -- URL-friendly identifier
  description text NOT NULL,
  long_description text, -- Detailed markdown description
  category integration_category NOT NULL DEFAULT 'other',
  status integration_status NOT NULL DEFAULT 'draft',

  -- Visual assets
  logo_url text, -- Integration logo/icon
  banner_url text, -- Banner image for detail page
  screenshots jsonb DEFAULT '[]'::jsonb, -- Array of screenshot URLs

  -- Provider info
  provider_name text NOT NULL, -- e.g., "Sheet Metal Connect e.U."
  provider_url text, -- Provider website
  provider_email text, -- Support contact

  -- Integration details
  supported_systems jsonb DEFAULT '[]'::jsonb, -- Array of ERP system names
  features jsonb DEFAULT '[]'::jsonb, -- Array of feature descriptions
  requirements jsonb DEFAULT '{}}'::jsonb, -- System requirements

  -- Documentation & Resources
  documentation_url text, -- Link to docs
  github_repo_url text, -- GitHub starter kit repo
  demo_video_url text, -- Video demonstration

  -- Pricing (optional)
  is_free boolean DEFAULT true,
  pricing_description text, -- e.g., "Free tier available, $99/month for premium"
  pricing_url text, -- External pricing page

  -- Installation
  install_url text, -- OAuth URL or installation endpoint
  webhook_template jsonb, -- Pre-configured webhook settings
  requires_api_key boolean DEFAULT true,

  -- Metadata
  version text DEFAULT '1.0.0',
  min_plan_tier text, -- 'free', 'pro', 'premium' - minimum required plan
  install_count integer DEFAULT 0, -- Global installation counter
  rating_average numeric(2,1) DEFAULT 0.0, -- Average rating 0.0-5.0
  rating_count integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- Installed integrations per tenant
CREATE TABLE installed_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

  -- Installation config
  config jsonb DEFAULT '{}'::jsonb, -- Tenant-specific configuration
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL, -- Associated API key
  webhook_id uuid REFERENCES webhooks(id) ON DELETE SET NULL, -- Associated webhook

  -- Status
  is_active boolean DEFAULT true,
  last_sync_at timestamptz, -- Last successful sync/activity

  -- Metadata
  installed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  installed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Prevent duplicate installations
  UNIQUE(tenant_id, integration_id)
);

-- Integration reviews/ratings (optional, for future enhancement)
CREATE TABLE integration_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One review per tenant per integration
  UNIQUE(tenant_id, integration_id)
);

-- Indexes for performance
CREATE INDEX idx_integrations_category ON integrations(category);
CREATE INDEX idx_integrations_status ON integrations(status);
CREATE INDEX idx_integrations_slug ON integrations(slug);
CREATE INDEX idx_installed_integrations_tenant ON installed_integrations(tenant_id);
CREATE INDEX idx_installed_integrations_integration ON installed_integrations(integration_id);
CREATE INDEX idx_integration_reviews_integration ON integration_reviews(integration_id);

-- RLS Policies

-- Integrations are publicly readable (catalog)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Integrations are viewable by all authenticated users"
  ON integrations FOR SELECT
  TO authenticated
  USING (status = 'published');

-- Only admins can manage integrations catalog (super admin functionality)
CREATE POLICY "Only admins can manage integrations"
  ON integrations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Installed integrations are tenant-scoped
ALTER TABLE installed_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view installed integrations in their tenant"
  ON installed_integrations FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage installed integrations in their tenant"
  ON installed_integrations FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Reviews are tenant-scoped
ALTER TABLE integration_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reviews"
  ON integration_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own reviews"
  ON integration_reviews FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Function to update integration rating when reviews change
CREATE OR REPLACE FUNCTION update_integration_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE integrations
  SET
    rating_average = (
      SELECT COALESCE(AVG(rating), 0)::numeric(2,1)
      FROM integration_reviews
      WHERE integration_id = COALESCE(NEW.integration_id, OLD.integration_id)
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM integration_reviews
      WHERE integration_id = COALESCE(NEW.integration_id, OLD.integration_id)
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.integration_id, OLD.integration_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update ratings
CREATE TRIGGER integration_review_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON integration_reviews
FOR EACH ROW
EXECUTE FUNCTION update_integration_rating();

-- Function to increment install count
CREATE OR REPLACE FUNCTION increment_integration_install_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE integrations
    SET install_count = install_count + 1,
        updated_at = now()
    WHERE id = NEW.integration_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE integrations
    SET install_count = GREATEST(0, install_count - 1),
        updated_at = now()
    WHERE id = OLD.integration_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to track installs
CREATE TRIGGER installed_integration_count_trigger
AFTER INSERT OR DELETE ON installed_integrations
FOR EACH ROW
EXECUTE FUNCTION increment_integration_install_count();

-- Seed some example integrations
INSERT INTO integrations (
  name, slug, description, long_description, category, status,
  provider_name, provider_url, provider_email,
  supported_systems, features,
  documentation_url, github_repo_url,
  is_free, requires_api_key, published_at
) VALUES
(
  'SAP Business One Connector',
  'sap-business-one',
  'Bi-directional sync between Eryxon Flow and SAP Business One for seamless manufacturing data exchange.',
  E'# SAP Business One Integration\n\nThis integration provides real-time synchronization between Eryxon Flow and SAP Business One ERP system.\n\n## Features\n- Automatic job creation from production orders\n- Real-time inventory updates\n- Cost center tracking\n- Production reporting\n\n## Requirements\n- SAP Business One 9.3 or higher\n- Service Layer enabled\n- API access credentials',
  'erp',
  'published',
  'Sheet Metal Connect e.U.',
  'https://sheetmetalconnect.com',
  'support@sheetmetalconnect.com',
  '["SAP Business One 9.3", "SAP Business One 10.0"]'::jsonb,
  '["Automatic job sync", "Inventory management", "Real-time reporting", "Cost tracking"]'::jsonb,
  'https://docs.sheetmetalconnect.com/integrations/sap-b1',
  'https://github.com/sheetmetalconnect/eryxon-sap-b1-starter',
  false,
  true,
  now()
),
(
  'Microsoft Dynamics 365 Sync',
  'microsoft-dynamics-365',
  'Connect your Microsoft Dynamics 365 Business Central with Eryxon Flow for unified manufacturing operations.',
  E'# Microsoft Dynamics 365 Integration\n\nSeamlessly integrate with Dynamics 365 Business Central for end-to-end manufacturing visibility.\n\n## What This Integration Does\n- Syncs production orders to Eryxon Flow jobs\n- Updates item availability in real-time\n- Posts production output back to Dynamics\n- Tracks labor costs and routing\n\n## Setup Requirements\n- Dynamics 365 Business Central (Cloud or On-Premise)\n- OAuth 2.0 app registration\n- Manufacturing module enabled',
  'erp',
  'published',
  'Sheet Metal Connect e.U.',
  'https://sheetmetalconnect.com',
  'support@sheetmetalconnect.com',
  '["Dynamics 365 Business Central"]'::jsonb,
  '["Production order sync", "Item availability", "Labor tracking", "Routing integration"]'::jsonb,
  'https://docs.sheetmetalconnect.com/integrations/dynamics-365',
  'https://github.com/sheetmetalconnect/eryxon-dynamics-starter',
  false,
  true,
  now()
),
(
  'QuickBooks Manufacturing',
  'quickbooks-manufacturing',
  'Sync manufacturing jobs with QuickBooks for accurate job costing and invoicing.',
  E'# QuickBooks Integration\n\nBridge the gap between shop floor execution and financial accounting.\n\n## Features\n- Job cost tracking\n- Automatic invoice generation\n- Material cost allocation\n- Labor cost posting\n\n## Requirements\n- QuickBooks Online or Desktop (2020+)\n- API access enabled\n- Manufacturing & Wholesale edition recommended',
  'accounting',
  'published',
  'Sheet Metal Connect e.U.',
  'https://sheetmetalconnect.com',
  'support@sheetmetalconnect.com',
  '["QuickBooks Online", "QuickBooks Desktop 2020+"]'::jsonb,
  '["Job costing", "Invoice automation", "Material tracking", "Labor posting"]'::jsonb,
  'https://docs.sheetmetalconnect.com/integrations/quickbooks',
  'https://github.com/sheetmetalconnect/eryxon-quickbooks-starter',
  true,
  true,
  now()
),
(
  'Odoo ERP Connector',
  'odoo-erp',
  'Open-source integration with Odoo ERP for manufacturing, inventory, and sales synchronization.',
  E'# Odoo ERP Integration\n\nConnect to the world''s leading open-source ERP platform.\n\n## Capabilities\n- Manufacturing order sync\n- BOM (Bill of Materials) import\n- Stock level updates\n- Quality control integration\n\n## Requirements\n- Odoo 14.0 or higher\n- Manufacturing module installed\n- API key or OAuth credentials',
  'erp',
  'published',
  'Sheet Metal Connect e.U.',
  'https://sheetmetalconnect.com',
  'support@sheetmetalconnect.com',
  '["Odoo 14", "Odoo 15", "Odoo 16", "Odoo 17"]'::jsonb,
  '["MO sync", "BOM import", "Inventory sync", "QC integration"]'::jsonb,
  'https://docs.sheetmetalconnect.com/integrations/odoo',
  'https://github.com/sheetmetalconnect/eryxon-odoo-starter',
  true,
  true,
  now()
),
(
  'Custom Integration Starter Kit',
  'custom-integration-starter',
  'Build your own custom integration using our comprehensive starter kit with example code and documentation.',
  E'# Custom Integration Starter Kit\n\nCreate your own integration tailored to your specific needs.\n\n## What''s Included\n- Complete TypeScript/Node.js example project\n- Authentication handling (API keys + OAuth)\n- Webhook event listeners\n- Data sync utilities\n- Testing framework\n- Comprehensive documentation\n\n## Use Cases\n- Legacy ERP systems\n- Custom in-house software\n- Specialized industry tools\n- Multi-system integrations\n\n## Getting Started\n```bash\ngit clone https://github.com/sheetmetalconnect/eryxon-integration-starter\ncd eryxon-integration-starter\nnpm install\nnpm run dev\n```\n\nFollow the step-by-step guide in the README to build your integration.',
  'other',
  'published',
  'Sheet Metal Connect e.U.',
  'https://sheetmetalconnect.com',
  'support@sheetmetalconnect.com',
  '["Any system with REST API", "Custom software", "Legacy systems"]'::jsonb,
  '["Full source code", "TypeScript examples", "Webhook templates", "OAuth flow", "Testing suite", "Documentation"]'::jsonb,
  'https://docs.sheetmetalconnect.com/integrations/starter-kit',
  'https://github.com/sheetmetalconnect/eryxon-integration-starter',
  true,
  true,
  now()
);

-- Update timestamps trigger
CREATE TRIGGER update_integrations_updated_at
BEFORE UPDATE ON integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installed_integrations_updated_at
BEFORE UPDATE ON installed_integrations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_reviews_updated_at
BEFORE UPDATE ON integration_reviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE integrations IS 'Marketplace catalog of available integrations';
COMMENT ON TABLE installed_integrations IS 'Tenant-specific integration installations and configurations';
COMMENT ON TABLE integration_reviews IS 'User reviews and ratings for integrations';
