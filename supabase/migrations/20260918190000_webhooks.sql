-- Webhooks: one event source (database triggers), one delivery record, one signature.
-- Replaces three parallel emitters (activity-log triggers, edge functions, browser).

-- Endpoint configuration -----------------------------------------------------
ALTER TABLE public.webhooks
  ADD COLUMN name text,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN last_delivery_at timestamptz,
  ADD COLUMN last_status_code integer,
  ADD COLUMN consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN disabled_reason text,
  ALTER COLUMN active SET NOT NULL,
  ALTER COLUMN active SET DEFAULT true,
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT webhooks_url_https CHECK (url ~ '^https://') NOT VALID;
DELETE FROM public.webhooks WHERE url !~ '^https://';
ALTER TABLE public.webhooks VALIDATE CONSTRAINT webhooks_url_https;
UPDATE public.webhooks SET name = split_part(split_part(url, '://', 2), '/', 1) WHERE name IS NULL;
ALTER TABLE public.webhooks ALTER COLUMN name SET NOT NULL;
CREATE INDEX idx_webhooks_tenant_active ON public.webhooks (tenant_id) WHERE active;
CREATE TRIGGER webhooks_updated_at BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Delivery records replace webhook_logs (no tenant column, no outcome, no timing).
DROP TABLE public.webhook_logs;
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('delivered', 'failed')),
  status_code integer,
  attempts integer NOT NULL DEFAULT 1,
  latency_ms integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_deliveries_tenant_created ON public.webhook_deliveries (tenant_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries (webhook_id, created_at DESC);
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_deliveries_admin_read ON public.webhook_deliveries FOR SELECT
  USING (tenant_id = public.get_user_tenant_id() AND public.has_role((SELECT auth.uid()), 'admin'));
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;

-- Dispatch ---------------------------------------------------------------------
-- Posts one event to the webhook-dispatch Edge Function. p_webhook_id targets a
-- single endpoint (test ping, redelivery); NULL fans out to every subscriber.
CREATE OR REPLACE FUNCTION public.dispatch_webhook(p_tenant_id uuid, p_event_type text, p_data jsonb, p_webhook_id uuid DEFAULT NULL, p_event_id uuid DEFAULT NULL)
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
      'event_id', COALESCE(p_event_id, gen_random_uuid()), 'occurred_at', now(),
      'webhook_id', p_webhook_id)
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Failed to dispatch webhook: %', SQLERRM;
END;
$$;
DROP FUNCTION IF EXISTS public.dispatch_webhook(uuid, text, jsonb);
REVOKE ALL ON FUNCTION public.dispatch_webhook(uuid, text, jsonb, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_webhook(uuid, text, jsonb, uuid, uuid) TO service_role;

-- The activity log no longer fans out to webhooks; entity triggers below do.
CREATE OR REPLACE FUNCTION public.log_activity_and_webhook(p_tenant_id uuid, p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_entity_name text, p_description text, p_changes jsonb DEFAULT NULL, p_metadata jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_name text;
  v_user_email text;
BEGIN
  SELECT full_name, email INTO v_user_name, v_user_email FROM profiles WHERE id = p_user_id;
  INSERT INTO activity_log (tenant_id, user_id, user_name, user_email, action, entity_type, entity_id, entity_name, description, changes, metadata)
  VALUES (p_tenant_id, p_user_id, v_user_name, v_user_email, p_action, p_entity_type, p_entity_id, p_entity_name, p_description, COALESCE(p_changes, '{}'::jsonb), COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

-- Event catalogue: entity prefix + operation + status transition → event name.
CREATE OR REPLACE FUNCTION public.webhook_event_name(p_entity text, p_op text, p_old_status text, p_new_status text)
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_entity || '.' || CASE
    WHEN p_op = 'INSERT' THEN CASE WHEN p_entity = 'production' THEN 'reported' ELSE 'created' END
    WHEN p_op = 'DELETE' THEN 'deleted'
    WHEN p_old_status IS NOT DISTINCT FROM p_new_status THEN 'updated'
    WHEN p_entity = 'issue' THEN CASE WHEN p_new_status IN ('approved', 'rejected', 'closed') THEN 'resolved' ELSE 'updated' END
    WHEN p_new_status = 'in_progress' AND p_old_status = 'on_hold' THEN 'resumed'
    WHEN p_new_status = 'in_progress' THEN 'started'
    WHEN p_new_status = 'on_hold' THEN 'paused'
    WHEN p_new_status = 'completed' THEN 'completed'
    ELSE 'updated'
  END
$$;

-- One trigger for every event-bearing table. Skips the HTTP call when no active
-- endpoint of the tenant subscribes to the event.
CREATE OR REPLACE FUNCTION public.emit_webhook_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row jsonb := to_jsonb(COALESCE(NEW, OLD));
  v_entity text := CASE TG_TABLE_NAME
    WHEN 'jobs' THEN 'job' WHEN 'parts' THEN 'part' WHEN 'operations' THEN 'operation' WHEN 'issues' THEN 'issue'
    WHEN 'operation_batches' THEN 'batch' WHEN 'operation_quantities' THEN 'production' END;
  v_event text;
  v_tenant uuid := (v_row->>'tenant_id')::uuid;
  v_context jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND to_jsonb(OLD) - 'updated_at' - 'sync_hash' = to_jsonb(NEW) - 'updated_at' - 'sync_hash' THEN
    RETURN NULL;
  END IF;
  v_event := public.webhook_event_name(v_entity, TG_OP,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)->>'status' END, CASE WHEN TG_OP <> 'DELETE' THEN v_row->>'status' END);
  IF NOT EXISTS (SELECT 1 FROM public.webhooks WHERE tenant_id = v_tenant AND active AND v_event = ANY(events)) THEN
    RETURN NULL;
  END IF;
  IF TG_TABLE_NAME IN ('operations', 'issues', 'operation_quantities') THEN
    SELECT jsonb_build_object('operation_id', o.id, 'operation_name', o.operation_name, 'cell_id', o.cell_id, 'cell', c.name,
      'part_id', p.id, 'part_number', p.part_number, 'job_id', j.id, 'job_number', j.job_number, 'customer', j.customer)
    INTO v_context
    FROM public.operations o JOIN public.parts p ON p.id = o.part_id JOIN public.jobs j ON j.id = p.job_id LEFT JOIN public.cells c ON c.id = o.cell_id
    WHERE o.id = COALESCE((v_row->>'operation_id')::uuid, (v_row->>'id')::uuid);
  ELSIF TG_TABLE_NAME = 'parts' THEN
    SELECT jsonb_build_object('job_id', j.id, 'job_number', j.job_number, 'customer', j.customer) INTO v_context
    FROM public.jobs j WHERE j.id = (v_row->>'job_id')::uuid;
  ELSIF TG_TABLE_NAME = 'operation_batches' THEN
    SELECT jsonb_build_object('cell_id', c.id, 'cell', c.name) INTO v_context FROM public.cells c WHERE c.id = (v_row->>'cell_id')::uuid;
  END IF;
  PERFORM public.dispatch_webhook(v_tenant, v_event, jsonb_build_object(
    'record', v_row - 'sync_hash',
    'previous_status', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)->>'status' END,
    'context', COALESCE(v_context, '{}'::jsonb),
    'actor_id', auth.uid()));
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.emit_webhook_event() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS webhook_events ON public.jobs;
DROP TRIGGER IF EXISTS webhook_events ON public.parts;
DROP TRIGGER IF EXISTS webhook_events ON public.operations;
DROP TRIGGER IF EXISTS webhook_events ON public.issues;
DROP TRIGGER IF EXISTS webhook_events ON public.operation_batches;
DROP TRIGGER IF EXISTS webhook_events ON public.operation_quantities;
CREATE TRIGGER webhook_events AFTER INSERT OR UPDATE OR DELETE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.emit_webhook_event();
CREATE TRIGGER webhook_events AFTER INSERT OR UPDATE OR DELETE ON public.parts FOR EACH ROW EXECUTE FUNCTION public.emit_webhook_event();
CREATE TRIGGER webhook_events AFTER INSERT OR UPDATE OR DELETE ON public.operations FOR EACH ROW EXECUTE FUNCTION public.emit_webhook_event();
CREATE TRIGGER webhook_events AFTER INSERT OR UPDATE OR DELETE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.emit_webhook_event();
CREATE TRIGGER webhook_events AFTER INSERT OR UPDATE OR DELETE ON public.operation_batches FOR EACH ROW EXECUTE FUNCTION public.emit_webhook_event();
CREATE TRIGGER webhook_events AFTER INSERT OR DELETE ON public.operation_quantities FOR EACH ROW EXECUTE FUNCTION public.emit_webhook_event();

-- Admin actions ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.webhook_send_test(p_webhook_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.webhooks WHERE id = p_webhook_id;
  IF v_tenant IS NULL THEN RAISE EXCEPTION 'Webhook not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.assert_tenant_admin(v_tenant);
  PERFORM public.dispatch_webhook(v_tenant, 'webhook.test', jsonb_build_object('webhook_id', p_webhook_id, 'sent_by', auth.uid()), p_webhook_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.webhook_redeliver(p_delivery_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_delivery public.webhook_deliveries%ROWTYPE;
BEGIN
  SELECT * INTO v_delivery FROM public.webhook_deliveries WHERE id = p_delivery_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Delivery not found' USING ERRCODE = 'P0002'; END IF;
  PERFORM public.assert_tenant_admin(v_delivery.tenant_id);
  PERFORM public.dispatch_webhook(v_delivery.tenant_id, v_delivery.event, v_delivery.payload->'data', v_delivery.webhook_id, v_delivery.event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.webhook_send_test(uuid), public.webhook_redeliver(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.webhook_send_test(uuid), public.webhook_redeliver(uuid) TO authenticated, service_role;
