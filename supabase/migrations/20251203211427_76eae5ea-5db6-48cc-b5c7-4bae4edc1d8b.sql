-- PART 2: All remaining migrations (now that enterprise enum is committed)

-- 1. Add factory hours settings to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS factory_opening_time TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS factory_closing_time TIME DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS auto_stop_tracking BOOLEAN DEFAULT false;

-- 2. Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Create issue_categories table
CREATE TABLE IF NOT EXISTS issue_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  severity_default VARCHAR(20) DEFAULT 'medium',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's issue categories" ON issue_categories;
CREATE POLICY "Users can view their tenant's issue categories" ON issue_categories FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert issue categories" ON issue_categories;
CREATE POLICY "Admins can insert issue categories" ON issue_categories FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update issue categories" ON issue_categories;
CREATE POLICY "Admins can update issue categories" ON issue_categories FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete issue categories" ON issue_categories;
CREATE POLICY "Admins can delete issue categories" ON issue_categories FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_issue_categories_tenant ON issue_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_issue_categories_active ON issue_categories(tenant_id, active);

-- Add scheduler columns
ALTER TABLE public.cells ADD COLUMN IF NOT EXISTS capacity_hours_per_day numeric DEFAULT 8;

ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS setup_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS run_time_per_unit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS wait_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS changeover_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_start timestamptz,
ADD COLUMN IF NOT EXISTS planned_end timestamptz;

-- Add whitelabeling columns
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS whitelabel_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whitelabel_logo_url TEXT,
ADD COLUMN IF NOT EXISTS whitelabel_app_name TEXT,
ADD COLUMN IF NOT EXISTS whitelabel_primary_color TEXT,
ADD COLUMN IF NOT EXISTS whitelabel_favicon_url TEXT,
ADD COLUMN IF NOT EXISTS working_days_mask INTEGER DEFAULT 31;

-- Add Part fields for QR code
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS drawing_no TEXT,
ADD COLUMN IF NOT EXISTS cnc_program_name TEXT,
ADD COLUMN IF NOT EXISTS is_bullet_card BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_parts_is_bullet_card ON public.parts(tenant_id, is_bullet_card) WHERE is_bullet_card = true;
CREATE INDEX IF NOT EXISTS idx_parts_cnc_program_name ON public.parts(tenant_id, cnc_program_name) WHERE cnc_program_name IS NOT NULL;

-- Add ERP sync columns
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_hash TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_hash TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.cells
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

-- Create sync indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_sync ON public.jobs (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_external_sync ON public.parts (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_external_sync ON public.operations (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_external_sync ON public.resources (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cells_external_sync ON public.cells (tenant_id, external_source, external_id) WHERE external_id IS NOT NULL;

-- Create active record indexes
CREATE INDEX IF NOT EXISTS idx_jobs_active ON public.jobs (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_parts_active ON public.parts (tenant_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_operations_active ON public.operations (tenant_id, part_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resources_active ON public.resources (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cells_active ON public.cells (tenant_id) WHERE deleted_at IS NULL;

-- Update plan limits
UPDATE public.tenants SET max_jobs = 25, max_parts_per_month = 250, max_storage_gb = 1 WHERE plan = 'free';
UPDATE public.tenants SET max_jobs = 500, max_parts_per_month = 5000, max_storage_gb = 10 WHERE plan = 'pro';
UPDATE public.tenants SET max_jobs = 2000, max_parts_per_month = 20000, max_storage_gb = 100 WHERE plan = 'premium';
UPDATE public.tenants SET max_jobs = NULL, max_parts_per_month = NULL, max_storage_gb = NULL WHERE plan = 'enterprise';

-- Generate sync hash function
CREATE OR REPLACE FUNCTION generate_sync_hash(payload JSONB) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$ SELECT md5(payload::text); $$;