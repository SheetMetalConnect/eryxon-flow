-- Rollback-only check of the function allowlist from 20260918140000.
BEGIN;
CREATE FUNCTION pg_temp.expect_error(statement text,expected_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE=expected_state THEN RETURN; END IF;
    RAISE EXCEPTION 'Expected %, got %: %',expected_state,SQLSTATE,SQLERRM;
  END;
  RAISE EXCEPTION 'Expected % but statement succeeded',expected_state;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.prosecdef AND p.proconfig IS NULL) THEN
    RAISE EXCEPTION 'SECURITY DEFINER function without search_path: %',
      (SELECT string_agg(p.proname,', ') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.prosecdef AND p.proconfig IS NULL);
  END IF;
END $$;
DO $$ BEGIN
  IF pg_get_functiondef('public.invoke_pilot_alert_evaluator()'::regprocedure)
       ~ 'https://[a-z0-9]+[.]supabase[.]co' THEN
    RAISE EXCEPTION 'pilot evaluator contains a deployment-specific Supabase URL';
  END IF;
END $$;
SET LOCAL ROLE anon;
SELECT public.instance_accepts_signups();
SELECT public.get_invitation_by_token('nope');
SELECT pg_temp.expect_error('SELECT public.list_operators()','42501');
SELECT pg_temp.expect_error('SELECT public.delete_tenant_data(gen_random_uuid())','42501');
SELECT pg_temp.expect_error('SELECT public.operator_clock_in(gen_random_uuid(),null)','42501');
SELECT pg_temp.expect_error('SELECT public.list_all_tenants()','42501');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.expect_error('SELECT public.delete_tenant_data(gen_random_uuid())','42501');
SELECT pg_temp.expect_error('SELECT public.handle_new_user()','42501');
SELECT pg_temp.expect_error('SELECT public.report_hosted_trial_summary(1,1)','42501');
SELECT has_function_privilege('authenticated','public.transition_operation(uuid,uuid,text,uuid,text)','EXECUTE') AS ok \gset
SELECT CASE WHEN :'ok'='t' THEN 1 ELSE 1/0 END;
SELECT has_function_privilege('authenticated','public.switch_operation(uuid,uuid,uuid,uuid,text)','EXECUTE') AS ok \gset
SELECT CASE WHEN :'ok'='t' THEN 1 ELSE 1/0 END;
RESET ROLE;
ROLLBACK;
