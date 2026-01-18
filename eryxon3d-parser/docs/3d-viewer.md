---
title: "3D STEP Viewer"
description: "Browser-based 3D viewer for STEP CAD files"
---

Browser-based 3D viewer for STEP files. Built with Three.js + occt-import-js for client-side rendering.

**Features:** Parse .step/.stp files, orbit/zoom/pan controls, exploded view, wireframe mode, auto-sized grid, tenant-isolated storage

**Stack:** Three.js, occt-import-js (CDN), Supabase Storage

See also: [3D Engine Architecture](/architecture/3d-engine/), [PMI Extraction](/features/pmi-extraction/)

## Setup

Storage bucket `parts-cad` with RLS policies for tenant isolation. Files stored at `{tenant_id}/parts/{part_id}/`.

See [Database Schema](/architecture/database/) for full setup.

## Flow

1. User opens Part Detail → uploads STEP file
2. File stored in Supabase Storage → path saved to `parts.file_paths[]`
3. Click "View 3D" → signed URL → blob fetch → STEPViewer component
4. occt-import-js parses → Three.js renders

## Usage

1. Admin → Parts → open part detail
2. Upload: "3D CAD Files" section → drag-drop or select .step/.stp
3. View: Click "View 3D" → full-screen viewer

**Controls:**
- **Rotate:** Left-click drag
- **Zoom:** Scroll wheel
- **Pan:** Right-click drag
- **Fit View / Wireframe / Explode / Grid:** Toolbar buttons

## Component

```typescript
import { STEPViewer } from '@/components/STEPViewer';
<STEPViewer url="blob:..." title="Bracket Assembly" />
```

## Limits

- Max file size: 50MB (recommend < 10MB)
- Signed URLs expire after 1 hour
- Only .step/.stp files accepted

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to load STEP parser" | Check internet - CDN may be down |
| "No geometry found" | Verify STEP format, try re-export |
| Model off-center | Click "Fit View" |
| CORS errors | Already handled via blob fetch |
