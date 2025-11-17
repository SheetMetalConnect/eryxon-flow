-- Create storage bucket for CAD/STEP files
INSERT INTO storage.buckets (id, name, public)
VALUES ('parts-cad', 'parts-cad', false);

-- RLS Policy: Allow authenticated users to upload files to their tenant folder
CREATE POLICY "Users can upload CAD files to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parts-cad' 
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to read files from their tenant folder
CREATE POLICY "Users can view CAD files from their tenant folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'parts-cad'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policy: Allow authenticated users to delete files from their tenant folder
CREATE POLICY "Users can delete CAD files from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'parts-cad'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);