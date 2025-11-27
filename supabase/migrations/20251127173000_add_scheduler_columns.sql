-- Migration: Add Scheduler Columns

-- Add capacity_hours_per_day to cells table
ALTER TABLE public.cells 
ADD COLUMN IF NOT EXISTS capacity_hours_per_day numeric DEFAULT 8;

-- Add timing and scheduling columns to operations table
ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS setup_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS run_time_per_unit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS wait_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS changeover_time numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_start timestamptz,
ADD COLUMN IF NOT EXISTS planned_end timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN public.cells.capacity_hours_per_day IS 'Daily capacity in hours for this cell';
COMMENT ON COLUMN public.operations.setup_time IS 'Setup time in minutes';
COMMENT ON COLUMN public.operations.run_time_per_unit IS 'Run time per unit in minutes';
COMMENT ON COLUMN public.operations.wait_time IS 'Wait time in minutes';
COMMENT ON COLUMN public.operations.changeover_time IS 'Changeover time in minutes';
