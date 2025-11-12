# 3D STEP Viewer Implementation Guide

## Overview

A browser-based 3D STEP file viewer integrated into the EryxonFlow parts management system. Built with React, Three.js, and occt-import-js to parse and render CAD models directly in the browser.

## Features

✅ **STEP File Support**: Parse and render .step and .stp files
✅ **Interactive 3D Controls**: Orbit, zoom, and pan with mouse/touch
✅ **Exploded View**: Visualize assemblies with adjustable separation
✅ **Wireframe Mode**: Toggle between solid and wireframe rendering
✅ **Dynamic Grid**: Auto-sized grid based on model dimensions
✅ **Fit to View**: Automatically frame the model in the viewport
✅ **File Management**: Upload, view, and delete CAD files
✅ **Multi-tenant**: Secure tenant-isolated file storage

## Technology Stack

### Dependencies Installed
```json
{
  "three": "^0.180.0"  // ✅ Installed
}
```

### External Libraries (CDN)
- **occt-import-js** (v0.0.23): STEP file parser loaded from CDN

### Existing Dependencies Used
- `@radix-ui/react-dialog`: Modal dialogs
- `@radix-ui/react-slider`: Explosion factor control
- `lucide-react`: Icons
- `@supabase/supabase-js`: File storage

## Architecture

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
STEPViewer loads occt-import-js from CDN
    ↓
Initializes Three.js scene (camera, renderer, lights, controls)
    ↓
Fetches STEP file → Convert to ArrayBuffer → Parse with occt-import-js
    ↓
Convert parsed meshes to Three.js geometry
    ↓
Add to scene → Fit camera → Render loop
```

## File Structure

```
src/
├── components/
│   ├── STEPViewer.tsx              # 🆕 3D viewer component
│   └── admin/
│       └── PartDetailModal.tsx     # ✏️ Modified - Added CAD file section
└── integrations/
    └── supabase/
        └── types.ts                # Existing - parts table types
```

## Key Components

### 1. STEPViewer Component
**Location**: `/src/components/STEPViewer.tsx`

Main 3D viewer component with:
- Three.js scene initialization
- STEP file parsing with occt-import-js
- Interactive controls (orbit, zoom, pan)
- Feature toggles (wireframe, grid, exploded view)
- Loading states and error handling

**Props:**
```typescript
interface STEPViewerProps {
  url: string;      // Blob URL to STEP file
  title?: string;   // Display title
}
```

**Features:**
- 🎮 **Orbit Controls**: Click-drag to rotate, scroll to zoom, right-click-drag to pan
- 📦 **Exploded View**: Separate parts with adjustable factor (0-2x)
- 🔲 **Wireframe Mode**: Toggle between solid and wireframe rendering
- 📐 **Dynamic Grid**: Auto-sized based on model dimensions
- 🎯 **Fit to View**: Automatically center and frame the model
- ⚡ **Optimized**: Efficient rendering with requestAnimationFrame

### 2. PartDetailModal (Modified)
**Location**: `/src/components/admin/PartDetailModal.tsx`

Added sections:
- **CAD Files Upload**: Drag-and-drop file uploader for .step/.stp files
- **CAD Files List**: Display existing files with View/Delete actions
- **3D Viewer Dialog**: Full-screen modal for STEPViewer component

**New Features:**
- `handleCADUpload()`: Upload STEP files to Supabase storage
- `handleViewCADFile()`: Open file in 3D viewer
- `handleDeleteCADFile()`: Delete file from storage
- `handleStepDialogClose()`: Cleanup blob URLs on close

## Data Flow

### File Upload Flow
```typescript
1. User selects .step/.stp file(s)
   ↓
2. handleCADUpload() validates file extensions
   ↓
3. Upload to Supabase: parts-cad/{tenant_id}/parts/{part_id}/{filename}
   ↓
4. Update parts.file_paths array with new paths
   ↓
5. Refresh part detail to show new files
```

### File Viewing Flow
```typescript
1. User clicks "View 3D" button
   ↓
2. Create signed URL (expires in 1 hour)
   ↓
3. Fetch signed URL as blob (avoids CORS)
   ↓
4. Create blob URL with URL.createObjectURL()
   ↓
5. Open STEPViewer dialog with blob URL
   ↓
6. STEPViewer parses and renders the file
   ↓
7. On close: URL.revokeObjectURL() to prevent memory leak
```

## Database Schema

### Parts Table
```sql
CREATE TABLE parts (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  job_id uuid NOT NULL,
  part_number text NOT NULL,
  material text NOT NULL,
  quantity integer,
  status text,
  current_cell_id uuid,
  file_paths text[],  -- 🆕 Used for storing CAD file paths
  notes text,
  metadata jsonb,
  parent_part_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Storage Structure
```
parts-cad/                           # Storage bucket
  └── {tenant_id}/                   # Tenant isolation
      └── parts/                     # Parts folder
          └── {part_id}/             # Part-specific folder
              ├── bracket.step       # STEP files
              ├── assembly.stp
              └── ...
```

## Implementation Details

### TypedArray Conversion (Critical)
```typescript
// ❌ WRONG - May cause Three.js errors
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

// ✅ CORRECT - Explicit Float32Array conversion
const typedVertices = vertices instanceof Float32Array
  ? vertices
  : new Float32Array(vertices);
geometry.setAttribute('position', new THREE.BufferAttribute(typedVertices, 3));
```

### Blob URL Management (Critical)
```typescript
// Create blob URL
const blobUrl = URL.createObjectURL(blob);

// Use in component...

// ⚠️ ALWAYS revoke when done (prevents memory leak)
URL.revokeObjectURL(blobUrl);
```

### Camera Controls Update (Critical)
```typescript
// ❌ WRONG - Camera won't look at center
camera.position.set(x, y, z);

// ✅ CORRECT - Update controls target and call update()
camera.position.set(x, y, z);
controls.target.copy(center);
controls.update(); // CRITICAL LINE
```

### CDN Library Loading
```typescript
script.onload = () => {
  // Add delay for library initialization
  setTimeout(() => {
    if (window.occtimportjs) {
      setLibrariesLoaded(true);
    }
  }, 500); // 500ms delay
};
```

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

### File Upload Handler

```typescript
const handleCADUpload = async () => {
  // 1. Validate file types (.step, .stp only)
  // 2. Upload to Supabase: parts-cad/{tenant}/{part_id}/{filename}
  // 3. Update parts.file_paths array
  // 4. Show success toast
  // 5. Refresh part data
};
```

### File Viewer Handler

```typescript
const handleViewCADFile = async (filePath: string) => {
  // 1. Create signed URL (1 hour expiration)
  // 2. Fetch as blob
  // 3. Create blob URL
  // 4. Open STEPViewer dialog
};
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
```sql
-- Users can only upload to their tenant's folder
CREATE POLICY "..." ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'parts-cad' AND
  (storage.foldername(name))[1] = get_user_tenant_id()::text
);
```

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
```typescript
// Add retry logic
const retryLoadLibrary = async (maxAttempts = 3) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await loadOcct();
      break;
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### Issue: "No geometry found in STEP file"
**Causes**:
- Corrupt STEP file
- Unsupported STEP version (AP242, AP214, etc.)
- Empty or invalid file

**Solution**: Verify file is valid STEP format, try re-exporting from CAD software

### Issue: Model appears off-center
**Solution**: Click "Fit View" button or press 'F' key
```typescript
fitCameraToMeshes(); // Automatically centers model
```

### Issue: CORS errors
**Solution**: We fetch signed URLs as blobs
```typescript
// ✅ This avoids CORS
const response = await fetch(signedUrl);
const blob = await response.blob();
const blobUrl = URL.createObjectURL(blob);
```

### Issue: Memory leaks
**Solution**: Always revoke blob URLs
```typescript
useEffect(() => {
  return () => {
    if (currentStepUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(currentStepUrl);
    }
  };
}, [currentStepUrl]);
```

## Testing Checklist

### Upload & Storage
- [ ] Upload single STEP file
- [ ] Upload multiple STEP files at once
- [ ] Reject non-STEP files (.pdf, .jpg, etc.)
- [ ] Files appear in parts-cad bucket
- [ ] File paths saved to parts.file_paths
- [ ] Tenant isolation works (can't see other tenant's files)

### 3D Viewer
- [ ] STEP file loads and displays
- [ ] Model renders correctly with colors
- [ ] Camera controls work (orbit, zoom, pan)
- [ ] "Fit View" centers model
- [ ] Wireframe toggle works
- [ ] Grid toggle works
- [ ] Exploded view separates parts
- [ ] Explosion slider adjusts separation
- [ ] No console errors

### Performance
- [ ] Small files (<1MB) load quickly
- [ ] Medium files (1-5MB) load acceptably
- [ ] Large files (5-20MB) load without crashing
- [ ] Multiple open/close cycles don't leak memory
- [ ] Smooth rendering at 60fps

### Browser Compatibility
- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works in Edge

## Future Enhancements

### Potential Features
- 📏 **Dimension Annotations**: Display measurements on model
- 📸 **Screenshot Export**: Save 3D view as PNG
- 🎨 **Custom Colors**: Override part colors
- 🔍 **Part Selection**: Click to select/highlight parts
- 📊 **BOM Integration**: Link 3D parts to bill of materials
- 💾 **Thumbnail Generation**: Auto-generate preview images
- 🔄 **File Versioning**: Track multiple versions of same file
- 📱 **Mobile Optimization**: Better touch controls

### Technical Improvements
- Cache parsed STEP files for faster re-opening
- Progressive loading for large assemblies
- Web Worker for parsing (keep UI responsive)
- WebGL 2.0 features (better rendering)

## References

- **Three.js Docs**: https://threejs.org/docs/
- **occt-import-js**: https://github.com/kovacsv/occt-import-js
- **OrbitControls**: https://threejs.org/docs/#examples/en/controls/OrbitControls
- **Supabase Storage**: https://supabase.com/docs/guides/storage

## Support

For issues or questions:
- Check browser console for errors
- Check Network tab for failed requests
- Review Supabase Storage logs
- Test with simple STEP file first (cube, cylinder)

## Summary

The 3D STEP viewer is now fully integrated into the parts management system:

✅ **Front-end**: STEPViewer component with full 3D controls
✅ **Integration**: Added to PartDetailModal with upload/view/delete
✅ **Storage**: Uses Supabase storage with tenant isolation
✅ **Security**: RLS policies enforce access control
✅ **Performance**: Optimized rendering and memory management

**Next Steps**: Run the database migration (see DATABASE_SETUP_3D_VIEWER.md)
