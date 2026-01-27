-- Migration: Create batch_requirements table
-- Description: Add table for tracking material requirements within batches

-- Create batch_requirements table
CREATE TABLE IF NOT EXISTS public.batch_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    material_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL,
    CONSTRAINT batch_requirements_batch_id_fkey
        FOREIGN KEY (batch_id)
        REFERENCES public.operation_batches(id)
        ON DELETE CASCADE
);

-- Add index for batch_id lookups
CREATE INDEX IF NOT EXISTS idx_batch_requirements_batch_id
ON public.batch_requirements(batch_id);

-- Add index for tenant_id (for RLS performance)
CREATE INDEX IF NOT EXISTS idx_batch_requirements_tenant_id
ON public.batch_requirements(tenant_id);

-- Enable Row Level Security
ALTER TABLE public.batch_requirements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for multi-tenant access control
CREATE POLICY "Users can view batch_requirements from their tenant"
ON public.batch_requirements
FOR SELECT
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can insert batch_requirements for their tenant"
ON public.batch_requirements
FOR INSERT
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can update batch_requirements from their tenant"
ON public.batch_requirements
FOR UPDATE
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can delete batch_requirements from their tenant"
ON public.batch_requirements
FOR DELETE
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Add comments
COMMENT ON TABLE public.batch_requirements IS 'Material requirements tracked within operation batches';
COMMENT ON COLUMN public.batch_requirements.batch_id IS 'Reference to the operation batch';
COMMENT ON COLUMN public.batch_requirements.material_name IS 'Name of the required material';
COMMENT ON COLUMN public.batch_requirements.quantity IS 'Quantity required';
COMMENT ON COLUMN public.batch_requirements.status IS 'Status of the requirement (pending, fulfilled, etc.)';
COMMENT ON COLUMN public.batch_requirements.tenant_id IS 'Tenant ID for multi-tenant isolation';
