-- Migration: Add icon fields to cells and operations tables
-- Description: Adds icon_name field to support lucide-react icon selection

-- Add icon_name column to cells table (formerly stages)
ALTER TABLE cells
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

COMMENT ON COLUMN cells.icon_name IS 'Lucide-react icon name for visual representation (e.g., Factory, Settings, Wrench)';

-- Add icon_name column to operations table (formerly tasks)
ALTER TABLE operations
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

COMMENT ON COLUMN operations.icon_name IS 'Lucide-react icon name for operation type (e.g., Hammer, Cog, Drill)';

-- Add icon_name column to substeps table for granular icon support
ALTER TABLE substeps
ADD COLUMN IF NOT EXISTS icon_name VARCHAR(100);

COMMENT ON COLUMN substeps.icon_name IS 'Lucide-react icon name for substep visualization (e.g., CheckCircle, AlertTriangle)';

-- Create index for faster icon-based queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_cells_icon_name ON cells(icon_name) WHERE icon_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operations_icon_name ON operations(icon_name) WHERE icon_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_substeps_icon_name ON substeps(icon_name) WHERE icon_name IS NOT NULL;
