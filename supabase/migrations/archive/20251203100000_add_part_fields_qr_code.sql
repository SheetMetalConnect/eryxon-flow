-- Add new fields to parts table for drawing number, CNC program reference, and priority (bullet card)
-- These fields support QR code generation for CNC operators and QRM priority tracking

ALTER TABLE public.parts
ADD COLUMN IF NOT EXISTS drawing_no TEXT,
ADD COLUMN IF NOT EXISTS cnc_program_name TEXT,
ADD COLUMN IF NOT EXISTS is_bullet_card BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.parts.drawing_no IS 'Drawing number reference for the part';
COMMENT ON COLUMN public.parts.cnc_program_name IS 'CNC program name for machine operators - generates QR code when set';
COMMENT ON COLUMN public.parts.is_bullet_card IS 'QRM bullet card - indicates rush/priority order';

-- Create index for bullet card filtering (commonly used for priority filtering)
CREATE INDEX IF NOT EXISTS idx_parts_is_bullet_card ON public.parts(tenant_id, is_bullet_card) WHERE is_bullet_card = true;

-- Create index for CNC program lookup
CREATE INDEX IF NOT EXISTS idx_parts_cnc_program_name ON public.parts(tenant_id, cnc_program_name) WHERE cnc_program_name IS NOT NULL;
