-- Migration: Enhance Batch Management
-- Description: Add blocked status, parent_batch_id for nesting, and image URL columns

-- Add 'blocked' status to batch_status enum
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'blocked';

-- Add parent_batch_id column for nested batches
ALTER TABLE public.operation_batches
ADD COLUMN IF NOT EXISTS parent_batch_id UUID;

-- Add foreign key constraint for parent_batch_id
ALTER TABLE public.operation_batches
ADD CONSTRAINT operation_batches_parent_batch_id_fkey
FOREIGN KEY (parent_batch_id)
REFERENCES public.operation_batches(id)
ON DELETE CASCADE;

-- Add index for parent_batch_id lookups
CREATE INDEX IF NOT EXISTS idx_operation_batches_parent
ON public.operation_batches(parent_batch_id)
WHERE parent_batch_id IS NOT NULL;

-- Add image URL columns for batch visuals
ALTER TABLE public.operation_batches
ADD COLUMN IF NOT EXISTS nesting_image_url TEXT,
ADD COLUMN IF NOT EXISTS layout_image_url TEXT;

-- Add comment to explain parent_batch_id
COMMENT ON COLUMN public.operation_batches.parent_batch_id IS 'Reference to parent batch for nested batches (e.g., sheets within a master nesting batch)';

-- Add comment for image columns
COMMENT ON COLUMN public.operation_batches.nesting_image_url IS 'URL to nesting layout image (signed URL from batch-images storage bucket)';
COMMENT ON COLUMN public.operation_batches.layout_image_url IS 'URL to general layout image (signed URL from batch-images storage bucket)';
