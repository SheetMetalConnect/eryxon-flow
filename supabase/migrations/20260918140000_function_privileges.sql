-- Supabase security advisor: every SECURITY DEFINER function in public was
-- executable by anon and authenticated through the default privileges.
-- Allowlist instead: anon gets the pre-login set, authenticated gets the RPCs
-- the browser calls plus the RLS helpers, service_role keeps everything.
-- New RPCs need an explicit GRANT EXECUTE ... TO authenticated.
DO $$
DECLARE
  f record;
  sig text;
  anon_allowed text[] := ARRAY[
    'instance_accepts_signups','is_hosted_instance','get_invitation_by_token','accept_invitation',
    'get_user_tenant_id','has_role','get_user_role','owns_storage_object'];
  authenticated_allowed text[] := anon_allowed || ARRAY[
    'add_batch_operations','can_upload_file','cancel_invitation','check_next_cell_capacity',
    'clear_operator_session','create_machine_worker','create_operator_with_pin',
    'disable_demo_mode','dismiss_notification','enable_demo_mode','get_activity_logs','get_activity_stats','get_api_usage_stats','get_cell_qrm_metrics',
    'get_job_issue_summary','get_my_tenant_subscription','get_part_issue_summary','get_part_routing',
    'get_storage_quota','get_tenant_info','get_tenant_usage_stats','is_demo_mode','list_all_tenants',
    'list_operators','mark_all_notifications_read','mark_notification_read','reset_operator_pin','seed_default_scrap_reasons','set_active_tenant','time_entry_action',
    'toggle_notification_pin','transition_batch','transition_operation','unlock_operator',
    'update_tenant_storage_usage','verify_operator_pin',
    'seed_demo_operators','seed_demo_resources','seed_demo_operator_assignment','clear_demo_data'];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
    -- Invoker-context callers (SECURITY INVOKER trigger functions, RLS policies)
    -- run as the signed-in user and need the helper they call.
    IF f.proname = ANY (authenticated_allowed)
       OR EXISTS (SELECT 1 FROM pg_proc q JOIN pg_namespace m ON m.oid = q.pronamespace
                  WHERE m.nspname = 'public' AND NOT q.prosecdef AND q.prosrc ~ ('\m' || f.proname || '\M'))
       OR EXISTS (SELECT 1 FROM pg_policies pl
                  WHERE (coalesce(pl.qual, '') || coalesce(pl.with_check, '')) ~ ('\m' || f.proname || '\M')) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
    END IF;
    IF f.proname = ANY (anon_allowed) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f.sig);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY ARRAY[
    'public.update_batches_updated_at()','public.set_updated_at()',
    'public.update_factory_calendar_updated_at()','public.get_operation_scrap_analysis(uuid)']
  LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public', sig);
    END IF;
  END LOOP;
END $$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
