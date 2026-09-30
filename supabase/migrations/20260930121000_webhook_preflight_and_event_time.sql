-- Keep the existing dispatch signature as a wrapper for all current callers.
CREATE OR REPLACE FUNCTION public.dispatch_webhook(p_tenant_id uuid, p_event_type text, p_data jsonb, p_webhook_id uuid, p_event_id uuid, p_occurred_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' LIMIT 1;
  IF NULLIF(v_url, '') IS NULL OR NULLIF(v_secret, '') IS NULL THEN
    RAISE WARNING 'dispatch_webhook: vault secrets project_url and internal_service_secret are required; skipped %', p_event_type;
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := v_url || '/functions/v1/webhook-dispatch',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_secret),
    body := jsonb_build_object(
      'tenant_id', p_tenant_id, 'event', p_event_type, 'data', p_data,
      'event_id', COALESCE(p_event_id, gen_random_uuid()), 'occurred_at', COALESCE(p_occurred_at, now()),
      'webhook_id', p_webhook_id)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to dispatch webhook: %', SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_webhook(uuid, text, jsonb, uuid, uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_webhook(uuid, text, jsonb, uuid, uuid, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.dispatch_webhook(p_tenant_id uuid, p_event_type text, p_data jsonb, p_webhook_id uuid DEFAULT NULL, p_event_id uuid DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.dispatch_webhook(p_tenant_id, p_event_type, p_data, p_webhook_id, p_event_id, now());
$$;

CREATE OR REPLACE FUNCTION public.webhook_send_test(p_webhook_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.webhooks WHERE id = p_webhook_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Webhook not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.assert_tenant_admin(v_tenant);
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url' AND NULLIF(decrypted_secret, '') IS NOT NULL)
    OR NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'internal_service_secret' AND NULLIF(decrypted_secret, '') IS NOT NULL) THEN
    RAISE EXCEPTION 'Webhook dispatch is not configured. Configure Vault project_url and internal_service_secret using scripts/configure-webhook-vault.mjs; match INTERNAL_SERVICE_SECRET in the Edge runtime.' USING ERRCODE = '55000';
  END IF;
  PERFORM public.dispatch_webhook(v_tenant, 'webhook.test', jsonb_build_object('webhook_id', p_webhook_id, 'sent_by', auth.uid()), p_webhook_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.webhook_redeliver(p_delivery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_delivery public.webhook_deliveries%ROWTYPE;
  v_occurred_at timestamptz;
BEGIN
  SELECT * INTO v_delivery FROM public.webhook_deliveries WHERE id = p_delivery_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.assert_tenant_admin(v_delivery.tenant_id);
  BEGIN
    v_occurred_at := (v_delivery.payload->>'occurred_at')::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Cannot redeliver: original event occurred_at is invalid' USING ERRCODE = '22007';
  END;
  IF v_occurred_at IS NULL OR NOT isfinite(v_occurred_at) THEN
    RAISE EXCEPTION 'Cannot redeliver: original event occurred_at is missing or invalid' USING ERRCODE = '22007';
  END IF;
  PERFORM public.dispatch_webhook(v_delivery.tenant_id, v_delivery.event, v_delivery.payload->'data', v_delivery.webhook_id, v_delivery.event_id, v_occurred_at);
END;
$$;

-- Existing function privileges are preserved by CREATE OR REPLACE.
-- Rollback: restore the three five-argument/admin definitions from 20260918190000,
-- then drop only the new six-argument overload. No table data is changed here.
