-- Migration to improve NCR (issues) visibility and tracking
-- This migration adds indices and helper functions for better NCR performance

-- Add composite indices for better query performance
CREATE INDEX IF NOT EXISTS idx_issues_operation_id ON public.issues(operation_id);
CREATE INDEX IF NOT EXISTS idx_issues_tenant_status ON public.issues(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON public.issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_created_by ON public.issues(created_by);

-- Function to get issue counts and severity for a part
CREATE OR REPLACE FUNCTION public.get_part_issue_summary(part_id_param UUID)
RETURNS TABLE (
  total_count BIGINT,
  pending_count BIGINT,
  highest_severity public.issue_severity
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE i.status = 'pending')::BIGINT as pending_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE i.severity = 'critical') > 0 THEN 'critical'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'high') > 0 THEN 'high'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'medium') > 0 THEN 'medium'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'low') > 0 THEN 'low'::public.issue_severity
      ELSE NULL
    END as highest_severity
  FROM public.issues i
  INNER JOIN public.operations o ON i.operation_id = o.id
  WHERE o.part_id = part_id_param;
$$;

-- Function to get issue counts and severity for a job
CREATE OR REPLACE FUNCTION public.get_job_issue_summary(job_id_param UUID)
RETURNS TABLE (
  total_count BIGINT,
  pending_count BIGINT,
  highest_severity public.issue_severity
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    COUNT(*)::BIGINT as total_count,
    COUNT(*) FILTER (WHERE i.status = 'pending')::BIGINT as pending_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE i.severity = 'critical') > 0 THEN 'critical'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'high') > 0 THEN 'high'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'medium') > 0 THEN 'medium'::public.issue_severity
      WHEN COUNT(*) FILTER (WHERE i.severity = 'low') > 0 THEN 'low'::public.issue_severity
      ELSE NULL
    END as highest_severity
  FROM public.issues i
  INNER JOIN public.operations o ON i.operation_id = o.id
  INNER JOIN public.parts p ON o.part_id = p.id
  WHERE p.job_id = job_id_param;
$$;

-- Create a view for easy issue tracking with full context
CREATE OR REPLACE VIEW public.issues_with_context AS
SELECT
  i.*,
  o.operation_name,
  o.part_id,
  p.part_number,
  p.job_id,
  j.job_number,
  j.customer,
  creator.full_name as creator_name,
  reviewer.full_name as reviewer_name
FROM public.issues i
INNER JOIN public.operations o ON i.operation_id = o.id
INNER JOIN public.parts p ON o.part_id = p.id
INNER JOIN public.jobs j ON p.job_id = j.id
LEFT JOIN public.profiles creator ON i.created_by = creator.id
LEFT JOIN public.profiles reviewer ON i.reviewed_by = reviewer.id;

-- Grant permissions on the view
ALTER VIEW public.issues_with_context OWNER TO postgres;

-- RLS policy for the view (inherits from base tables)
-- No need for explicit RLS on views as it uses base table policies

-- Create storage bucket for issue images if it doesn't exist
-- Note: This needs to be run manually in Supabase dashboard or via API
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('issues', 'issues', false)
-- ON CONFLICT (id) DO NOTHING;

-- Comment for documentation
COMMENT ON FUNCTION public.get_part_issue_summary IS
'Returns issue count summary for a given part including total count, pending count, and highest severity level';

COMMENT ON FUNCTION public.get_job_issue_summary IS
'Returns issue count summary for a given job including total count, pending count, and highest severity level across all parts';

COMMENT ON VIEW public.issues_with_context IS
'Provides a complete view of issues with related job, part, and operation context for easier reporting and tracking';
