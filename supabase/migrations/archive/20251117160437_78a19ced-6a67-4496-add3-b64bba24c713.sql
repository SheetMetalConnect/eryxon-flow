-- Fix existing migrations and add all required tables

-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON public.materials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(tenant_id, active);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for materials
DROP POLICY IF EXISTS "Users can view materials in their tenant" ON public.materials;
CREATE POLICY "Users can view materials in their tenant"
  ON public.materials FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials"
  ON public.materials FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- Create resources table for reusable resources (tooling, fixtures, molds, etc.)
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  identifier TEXT,
  location TEXT,
  status TEXT DEFAULT 'available',
  metadata JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- Create operation_resources junction table
CREATE TABLE IF NOT EXISTS public.operation_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(operation_id, resource_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resources_tenant_id ON public.resources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON public.resources(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_operation_resources_operation_id ON public.operation_resources(operation_id);
CREATE INDEX IF NOT EXISTS idx_operation_resources_resource_id ON public.operation_resources(resource_id);

-- Enable RLS on resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources
DROP POLICY IF EXISTS "Users can view resources in their tenant" ON public.resources;
CREATE POLICY "Users can view resources in their tenant"
  ON public.resources FOR SELECT
  USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  USING (tenant_id = get_user_tenant_id() AND get_user_role() = 'admin');

-- Enable RLS on operation_resources
ALTER TABLE public.operation_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operation_resources
DROP POLICY IF EXISTS "Users can view operation_resources in their tenant" ON public.operation_resources;
CREATE POLICY "Users can view operation_resources in their tenant"
  ON public.operation_resources FOR SELECT
  USING (
    operation_id IN (
      SELECT id FROM operations WHERE tenant_id = get_user_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Admins can manage operation_resources" ON public.operation_resources;
CREATE POLICY "Admins can manage operation_resources"
  ON public.operation_resources FOR ALL
  USING (
    operation_id IN (
      SELECT id FROM operations WHERE tenant_id = get_user_tenant_id()
    ) AND get_user_role() = 'admin'
  );

-- Add pause tracking for time entries
CREATE TABLE IF NOT EXISTS public.time_entry_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.time_entry_pauses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_entry_pauses
DROP POLICY IF EXISTS "Users can manage their own pauses" ON public.time_entry_pauses;
CREATE POLICY "Users can manage their own pauses"
  ON public.time_entry_pauses FOR ALL
  USING (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

-- Add is_paused flag to time_entries
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_time_entry_id
  ON public.time_entry_pauses(time_entry_id);

CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_resumed_at
  ON public.time_entry_pauses(resumed_at)
  WHERE resumed_at IS NULL;

-- Migrate existing materials from parts table
INSERT INTO public.materials (tenant_id, name, active)
SELECT DISTINCT
  p.tenant_id,
  p.material,
  true
FROM public.parts p
WHERE p.material IS NOT NULL
  AND p.material != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.materials m
    WHERE m.tenant_id = p.tenant_id
    AND m.name = p.material
  )
ON CONFLICT (tenant_id, name) DO NOTHING;