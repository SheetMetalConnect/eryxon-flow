-- ============================================================================
-- PART 3: INVITATIONS & ONBOARDING SYSTEM
-- ============================================================================

-- Enhance tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Enhance profiles table for non-email operators
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_email_login BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pin_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id) WHERE employee_id IS NOT NULL;

-- Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON public.invitations(tenant_id, email) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON public.invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invitations in their tenant" ON public.invitations;
CREATE POLICY "Users can view invitations in their tenant" ON public.invitations
FOR SELECT USING (tenant_id = public.get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can create invitations in their tenant" ON public.invitations;
CREATE POLICY "Admins can create invitations in their tenant" ON public.invitations
FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update invitations in their tenant" ON public.invitations;
CREATE POLICY "Admins can update invitations in their tenant" ON public.invitations
FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can delete invitations in their tenant" ON public.invitations;
CREATE POLICY "Admins can delete invitations in their tenant" ON public.invitations
FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.get_user_role() = 'admin');

-- Invitation management functions
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_email TEXT, p_role public.app_role DEFAULT 'operator', p_tenant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := COALESCE(p_tenant_id, public.get_user_tenant_id());
  
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invitations';
  END IF;
  
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.profiles WHERE tenant_id = v_tenant_id AND email = p_email) THEN
    RAISE EXCEPTION 'User with this email already exists in your organization';
  END IF;
  
  v_token := encode(gen_random_bytes(32), 'base64');
  
  INSERT INTO public.invitations (tenant_id, email, role, token, invited_by)
  VALUES (v_tenant_id, p_email, p_role, v_token, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN v_invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID, email TEXT, role public.app_role, tenant_id UUID,
  tenant_name TEXT, invited_by_name TEXT, expires_at TIMESTAMPTZ, status TEXT
)
LANGUAGE SQL SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.id, i.email, i.role, i.tenant_id, t.name as tenant_name,
         p.full_name as invited_by_name, i.expires_at, i.status
  FROM public.invitations i
  JOIN public.tenants t ON t.id = i.tenant_id
  JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.token = p_token AND i.status = 'pending' AND i.expires_at > NOW();
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.invitations SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Trigger for invitations updated_at
CREATE OR REPLACE FUNCTION public.update_invitations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_invitations_updated_at ON public.invitations;
CREATE TRIGGER trigger_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_invitations_updated_at();