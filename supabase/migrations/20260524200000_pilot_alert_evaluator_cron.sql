-- ERY-93: scheduled execution path for the ERY-43 pilot alert evaluator.
--
-- Registers a pg_cron job that invokes the `pilot-alert-evaluator` edge
-- function on a fixed schedule, so ERY-40 alert evaluation runs without manual
-- invocation. The HTTP call carries the cron secret in the `x-cron-secret`
-- header (matching the function's authenticateCron model).
--
-- Deploy-gate prerequisites (set out-of-band, NOT committed):
--   - DB settings, applied by the operator before/after this migration:
--       ALTER DATABASE postgres SET app.pilot_alert.base_url   = 'https://<ref>.supabase.co';
--       ALTER DATABASE postgres SET app.pilot_alert.cron_secret = '<CRON_SECRET>';
--     (base_url falls back to the project URL already used by dispatch_webhook.)
--   - CRON_SECRET env var set on the pilot-alert-evaluator function, equal to
--     the app.pilot_alert.cron_secret setting above.
--   - pg_cron + pg_net enabled (already enabled in this project).
--
-- Idempotent: unschedules any prior job of the same name before re-registering.

CREATE OR REPLACE FUNCTION public.invoke_pilot_alert_evaluator()
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_base_url    text;
  v_cron_secret text;
BEGIN
  v_base_url    := coalesce(
                     current_setting('app.pilot_alert.base_url', true),
                     'https://vatgianzotsurljznsry.supabase.co');
  v_cron_secret := current_setting('app.pilot_alert.cron_secret', true);

  IF v_cron_secret IS NULL OR v_cron_secret = '' THEN
    RAISE WARNING 'pilot-alert-evaluator: app.pilot_alert.cron_secret not set; skipping invocation';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_base_url || '/functions/v1/pilot-alert-evaluator',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', v_cron_secret),
    body    := jsonb_build_object('lookback_ms', 900000)  -- 15 min window
  );
EXCEPTION WHEN OTHERS THEN
  -- Never let a scheduling failure break the cron worker.
  RAISE WARNING 'pilot-alert-evaluator invocation failed: %', SQLERRM;
END;
$$;

ALTER FUNCTION public.invoke_pilot_alert_evaluator() OWNER TO postgres;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'schedule') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pilot-alert-evaluator') THEN
      PERFORM cron.unschedule('pilot-alert-evaluator');
    END IF;

    -- Every 5 minutes; the function reads a rolling 15-minute window so a single
    -- missed tick still covers the same signals on the next run.
    PERFORM cron.schedule(
      'pilot-alert-evaluator',
      '*/5 * * * *',
      'SELECT public.invoke_pilot_alert_evaluator()'
    );

    RAISE NOTICE 'pilot-alert-evaluator cron job scheduled (*/5 * * * *)';
  ELSE
    RAISE NOTICE 'pg_cron extension not installed — skipping pilot-alert-evaluator scheduling.';
  END IF;
END $$;
