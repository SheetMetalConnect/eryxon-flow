-- Add image support to parts table
-- This migration adds an image_paths column to store multiple images per part

-- Add image_paths column to parts table
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.parts.image_paths IS 'Array of storage paths to part images in parts-images bucket. Format: {tenant_id}/parts/{part_id}/{timestamp}_{filename}.{ext}';

-- Create GIN index for better query performance when filtering by image paths
CREATE INDEX IF NOT EXISTS idx_parts_image_paths
ON public.parts USING GIN (image_paths);

-- Create index for parts with images (useful for filtering)
CREATE INDEX IF NOT EXISTS idx_parts_with_images
ON public.parts ((CASE WHEN array_length(image_paths, 1) > 0 THEN true ELSE false END));

-- Grant permissions (already covered by existing RLS policies)
-- No additional grants needed as parts table RLS policies cover this column
