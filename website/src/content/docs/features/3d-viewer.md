---
title: "3D STEP Viewer"
description: "Documentation for 3D STEP Viewer"
---

## Overview

Eryxon Flow ships with a browser-rendered 3D STEP viewer for production use, plus an optional backend-assisted CAD path for richer geometry and PMI workflows.

The viewer always renders in the browser, but it can source geometry in two ways:

- browser-side STEP parsing for zero-extra-infrastructure deployments
- server-processed geometry and PMI payloads when a CAD backend is configured

## Features

✅ **STEP File Support**: Parse and render `.step` and `.stp` files
✅ **Interactive 3D Controls**: Orbit, zoom, and pan with mouse/touch
✅ **Exploded View**: Visualize assemblies with adjustable separation
✅ **Wireframe Mode**: Toggle between solid and wireframe rendering
✅ **Dynamic Grid**: Auto-sized grid based on model dimensions
✅ **Fit to View**: Automatically frame the model in the viewport
✅ **Measurement Tools**: Distance, thickness, angle, and radius measurements
✅ **PMI Overlay Support**: Show PMI when backend-extracted PMI data exists
✅ **File Management**: Upload, view, and delete CAD files
✅ **Multi-tenant**: Secure tenant-isolated file storage

## Technology Stack

### Dependencies
```json
{
  "three": "^0.180.0"
}
```

### Runtime Paths
- **Browser fallback**: STEP parsing in the browser through occt-import-js
- **Optional CAD backend**: server geometry and PMI extraction through the configurable CAD service

### Existing Dependencies
- `@radix-ui/react-dialog`: Modal dialogs
- `@radix-ui/react-slider`: Explosion factor control
- `lucide-react`: Icons
- `@supabase/supabase-js`: File storage
- `three-mesh-bvh`: accelerated raycasting for measurements

## Database Setup

### 1. Create Supabase Storage Bucket

Create a storage bucket called `parts-cad` for storing STEP files.

**Via Supabase Dashboard:**
1. Go to Storage > Buckets
2. Click "Create bucket"
3. Name: `parts-cad`
4. Public: `false` (private bucket - files accessed via signed URLs)
5. Click "Create bucket"

**Via SQL (Alternative):**
```sql
-- Create storage bucket for parts CAD files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parts-cad',
  'parts-cad',
  false,
  52428800, -- 50MB max file size
  ARRAY['application/step', 'application/stp', 'application/octet-stream']
);
```

### 2. Set Up Storage Policies

Add RLS (Row Level Security) policies for the `parts-cad` bucket:

```sql
-- Policy: Allow authenticated users to upload files to their tenant's folder
CREATE POLICY "Users can upload CAD files to their tenant folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parts-cad' AND
  (storage.foldername(name))[1] = get_user_tenant_id()::text
);

-- Policy: Allow authenticated users to read files from their tenant's folder
CREATE POLICY "Users can view CAD files from their tenant"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'parts-cad' AND
  (storage.foldername(name))[1] = get_user_tenant_id()::text
);

-- Policy: Allow authenticated users to delete files from their tenant's folder
CREATE POLICY "Users can delete CAD files from their tenant"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'parts-cad' AND
  (storage.foldername(name))[1] = get_user_tenant_id()::text
);
```

### 3. Verify Parts Table Schema

The `parts` table should already have the `file_paths` column (as TEXT[]). Verify it exists:

```sql
-- Check if file_paths column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'parts' AND column_name = 'file_paths';

-- If it doesn't exist, add it:
ALTER TABLE parts ADD COLUMN IF NOT EXISTS file_paths TEXT[];
```

### 4. Create Helper Function

Create a helper function to get user's tenant ID:

```sql
-- Function to get current user's tenant ID
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;
```

### Storage Structure

Files are stored in the following structure:
```
parts-cad/
  └── {tenant_id}/
      └── parts/
          └── {part_id}/
              ├── model_v1.step
              ├── assembly.stp
              └── ...
```

## Runtime Architecture

```
User opens Part Detail Modal
    ↓
Clicks on existing STEP file OR uploads new file
    ↓
File uploaded to Supabase storage: parts-cad/{tenant_id}/parts/{part_id}/
    ↓
File path saved to parts.file_paths[]
    ↓
User clicks "View 3D" button
    ↓
Create signed URL → Fetch as blob → Create blob URL
    ↓
Opens STEPViewer component in Dialog
    ↓
Initialize Three.js scene + controls + measurement subsystem
    ↓
If CAD backend geometry exists, prefer server geometry
    ↓
Otherwise parse STEP in browser and build meshes locally
    ↓
If PMI data exists, allow PMI overlay toggles
    ↓
Add scene content → Fit camera → Render loop
```

## File Structure

```
src/
├── components/
│   ├── STEPViewer.tsx              # 3D viewer component
│   └── admin/
│       └── PartDetailModal.tsx     # Modified - Added CAD file section
└── integrations/
    └── supabase/
        └── types.ts                # parts table types
```

## Key Components

### STEPViewer Component
**Location**: `/src/components/STEPViewer.tsx`

Main 3D viewer component with:
- Three.js scene initialization
- browser fallback STEP parsing
- server-geometry rendering path
- Interactive controls (orbit, zoom, pan)
- Feature toggles (wireframe, grid, exploded view)
- measurement toolbar and measurement panel
- optional PMI overlay rendering
- Loading states and error handling

**Props:**
```typescript
interface STEPViewerProps {
  url: string;
  title?: string;
  compact?: boolean;
  pmiData?: PMIData | null;
  serverGeometry?: GeometryData | null;
  preferServerGeometry?: boolean;
}
```

**Features:**
- 🎮 **Orbit Controls**: Click-drag to rotate, scroll to zoom, right-click-drag to pan
- 📦 **Exploded View**: Separate parts with adjustable factor (0-2x)
- 🔲 **Wireframe Mode**: Toggle between solid and wireframe rendering
- 📐 **Dynamic Grid**: Auto-sized based on model dimensions
- 🎯 **Fit to View**: Automatically center and frame the model
- 📏 **Measurements**: Point distance, face distance, face angle, and radius tools
- 🏷️ **PMI Overlay**: Toggle extracted PMI when available
- ⚡ **Optimized**: Efficient rendering with requestAnimationFrame and BVH picking

## Deployment Notes

- No CAD backend is required for baseline STEP viewing.
- A CAD backend is recommended when you want server-tessellated geometry, backend PMI extraction, or future advanced CAD workflows.
- The viewer remains tenant-safe because files are fetched from private storage via signed URLs.

## Related Docs

- [3D CAD Engine](/architecture/3d-engine/)
- [3D Viewer Measurements Plan](/engineering/3d-viewer-measurements-plan/)

### PartDetailModal (Modified)
**Location**: `/src/components/admin/PartDetailModal.tsx`

Added sections:
- **CAD Files Upload**: Drag-and-drop file uploader for .step/.stp files
- **CAD Files List**: Display existing files with View/Delete actions
- **3D Viewer Dialog**: Full-screen modal for STEPViewer component

## Usage

### For Administrators (Parts Management)

1. **Navigate to Parts Page**
   - Go to Admin Dashboard > Parts

2. **Open Part Detail**
   - Click on any part to open the detail modal

3. **Upload CAD Files**
   - Scroll to "3D CAD Files" section
   - Click "Choose STEP files" or drag-and-drop
   - Select .step or .stp files
   - Click "Upload"

4. **View 3D Model**
   - Click "View 3D" button next to any file
   - 3D viewer opens in full-screen modal

5. **Interact with 3D Model**
   - **Rotate**: Left-click and drag
   - **Zoom**: Scroll wheel
   - **Pan**: Right-click and drag
   - **Fit View**: Click "Fit View" button
   - **Wireframe**: Toggle wireframe mode
   - **Explode**: Toggle exploded view, adjust slider
   - **Grid**: Toggle grid visibility

6. **Delete Files**
   - Click trash icon next to file
   - Confirm deletion

## API Reference

### STEPViewer Component

```typescript
import { STEPViewer } from '@/components/STEPViewer';

<STEPViewer
  url="blob:http://localhost:5173/abc123"  // Blob URL to STEP file
  title="Bracket Assembly"                 // Optional display title
/>
```

## Security

### Tenant Isolation
- Files stored in tenant-specific folders: `{tenant_id}/parts/{part_id}/`
- RLS policies restrict access to user's tenant only
- Signed URLs expire after 1 hour

### File Validation
- Client-side: Only .step and .stp extensions allowed
- Server-side: RLS policies enforce tenant access
- MIME types: `application/step`, `application/stp`, `application/octet-stream`

### Storage Policies
All storage operations are protected by RLS policies that enforce tenant isolation.

## Performance Considerations

### File Size Limits
- **Maximum file size**: 50MB per file
- **Recommended**: Keep files under 10MB for optimal performance
- **Large assemblies**: Consider splitting into sub-assemblies

### Rendering Optimization
- Uses `requestAnimationFrame` for smooth rendering
- Damped controls reduce unnecessary re-renders
- Efficient geometry disposal on cleanup
- Anti-aliasing enabled for better visual quality

### Memory Management
- Blob URLs revoked on dialog close
- Three.js geometries and materials disposed on unmount
- Animation frame cancelled on cleanup

## Troubleshooting

### Issue: "Failed to load STEP parser library"
**Solution**: Check internet connection, occt-import-js CDN may be down

### Issue: "No geometry found in STEP file"
**Causes**:
- Corrupt STEP file
- Unsupported STEP version (AP242, AP214, etc.)
- Empty or invalid file

**Solution**: Verify file is valid STEP format, try re-exporting from CAD software

### Issue: Model appears off-center
**Solution**: Click "Fit View" button

### Issue: CORS errors
**Solution**: We fetch signed URLs as blobs to avoid CORS issues

### Issue: Memory leaks
**Solution**: Always revoke blob URLs when closing the viewer

## Testing Checklist

### Upload & Storage
- [ ] Upload single STEP file
- [ ] Upload multiple STEP files at once
- [ ] Reject non-STEP files (.pdf, .jpg, etc.)
- [ ] Files appear in parts-cad bucket
- [ ] File paths saved to parts.file_paths
- [ ] Tenant isolation works

### 3D Viewer
- [ ] STEP file loads and displays
- [ ] Model renders correctly with colors
- [ ] Camera controls work (orbit, zoom, pan)
- [ ] "Fit View" centers model
- [ ] Wireframe toggle works
- [ ] Grid toggle works
- [ ] Exploded view separates parts
- [ ] No console errors

### Performance
- [ ] Small files (<1MB) load quickly
- [ ] Medium files (1-5MB) load acceptably
- [ ] Large files (5-20MB) load without crashing
- [ ] Multiple open/close cycles don't leak memory
- [ ] Smooth rendering at 60fps

## References

- **Three.js Docs**: https://threejs.org/docs/
- **occt-import-js**: https://github.com/kovacsv/occt-import-js
- **Supabase Storage**: https://supabase.com/docs/guides/storage
