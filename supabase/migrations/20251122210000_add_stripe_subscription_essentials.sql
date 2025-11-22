-- =====================================================
-- Migration: Stripe Subscription Essentials
-- =====================================================
-- Minimal database changes to support Stripe integration
-- - Subscription status tracking
-- - Access control based on payment status
-- - Stripe customer/subscription references
-- - Billing event audit log
--
-- COMING SOON MODE: Only super admins can test billing
-- =====================================================

-- =====================================================
-- 1. EXTEND TENANTS TABLE
-- =====================================================

DO $$
BEGIN
  -- Stripe Integration
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.tenants ADD COLUMN stripe_customer_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE public.tenants ADD COLUMN stripe_subscription_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'stripe_price_id') THEN
    ALTER TABLE public.tenants ADD COLUMN stripe_price_id TEXT;
  END IF;

  -- Subscription dates for access control
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_current_period_start') THEN
    ALTER TABLE public.tenants ADD COLUMN subscription_current_period_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_current_period_end') THEN
    ALTER TABLE public.tenants ADD COLUMN subscription_current_period_end TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'trial_end') THEN
    ALTER TABLE public.tenants ADD COLUMN trial_end TIMESTAMPTZ;
  END IF;

  -- Payment failure handling
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'payment_failed_at') THEN
    ALTER TABLE public.tenants ADD COLUMN payment_failed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'grace_period_ends_at') THEN
    ALTER TABLE public.tenants ADD COLUMN grace_period_ends_at TIMESTAMPTZ;
  END IF;

  -- Billing enabled flag (super admin controls this)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'billing_enabled') THEN
    ALTER TABLE public.tenants ADD COLUMN billing_enabled BOOLEAN DEFAULT false;
  END IF;

  -- VAT number for EU compliance
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'vat_number') THEN
    ALTER TABLE public.tenants ADD COLUMN vat_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'billing_country_code') THEN
    ALTER TABLE public.tenants ADD COLUMN billing_country_code CHAR(2);
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription ON tenants(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_enabled ON tenants(billing_enabled) WHERE billing_enabled = true;

-- =====================================================
-- 2. SUBSCRIPTION EVENTS AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'upgraded', 'downgraded', 'payment_failed', 'cancelled', 'trial_started', etc.
  old_plan subscription_plan,
  new_plan subscription_plan,
  old_status subscription_status,
  new_status subscription_status,

  -- Stripe reference
  stripe_event_id TEXT UNIQUE,
  stripe_event_type TEXT,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON subscription_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe ON subscription_events(stripe_event_id) WHERE stripe_event_id IS NOT NULL;

-- RLS for subscription events
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's subscription events"
  ON public.subscription_events FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to check if tenant has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      -- Free tier always has access
      WHEN plan = 'free' THEN true

      -- Active subscription
      WHEN status = 'active' THEN true

      -- Trial period active
      WHEN status = 'trial' AND trial_end IS NOT NULL AND trial_end > NOW() THEN true

      -- Grace period for payment failures (7 days)
      WHEN status = 'suspended' AND grace_period_ends_at IS NOT NULL AND grace_period_ends_at > NOW() THEN true

      -- Otherwise no access
      ELSE false
    END
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- Function to get subscription access info
CREATE OR REPLACE FUNCTION public.get_subscription_access(p_tenant_id UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  reason TEXT,
  grace_period_ends TIMESTAMPTZ,
  trial_ends TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN plan = 'free' THEN true
      WHEN status = 'active' THEN true
      WHEN status = 'trial' AND trial_end > NOW() THEN true
      WHEN status = 'suspended' AND grace_period_ends_at > NOW() THEN true
      ELSE false
    END as has_access,

    CASE
      WHEN plan = 'free' THEN 'free_tier'
      WHEN status = 'active' THEN 'active_subscription'
      WHEN status = 'trial' AND trial_end > NOW() THEN 'trial_period'
      WHEN status = 'suspended' AND grace_period_ends_at > NOW() THEN 'payment_overdue'
      WHEN status = 'suspended' THEN 'payment_failed'
      WHEN status = 'cancelled' THEN 'subscription_cancelled'
      ELSE 'no_subscription'
    END as reason,

    grace_period_ends_at as grace_period_ends,
    trial_end as trial_ends
  FROM tenants
  WHERE id = p_tenant_id;
$$;

-- Function to log subscription events
CREATE OR REPLACE FUNCTION public.log_subscription_event(
  p_tenant_id UUID,
  p_event_type TEXT,
  p_old_plan subscription_plan DEFAULT NULL,
  p_new_plan subscription_plan DEFAULT NULL,
  p_old_status subscription_status DEFAULT NULL,
  p_new_status subscription_status DEFAULT NULL,
  p_stripe_event_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO subscription_events (
    tenant_id,
    event_type,
    old_plan,
    new_plan,
    old_status,
    new_status,
    stripe_event_id,
    metadata
  ) VALUES (
    p_tenant_id,
    p_event_type,
    p_old_plan,
    p_new_plan,
    p_old_status,
    p_new_status,
    p_stripe_event_id,
    p_metadata
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$;

-- =====================================================
-- 4. GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.has_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_subscription_event(UUID, TEXT, subscription_plan, subscription_plan, subscription_status, subscription_status, TEXT, JSONB) TO authenticated, service_role;

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON COLUMN public.tenants.stripe_customer_id IS 'Stripe customer ID for subscription management';
COMMENT ON COLUMN public.tenants.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN public.tenants.billing_enabled IS 'Super admin flag to enable billing for this tenant (coming soon mode gate)';
COMMENT ON COLUMN public.tenants.payment_failed_at IS 'Timestamp when last payment failed';
COMMENT ON COLUMN public.tenants.grace_period_ends_at IS 'Grace period end date after payment failure (7 days)';

COMMENT ON TABLE public.subscription_events IS 'Audit log of all subscription lifecycle events';
COMMENT ON FUNCTION public.has_active_subscription(UUID) IS 'Check if tenant has active subscription with access';
COMMENT ON FUNCTION public.get_subscription_access(UUID) IS 'Get detailed subscription access information';
COMMENT ON FUNCTION public.log_subscription_event IS 'Log subscription lifecycle events for audit trail';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This minimal migration supports:
-- ✅ Stripe subscription tracking
-- ✅ Access control based on payment status
-- ✅ Grace periods for payment failures
-- ✅ Trial period support
-- ✅ Audit logging
-- ✅ Coming soon mode (billing_enabled flag)
--
-- Next steps:
-- 1. Deploy edge functions (stripe-create-checkout, stripe-webhook, stripe-portal)
-- 2. Configure Stripe products in EUR
-- 3. Set up webhook endpoint
-- 4. Enable billing_enabled for test tenants only
-- =====================================================
