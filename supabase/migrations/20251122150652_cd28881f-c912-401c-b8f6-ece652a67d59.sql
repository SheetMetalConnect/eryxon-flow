-- Fix remaining trigger functions to set search_path

-- 1. Fix update_activity_search_vector
CREATE OR REPLACE FUNCTION public.update_activity_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.user_name, '') || ' ' ||
    coalesce(NEW.user_email, '') || ' ' ||
    coalesce(NEW.action, '') || ' ' ||
    coalesce(NEW.entity_type, '') || ' ' ||
    coalesce(NEW.entity_name, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END;
$$;

-- 2. Fix update_invitations_updated_at
CREATE OR REPLACE FUNCTION public.update_invitations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. Fix update_tenant_updated_at
CREATE OR REPLACE FUNCTION public.update_tenant_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;