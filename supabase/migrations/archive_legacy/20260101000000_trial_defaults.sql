-- Set default trial end for new tenants (hosted alpha 30-day trial)
ALTER TABLE public.tenants
ALTER COLUMN trial_ends_at
SET DEFAULT (now() + interval '30 days');

-- Backfill trial end for existing trial tenants missing a date
UPDATE public.tenants
SET trial_ends_at = now() + interval '30 days'
WHERE status = 'trial'
  AND trial_ends_at IS NULL;

-- Ensure self-hosted tenants stay unlimited
UPDATE public.tenants
SET max_jobs = NULL,
    max_parts_per_month = NULL,
    max_storage_gb = NULL
WHERE self_hosted = TRUE;
