# 3D STEP Viewer - Database Setup Instructions

## Overview

This document describes the database changes required to enable 3D STEP file viewing for parts in the EryxonFlow system.

## Required Changes

### 1. Create Supabase Storage Bucket

You need to create a new storage bucket called `parts-cad` for storing STEP files.

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

### 4. Create Helper Function (Optional but Recommended)

Create a helper function to get user's tenant ID (if not already exists):

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

## Storage Structure

Files will be stored in the following structure:
```
parts-cad/
  └── {tenant_id}/
      └── parts/
          └── {part_id}/
              ├── model_v1.step
              ├── assembly.stp
              └── ...
```

## Database Schema Reference

### Parts Table
```typescript
parts: {
  id: string (UUID)                    // Primary key
  tenant_id: string (UUID)             // Multi-tenant support
  job_id: string (UUID)                // Foreign key to jobs
  part_number: string                  // Unique part identifier
  material: string                     // Material type
  quantity: number | null              // Quantity
  status: "not_started" | "in_progress" | "completed" | "on_hold"
  current_cell_id: string | null       // Current processing cell
  file_paths: string[] | null          // 🆕 Array of file paths (STEP files stored here)
  notes: string | null                 // Notes
  metadata: Json | null                // Custom metadata
  parent_part_id: string | null        // Assembly relationship
  created_at: string | null            // Created timestamp
  updated_at: string | null            // Updated timestamp
}
```

### File Path Format
```typescript
// Example file_paths entries:
[
  "abc123-tenant-id/parts/xyz789-part-id/bracket.step",
  "abc123-tenant-id/parts/xyz789-part-id/assembly.stp"
]
```

## Migration Script

Create a new migration file (e.g., `20251112_add_parts_cad_storage.sql`):

```sql
-- Migration: Add 3D CAD file storage for parts
-- Date: 2025-11-12

-- 1. Ensure file_paths column exists (should already exist from initial migration)
ALTER TABLE parts ADD COLUMN IF NOT EXISTS file_paths TEXT[];

-- 2. Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parts-cad',
  'parts-cad',
  false,
  52428800, -- 50MB max file size
  ARRAY['application/step', 'application/stp', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create helper function for tenant ID
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- 4. Storage policies for parts-cad bucket
CREATE POLICY "Users can upload CAD files to their tenant folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parts-cad' AND
  (storage.foldername(name))[1] = get_user_tenant_id()::text
);

CREATE POLICY "Users can view CAD files from their tenant"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'parts-cad' AND
  (storage.foldername(name))[1] = get_user_tenant_id()::text
);

CREATE POLICY "Users can delete CAD files from their tenant"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'parts-cad' AND
  (storage.foldername(name))[1] = get_user_tenant_id()::text
);

-- 5. Add index on file_paths for faster queries
CREATE INDEX IF NOT EXISTS idx_parts_file_paths ON parts USING GIN (file_paths);

-- 6. Add comment for documentation
COMMENT ON COLUMN parts.file_paths IS 'Array of storage paths for CAD files (STEP, STP) and other part documents';
```

## Testing the Setup

After running the migration, test the setup:

### 1. Test Bucket Creation
```sql
SELECT * FROM storage.buckets WHERE id = 'parts-cad';
```

### 2. Test Storage Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%CAD%';
```

### 3. Test File Upload (via application)
1. Go to Parts page
2. Open a part detail modal
3. Upload a .step or .stp file
4. Verify the file appears in the list
5. Click "View 3D" to test the viewer

### 4. Verify Storage
Check Supabase Dashboard > Storage > parts-cad bucket to see uploaded files.

## Security Considerations

1. **Tenant Isolation**: Files are stored in tenant-specific folders
2. **RLS Policies**: Users can only access files from their own tenant
3. **Signed URLs**: Files are accessed via time-limited signed URLs (1 hour expiration)
4. **File Type Validation**: Front-end validates only .step and .stp files
5. **File Size Limit**: Maximum 50MB per file

## Rollback

If you need to rollback these changes:

```sql
-- Remove storage policies
DROP POLICY IF EXISTS "Users can upload CAD files to their tenant folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view CAD files from their tenant" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete CAD files from their tenant" ON storage.objects;

-- Remove bucket (WARNING: This deletes all files!)
DELETE FROM storage.buckets WHERE id = 'parts-cad';

-- Optionally remove file_paths column (WARNING: This deletes all file path data!)
-- ALTER TABLE parts DROP COLUMN file_paths;
```

## Notes

- The `file_paths` column already existed in the schema from the initial migration
- It was previously unused, now repurposed for storing CAD file paths
- This approach uses the existing column rather than creating a separate documents table
- Files are stored with tenant isolation for multi-tenant security

## Support

For issues or questions:
- Check Supabase Storage logs in Dashboard > Storage > Logs
- Check browser console for client-side errors
- Check Network tab for failed file upload/download requests
