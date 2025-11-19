-- Migration: Add icon fields (if not exists safeguards)
-- Ensures icon_name columns exist on all relevant tables

ALTER TABLE cells
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

ALTER TABLE operations  
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

ALTER TABLE substeps
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

-- Add comments
COMMENT ON COLUMN cells.icon_name IS 'Lucide-react icon name for visual representation';
COMMENT ON COLUMN operations.icon_name IS 'Lucide-react icon name for operation type';
COMMENT ON COLUMN substeps.icon_name IS 'Lucide-react icon name for substep visualization';

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_cells_icon_name ON cells(icon_name) WHERE icon_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_icon_name ON operations(icon_name) WHERE icon_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_substeps_icon_name ON substeps(icon_name) WHERE icon_name IS NOT NULL;