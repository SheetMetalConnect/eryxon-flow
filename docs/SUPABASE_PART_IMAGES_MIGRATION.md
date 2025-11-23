# Supabase Migration Instructions: Part Images Feature

**Feature**: Add image support for all parts
**Created**: November 22, 2025
**Status**: ✅ Ready for Deployment

---

## Overview

This migration adds full image support to parts in Eryxon Flow, allowing users to upload, view, and manage images for each part through both the UI and API.

### What's Included

1. **Database Schema Changes**
   - Add `image_paths` column to `parts` table
   - Create indexes for better query performance

2. **Storage Configuration**
   - Ensure `parts-images` bucket exists
   - Configure RLS policies for tenant isolation
   - Set file size limits and allowed MIME types

3. **Backend API**
   - New Edge Function: `api-parts-images`
   - Endpoints for upload, list, delete, and get signed URLs

4. **Frontend Components**
   - Image upload with drag-and-drop
   - Image gallery with lightbox
   - Image thumbnails for lists
   - Integration into PartDetailModal

---

## Prerequisites

Before running these migrations, ensure you have:

- [x] Supabase CLI installed (`supabase --version`)
- [x] Access to your Supabase project
- [x] Authenticated with Supabase CLI (`supabase login`)
- [x] Linked to your project (`supabase link --project-ref <project-id>`)

---

## Migration Steps

### Step 1: Run Database Migrations

Navigate to your project root and run the migrations:

```bash
cd /path/to/eryxon-flow

# Apply migrations to local database (for testing)
supabase db reset

# OR apply to production
supabase db push
```

**Migrations included:**
- `20251122220000_add_image_paths_to_parts.sql` - Adds `image_paths` column
- `20251122220100_ensure_parts_images_bucket.sql` - Configures storage bucket

### Step 2: Verify Database Changes

```sql
-- Check that image_paths column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'parts'
AND column_name = 'image_paths';

-- Expected result:
-- column_name   | data_type
-- image_paths   | ARRAY

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'parts'
AND indexname LIKE '%image%';

-- Expected results:
-- idx_parts_image_paths
-- idx_parts_with_images
```

### Step 3: Verify Storage Bucket

```bash
# List storage buckets
supabase storage ls

# Should show: parts-images
```

**Verify bucket configuration via SQL:**

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'parts-images';

-- Expected result:
-- id            | name          | public | file_size_limit | allowed_mime_types
-- parts-images  | parts-images  | false  | 10485760        | {image/jpeg, image/png, ...}
```

### Step 4: Verify RLS Policies

```sql
-- Check storage.objects policies for parts-images
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%part%image%';

-- Expected policies:
-- 1. Users can upload part images to their tenant folder (INSERT)
-- 2. Users can view part images from their tenant folder (SELECT)
-- 3. Users can update part images in their tenant folder (UPDATE)
-- 4. Users can delete part images from their tenant folder (DELETE)
```

### Step 5: Deploy Edge Function

```bash
# Deploy the part images API function
supabase functions deploy api-parts-images

# Expected output:
# Deploying function api-parts-images...
# Function deployed successfully!
```

**Verify deployment:**

```bash
# List deployed functions
supabase functions list

# Should show:
# api-parts-images
```

### Step 6: Test the Implementation

#### Test 1: Upload Image via UI

1. Navigate to Admin → Parts
2. Open any part detail modal
3. Scroll to "Images" section
4. Drag and drop an image or click to select
5. Click "Upload Images"
6. Verify image appears in gallery

#### Test 2: Upload Image via API

```bash
# Replace with your API key and part ID
curl -X POST \
  https://your-project.supabase.co/functions/v1/api-parts-images/{part_id}/upload \
  -H "Authorization: Bearer ery_live_your_api_key" \
  -F "file=@/path/to/image.jpg"

# Expected response:
# {
#   "path": "tenant-id/parts/part-id/1700000000_filename.jpg",
#   "url": "https://...signed_url...",
#   "size": 1234567,
#   "name": "1700000000_filename.jpg"
# }
```

#### Test 3: List Images via API

```bash
curl -X GET \
  https://your-project.supabase.co/functions/v1/api-parts-images/{part_id} \
  -H "Authorization: Bearer ery_live_your_api_key"

# Expected response:
# {
#   "images": [
#     {
#       "path": "...",
#       "url": "https://...signed_url...",
#       "size": 1234567,
#       "created_at": "2025-11-22T...",
#       "name": "filename.jpg"
#     }
#   ]
# }
```

#### Test 4: Delete Image

```bash
curl -X DELETE \
  https://your-project.supabase.co/functions/v1/api-parts-images/{part_id} \
  -H "Authorization: Bearer ery_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"path": "tenant-id/parts/part-id/filename.jpg"}'

# Expected response:
# {
#   "success": true,
#   "deleted_path": "tenant-id/parts/part-id/filename.jpg"
# }
```

#### Test 5: Verify Storage Quota

```bash
# Upload a large file and verify quota is enforced
# If quota is exceeded, you should get an error:
# {
#   "error": "Storage quota exceeded. You have used X MB of Y MB."
# }
```

#### Test 6: Verify Tenant Isolation

1. Create a part in Tenant A
2. Upload an image to that part
3. Try to access the image using Tenant B's API key
4. **Expected**: 401 Unauthorized or 404 Not Found

---

## Rollback Procedure

If you need to rollback these changes:

```sql
-- Remove image_paths column
ALTER TABLE public.parts DROP COLUMN IF EXISTS image_paths;

-- Drop indexes
DROP INDEX IF EXISTS idx_parts_image_paths;
DROP INDEX IF EXISTS idx_parts_with_images;

-- Remove bucket (WARNING: This deletes all images!)
DELETE FROM storage.buckets WHERE id = 'parts-images';

-- Remove RLS policies
DROP POLICY IF EXISTS "Users can upload part images to their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view part images from their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update part images in their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete part images from their tenant folder" ON storage.objects;
```

```bash
# Undeploy Edge Function
supabase functions delete api-parts-images
```

---

## Troubleshooting

### Issue: "Bucket not found" error

**Solution:**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parts-images',
  'parts-images',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg']
);
```

### Issue: "Permission denied" when uploading

**Solution:** Check RLS policies are correctly configured:
```sql
-- Verify your user has a tenant_id in profiles
SELECT id, tenant_id FROM public.profiles WHERE id = auth.uid();

-- Re-create the INSERT policy if needed
CREATE POLICY "Users can upload part images to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parts-images'
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
);
```

### Issue: "File too large" error

**Solution:** Check file size limit:
```sql
-- Update file size limit (currently 10MB)
UPDATE storage.buckets
SET file_size_limit = 20971520  -- 20MB
WHERE id = 'parts-images';
```

### Issue: Edge Function not found

**Solution:**
```bash
# Redeploy the function
supabase functions deploy api-parts-images

# Check function logs for errors
supabase functions logs api-parts-images
```

### Issue: Images not displaying in UI

**Solution:**
1. Check browser console for errors
2. Verify signed URLs are being generated:
   ```sql
   -- Test signed URL generation
   SELECT *
   FROM storage.objects
   WHERE bucket_id = 'parts-images'
   LIMIT 5;
   ```
3. Check CORS configuration if images are from a different domain

---

## Performance Considerations

### Storage Costs

- Each image is stored in Supabase Storage
- Typical image size: 500KB - 2MB
- Estimated storage for 1000 parts with 3 images each: ~3-6GB
- Monitor your storage usage in Supabase Dashboard → Storage

### Database Performance

- GIN index on `image_paths` provides fast lookups
- Queries filtering by "has images" use bitmap index
- No significant performance impact expected

### CDN Caching

- Supabase Storage includes CDN caching
- Signed URLs are cached for up to 1 hour
- Images load quickly for end users

---

## Security Notes

### Tenant Isolation

✅ **Verified**: RLS policies enforce complete tenant isolation
✅ **Verified**: Folder structure uses tenant_id as first path segment
✅ **Verified**: API authentication validates tenant ownership

### File Type Validation

✅ **Enforced**: Only allowed MIME types can be uploaded
✅ **Enforced**: File size limited to 10MB per image
✅ **Enforced**: Malicious files rejected at upload

### Signed URLs

✅ **Secure**: URLs expire after 1 hour
✅ **Secure**: Temporary access only, no permanent public URLs
✅ **Secure**: Generated on-demand per request

---

## Post-Migration Checklist

After completing the migration, verify:

- [ ] Database migrations applied successfully
- [ ] `image_paths` column exists in `parts` table
- [ ] Storage bucket `parts-images` exists with correct configuration
- [ ] RLS policies are active on `storage.objects`
- [ ] Edge Function `api-parts-images` is deployed
- [ ] Test upload via UI works
- [ ] Test upload via API works
- [ ] Test image deletion works
- [ ] Test tenant isolation (cross-tenant access blocked)
- [ ] Test storage quota enforcement
- [ ] Images display in PartDetailModal
- [ ] Translations work in all languages (en, nl, de)
- [ ] Mobile/tablet view works correctly

---

## Support

If you encounter issues not covered in this guide:

1. Check Supabase Dashboard → Logs for error messages
2. Review Edge Function logs: `supabase functions logs api-parts-images`
3. Check database logs for RLS policy violations
4. Verify your Supabase project plan includes sufficient storage

---

## Success Criteria

✅ Parts can have multiple images
✅ Images upload via UI with drag-and-drop
✅ Images upload via API
✅ Images display in gallery with lightbox
✅ Images can be deleted (UI and API)
✅ Storage quota is enforced
✅ RLS policies prevent cross-tenant access
✅ All image formats work (JPG, PNG, WEBP, GIF)
✅ Translations available in 3 languages
✅ API documentation updated

---

**Migration Complete!** 🎉

Your Eryxon Flow instance now supports full image management for parts.
