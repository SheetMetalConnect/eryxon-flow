-- Add path columns for private storage migration
-- Replace long-lived signed URLs with object paths

ALTER TABLE public.operation_batches
ADD COLUMN IF NOT EXISTS nesting_image_path TEXT,
ADD COLUMN IF NOT EXISTS layout_image_path TEXT;

COMMENT ON COLUMN public.operation_batches.nesting_image_path IS 'Storage path to nesting layout image (tenant-prefixed, used with api-storage-url)';
COMMENT ON COLUMN public.operation_batches.layout_image_path IS 'Storage path to general layout image (tenant-prefixed, used with api-storage-url)';
COMMENT ON COLUMN public.operation_batches.nesting_image_url IS 'DEPRECATED: Prefer nesting_image_path. Signed URL for nesting layout image.';
COMMENT ON COLUMN public.operation_batches.layout_image_url IS 'DEPRECATED: Prefer layout_image_path. Signed URL for layout image.';
