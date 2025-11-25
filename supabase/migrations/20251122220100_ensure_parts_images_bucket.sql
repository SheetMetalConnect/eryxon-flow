-- Ensure parts-images storage bucket exists with proper configuration
-- This migration is idempotent and safe to run multiple times

-- Create storage bucket for part images (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parts-images',
  'parts-images',
  false, -- Private bucket (signed URLs required)
  10485760, -- 10MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];

-- Drop existing policies if they exist to recreate them with correct logic
DROP POLICY IF EXISTS "Users can upload part images to their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view part images from their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete part images from their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update part images in their tenant folder" ON storage.objects;

-- RLS Policy: Allow authenticated users to upload images to their tenant folder
CREATE POLICY "Users can upload part images to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to read images from their tenant folder
CREATE POLICY "Users can view part images from their tenant folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to update images in their tenant folder
CREATE POLICY "Users can update part images in their tenant folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to delete images from their tenant folder
CREATE POLICY "Users can delete part images from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- Create helper function to get signed URL for part image
CREATE OR REPLACE FUNCTION public.get_part_image_url(
  p_image_path TEXT,
  p_expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signed_url TEXT;
BEGIN
  -- This is a placeholder - actual signed URL generation happens in Edge Function
  -- This function is here for documentation and potential future use
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_part_image_url IS 'Helper function for generating signed URLs for part images (actual implementation in Edge Function)';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_part_image_url(TEXT, INTEGER) TO authenticated;
