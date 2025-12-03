-- Add whitelabeling fields to tenants table
-- These fields allow premium/enterprise tenants to customize branding

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.logo_url IS 'Custom logo URL for whitelabeling (premium/enterprise only)';
COMMENT ON COLUMN public.tenants.app_name IS 'Custom application name for whitelabeling (premium/enterprise only)';
COMMENT ON COLUMN public.tenants.primary_color IS 'Custom primary color hex code for whitelabeling (premium/enterprise only)';
COMMENT ON COLUMN public.tenants.favicon_url IS 'Custom favicon URL for whitelabeling (premium/enterprise only)';
