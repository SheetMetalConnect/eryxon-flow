-- A self-hosted installation serves one workshop: the first tenant is unlimited
-- and has no trial; further tenants are refused. The hosted service keeps plans,
-- trials and quotas and marks itself with the vault secret
--   SELECT vault.create_secret('true', 'hosted_mode');
-- Tests and local tooling may use SET LOCAL app.hosted = 'true' instead.
CREATE OR REPLACE FUNCTION public.is_hosted_instance()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_flag text := NULLIF(current_setting('app.hosted', true), '');
BEGIN
  IF v_flag IS NULL THEN
    SELECT decrypted_secret INTO v_flag FROM vault.decrypted_secrets WHERE name = 'hosted_mode' LIMIT 1;
  END IF;
  RETURN v_flag = 'true';
END;
$$;
REVOKE ALL ON FUNCTION public.is_hosted_instance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_hosted_instance() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_single_workshop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.is_hosted_instance() THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.tenants) THEN
    RAISE EXCEPTION 'This installation serves a single workshop. Ask its admin for an invitation.' USING ERRCODE = 'P0001';
  END IF;
  NEW.plan := 'enterprise';
  NEW.status := 'active';
  NEW.trial_ends_at := NULL;
  NEW.max_jobs := NULL;
  NEW.max_parts_per_month := NULL;
  NEW.max_storage_gb := NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_single_workshop BEFORE INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.protect_single_workshop();

-- Lets the sign-in page hide registration once the workshop exists.
CREATE OR REPLACE FUNCTION public.instance_accepts_signups()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_hosted_instance() OR NOT EXISTS (SELECT 1 FROM public.tenants);
$$;
REVOKE ALL ON FUNCTION public.instance_accepts_signups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.instance_accepts_signups() TO anon, authenticated, service_role;
