-- Add NCR-specific fields to issues table

-- Create issue_type enum
CREATE TYPE public.issue_type AS ENUM ('general', 'ncr');

-- Create ncr_category enum
CREATE TYPE public.ncr_category AS ENUM ('material_defect', 'dimensional', 'surface_finish', 'process_error', 'other');

-- Create disposition enum
CREATE TYPE public.disposition AS ENUM ('scrap', 'rework', 'use_as_is', 'return_to_supplier');

-- Add new columns to issues table
ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS issue_type issue_type DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS reported_by_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS ncr_category ncr_category,
  ADD COLUMN IF NOT EXISTS root_cause TEXT,
  ADD COLUMN IF NOT EXISTS corrective_action TEXT,
  ADD COLUMN IF NOT EXISTS preventive_action TEXT,
  ADD COLUMN IF NOT EXISTS affected_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS disposition disposition,
  ADD COLUMN IF NOT EXISTS verification_required BOOLEAN DEFAULT false;

-- Create index on issue_type for filtering
CREATE INDEX IF NOT EXISTS idx_issues_issue_type ON issues(issue_type);

-- Create index on reported_by_id for queries
CREATE INDEX IF NOT EXISTS idx_issues_reported_by_id ON issues(reported_by_id);

-- Update RLS policies to include reported_by_id
-- Drop existing operator insert policy
DROP POLICY IF EXISTS "Operators can create issues" ON public.issues;

-- Create new operator insert policy that allows setting reported_by_id
CREATE POLICY "Operators can create issues"
  ON public.issues FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() AND
    (created_by = auth.uid() OR reported_by_id = auth.uid())
  );
