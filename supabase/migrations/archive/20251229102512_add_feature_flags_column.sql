-- Add feature_flags column to tenants table
-- This column stores per-tenant feature flag settings as JSONB
-- Default is empty object, which will fall back to all features enabled in the application code

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN public.tenants.feature_flags IS 'JSONB object storing feature flag settings. Keys: analytics, monitoring, shipping, operatorViews, integrations, issues, capacity, assignments. All default to true if not specified.';
