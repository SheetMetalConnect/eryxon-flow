-- Create storage bucket for issue images
INSERT INTO storage.buckets (id, name, public)
VALUES ('issues', 'issues', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Allow authenticated users to upload images to their tenant folder
CREATE POLICY "Users can upload issue images to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'issues'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to read images from their tenant folder
CREATE POLICY "Users can view issue images from their tenant folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'issues'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to delete images from their tenant folder
CREATE POLICY "Users can delete issue images from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'issues'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);
