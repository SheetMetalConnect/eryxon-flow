-- ============================================================================
-- Batch/Nesting Operations Tables
-- ============================================================================
-- First, ensure the update_updated_at_column function exists

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Batch type enum
DO $$ BEGIN
  CREATE TYPE batch_type AS ENUM (
    'laser_nesting',
    'tube_batch',
    'saw_batch',
    'finishing_batch',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Batch status enum  
DO $$ BEGIN
  CREATE TYPE batch_status AS ENUM (
    'draft',
    'ready',
    'in_progress',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- Operation Batches Table (parent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operation_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Identification
  batch_number TEXT NOT NULL,
  batch_type batch_type NOT NULL DEFAULT 'general',
  status batch_status NOT NULL DEFAULT 'draft',
  
  -- Cell/Stage association
  cell_id UUID NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
  
  -- Grouping criteria (for sheet metal: same material + thickness)
  material TEXT,
  thickness_mm NUMERIC(10,2),
  
  -- Additional info
  notes TEXT,
  nesting_metadata JSONB,
  
  -- Counts and times
  operations_count INTEGER NOT NULL DEFAULT 0,
  estimated_time NUMERIC(10,2),
  actual_time NUMERIC(10,2),
  
  -- Tracking
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- External system integration (SigmaNest, Lantek, etc.)
  external_id TEXT,
  external_source TEXT,
  
  -- Constraints
  CONSTRAINT operation_batches_batch_number_tenant_unique UNIQUE (tenant_id, batch_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_operation_batches_tenant ON public.operation_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_operation_batches_status ON public.operation_batches(status);
CREATE INDEX IF NOT EXISTS idx_operation_batches_cell ON public.operation_batches(cell_id);
CREATE INDEX IF NOT EXISTS idx_operation_batches_material ON public.operation_batches(material, thickness_mm);
CREATE INDEX IF NOT EXISTS idx_operation_batches_created_at ON public.operation_batches(created_at DESC);

-- ============================================================================
-- Batch Operations Table (junction table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.batch_operations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.operation_batches(id) ON DELETE CASCADE,
  operation_id UUID NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Sequencing within batch
  sequence_in_batch INTEGER,
  quantity_in_batch INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint: operation can only be in one batch
  CONSTRAINT batch_operations_unique UNIQUE (operation_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_batch_operations_batch ON public.batch_operations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_operation ON public.batch_operations(operation_id);
CREATE INDEX IF NOT EXISTS idx_batch_operations_tenant ON public.batch_operations(tenant_id);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE public.operation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_operations ENABLE ROW LEVEL SECURITY;

-- Operation Batches RLS Policies
CREATE POLICY "Users can view batches in their tenant"
  ON public.operation_batches FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create batches in their tenant"
  ON public.operation_batches FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update batches in their tenant"
  ON public.operation_batches FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete batches in their tenant"
  ON public.operation_batches FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Batch Operations RLS Policies
CREATE POLICY "Users can view batch operations in their tenant"
  ON public.batch_operations FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create batch operations in their tenant"
  ON public.batch_operations FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update batch operations in their tenant"
  ON public.batch_operations FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete batch operations in their tenant"
  ON public.batch_operations FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================================
-- Triggers
-- ============================================================================

-- Update updated_at timestamp
CREATE TRIGGER update_operation_batches_updated_at
  BEFORE UPDATE ON public.operation_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_batch_operations_updated_at
  BEFORE UPDATE ON public.batch_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to count and update batch operations count
CREATE OR REPLACE FUNCTION public.update_batch_operations_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.operation_batches
    SET operations_count = (
      SELECT COUNT(*) FROM public.batch_operations WHERE batch_id = NEW.batch_id
    )
    WHERE id = NEW.batch_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.operation_batches
    SET operations_count = (
      SELECT COUNT(*) FROM public.batch_operations WHERE batch_id = OLD.batch_id
    )
    WHERE id = OLD.batch_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-update count
CREATE TRIGGER batch_operations_count_trigger
  AFTER INSERT OR DELETE ON public.batch_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_batch_operations_count();