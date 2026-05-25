-- Hosted-trial reporting pack (ERY-94, follows ERY-88 telemetry decision).
--
-- Goal: give root-admin / internal reporting a privacy-safe, aggregate-only
-- view of hosted-trial health built ONLY from internal signals we already
-- control (tenants, subscription_events, activity_log). No third-party
-- analytics, and no tenant-identifying detail ever leaves this boundary --
-- the function returns counts and timestamps only, never names, emails,
-- ids, plans-per-tenant, or contract detail.
--
-- Trial cohort definition (documented proxy):
--   A tenant is treated as a hosted trial when `trial_ends_at IS NOT NULL`
--   and it has not cancelled. `tenants.status` carries the lifecycle marker
--   ('trial' = live trial, 'expired' = lapsed trial, 'active' = converted).
--   We do NOT use `billing_enabled` as a discriminator: in the current
--   hosted data every tenant has billing disabled, so it carries no signal.
--
-- Activation proxy (documented):
--   A trial is "activated" once it produces its first pilot-critical product
--   event in activity_log. We treat the production-work entity types as
--   activation evidence: job(s), operation(s), part(s), quantity, time_entry,
--   issue. Pure setup/admin events (cells, profiles) do not count. The
--   activity_log trigger writes both singular ('job') and plural ('jobs')
--   entity_type values depending on the source path, so both are matched.

CREATE OR REPLACE FUNCTION public.report_hosted_trial_summary(
  p_new_trial_window_days integer DEFAULT 14,
  p_expiring_window_days integer DEFAULT 7
)
RETURNS TABLE(
  generated_at timestamp with time zone,
  new_trial_window_days integer,
  expiring_window_days integer,
  new_trials_in_window bigint,
  trials_live bigint,
  trials_expiring_soon bigint,
  trials_lapsed_unconverted bigint,
  trials_converted_active bigint,
  trial_to_active_transitions bigint,
  trial_to_cancelled_transitions bigint,
  trials_activated bigint,
  trials_not_yet_activated bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamp with time zone := now();
  v_new_window interval := make_interval(days => GREATEST(p_new_trial_window_days, 0));
  v_expiring_window interval := make_interval(days => GREATEST(p_expiring_window_days, 0));
BEGIN
  IF NOT public.is_root_admin() THEN
    RAISE EXCEPTION 'Only root administrators can run hosted-trial reporting';
  END IF;

  RETURN QUERY
  WITH trial_cohort AS (
    -- Non-cancelled tenants that were provisioned with a trial window.
    SELECT t.id, t.status::text AS status, t.trial_ends_at, t.created_at
    FROM public.tenants t
    WHERE t.trial_ends_at IS NOT NULL
      AND t.status::text <> 'cancelled'
  ),
  activated_trials AS (
    -- Trials with at least one pilot-critical production event.
    SELECT DISTINCT al.tenant_id
    FROM public.activity_log al
    JOIN trial_cohort tc ON tc.id = al.tenant_id
    WHERE al.entity_type IN (
      'job', 'jobs',
      'operation', 'operations',
      'part', 'parts',
      'quantity', 'time_entry', 'issue'
    )
  ),
  transitions AS (
    -- Status transitions recorded in subscription_events within the window.
    -- Empty today, but correct once subscription events start flowing.
    SELECT se.new_status::text AS new_status
    FROM public.subscription_events se
    WHERE se.old_status::text = 'trial'
      AND se.created_at >= v_now - v_new_window
  )
  SELECT
    v_now AS generated_at,
    p_new_trial_window_days AS new_trial_window_days,
    p_expiring_window_days AS expiring_window_days,
    (SELECT count(*) FROM trial_cohort tc
       WHERE tc.created_at >= v_now - v_new_window) AS new_trials_in_window,
    (SELECT count(*) FROM trial_cohort tc
       WHERE tc.status = 'trial'
         AND tc.trial_ends_at > v_now + v_expiring_window) AS trials_live,
    (SELECT count(*) FROM trial_cohort tc
       WHERE tc.status = 'trial'
         AND tc.trial_ends_at > v_now
         AND tc.trial_ends_at <= v_now + v_expiring_window) AS trials_expiring_soon,
    (SELECT count(*) FROM trial_cohort tc
       WHERE tc.status IN ('trial', 'expired')
         AND tc.trial_ends_at <= v_now) AS trials_lapsed_unconverted,
    (SELECT count(*) FROM trial_cohort tc
       WHERE tc.status = 'active') AS trials_converted_active,
    (SELECT count(*) FROM transitions WHERE new_status = 'active') AS trial_to_active_transitions,
    (SELECT count(*) FROM transitions WHERE new_status = 'cancelled') AS trial_to_cancelled_transitions,
    (SELECT count(*) FROM activated_trials) AS trials_activated,
    (SELECT count(*) FROM trial_cohort tc
       WHERE tc.status IN ('trial', 'expired')
         AND tc.id NOT IN (SELECT tenant_id FROM activated_trials)) AS trials_not_yet_activated;
END;
$$;

ALTER FUNCTION public.report_hosted_trial_summary(integer, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.report_hosted_trial_summary(integer, integer) IS
  'Root-admin only. Aggregate-only hosted-trial reporting packet (ERY-94). Returns counts and timestamps from tenants/subscription_events/activity_log; never tenant-identifying detail. Safe basis for the sanitized weekly trial summary.';

-- Match the access pattern of list_all_tenants(): callable by app roles, but
-- the body hard-guards on is_root_admin() so only root admins get data.
GRANT EXECUTE ON FUNCTION public.report_hosted_trial_summary(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_hosted_trial_summary(integer, integer) TO service_role;
