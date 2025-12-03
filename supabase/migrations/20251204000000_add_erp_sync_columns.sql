-- Migration: Add ERP sync columns for external system integration
-- Enables two-way sync with external ERP systems (SAP, NetSuite, Odoo, etc.)
-- Adds external_id tracking, sync metadata, and soft delete support

-- ============================================================================
-- PHASE 1: Add sync columns to core tables
-- ============================================================================

-- Jobs table (Sales Orders in ERP)
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_hash TEXT;

COMMENT ON COLUMN public.jobs.external_id IS 'Unique identifier from external ERP system';
COMMENT ON COLUMN public.jobs.external_source IS 'Source system identifier (e.g., SAP, NetSuite, Odoo)';
COMMENT ON COLUMN public.jobs.synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN public.jobs.sync_hash IS 'MD5 hash of payload for change detection';

-- Parts table (Work Orders / Sales Items in ERP)
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_hash TEXT;

COMMENT ON COLUMN public.parts.external_id IS 'Unique identifier from external ERP system';
COMMENT ON COLUMN public.parts.external_source IS 'Source system identifier';
COMMENT ON COLUMN public.parts.synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN public.parts.sync_hash IS 'MD5 hash of payload for change detection';

-- Operations table (Routing steps in ERP)
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.operations.external_id IS 'Unique identifier from external ERP system';
COMMENT ON COLUMN public.operations.external_source IS 'Source system identifier';
COMMENT ON COLUMN public.operations.synced_at IS 'Timestamp of last successful sync';

-- Resources table (Equipment/Tooling in ERP)
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.resources.external_id IS 'Unique identifier from external ERP system';
COMMENT ON COLUMN public.resources.external_source IS 'Source system identifier';
COMMENT ON COLUMN public.resources.synced_at IS 'Timestamp of last successful sync';

-- Cells table (Work Centers in ERP)
ALTER TABLE public.cells
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_source TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.cells.external_id IS 'Unique identifier from external ERP system';
COMMENT ON COLUMN public.cells.external_source IS 'Source system identifier';
COMMENT ON COLUMN public.cells.synced_at IS 'Timestamp of last successful sync';

-- ============================================================================
-- PHASE 2: Add composite unique indexes for upsert operations
-- ============================================================================

-- These indexes enable ON CONFLICT upsert by external_id
-- Partial index: only applies when external_id is NOT NULL

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_external_sync
ON public.jobs (tenant_id, external_source, external_id)
WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_external_sync
ON public.parts (tenant_id, external_source, external_id)
WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_external_sync
ON public.operations (tenant_id, external_source, external_id)
WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_external_sync
ON public.resources (tenant_id, external_source, external_id)
WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cells_external_sync
ON public.cells (tenant_id, external_source, external_id)
WHERE external_id IS NOT NULL;

-- ============================================================================
-- PHASE 3: Add soft delete columns
-- ============================================================================

-- Jobs
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.jobs.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN public.jobs.deleted_by IS 'User who performed the soft delete';

-- Parts
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.parts.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN public.parts.deleted_by IS 'User who performed the soft delete';

-- Operations
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.operations.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN public.operations.deleted_by IS 'User who performed the soft delete';

-- Resources
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.resources.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN public.resources.deleted_by IS 'User who performed the soft delete';

-- Cells
ALTER TABLE public.cells
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id);

COMMENT ON COLUMN public.cells.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN public.cells.deleted_by IS 'User who performed the soft delete';

-- ============================================================================
-- PHASE 4: Add indexes for soft delete queries
-- ============================================================================

-- Partial indexes for active records (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_jobs_active
ON public.jobs (tenant_id, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_parts_active
ON public.parts (tenant_id, job_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_operations_active
ON public.operations (tenant_id, part_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resources_active
ON public.resources (tenant_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cells_active
ON public.cells (tenant_id)
WHERE deleted_at IS NULL;

-- ============================================================================
-- PHASE 5: Create sync_imports table for tracking import batches
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sync_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                    -- 'csv', 'api', 'erp_sap', etc.
  entity_type TEXT NOT NULL,               -- 'jobs', 'parts', 'operations', etc.
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  total_records INTEGER NOT NULL DEFAULT 0,
  created_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB,                            -- Array of error details
  file_name TEXT,                          -- Original filename for CSV imports
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sync_imports ENABLE ROW LEVEL SECURITY;

-- RLS policy for sync_imports
CREATE POLICY "Tenant isolation for sync_imports"
ON public.sync_imports
FOR ALL
USING (tenant_id = get_user_tenant_id())
WITH CHECK (tenant_id = get_user_tenant_id());

-- Index for querying import history
CREATE INDEX IF NOT EXISTS idx_sync_imports_tenant
ON public.sync_imports (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_imports_status
ON public.sync_imports (tenant_id, status);

COMMENT ON TABLE public.sync_imports IS 'Tracks batch import operations for audit and monitoring';

-- ============================================================================
-- PHASE 6: Helper function for generating sync_hash
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_sync_hash(payload JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5(payload::text);
$$;

COMMENT ON FUNCTION generate_sync_hash IS 'Generates MD5 hash for change detection during sync';
