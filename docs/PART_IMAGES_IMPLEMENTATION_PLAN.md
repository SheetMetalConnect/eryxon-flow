# Part Images Implementation Plan

**Status**: ✅ Active Implementation
**Created**: November 22, 2025
**Feature**: Support images for all parts (upload via API and UI)

---

## Overview

This document outlines the complete implementation plan for adding image support to parts in Eryxon Flow. Each part can have multiple images that will be:
- Uploaded to Supabase storage bucket (`parts-images`)
- Displayed in operator terminal, parts list, and detail modals
- Accessible via REST API
- Subject to tenant-level storage quota limits
- Properly isolated by tenant (RLS policies)

---

## Architecture

### Database Schema Changes

**Table**: `parts`

Add new column:
- `image_paths` (TEXT[]) - Array of storage paths to images

This follows the same pattern as `file_paths` for STEP/PDF files.

### Storage Structure

**Bucket**: `parts-images` (already exists)

**Path Structure**:
```
parts-images/
  └── {tenant_id}/
      └── parts/
          └── {part_id}/
              ├── {timestamp}_{filename}.jpg
              ├── {timestamp}_{filename}.png
              └── {timestamp}_{filename}.webp
```

**Allowed Extensions**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`

**Size Limits**:
- Per file: 10MB max
- Subject to tenant storage quota

### RLS Policies (Already Exist)

The `parts-images` bucket already has proper RLS policies for tenant isolation:
- Upload: Users can upload to their tenant folder
- Read: Users can view from their tenant folder
- Delete: Users can delete from their tenant folder

---

## Implementation Components

### 1. Database Migration

**File**: `supabase/migrations/YYYYMMDD_add_image_paths_to_parts.sql`

```sql
-- Add image_paths column to parts table
ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.parts.image_paths IS 'Array of storage paths to part images in parts-images bucket';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_parts_image_paths
ON public.parts USING GIN (image_paths);
```

### 2. Backend API Endpoints

**Location**: `supabase/functions/api-parts-images/`

#### Endpoints

1. **Upload Image**
   - `POST /api-parts-images/{part_id}/upload`
   - Body: multipart/form-data with image file
   - Returns: `{ path: string, url: string }`

2. **List Images**
   - `GET /api-parts-images/{part_id}`
   - Returns: `{ images: Array<{ path: string, url: string, size: number }> }`

3. **Delete Image**
   - `DELETE /api-parts-images/{part_id}`
   - Body: `{ path: string }`
   - Returns: `{ success: boolean }`

4. **Get Signed URL**
   - `GET /api-parts-images/{part_id}/url?path={path}`
   - Returns: `{ url: string, expiresIn: number }`

### 3. Frontend Components

#### ImageUpload Component
**File**: `src/components/parts/ImageUpload.tsx`

Features:
- Drag-and-drop zone
- Multiple file selection
- Image preview before upload
- Progress tracking (using `useFileUpload` hook)
- Quota validation
- Image compression (optional)

#### ImageGallery Component
**File**: `src/components/parts/ImageGallery.tsx`

Features:
- Grid display of images
- Lightbox view (full-screen)
- Zoom in/out
- Download image
- Delete image (with confirmation)
- Navigation (next/previous)

#### ImageThumbnail Component
**File**: `src/components/parts/ImageThumbnail.tsx`

Features:
- Small preview for lists
- Click to open in lightbox
- Lazy loading
- Placeholder while loading

### 4. Integration Points

#### PartDetailModal
**File**: `src/components/admin/PartDetailModal.tsx`

Add new tab/section:
- Display `ImageGallery` component
- Add `ImageUpload` component
- Show image count badge

#### Parts List
**File**: `src/pages/admin/Parts.tsx`

Add image thumbnail column:
- Show first image as thumbnail
- Badge showing total image count
- Click to open PartDetailModal

#### Operator Terminal
**File**: `src/pages/operator/OperatorTerminal.tsx`

Display images in job/part detail:
- Gallery view of part images
- Helps operators identify parts visually
- View-only (no upload)

#### Work Queue
**File**: `src/pages/operator/WorkQueue.tsx`

Add image preview:
- Small thumbnail in work queue cards
- Visual identification of parts

### 5. API Documentation Updates

**File**: `docs/API_DOCUMENTATION.md`

Add new section:

```markdown
## Part Images Endpoints

### Upload Part Image
POST /api-parts-images/{part_id}/upload
...

### List Part Images
GET /api-parts-images/{part_id}
...

### Delete Part Image
DELETE /api-parts-images/{part_id}
...

### Get Signed Image URL
GET /api-parts-images/{part_id}/url
...
```

### 6. Translations

**Files**:
- `src/i18n/locales/en/translation.json`
- `src/i18n/locales/nl/translation.json`
- `src/i18n/locales/de/translation.json`

Add translations for:
- "Upload Image"
- "Drag and drop images here"
- "Images" (tab name)
- "No images uploaded"
- "Delete image"
- "Image uploaded successfully"
- "Failed to upload image"
- "Image too large"
- "Invalid image format"

---

## Use Cases

### 1. Admin Creates Part with Images
1. Admin creates new part in job creation wizard
2. Admin uploads product photos, CAD screenshots, or reference images
3. Images are stored in `parts-images/{tenant_id}/parts/{part_id}/`
4. Paths saved to `parts.image_paths` array

### 2. Operator Views Part in Terminal
1. Operator opens job in terminal
2. Sees part images in gallery
3. Can zoom in to see details
4. Helps verify they have the correct part

### 3. API Consumer Uploads Image
1. External system calls `POST /api-parts-images/{part_id}/upload`
2. Provides API key for authentication
3. Image is uploaded and path returned
4. System can reference image in downstream processes

### 4. Quality Control Reviews Images
1. QC inspector opens part detail modal
2. Reviews uploaded images
3. Can upload additional inspection photos
4. Images serve as quality documentation

---

## Security & Performance

### Security
- **Tenant Isolation**: RLS policies enforce tenant boundaries
- **File Validation**: Only allowed image formats accepted
- **Size Limits**: 10MB max per image
- **Quota Enforcement**: Tenant storage quota checked before upload
- **Signed URLs**: Time-limited URLs for image access (1 hour expiry)

### Performance
- **Lazy Loading**: Images load on-demand
- **Thumbnails**: Generate thumbnails for list views (optional)
- **CDN**: Supabase storage includes CDN for fast delivery
- **Compression**: Client-side compression before upload (optional)
- **Pagination**: Gallery supports pagination for parts with many images

---

## Migration Instructions for Supabase

### Step 1: Run Database Migration

```bash
# From project root
cd supabase
supabase migration new add_image_paths_to_parts
```

Copy the migration SQL into the new file, then:

```bash
# Apply locally (if testing)
supabase db reset

# Apply to production
supabase db push
```

### Step 2: Verify Storage Bucket

```bash
# Check bucket exists
supabase storage ls

# Should show: parts-images
```

If bucket doesn't exist, create it:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('parts-images', 'parts-images', false)
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Verify RLS Policies

```sql
-- Check policies on storage.objects
SELECT * FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%part%image%';
```

Should show 3 policies:
- Users can upload part images to their tenant folder
- Users can view part images from their tenant folder
- Users can delete part images from their tenant folder

### Step 4: Deploy Edge Functions

```bash
# Deploy the image API function
supabase functions deploy api-parts-images
```

### Step 5: Test Upload

```bash
# Test image upload via API
curl -X POST \
  https://your-project.supabase.co/functions/v1/api-parts-images/{part_id}/upload \
  -H "X-API-Key: your-api-key" \
  -F "file=@test-image.jpg"
```

---

## Testing Checklist

- [ ] Upload single image via UI
- [ ] Upload multiple images via UI
- [ ] View images in PartDetailModal gallery
- [ ] Delete image from gallery
- [ ] View image thumbnails in parts list
- [ ] View images in operator terminal
- [ ] Upload image via API endpoint
- [ ] Delete image via API endpoint
- [ ] Verify storage quota is enforced
- [ ] Verify RLS policies block cross-tenant access
- [ ] Test with different image formats (jpg, png, webp)
- [ ] Test file size validation (reject > 10MB)
- [ ] Test invalid file types (reject non-images)
- [ ] Verify signed URLs expire after 1 hour
- [ ] Test lazy loading in gallery
- [ ] Test translations in all languages (en, nl, de)

---

## Future Enhancements

### Phase 2 (Optional)
- **Image Annotations**: Draw/markup on images
- **Image Comparison**: Side-by-side comparison
- **AI Image Analysis**: Detect defects, measure dimensions
- **Image Search**: Find parts by visual similarity
- **Automatic Thumbnails**: Server-side thumbnail generation
- **Image Compression**: Automatic compression on upload
- **EXIF Data Extraction**: Extract camera metadata
- **Image Versioning**: Track changes to images over time

---

## Files to Create/Modify

### Create New Files
- [ ] `supabase/migrations/YYYYMMDD_add_image_paths_to_parts.sql`
- [ ] `supabase/functions/api-parts-images/index.ts`
- [ ] `src/components/parts/ImageUpload.tsx`
- [ ] `src/components/parts/ImageGallery.tsx`
- [ ] `src/components/parts/ImageThumbnail.tsx`
- [ ] `src/components/parts/ImageLightbox.tsx`
- [ ] `src/hooks/usePartImages.ts`
- [ ] `src/lib/imageUtils.ts`
- [ ] `docs/PART_IMAGES_IMPLEMENTATION_PLAN.md` (this file)

### Modify Existing Files
- [ ] `src/components/admin/PartDetailModal.tsx` - Add images tab
- [ ] `src/pages/admin/Parts.tsx` - Add thumbnail column
- [ ] `src/pages/operator/OperatorTerminal.tsx` - Display images
- [ ] `src/pages/operator/WorkQueue.tsx` - Show thumbnails
- [ ] `src/i18n/locales/en/translation.json` - Add image translations
- [ ] `src/i18n/locales/nl/translation.json` - Add Dutch translations
- [ ] `src/i18n/locales/de/translation.json` - Add German translations
- [ ] `docs/API_DOCUMENTATION.md` - Add image endpoints
- [ ] `docs/HOW-THE-APP-WORKS.md` - Document image feature

---

## Estimated Timeline

- **Database Migration**: 30 minutes
- **Backend API Endpoints**: 2-3 hours
- **Frontend Components**: 4-5 hours
- **Integration & Testing**: 2-3 hours
- **Documentation**: 1 hour
- **Total**: ~10-12 hours

---

## Success Criteria

✅ Parts can have multiple images uploaded via UI
✅ Images display in admin and operator views
✅ Images can be uploaded/deleted via API
✅ Storage quota is enforced
✅ RLS policies prevent cross-tenant access
✅ All image formats (jpg, png, webp) supported
✅ File size validation works (max 10MB)
✅ Translations work in all languages
✅ Documentation is complete and accurate

---

**End of Plan**
