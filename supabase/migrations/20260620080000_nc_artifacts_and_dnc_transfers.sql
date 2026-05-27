-- NC Program Artifacts and DNC Transfer Jobs
-- Supports the DNC bridge for sending NC programs to CNC machines
--
-- NC programs = G-code / CAM output files that control CNC machines
-- DNC transfer jobs = track requests to send programs to specific machines

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.nc_program_status AS ENUM ('draft', 'active', 'archived', 'superseded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.nc_program_type AS ENUM ('cnc', 'laser', 'plasma', 'waterjet', 'robot', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.dnc_transfer_status AS ENUM ('pending', 'transferring', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.dnc_transfer_protocol AS ENUM ('ftp', 'smb', 'mqtt', 'api', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- NC PROGRAMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.nc_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),

  -- Link to part/operation (optional — programs can be standalone)
  part_id UUID REFERENCES public.parts(id),
  operation_id UUID REFERENCES public.operations(id),

  -- Program identification
  program_name TEXT NOT NULL,
  description TEXT,

  -- File information
  file_path TEXT NOT NULL,
  file_size BIGINT,
  content_hash TEXT,
  mime_type TEXT DEFAULT 'text/plain',

  -- NC program metadata
  program_type public.nc_program_type NOT NULL DEFAULT 'cnc',
  post_processor TEXT,
  machine_type TEXT,
  estimated_cycle_time_seconds INT,

  -- Versioning
  version INT NOT NULL DEFAULT 1,
  previous_version_id UUID REFERENCES public.nc_programs(id),

  -- Status
  status public.nc_program_status NOT NULL DEFAULT 'draft',

  notes TEXT,
  metadata JSONB,

  -- ERP Sync
  external_id TEXT,
  external_source TEXT,
  sync_hash TEXT,
  synced_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for nc_programs
CREATE INDEX IF NOT EXISTS idx_nc_programs_tenant ON public.nc_programs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_nc_programs_part ON public.nc_programs(tenant_id, part_id) WHERE part_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nc_programs_operation ON public.nc_programs(tenant_id, operation_id) WHERE operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_nc_programs_status ON public.nc_programs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_nc_programs_name ON public.nc_programs(tenant_id, program_name);
CREATE INDEX IF NOT EXISTS idx_nc_programs_external ON public.nc_programs(tenant_id, external_source, external_id) WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_nc_programs_tenant_name_version ON public.nc_programs(tenant_id, program_name, version);

COMMENT ON TABLE public.nc_programs IS 'NC (Numerical Control) program artifacts stored for transfer to CNC machines via DNC bridge';
COMMENT ON COLUMN public.nc_programs.program_name IS 'Name of the NC program file (e.g. OP-1234.NC, PROG-001)';
COMMENT ON COLUMN public.nc_programs.file_path IS 'Path in Supabase Storage where the file is stored';
COMMENT ON COLUMN public.nc_programs.content_hash IS 'SHA-256 hash of file content for change detection';
COMMENT ON COLUMN public.nc_programs.program_type IS 'Type of NC program: cnc, laser, plasma, waterjet, robot, other';
COMMENT ON COLUMN public.nc_programs.post_processor IS 'CAM post-processor used to generate this program';
COMMENT ON COLUMN public.nc_programs.version IS 'Incremented when a new revision of the same program is uploaded';
COMMENT ON COLUMN public.nc_programs.previous_version_id IS 'Points to the previous version of this program';

-- ============================================
-- DNC TRANSFER JOBS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.dnc_transfer_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),

  -- What to transfer
  nc_program_id UUID NOT NULL REFERENCES public.nc_programs(id),

  -- Where to transfer
  target_machine_id UUID REFERENCES public.resources(id),
  target_cell_id UUID REFERENCES public.cells(id),
  destination_path TEXT,

  -- Operation context (optional — which operation this transfer supports)
  operation_id UUID REFERENCES public.operations(id),

  -- Transfer details
  status public.dnc_transfer_status NOT NULL DEFAULT 'pending',
  transfer_protocol public.dnc_transfer_protocol DEFAULT 'ftp',
  transfer_config JSONB,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Result
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  max_retries INT NOT NULL DEFAULT 3,

  -- Audit
  requested_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),

  notes TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for dnc_transfer_jobs
CREATE INDEX IF NOT EXISTS idx_dnc_transfer_tenant ON public.dnc_transfer_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dnc_transfer_program ON public.dnc_transfer_jobs(nc_program_id);
CREATE INDEX IF NOT EXISTS idx_dnc_transfer_status ON public.dnc_transfer_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dnc_transfer_machine ON public.dnc_transfer_jobs(target_machine_id) WHERE target_machine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dnc_transfer_pending ON public.dnc_transfer_jobs(tenant_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dnc_transfer_operation ON public.dnc_transfer_jobs(operation_id) WHERE operation_id IS NOT NULL;

COMMENT ON TABLE public.dnc_transfer_jobs IS 'DNC (Distributed Numerical Control) transfer jobs — requests to send NC programs to specific machines';
COMMENT ON COLUMN public.dnc_transfer_jobs.target_machine_id IS 'Target machine (from resources table) that should receive the NC program';
COMMENT ON COLUMN public.dnc_transfer_jobs.transfer_protocol IS 'Protocol used for transfer: ftp, smb, mqtt, api, manual';
COMMENT ON COLUMN public.dnc_transfer_jobs.transfer_config IS 'Protocol-specific configuration overrides (e.g. target FTP path, MQTT topic)';
COMMENT ON COLUMN public.dnc_transfer_jobs.destination_path IS 'Target path on the receiving machine or network share';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.nc_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnc_transfer_jobs ENABLE ROW LEVEL SECURITY;

-- nc_programs policies
DO $$ BEGIN
  CREATE POLICY "Users can view NC programs in their tenant"
    ON public.nc_programs FOR SELECT
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can create NC programs"
    ON public.nc_programs FOR INSERT
    WITH CHECK (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update NC programs"
    ON public.nc_programs FOR UPDATE
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete NC programs"
    ON public.nc_programs FOR DELETE
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- dnc_transfer_jobs policies
DO $$ BEGIN
  CREATE POLICY "Users can view DNC transfers in their tenant"
    ON public.dnc_transfer_jobs FOR SELECT
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can create DNC transfers"
    ON public.dnc_transfer_jobs FOR INSERT
    WITH CHECK (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update DNC transfers"
    ON public.dnc_transfer_jobs FOR UPDATE
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete DNC transfers"
    ON public.dnc_transfer_jobs FOR DELETE
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STORAGE BUCKET for NC programs
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nc-programs',
  'nc-programs',
  false,
  52428800,
  ARRAY[
    'text/plain',
    'text/x-nc',
    'application/octet-stream',
    'text/x-gcode',
    'application/x-nc'
  ]
) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload NC programs"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'nc-programs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view NC programs"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'nc-programs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete NC programs"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'nc-programs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
