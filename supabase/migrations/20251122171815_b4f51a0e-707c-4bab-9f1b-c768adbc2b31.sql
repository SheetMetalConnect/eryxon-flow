-- Add NCR (Non-Conformance Report) fields to issues table
-- Add title field
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS title TEXT;

-- Add issue_type enum and column
DO $$ BEGIN
  CREATE TYPE public.issue_type AS ENUM ('general', 'ncr');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS issue_type public.issue_type DEFAULT 'general';

-- Add reported_by_id (references profiles)
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS reported_by_id UUID REFERENCES public.profiles(id);

-- Add NCR-specific category enum and column
DO $$ BEGIN
  CREATE TYPE public.ncr_category AS ENUM ('material_defect', 'dimensional', 'surface_finish', 'process_error', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS ncr_category public.ncr_category;

-- Add NCR-specific disposition enum and column
DO $$ BEGIN
  CREATE TYPE public.ncr_disposition AS ENUM ('scrap', 'rework', 'use_as_is', 'return_to_supplier');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS disposition public.ncr_disposition;

-- Add NCR text fields
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS root_cause TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS corrective_action TEXT;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS preventive_action TEXT;

-- Add affected quantity
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS affected_quantity INTEGER;

-- Add verification required flag
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT false;

-- Update search vector to include title
DROP TRIGGER IF EXISTS update_issues_search_vector ON public.issues;

CREATE OR REPLACE FUNCTION public.update_issues_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.title, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.severity::text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_issues_search_vector
  BEFORE INSERT OR UPDATE ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_issues_search_vector();