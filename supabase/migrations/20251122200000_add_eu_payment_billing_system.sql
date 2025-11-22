-- =====================================================
-- Migration: EU Payment & Billing System
-- =====================================================
-- Adds complete payment and billing infrastructure for:
-- - Invoice-based billing (primary)
-- - Stripe with iDEAL integration
-- - SumUp integration (alternative)
-- - Coming Soon waitlist
-- - VAT validation and compliance
--
-- Target Market: EU Only, EUR Currency, B2B Only
-- =====================================================

-- =====================================================
-- 1. ENUMS
-- =====================================================

-- Payment provider types
CREATE TYPE IF NOT EXISTS public.payment_provider AS ENUM ('invoice', 'stripe', 'sumup');

-- Payment transaction types
CREATE TYPE IF NOT EXISTS public.payment_transaction_type AS ENUM ('charge', 'refund', 'chargeback', 'dispute');

-- Payment transaction status
CREATE TYPE IF NOT EXISTS public.payment_transaction_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'cancelled');

-- Invoice payment status
CREATE TYPE IF NOT EXISTS public.invoice_payment_status AS ENUM ('pending', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded');

-- Waitlist status
CREATE TYPE IF NOT EXISTS public.waitlist_status AS ENUM ('pending', 'approved', 'rejected', 'converted');

-- =====================================================
-- 2. BILLING WAITLIST (Coming Soon Mode)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.billing_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Company Information
  company_name TEXT NOT NULL,
  vat_number TEXT NOT NULL,
  company_registration_number TEXT,

  -- Contact Information
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Business Details
  country_code CHAR(2) NOT NULL CHECK (country_code IN (
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR',
    'DE','GR','HU','IE','IT','LV','LT','LU','MT','NL',
    'PL','PT','RO','SK','SI','ES','SE'
  )),
  industry TEXT,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '501+')),

  -- Preferred Payment Method
  preferred_payment_method payment_provider DEFAULT 'invoice',

  -- Plan Selection
  interested_plan subscription_plan DEFAULT 'pro',

  -- VAT Validation
  vat_valid BOOLEAN DEFAULT false,
  vat_validated_at TIMESTAMPTZ,
  vat_company_name TEXT,
  vat_company_address TEXT,

  -- Status
  status waitlist_status DEFAULT 'pending',
  converted_to_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,

  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for waitlist
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON billing_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_country ON billing_waitlist(country_code);
CREATE INDEX IF NOT EXISTS idx_waitlist_vat ON billing_waitlist(vat_number);
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON billing_waitlist(created_at DESC);

-- RLS for waitlist (admins can view all, users can only insert)
ALTER TABLE public.billing_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert waitlist entries"
  ON public.billing_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all waitlist entries"
  ON public.billing_waitlist FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update waitlist entries"
  ON public.billing_waitlist FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 3. VAT VALIDATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.vat_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  vat_number TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,

  -- VIES Response
  is_valid BOOLEAN NOT NULL,
  company_name TEXT,
  company_address TEXT,

  -- Validation Details
  validated_at TIMESTAMPTZ DEFAULT NOW(),
  vies_request_id TEXT,

  -- Caching (re-validate every 30 days)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Associated Records
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  waitlist_id UUID REFERENCES public.billing_waitlist(id) ON DELETE SET NULL,

  -- Metadata
  raw_response JSONB
);

CREATE INDEX IF NOT EXISTS idx_vat_validations_number ON vat_validations(vat_number);
CREATE INDEX IF NOT EXISTS idx_vat_validations_expires ON vat_validations(expires_at);
CREATE INDEX IF NOT EXISTS idx_vat_validations_tenant ON vat_validations(tenant_id);

-- RLS for VAT validations
ALTER TABLE public.vat_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's VAT validations"
  ON public.vat_validations FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- 4. PAYMENT METHODS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Provider Details
  provider payment_provider NOT NULL,
  is_primary BOOLEAN DEFAULT false,

  -- Stripe
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  stripe_payment_method_type TEXT, -- 'ideal', 'sepa_debit', 'card'

  -- SumUp
  sumup_merchant_code TEXT,
  sumup_customer_id TEXT,

  -- Invoice
  invoice_billing_email TEXT,
  invoice_payment_terms INTEGER DEFAULT 30, -- Net 30, 60, etc.

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'failed')),
  last_used_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX IF NOT EXISTS idx_payment_methods_primary ON payment_methods(tenant_id, is_primary) WHERE is_primary = true;

-- RLS for payment methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's payment methods"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage their tenant's payment methods"
  ON public.payment_methods FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  );

-- =====================================================
-- 5. INVOICES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Invoice Details
  invoice_number TEXT UNIQUE NOT NULL, -- Format: INV-2025-001234
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Amounts (in cents to avoid floating point issues)
  subtotal_cents INTEGER NOT NULL,
  vat_rate DECIMAL(5,2), -- e.g., 21.00 for 21% VAT
  vat_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Currency
  currency CHAR(3) DEFAULT 'EUR' CHECK (currency = 'EUR'),

  -- Payment Details
  payment_status invoice_payment_status DEFAULT 'pending',
  payment_method payment_provider,
  paid_at TIMESTAMPTZ,

  -- Stripe Reference
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  -- SumUp Reference
  sumup_transaction_id TEXT,
  sumup_checkout_id TEXT,

  -- Invoice Content
  line_items JSONB NOT NULL, -- Array of {description, quantity, unit_price_cents, total_cents}

  -- Customer Details (snapshot at invoice time)
  customer_name TEXT NOT NULL,
  customer_vat_number TEXT,
  customer_address JSONB,

  -- Reverse Charge VAT (B2B intra-EU)
  is_reverse_charge BOOLEAN DEFAULT true,

  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Email tracking
  sent_at TIMESTAMPTZ,
  sent_to TEXT,
  viewed_at TIMESTAMPTZ,

  -- Overdue handling
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage their tenant's invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  );

-- =====================================================
-- 6. PAYMENT TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

  -- Transaction Details
  provider payment_provider NOT NULL,
  transaction_type payment_transaction_type NOT NULL,

  -- Amount
  amount_cents INTEGER NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',

  -- Fees
  fee_cents INTEGER DEFAULT 0,
  net_cents INTEGER, -- amount - fee

  -- Status
  status payment_transaction_status DEFAULT 'pending',

  -- Provider References
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  sumup_transaction_code TEXT,

  -- Payment Method Details
  payment_method_type TEXT, -- 'ideal', 'sepa_debit', 'card', 'bank_transfer'
  payment_method_last4 TEXT,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,

  -- Failure Info
  failure_code TEXT,
  failure_message TEXT,

  -- Metadata
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON payment_transactions(provider);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON payment_transactions(created_at DESC);

-- RLS for transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Admins can manage their tenant's transactions"
  ON public.payment_transactions FOR ALL
  TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id()
    AND public.get_user_role() = 'admin'
  );

-- =====================================================
-- 7. EXTEND TENANTS TABLE
-- =====================================================

-- Add EU B2B and payment-related columns to tenants
DO $$
BEGIN
  -- Company Details (EU B2B)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'vat_number') THEN
    ALTER TABLE public.tenants ADD COLUMN vat_number TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'company_registration_number') THEN
    ALTER TABLE public.tenants ADD COLUMN company_registration_number TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'legal_entity_name') THEN
    ALTER TABLE public.tenants ADD COLUMN legal_entity_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'billing_address') THEN
    ALTER TABLE public.tenants ADD COLUMN billing_address JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'billing_country_code') THEN
    ALTER TABLE public.tenants ADD COLUMN billing_country_code CHAR(2);
  END IF;

  -- Payment Provider IDs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'stripe_customer_id') THEN
    ALTER TABLE public.tenants ADD COLUMN stripe_customer_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'stripe_subscription_id') THEN
    ALTER TABLE public.tenants ADD COLUMN stripe_subscription_id TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'sumup_merchant_code') THEN
    ALTER TABLE public.tenants ADD COLUMN sumup_merchant_code TEXT UNIQUE;
  END IF;

  -- Payment Preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'preferred_payment_method') THEN
    ALTER TABLE public.tenants ADD COLUMN preferred_payment_method payment_provider DEFAULT 'invoice';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'payment_terms') THEN
    ALTER TABLE public.tenants ADD COLUMN payment_terms INTEGER DEFAULT 30;
  END IF;

  -- Subscription Details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_starts_at') THEN
    ALTER TABLE public.tenants ADD COLUMN subscription_starts_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_renews_at') THEN
    ALTER TABLE public.tenants ADD COLUMN subscription_renews_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'subscription_cancelled_at') THEN
    ALTER TABLE public.tenants ADD COLUMN subscription_cancelled_at TIMESTAMPTZ;
  END IF;

  -- Trial
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'trial_start_date') THEN
    ALTER TABLE public.tenants ADD COLUMN trial_start_date TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'trial_end_date') THEN
    ALTER TABLE public.tenants ADD COLUMN trial_end_date TIMESTAMPTZ;
  END IF;

  -- Credit Limit (for invoice customers)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'credit_limit_cents') THEN
    ALTER TABLE public.tenants ADD COLUMN credit_limit_cents INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'credit_check_passed') THEN
    ALTER TABLE public.tenants ADD COLUMN credit_check_passed BOOLEAN DEFAULT false;
  END IF;

  -- Account Manager
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'account_manager_id') THEN
    ALTER TABLE public.tenants ADD COLUMN account_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for new tenant fields
CREATE INDEX IF NOT EXISTS idx_tenants_vat ON tenants(vat_number) WHERE vat_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_payment_method ON tenants(preferred_payment_method);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_country ON tenants(billing_country_code);

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to generate unique invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  invoice_num TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');

  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d{6})') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';

  -- Format: INV-2025-001234
  invoice_num := 'INV-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');

  RETURN invoice_num;
END;
$$;

-- Function to calculate VAT amount
CREATE OR REPLACE FUNCTION public.calculate_vat(
  subtotal_cents INTEGER,
  vat_number TEXT,
  country_code CHAR(2)
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vat_amount INTEGER;
  vat_rate DECIMAL(5,2);
BEGIN
  -- If valid VAT number provided, reverse charge applies (0% VAT)
  IF vat_number IS NOT NULL AND LENGTH(vat_number) > 0 THEN
    RETURN 0;
  END IF;

  -- Get VAT rate for country (simplified - should be a lookup table)
  vat_rate := CASE country_code
    WHEN 'DE' THEN 19.00
    WHEN 'NL' THEN 21.00
    WHEN 'FR' THEN 20.00
    WHEN 'IT' THEN 22.00
    WHEN 'ES' THEN 21.00
    WHEN 'BE' THEN 21.00
    WHEN 'PL' THEN 23.00
    WHEN 'SE' THEN 25.00
    ELSE 21.00 -- Default EU average
  END;

  vat_amount := ROUND(subtotal_cents * vat_rate / 100.0);

  RETURN vat_amount;
END;
$$;

-- Function to get overdue invoices
CREATE OR REPLACE FUNCTION public.get_overdue_invoices()
RETURNS TABLE (
  invoice_id UUID,
  tenant_id UUID,
  invoice_number TEXT,
  total_cents INTEGER,
  due_date DATE,
  days_overdue INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    tenant_id,
    invoice_number,
    total_cents,
    due_date,
    CURRENT_DATE - due_date AS days_overdue
  FROM public.invoices
  WHERE payment_status = 'pending'
    AND due_date < CURRENT_DATE
  ORDER BY due_date ASC;
$$;

-- Function to get tenant billing summary
CREATE OR REPLACE FUNCTION public.get_tenant_billing_summary(p_tenant_id UUID)
RETURNS TABLE (
  total_invoices BIGINT,
  paid_invoices BIGINT,
  pending_invoices BIGINT,
  overdue_invoices BIGINT,
  total_paid_cents BIGINT,
  total_pending_cents BIGINT,
  total_overdue_cents BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS total_invoices,
    COUNT(*) FILTER (WHERE payment_status = 'paid') AS paid_invoices,
    COUNT(*) FILTER (WHERE payment_status = 'pending') AS pending_invoices,
    COUNT(*) FILTER (WHERE payment_status = 'pending' AND due_date < CURRENT_DATE) AS overdue_invoices,
    COALESCE(SUM(total_cents) FILTER (WHERE payment_status = 'paid'), 0) AS total_paid_cents,
    COALESCE(SUM(total_cents) FILTER (WHERE payment_status = 'pending'), 0) AS total_pending_cents,
    COALESCE(SUM(total_cents) FILTER (WHERE payment_status = 'pending' AND due_date < CURRENT_DATE), 0) AS total_overdue_cents
  FROM public.invoices
  WHERE tenant_id = p_tenant_id;
$$;

-- =====================================================
-- 9. TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_billing_waitlist_updated_at
  BEFORE UPDATE ON public.billing_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update invoice status to overdue
CREATE OR REPLACE FUNCTION public.mark_invoices_overdue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invoices
  SET payment_status = 'overdue'
  WHERE payment_status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$;

-- =====================================================
-- 10. GRANTS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_vat(INTEGER, TEXT, CHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_overdue_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_billing_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_invoices_overdue() TO authenticated;

-- =====================================================
-- 11. COMMENTS
-- =====================================================

COMMENT ON TABLE public.billing_waitlist IS 'Stores waitlist entries for coming soon billing system';
COMMENT ON TABLE public.vat_validations IS 'Caches VAT number validations from EU VIES system';
COMMENT ON TABLE public.payment_methods IS 'Stores payment method configurations per tenant';
COMMENT ON TABLE public.invoices IS 'Stores all invoices for invoice-based and automated billing';
COMMENT ON TABLE public.payment_transactions IS 'Audit log of all payment transactions across providers';

COMMENT ON FUNCTION public.generate_invoice_number() IS 'Generates sequential invoice numbers in format INV-YYYY-NNNNNN';
COMMENT ON FUNCTION public.calculate_vat(INTEGER, TEXT, CHAR) IS 'Calculates VAT amount with reverse charge support for B2B';
COMMENT ON FUNCTION public.get_overdue_invoices() IS 'Returns all overdue invoices across all tenants';
COMMENT ON FUNCTION public.get_tenant_billing_summary(UUID) IS 'Returns billing summary statistics for a tenant';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Deploy edge functions for payment processing
-- 2. Implement coming soon waitlist page
-- 3. Configure Stripe with EUR products
-- 4. Set up invoice generation workflow
-- 5. Integrate SumUp API
-- =====================================================
