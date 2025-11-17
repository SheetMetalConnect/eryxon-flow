-- Create storage bucket for part images
INSERT INTO storage.buckets (id, name, public)
VALUES ('parts-images', 'parts-images', false)
ON CONFLICT (id) DO NOTHING;

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

-- RLS Policy: Allow authenticated users to delete images from their tenant folder
CREATE POLICY "Users can delete part images from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);
