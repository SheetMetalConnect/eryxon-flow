-- dispatch_webhook signs outbound events with the internal secret. Only the
-- database's own SECURITY DEFINER triggers and the service role may call it;
-- the baseline had granted it to anon and authenticated.
REVOKE ALL ON FUNCTION public.dispatch_webhook(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_webhook(uuid, text, jsonb) TO service_role;
