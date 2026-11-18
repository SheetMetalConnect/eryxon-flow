-- Keep the scheduled pilot evaluator portable across hosted and self-hosted
-- Supabase projects. The deployment URL is operator configuration, not source.
CREATE OR REPLACE FUNCTION public.invoke_pilot_alert_evaluator()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url text;
  v_cron_secret text;
BEGIN
  SELECT decrypted_secret
    INTO v_base_url
    FROM vault.decrypted_secrets
   WHERE name = 'project_url'
   LIMIT 1;

  SELECT decrypted_secret
    INTO v_cron_secret
    FROM vault.decrypted_secrets
   WHERE name = 'pilot_alert_cron_secret'
   LIMIT 1;

  IF NULLIF(v_base_url, '') IS NULL OR NULLIF(v_cron_secret, '') IS NULL THEN
    RAISE WARNING 'pilot-alert-evaluator: vault secrets project_url and pilot_alert_cron_secret are required; skipping invocation';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := rtrim(v_base_url, '/') || '/functions/v1/pilot-alert-evaluator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object('lookback_ms', 900000)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'pilot-alert-evaluator invocation failed: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_pilot_alert_evaluator() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_pilot_alert_evaluator() TO service_role;
