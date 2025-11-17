-- Add metadata column to operations table for flexible process-specific data
-- This allows operations to store bend sequences, welding parameters, machine settings, etc.

ALTER TABLE operations
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add index for metadata queries (useful for searching specific metadata fields)
CREATE INDEX IF NOT EXISTS idx_operations_metadata ON operations USING gin(metadata);

-- Add comment to document the metadata column
COMMENT ON COLUMN operations.metadata IS 'Flexible JSON metadata for process-specific settings like bend sequences, welding parameters, machine settings, assembly instructions, inspection requirements, etc.';
