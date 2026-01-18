-- Create batch_type enum if not exists
DO $$ BEGIN
  CREATE TYPE batch_type AS ENUM ('general', 'nesting', 'kit', 'rework');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create batch_status enum if not exists
DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM ('draft', 'ready', 'in_progress', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create operation_batches table if not exists
CREATE TABLE IF NOT EXISTS public.operation_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  batch_type batch_type NOT NULL DEFAULT 'general',
  status batch_status NOT NULL DEFAULT 'draft',
  cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  material TEXT,
  thickness_mm NUMERIC,
  notes TEXT,
  nesting_metadata JSONB,
  operations_count INTEGER NOT NULL DEFAULT 0,
  estimated_time INTEGER,
  actual_time INTEGER,
  created_by UUID REFERENCES public.profiles(id),
  started_by UUID REFERENCES public.profiles(id),
  completed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  external_id TEXT,
  external_source TEXT,
  UNIQUE(tenant_id, batch_number)
);

-- Create batch_operations table if not exists
CREATE TABLE IF NOT EXISTS public.batch_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.operation_batches(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sequence_in_batch INTEGER,
  quantity_in_batch INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(operation_id)
);

-- Enable RLS
ALTER TABLE public.operation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_operations ENABLE ROW LEVEL SECURITY;

-- RLS policies for operation_batches
DROP POLICY IF EXISTS "Users can view batches in their tenant" ON public.operation_batches;
CREATE POLICY "Users can view batches in their tenant" ON public.operation_batches
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create batches in their tenant" ON public.operation_batches;
CREATE POLICY "Users can create batches in their tenant" ON public.operation_batches
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update batches in their tenant" ON public.operation_batches;
CREATE POLICY "Users can update batches in their tenant" ON public.operation_batches
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete batches in their tenant" ON public.operation_batches;
CREATE POLICY "Users can delete batches in their tenant" ON public.operation_batches
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS policies for batch_operations
DROP POLICY IF EXISTS "Users can view batch operations in their tenant" ON public.batch_operations;
CREATE POLICY "Users can view batch operations in their tenant" ON public.batch_operations
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create batch operations in their tenant" ON public.batch_operations;
CREATE POLICY "Users can create batch operations in their tenant" ON public.batch_operations
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update batch operations in their tenant" ON public.batch_operations;
CREATE POLICY "Users can update batch operations in their tenant" ON public.batch_operations
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete batch operations in their tenant" ON public.batch_operations;
CREATE POLICY "Users can delete batch operations in their tenant" ON public.batch_operations
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_operation_batches_tenant ON public.operation_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_batches_status ON public.operation_batches(status);
CREATE INDEX IF NOT EXISTS idx_operation_batches_cell ON public.operation_batches(cell_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_batch ON public.batch_operations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_operation ON public.batch_operations(operation_id);

-- Trigger to update operations_count
CREATE OR REPLACE FUNCTION update_batch_operations_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.operation_batches 
    SET operations_count = (SELECT COUNT(*) FROM public.batch_operations WHERE batch_id = NEW.batch_id),
        updated_at = now()
    WHERE id = NEW.batch_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.operation_batches 
    SET operations_count = (SELECT COUNT(*) FROM public.batch_operations WHERE batch_id = OLD.batch_id),
        updated_at = now()
    WHERE id = OLD.batch_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_batch_operations_count ON public.batch_operations;
CREATE TRIGGER trigger_update_batch_operations_count
  AFTER INSERT OR DELETE ON public.batch_operations
  FOR EACH ROW EXECUTE FUNCTION update_batch_operations_count();