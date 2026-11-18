-- Self-hosted instances accept exactly one workshop; hosted instances keep accepting.
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
SET LOCAL app.hosted = 'false';
INSERT INTO public.tenants(name) VALUES ('First workshop');
DO $$ DECLARE r record; BEGIN
  SELECT plan, status, trial_ends_at, max_jobs, max_parts_per_month, max_storage_gb INTO r FROM public.tenants WHERE name = 'First workshop';
  IF r.plan <> 'enterprise' OR r.status <> 'active' OR r.trial_ends_at IS NOT NULL OR r.max_jobs IS NOT NULL OR r.max_parts_per_month IS NOT NULL OR r.max_storage_gb IS NOT NULL THEN
    RAISE EXCEPTION 'first workshop must be unlimited without trial';
  END IF;
END $$;
SELECT pg_temp.expect_error('INSERT INTO public.tenants(name) VALUES (''Second workshop'')','P0001');
DO $$ BEGIN IF public.instance_accepts_signups() THEN RAISE EXCEPTION 'single workshop must refuse signups'; END IF; END $$;
SET LOCAL app.hosted = 'true';
INSERT INTO public.tenants(name) VALUES ('Hosted workshop');
DO $$ BEGIN IF NOT public.instance_accepts_signups() THEN RAISE EXCEPTION 'hosted must accept signups'; END IF; END $$;
ROLLBACK;
