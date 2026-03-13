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
  "three": "^0.182.0",
  "three-mesh-bvh": "^0.9.9"
}
```

**Browser STEP parser** (loaded from CDN at runtime):
- `occt-import-js@0.0.23` via `https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js`
- Compiled with Emscripten (WASM + Web Workers)

> **Note:** Version `0.0.23` is pinned. Version `0.0.24` does not exist on the CDN and was previously referenced in error (fixed in commit `5cf7bd7`).

### Runtime Paths
- **Browser fallback** (default): STEP parsing in the browser through occt-import-js — no server required
- **Optional CAD backend**: server geometry and PMI extraction through the configurable CAD service

### Other Dependencies
- `@radix-ui/react-dialog`: Modal dialogs
- `@radix-ui/react-slider`: Explosion factor control
- `lucide-react`: Icons
- `@supabase/supabase-js`: File storage

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
  104857600, -- 100MB max file size
  ARRAY['model/step', 'model/stl', 'application/sla', 'application/octet-stream', 'model/3mf']
)
ON CONFLICT (id) DO NOTHING;
```

> **Note:** If you ran `supabase db push` and `seed.sql`, this bucket is already created by the migrations. This SQL is only needed for manual setup.

### 2. Storage Policies

The migrations create bucket-level RLS policies for authenticated users. These are applied automatically by `supabase db push` + `seed.sql`. For reference, the actual policies are:

```sql
-- Applied by migration 20260127230000_post_schema_setup.sql (idempotent)
CREATE POLICY "Authenticated users can upload CAD files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parts-cad');

CREATE POLICY "Authenticated users can view CAD files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'parts-cad');

CREATE POLICY "Authenticated users can delete CAD files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'parts-cad');
```

Tenant isolation is enforced at the application level through the folder structure (`{tenant_id}/parts/{part_id}/`) and signed URL generation, not at the storage policy level.

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
│   ├── STEPViewer.tsx              # Main 3D viewer component (1,827 lines)
│   ├── STEPViewerLazy.tsx          # Lazy-loaded wrapper with Suspense
│   └── viewer/
│       └── measurements/
│           ├── setupBVH.ts         # BVH acceleration installation
│           ├── types.ts            # Measurement type definitions
│           ├── useRaycastPicker.ts  # Raycasting and snap detection
│           ├── useMeasurements.ts   # Measurement state machine
│           ├── computations.ts      # Distance, angle, radius math
│           ├── annotations.ts       # Three.js annotation rendering
│           ├── MeasurementToolbar.tsx
│           └── MeasurementPanel.tsx
├── config/
│   └── cadBackend.ts               # CAD backend mode configuration
├── hooks/
│   └── useCADProcessing.ts         # CAD file processing with backend integration
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
- Client-side upload: `.step`, `.stp`, `.pdf` extensions (validated in `useFileUpload.ts` and `PartDetailModal.tsx`)
- Server-side storage bucket: `model/step`, `model/stl`, `application/sla`, `application/octet-stream`, `model/3mf` MIME types (bucket allows more formats than the client currently uses, for forward compatibility)
- RLS policies enforce tenant access

### Storage Policies
All storage operations are protected by RLS policies that enforce tenant isolation.

## Performance Considerations

### File Size Limits
- **Storage limit**: 100MB per file (bucket configuration)
- **Browser parsing limit**: ~50MB (browser-only mode; larger files may cause memory pressure)
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

## CSP Requirements

The STEP parser (occt-import-js) uses Emscripten/WASM and requires specific Content Security Policy directives. These are already set in the shipped `index.html` `<meta>` tag, but if your deployment adds CSP headers at the proxy level, ensure they include:

| Directive | Value | Reason |
|-----------|-------|--------|
| `script-src` | `'unsafe-eval'` | Emscripten embind uses `new Function()` |
| `script-src` | `'wasm-unsafe-eval'` | WASM compilation |
| `script-src` | `https://cdn.jsdelivr.net` | CDN for occt-import-js |
| `worker-src` | `'self' blob:` | Web Workers from blob URLs |

The default Nginx and Caddy configs shipped with the repo do **not** set CSP headers, so this only matters if you add custom CSP rules at the proxy level.

## Troubleshooting

### Issue: "Failed to load STEP parser library"

**Most common cause:** CSP (Content Security Policy) blocking. Check the browser console:

- **`EvalError: Refused to evaluate a string as JavaScript`** — your proxy is blocking `'unsafe-eval'`. Add it to `script-src` (required for Emscripten embind).
- **`Refused to create a worker from 'blob:...'`** — add `worker-src 'self' blob:` to your CSP.
- **`Failed to fetch` from cdn.jsdelivr.net** — ensure `https://cdn.jsdelivr.net` is allowed in `script-src`, or check network/firewall access.
- **None of the above** — check internet connectivity; the occt-import-js library is loaded from jsDelivr CDN at runtime.

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
**Solution**: The viewer automatically revokes blob URLs and disposes Three.js resources on close. If you see memory growth, ensure dialogs are properly unmounted.

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
