# EU Payment & Billing Integration Plan
# Eryxon Flow - European Union Market

**Author:** Claude
**Date:** 2025-11-22
**Status:** Planning Phase - Coming Soon Mode
**Market:** European Union Only
**Currency:** EUR (€)
**Target:** B2B/Business Accounts Only

---

## Executive Summary

This document outlines the implementation plan for EU-focused payment and billing integration for Eryxon Flow. The system will support:

1. **Primary Payment Method:** Invoice by Email (Manual Processing)
2. **Automated Payments:** Stripe with iDEAL support
3. **Alternative Provider:** SumUp integration
4. **Initial Launch:** "Coming Soon" mode with waitlist
5. **Compliance:** EU regulations, GDPR, PSD2, VAT handling

**Key Differentiators:**
- EU-only service (geo-restricted)
- Euro currency exclusively
- Business accounts only (B2B focus)
- SEPA payments preferred
- iDEAL for Netherlands market
- Reverse charge VAT mechanism for B2B

---

## Table of Contents

1. [Market Requirements](#market-requirements)
2. [Payment Methods Overview](#payment-methods-overview)
3. [Implementation Phases](#implementation-phases)
4. [Database Schema](#database-schema)
5. [Coming Soon Mode](#coming-soon-mode)
6. [Invoice Payment System](#invoice-payment-system)
7. [Stripe + iDEAL Integration](#stripe-ideal-integration)
8. [SumUp Integration](#sumup-integration)
9. [Compliance & Legal](#compliance-legal)
10. [Pricing Structure](#pricing-structure)
11. [Technical Implementation](#technical-implementation)
12. [Testing Strategy](#testing-strategy)

---

## Market Requirements

### Geographic Restrictions

**EU Member States Only:**
```typescript
const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];
```

**Implementation:**
- IP-based geolocation check during signup
- Country selector validation (EU countries only)
- Registration requires EU VAT number
- Billing address must be in EU

### B2B Requirements

**Business Account Validation:**
- ✅ Company name (required)
- ✅ EU VAT number (required, validated via VIES)
- ✅ Business registration number
- ✅ Billing address in EU
- ✅ Business email domain (no free email providers)
- ❌ Personal/consumer accounts (not supported)

### Currency & Pricing

**Euro Only:**
- All prices in EUR (€)
- No currency conversion
- SEPA bank transfers preferred
- Cross-border EU payments standardized

---

## Payment Methods Overview

### Priority Order

1. **Invoice by Email** (Primary, Manual)
   - Most flexible for businesses
   - Net 30 payment terms standard
   - Manual verification and approval
   - Best for large enterprises

2. **Stripe with iDEAL** (Automated, Preferred)
   - Instant activation
   - iDEAL for Netherlands
   - SEPA Direct Debit
   - Credit card fallback
   - PSD2 SCA compliant

3. **SumUp** (Alternative, Small Businesses)
   - Lower fees than Stripe
   - Popular in EU SMB market
   - Card reader integration
   - SEPA support

### Payment Method Comparison

| Feature | Invoice | Stripe | SumUp |
|---------|---------|--------|-------|
| **Setup Time** | Instant | 2-5 min | 5-10 min |
| **Activation** | Manual approval | Instant | Instant |
| **Fees** | None | 1.4% + €0.25 (EU) | 1.39% flat |
| **iDEAL Support** | N/A | ✅ Yes | ❌ No |
| **SEPA Debit** | ✅ Manual | ✅ Yes | ✅ Yes |
| **Payment Terms** | Net 30/60 | Instant | Instant |
| **Best For** | Enterprises | All sizes | Small business |

---

## Implementation Phases

### Phase 0: Coming Soon Mode (Week 1)
**Status:** Initial launch, no payment processing yet

- [ ] Create "Coming Soon" landing page
- [ ] Waitlist signup form with business validation
- [ ] Email notification system
- [ ] Admin dashboard for waitlist management
- [ ] Database tables for waitlist entries
- [ ] Automated confirmation emails

**Goal:** Build interest, collect leads, validate business details

---

### Phase 1: Database & Schema (Week 2)
**Status:** Foundation for all payment methods

- [ ] Create `payment_methods` table
- [ ] Create `invoices` table
- [ ] Create `payment_transactions` table
- [ ] Create `vat_validations` table
- [ ] Add Stripe/SumUp fields to `tenants`
- [ ] Create audit log for billing events
- [ ] Add EU-specific fields (VAT, company registration)

**Goal:** Complete database foundation for multi-provider system

---

### Phase 2: Invoice Payment System (Week 3-4)
**Status:** Primary payment method for B2B

- [ ] Invoice generation system (PDF)
- [ ] Email delivery automation
- [ ] Payment tracking dashboard
- [ ] Admin approval workflow
- [ ] Overdue payment alerts
- [ ] Invoice numbering (EU compliant)
- [ ] VAT calculation engine

**Goal:** Enable manual invoice-based billing

---

### Phase 3: Stripe Integration (Week 5-6)
**Status:** Automated payment processing

- [ ] Stripe account setup (EU entity)
- [ ] iDEAL payment method configuration
- [ ] SEPA Direct Debit setup
- [ ] Webhook handler for EU events
- [ ] Customer portal integration
- [ ] SCA (Strong Customer Authentication)
- [ ] Subscription management

**Goal:** Automated recurring billing with iDEAL

---

### Phase 4: SumUp Integration (Week 7-8)
**Status:** Alternative payment provider

- [ ] SumUp API integration
- [ ] Payment link generation
- [ ] Transaction webhook handling
- [ ] Customer dashboard integration
- [ ] Fallback payment flow
- [ ] Fee calculation

**Goal:** Provide cost-effective alternative

---

### Phase 5: Compliance & Go-Live (Week 9-10)
**Status:** Legal compliance and launch

- [ ] GDPR compliance audit
- [ ] VAT MOSS registration (if needed)
- [ ] Terms of Service (EU compliant)
- [ ] Privacy Policy updates
- [ ] Cookie consent integration
- [ ] PSD2 compliance verification
- [ ] Production deployment

**Goal:** Fully compliant EU billing system

---

## Database Schema

### New Tables

#### 1. billing_waitlist

```sql
CREATE TABLE public.billing_waitlist (
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
  preferred_payment_method TEXT CHECK (preferred_payment_method IN ('invoice', 'stripe', 'sumup')),

  -- Plan Selection
  interested_plan subscription_plan DEFAULT 'pro',

  -- VAT Validation
  vat_valid BOOLEAN DEFAULT false,
  vat_validated_at TIMESTAMPTZ,
  vat_company_name TEXT, -- From VIES validation
  vat_company_address TEXT, -- From VIES validation

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
  converted_to_tenant_id UUID REFERENCES public.tenants(id),

  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_waitlist_status ON billing_waitlist(status);
CREATE INDEX idx_waitlist_country ON billing_waitlist(country_code);
CREATE INDEX idx_waitlist_vat ON billing_waitlist(vat_number);
```

#### 2. payment_methods

```sql
CREATE TYPE public.payment_provider AS ENUM ('invoice', 'stripe', 'sumup');

CREATE TABLE public.payment_methods (
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

CREATE INDEX idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX idx_payment_methods_primary ON payment_methods(tenant_id, is_primary) WHERE is_primary = true;
```

#### 3. invoices

```sql
CREATE TABLE public.invoices (
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
  payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded')
  ),
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

  -- Reverse Charge VAT
  is_reverse_charge BOOLEAN DEFAULT true, -- B2B intra-EU = reverse charge

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

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(payment_status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
```

#### 4. payment_transactions

```sql
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,

  -- Transaction Details
  provider payment_provider NOT NULL,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('charge', 'refund', 'chargeback', 'dispute')
  ),

  -- Amount
  amount_cents INTEGER NOT NULL,
  currency CHAR(3) DEFAULT 'EUR',

  -- Fees
  fee_cents INTEGER DEFAULT 0,
  net_cents INTEGER, -- amount - fee

  -- Status
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')
  ),

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

CREATE INDEX idx_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX idx_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX idx_transactions_status ON payment_transactions(status);
CREATE INDEX idx_transactions_provider ON payment_transactions(provider);
```

#### 5. vat_validations

```sql
CREATE TABLE public.vat_validations (
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

CREATE INDEX idx_vat_validations_number ON vat_validations(vat_number);
CREATE INDEX idx_vat_validations_expires ON vat_validations(expires_at);
```

### Modified Tables

#### tenants table additions

```sql
ALTER TABLE public.tenants
  -- Company Details (EU B2B)
  ADD COLUMN IF NOT EXISTS vat_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS company_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS legal_entity_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS billing_country_code CHAR(2),

  -- Payment Provider IDs
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS sumup_merchant_code TEXT UNIQUE,

  -- Payment Preferences
  ADD COLUMN IF NOT EXISTS preferred_payment_method payment_provider DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30,

  -- Subscription Details
  ADD COLUMN IF NOT EXISTS subscription_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_renews_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ,

  -- Trial (optional - can be disabled for invoice customers)
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,

  -- Credit Limit (for invoice customers)
  ADD COLUMN IF NOT EXISTS credit_limit_cents INTEGER,
  ADD COLUMN IF NOT EXISTS credit_check_passed BOOLEAN DEFAULT false,

  -- Account Manager
  ADD COLUMN IF NOT EXISTS account_manager_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_tenants_vat ON tenants(vat_number);
CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX idx_tenants_payment_method ON tenants(preferred_payment_method);
```

---

## Coming Soon Mode

### Landing Page Features

**URL:** `/billing/coming-soon`

**Components:**

1. **Hero Section**
   - "Professional Billing Coming Soon"
   - EU-focused messaging
   - Multiple payment options visual
   - Countdown timer (optional)

2. **Waitlist Form**
   ```typescript
   interface WaitlistForm {
     // Company
     companyName: string;
     vatNumber: string;
     companyRegistrationNumber?: string;
     industry?: string;
     companySize: '1-10' | '11-50' | '51-200' | '201-500' | '501+';

     // Contact
     contactName: string;
     contactEmail: string;
     contactPhone?: string;

     // Location
     countryCode: EU_COUNTRY_CODE;

     // Preferences
     preferredPaymentMethod: 'invoice' | 'stripe' | 'sumup';
     interestedPlan: 'pro' | 'premium';

     // Additional
     notes?: string;
   }
   ```

3. **VAT Validation**
   - Real-time VIES API check
   - Display validated company name
   - Show validation status

4. **Payment Method Selector**
   - Invoice: "Best for enterprises, Net 30 terms"
   - Stripe: "Instant activation with iDEAL"
   - SumUp: "Lower fees for small businesses"

5. **Email Confirmation**
   - Immediate confirmation email
   - Estimated timeline
   - Next steps
   - Contact information

### Admin Dashboard

**URL:** `/admin/billing-waitlist`

**Features:**
- View all waitlist entries
- Filter by status, country, payment method
- VAT validation status
- Approve/reject applications
- Convert to active tenant
- Export to CSV
- Send bulk updates

### Edge Functions

**Function:** `waitlist-signup`
```typescript
POST /functions/v1/waitlist-signup
{
  companyName: string;
  vatNumber: string;
  // ... other fields
}

Response:
{
  success: true;
  waitlistId: string;
  vatValidation: {
    valid: boolean;
    companyName: string;
  }
}
```

**Function:** `validate-vat`
```typescript
POST /functions/v1/validate-vat
{
  vatNumber: string;
  countryCode: string;
}

Response:
{
  valid: boolean;
  companyName: string;
  companyAddress: string;
  requestDate: string;
}
```

---

## Invoice Payment System

### Invoice Generation

**PDF Generation:**
- Use `jsPDF` or server-side PDF generation
- EU-compliant invoice format
- Include all legal requirements:
  - Supplier details (your company)
  - Customer details (VAT number required)
  - Unique invoice number
  - Invoice date & due date
  - Line items with VAT breakdown
  - Reverse charge statement (if applicable)
  - Payment instructions (IBAN, SWIFT)

**Invoice Numbering:**
```
Format: INV-{YEAR}-{SEQUENCE}
Example: INV-2025-001234

Sequence resets annually
Zero-padded 6 digits
```

### Email Workflow

1. **Invoice Sent**
   - PDF attachment
   - Payment instructions
   - Due date reminder
   - Bank transfer details

2. **Payment Reminder** (Due Date - 3 days)
   - Friendly reminder
   - Invoice attached
   - Payment options

3. **Overdue Notice** (Due Date + 7 days)
   - Professional but firm
   - Late payment fees (if applicable)
   - Suspension warning

4. **Final Notice** (Due Date + 30 days)
   - Account suspension imminent
   - Escalation to collections
   - Legal disclaimer

### Payment Tracking

**Manual Reconciliation:**
- Admin dashboard for payment matching
- Upload bank statements (CSV)
- Match transactions to invoices
- Bulk payment processing
- Automated status updates

**Automated Matching:**
- Parse bank statement description
- Match invoice number
- Match amount
- Auto-mark as paid
- Send confirmation email

### Edge Functions

**Function:** `generate-invoice`
```typescript
POST /functions/v1/generate-invoice
{
  tenantId: string;
  period: { start: Date; end: Date };
  planId: string;
}

Response:
{
  invoiceId: string;
  invoiceNumber: string;
  pdfUrl: string;
  totalCents: number;
}
```

**Function:** `record-invoice-payment`
```typescript
POST /functions/v1/record-invoice-payment
{
  invoiceId: string;
  amountCents: number;
  paymentDate: Date;
  referenceNumber?: string;
}

Response:
{
  success: boolean;
  transactionId: string;
}
```

---

## Stripe + iDEAL Integration

### Stripe Configuration

**Account Setup:**
- Register Stripe account with EU business entity
- Enable following payment methods:
  - iDEAL (Netherlands)
  - SEPA Direct Debit (EU-wide)
  - Credit/Debit Cards (fallback)
- Configure SCA (Strong Customer Authentication)
- Enable automatic tax calculation

**Products & Prices (EUR):**

```javascript
// Pro Plan
{
  name: "Eryxon Flow Pro",
  price: €97.00 EUR,
  interval: "month",
  currency: "eur",
  tax_behavior: "exclusive", // VAT added separately
  metadata: {
    plan_key: "pro",
    max_jobs: "1000",
    max_parts_per_month: "10000",
    max_storage_gb: "50"
  }
}

// Premium Plan
{
  name: "Eryxon Flow Premium",
  price: €497.00 EUR,
  interval: "month",
  currency: "eur",
  tax_behavior: "exclusive",
  metadata: {
    plan_key: "premium",
    max_jobs: "unlimited",
    max_parts_per_month: "unlimited",
    max_storage_gb: "500"
  }
}
```

### iDEAL Implementation

**Payment Flow:**

1. User selects "Pay with iDEAL"
2. Redirect to Stripe Checkout
3. User selects their Dutch bank
4. Redirected to bank's authentication
5. Payment confirmation
6. Redirect back to app
7. Webhook confirms payment
8. Subscription activated

**Stripe Checkout Session:**
```typescript
const session = await stripe.checkout.sessions.create({
  customer: stripeCustomerId,
  payment_method_types: ['ideal', 'sepa_debit', 'card'],
  mode: 'subscription',
  line_items: [{
    price: 'price_pro_eur_monthly',
    quantity: 1,
  }],
  success_url: 'https://app.eryxonflow.com/billing/success',
  cancel_url: 'https://app.eryxonflow.com/billing/cancelled',
  locale: 'nl', // or auto-detect
  customer_email: customerEmail,
  metadata: {
    tenantId: tenantId,
  }
});
```

### SEPA Direct Debit

**Setup:**
- Customer provides IBAN
- Stripe handles SEPA mandate
- First payment: 5-7 business days
- Recurring: Automatic
- Lower fees than cards: 0.8% capped at €5

**Implementation:**
```typescript
const paymentMethod = await stripe.paymentMethods.create({
  type: 'sepa_debit',
  sepa_debit: {
    iban: 'NL91ABNA0417164300',
  },
  billing_details: {
    name: companyName,
    email: billingEmail,
  },
});
```

### Webhook Events

**Endpoint:** `https://your-domain.supabase.co/functions/v1/stripe-webhook-handler`

**Events to Handle:**

```typescript
switch (event.type) {
  case 'checkout.session.completed':
    // Activate subscription
    // Store customer ID
    // Send welcome email
    break;

  case 'invoice.payment_succeeded':
    // Mark subscription as paid
    // Generate receipt
    // Extend service period
    break;

  case 'invoice.payment_failed':
    // Retry payment
    // Send failure notification
    // Suspend after N attempts
    break;

  case 'customer.subscription.updated':
    // Handle plan changes
    // Update limits
    break;

  case 'customer.subscription.deleted':
    // Cancel subscription
    // Downgrade to free
    // Export data option
    break;
}
```

### VAT Handling with Stripe Tax

**Enable Stripe Tax:**
```typescript
const session = await stripe.checkout.sessions.create({
  // ...other options
  automatic_tax: {
    enabled: true,
  },
  customer_update: {
    address: 'auto',
  },
});
```

**Reverse Charge for B2B:**
- Validate VAT number via Stripe
- Apply 0% VAT for valid intra-EU B2B
- Customer self-accounts for VAT
- Invoice notes reverse charge

---

## SumUp Integration

### SumUp Setup

**Account Requirements:**
- SumUp Business account
- EU-based merchant
- API credentials

**Advantages:**
- Lower fees: 1.39% flat rate
- Popular in EU SMB market
- No monthly fees
- Quick setup

**Limitations:**
- No recurring billing (one-time only)
- Manual subscription management
- Limited webhook support

### Payment Implementation

**Flow:**

1. Generate SumUp payment link
2. Send link to customer
3. Customer completes payment
4. Webhook notification
5. Manual subscription activation

**API Integration:**

```typescript
// Create Checkout
const checkout = await sumupApi.createCheckout({
  checkout_reference: `eryxon-${tenantId}-${Date.now()}`,
  amount: 97.00,
  currency: 'EUR',
  merchant_code: process.env.SUMUP_MERCHANT_CODE,
  description: 'Eryxon Flow Pro - Monthly Subscription',
  redirect_url: 'https://app.eryxonflow.com/billing/sumup-success',
});

// Response: checkout.id and checkout_url
```

**Webhook Handler:**

```typescript
POST /functions/v1/sumup-webhook-handler

{
  id: "checkout-id",
  status: "PAID",
  amount: 97.00,
  currency: "EUR",
  merchant_code: "...",
  timestamp: "2025-11-22T10:00:00Z"
}
```

**Monthly Billing Flow:**

1. Generate payment link on renewal date
2. Email customer with link
3. Customer pays via link
4. Webhook confirms payment
5. Extend subscription for 30 days
6. Repeat monthly

---

## Compliance & Legal

### GDPR Compliance

**Data Processing:**
- ✅ Privacy policy updated for payment data
- ✅ Consent for email invoices
- ✅ Right to data export
- ✅ Right to erasure (with payment history retention)
- ✅ Data processing agreements with Stripe/SumUp
- ✅ Secure payment data (PCI-DSS via providers)

**Customer Rights:**
- Access payment history
- Download invoices
- Request data deletion
- Update billing information
- Cancel subscription anytime

### PSD2 Compliance

**Strong Customer Authentication (SCA):**
- ✅ 3D Secure for cards
- ✅ Bank authentication for iDEAL
- ✅ SEPA mandate authentication
- ✅ Exemptions for low-risk transactions

**Implementation:**
- Stripe handles SCA automatically
- iDEAL redirects to bank login
- SEPA requires initial authentication

### VAT Compliance

**Reverse Charge Mechanism:**
- B2B sales within EU: 0% VAT + reverse charge note
- Validate VAT numbers via VIES
- Invoice must state: "VAT reverse charge applies"
- Customer accounts for VAT in their country

**Invoice Requirements:**
```
Required Fields:
✓ Unique invoice number
✓ Invoice date
✓ Supplier VAT number
✓ Customer VAT number (if B2B)
✓ Customer name and address
✓ Line items with descriptions
✓ VAT amount (or reverse charge note)
✓ Total amount
✓ Payment terms
✓ Payment instructions
```

**VAT MOSS (if B2C):**
- Not required (B2B only)
- May be needed for future expansion

---

## Pricing Structure

### Plans (EUR)

| Plan | Price/Month | Features |
|------|-------------|----------|
| **Free** | €0 | 100 jobs, 1,000 parts, 5 GB |
| **Pro** | €97 | 1,000 jobs, 10,000 parts, 50 GB |
| **Premium** | €497 | Unlimited, 500 GB, SSO, On-prem |

### Payment Terms

**Invoice:**
- Net 30 standard
- Net 60 for enterprise (approved accounts)
- 2% discount for annual prepayment

**Stripe:**
- Monthly billing
- Charged on signup date
- Automatic renewal

**SumUp:**
- Monthly payment link
- Manual processing
- No auto-renewal

### Discounts

**Annual Prepayment:**
- Pro: €970/year (2 months free) = €80.83/month
- Premium: €4,970/year (2 months free) = €414.17/month

**Volume:**
- 5+ seats: 10% discount
- 20+ seats: 20% discount
- Enterprise: Custom pricing

---

## Technical Implementation

### Frontend Components

#### 1. Billing Settings Page

**Path:** `/src/pages/admin/BillingSettings.tsx`

**Sections:**
- Current plan overview
- Payment method management
- Invoice history
- Usage statistics
- Upgrade/downgrade options

#### 2. Payment Method Selector

**Component:** `/src/components/billing/PaymentMethodSelector.tsx`

```tsx
interface PaymentMethodOption {
  id: 'invoice' | 'stripe' | 'sumup';
  name: string;
  description: string;
  icon: React.ReactNode;
  recommended?: boolean;
  features: string[];
  setupTime: string;
}
```

#### 3. Stripe Checkout Integration

**Component:** `/src/components/billing/StripeCheckout.tsx`

```tsx
const handleStripeCheckout = async () => {
  const { data } = await supabase.functions.invoke('stripe-create-checkout', {
    body: {
      priceId: 'price_pro_eur_monthly',
      tenantId: tenant.id,
    }
  });

  // Redirect to Stripe
  window.location.href = data.url;
};
```

#### 4. Invoice Viewer

**Component:** `/src/components/billing/InvoiceViewer.tsx`

Features:
- List all invoices
- Download PDF
- Payment status
- Due date alerts
- Payment instructions

### Backend Edge Functions

#### 1. stripe-create-checkout-session

**Path:** `/supabase/functions/stripe-create-checkout-session/index.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia',
});

Deno.serve(async (req) => {
  const { priceId, tenantId } = await req.json();

  // Get or create Stripe customer
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, billing_email, company_name, vat_number')
    .eq('id', tenantId)
    .single();

  let customerId = tenant.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant.billing_email,
      name: tenant.company_name,
      metadata: { tenantId },
      tax_id_data: tenant.vat_number ? [{
        type: 'eu_vat',
        value: tenant.vat_number,
      }] : undefined,
    });
    customerId = customer.id;

    // Save customer ID
    await supabase
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenantId);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['ideal', 'sepa_debit', 'card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${Deno.env.get('APP_URL')}/billing/success`,
    cancel_url: `${Deno.env.get('APP_URL')}/billing`,
    locale: 'auto',
    automatic_tax: { enabled: true },
    customer_update: { address: 'auto' },
    metadata: { tenantId },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### 2. stripe-webhook-handler

**Path:** `/supabase/functions/stripe-webhook-handler/index.ts`

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();

  // Verify webhook
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const tenantId = session.metadata.tenantId;

      // Update tenant subscription
      await supabase
        .from('tenants')
        .update({
          stripe_subscription_id: session.subscription,
          plan: 'pro',
          status: 'active',
          subscription_starts_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      // Create payment record
      await supabase.from('payment_transactions').insert({
        tenant_id: tenantId,
        provider: 'stripe',
        transaction_type: 'charge',
        amount_cents: session.amount_total,
        currency: 'eur',
        status: 'succeeded',
        stripe_payment_intent_id: session.payment_intent,
      });

      break;
    }

    case 'invoice.payment_succeeded': {
      // Handle recurring payment
      break;
    }

    case 'invoice.payment_failed': {
      // Handle failed payment
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }));
});
```

#### 3. generate-invoice

**Path:** `/supabase/functions/generate-invoice/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const { tenantId, planId } = await req.json();

  // Get tenant details
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  // Calculate invoice
  const planPrices = { pro: 9700, premium: 49700 }; // in cents
  const subtotalCents = planPrices[planId];

  // VAT logic (reverse charge for valid VAT number)
  const vatCents = tenant.vat_number ? 0 : Math.round(subtotalCents * 0.21);
  const totalCents = subtotalCents + vatCents;

  // Generate invoice number
  const invoiceNumber = await generateInvoiceNumber();

  // Create invoice record
  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0],
      subtotal_cents: subtotalCents,
      vat_rate: tenant.vat_number ? 0 : 21,
      vat_cents: vatCents,
      total_cents: totalCents,
      currency: 'EUR',
      payment_status: 'pending',
      payment_method: 'invoice',
      customer_name: tenant.company_name,
      customer_vat_number: tenant.vat_number,
      customer_address: tenant.billing_address,
      is_reverse_charge: !!tenant.vat_number,
      line_items: [{
        description: `Eryxon Flow ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        quantity: 1,
        unit_price_cents: subtotalCents,
        total_cents: subtotalCents,
      }],
    })
    .select()
    .single();

  // Generate PDF (to be implemented)
  // const pdfUrl = await generateInvoicePDF(invoice);

  return new Response(JSON.stringify({ invoice }));
});
```

#### 4. validate-vat

**Path:** `/supabase/functions/validate-vat/index.ts`

```typescript
Deno.serve(async (req) => {
  const { vatNumber, countryCode } = await req.json();

  // Call EU VIES API
  const response = await fetch(
    `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        countryCode,
        vatNumber: vatNumber.replace(countryCode, ''),
      }),
    }
  );

  const data = await response.json();

  // Store validation result
  await supabase.from('vat_validations').insert({
    vat_number: vatNumber,
    country_code: countryCode,
    is_valid: data.valid,
    company_name: data.name,
    company_address: data.address,
    vies_request_id: data.requestId,
  });

  return new Response(JSON.stringify({
    valid: data.valid,
    companyName: data.name,
    companyAddress: data.address,
  }));
});
```

---

## Testing Strategy

### Phase 0: Coming Soon Mode

**Tests:**
- ✓ Waitlist form validation
- ✓ VAT number validation via VIES
- ✓ Email confirmation sent
- ✓ Admin dashboard displays entries
- ✓ Approval workflow

### Phase 2: Invoice System

**Tests:**
- ✓ Invoice generation with correct VAT
- ✓ Reverse charge calculation
- ✓ PDF generation
- ✓ Email delivery
- ✓ Payment reconciliation
- ✓ Overdue notifications

### Phase 3: Stripe Integration

**Test Cards (EUR):**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
SCA Required: 4000 0027 6000 3184
```

**Test iDEAL:**
```
Bank: Test Bank
Status: Success/Failure (selectable)
```

**Tests:**
- ✓ Checkout session creation
- ✓ iDEAL payment flow
- ✓ SEPA Direct Debit setup
- ✓ Webhook processing
- ✓ Subscription activation
- ✓ VAT calculation
- ✓ Payment failure handling

### Phase 4: SumUp Integration

**Tests:**
- ✓ Checkout creation
- ✓ Payment link generation
- ✓ Webhook processing
- ✓ Manual subscription activation

---

## Deployment Checklist

### Environment Variables

```bash
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SumUp
SUMUP_API_KEY=...
SUMUP_MERCHANT_CODE=...
SUMUP_WEBHOOK_SECRET=...

# App
APP_URL=https://app.eryxonflow.com
COMPANY_VAT_NUMBER=NL...
COMPANY_IBAN=NL...
```

### Stripe Configuration

- [ ] Create EUR products
- [ ] Enable iDEAL payment method
- [ ] Enable SEPA Direct Debit
- [ ] Configure webhooks
- [ ] Enable Stripe Tax
- [ ] Test mode verification
- [ ] Live mode activation

### Legal Documents

- [ ] Privacy Policy (GDPR compliant)
- [ ] Terms of Service (EU law)
- [ ] Cookie Policy
- [ ] Payment Terms
- [ ] Refund Policy
- [ ] Invoice template

### Go-Live

- [ ] Database migrations applied
- [ ] Edge functions deployed
- [ ] Frontend deployed
- [ ] Email templates configured
- [ ] Admin training
- [ ] Support documentation
- [ ] Monitoring enabled
- [ ] Backup plan ready

---

## Success Metrics

### Waitlist Phase (Phase 0)
- Waitlist signups: Target 50 businesses
- VAT validation rate: > 90%
- Approval rate: > 70%
- Conversion to paid: > 20%

### Invoice Phase (Phase 2)
- Invoice delivery rate: > 99%
- Payment within terms: > 80%
- Overdue rate: < 20%
- Payment reconciliation time: < 2 days

### Stripe Phase (Phase 3)
- Checkout completion: > 70%
- iDEAL usage: > 40% (NL customers)
- SEPA usage: > 30%
- Payment success: > 95%
- Webhook processing: > 99.9%

### Overall
- Payment method distribution:
  - Invoice: 40-50%
  - Stripe: 40-50%
  - SumUp: 5-10%
- Customer satisfaction: > 4.5/5
- Support tickets (billing): < 5%

---

## Future Enhancements

1. **Annual Billing** - Stripe subscriptions with discount
2. **Usage-Based Billing** - Overage charges
3. **Multi-Currency** - GBP, CHF for non-EU Europe
4. **Bank Transfer Automation** - SEPA XML parsing
5. **Accounting Integration** - Xero, QuickBooks, Exact
6. **Dunning Management** - Smart retry logic
7. **Credit Notes** - Refund handling
8. **Customer Portal** - Self-service billing
9. **Tax Automation** - Real-time VAT rates
10. **Fraud Prevention** - Advanced verification

---

## Appendix

### EU VAT Rates (2025)

| Country | Standard VAT Rate |
|---------|-------------------|
| DE | 19% |
| NL | 21% |
| FR | 20% |
| IT | 22% |
| ES | 21% |
| BE | 21% |
| PL | 23% |
| SE | 25% |
| ... | ... |

**Note:** B2B intra-EU = 0% with reverse charge

### SEPA Country Codes

All EU countries + Iceland, Liechtenstein, Norway, Switzerland, Monaco, San Marino

### Payment Processing Fees

| Provider | EU Cards | iDEAL | SEPA DD |
|----------|----------|-------|---------|
| Stripe | 1.4% + €0.25 | 0.8% | 0.8% (max €5) |
| SumUp | 1.39% | N/A | TBD |

### Contact Information

**Support:** support@eryxonflow.com
**Billing:** billing@eryxonflow.com
**Sales:** sales@eryxonflow.com

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Next Review:** After Phase 0 completion
