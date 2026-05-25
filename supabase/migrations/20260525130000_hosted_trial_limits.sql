-- Hosted Trial plan: enforce usage limits + a 30-day window.
--
-- The hosted SaaS offers a 30-day Hosted Trial (plan = 'free'). Limits:
--   100 jobs, 500 parts/month, 2 GB storage. (API: 100/day, set by plan in
--   get_api_usage_stats — unchanged here.) Premium (legacy SaaS for internal /
--   select clients) and self-hosted deployments are unaffected.
--
-- New signups: handle_new_user inserts only (name, company_name, plan, status),
-- so the limits + trial end come from these column defaults.

alter table public.tenants alter column max_jobs set default 100;
alter table public.tenants alter column max_parts_per_month set default 500;
alter table public.tenants alter column max_storage_gb set default 2;
alter table public.tenants alter column trial_ends_at set default (now() + interval '30 days');

-- Backfill existing free tenants to a fresh 30-day trial + limits.
-- The new-signup webhook fires on tenants UPDATE; disable it for the bulk
-- write so we don't emit a notification per backfilled row.
alter table public.tenants disable trigger "notify-new-signup";

update public.tenants
set max_jobs = 100,
    max_parts_per_month = 500,
    max_storage_gb = 2,
    status = 'trial',
    trial_ends_at = now() + interval '30 days',
    updated_at = now()
where plan = 'free';

alter table public.tenants enable trigger "notify-new-signup";
