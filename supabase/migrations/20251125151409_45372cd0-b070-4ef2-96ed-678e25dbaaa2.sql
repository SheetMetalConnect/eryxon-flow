-- Add factory hours settings to tenants table
-- These are used to automatically stop time tracking at factory closing time

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS factory_opening_time TIME DEFAULT '07:00:00',
ADD COLUMN IF NOT EXISTS factory_closing_time TIME DEFAULT '17:00:00',
ADD COLUMN IF NOT EXISTS auto_stop_tracking BOOLEAN DEFAULT false;

-- Add comment to explain the columns
COMMENT ON COLUMN public.tenants.factory_opening_time IS 'Factory opening time (used for scheduling)';
COMMENT ON COLUMN public.tenants.factory_closing_time IS 'Factory closing time (used to auto-stop time tracking if enabled)';
COMMENT ON COLUMN public.tenants.auto_stop_tracking IS 'If true, automatically stop time tracking at factory closing time';