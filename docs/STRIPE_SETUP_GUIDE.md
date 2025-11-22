# Stripe Integration Setup Guide

This guide walks you through setting up Stripe integration for EU-based billing with iDEAL support.

## 🎯 Overview

The Stripe integration supports:
- ✅ iDEAL (Netherlands)
- ✅ SEPA Direct Debit (EU-wide)
- ✅ Credit/Debit Cards
- ✅ Automatic tax calculation (Stripe Tax)
- ✅ Customer portal for self-service
- ✅ Coming Soon mode (admin-only testing)

---

## 📋 Prerequisites

1. **Stripe Account**
   - Create account at https://stripe.com
   - Verify your business
   - Enable EU payment methods

2. **Supabase Project**
   - Database migrations applied
   - Edge functions deployed
   - Environment variables configured

---

## 🔧 Step 1: Create Stripe Products

### Via Stripe Dashboard

1. Go to **Products** → **Add product**

2. **Pro Plan**:
   - Name: `Eryxon Flow Pro`
   - Description: `Professional manufacturing management`
   - Pricing: **Recurring**
     - Price: `€97.00 EUR`
     - Billing period: `Monthly`
     - Price ID: Copy this (e.g., `price_1ABC...`)

3. **Premium Plan**:
   - Name: `Eryxon Flow Premium`
   - Description: `Enterprise-grade manufacturing suite`
   - Pricing: **Recurring**
     - Price: `€497.00 EUR`
     - Billing period: `Monthly`
     - Price ID: Copy this (e.g., `price_1XYZ...`)

---

## 🔑 Step 2: Configure Environment Variables

### Supabase Secrets (Edge Functions)

```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_...

# Set webhook secret (from Step 3)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Set app URL
supabase secrets set APP_URL=https://your-app.com
```

### Frontend (.env)

```bash
# Add Stripe publishable key (not currently needed for server-side flow)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🪝 Step 3: Configure Stripe Webhooks

### Create Webhook Endpoint

1. Go to **Developers** → **Webhooks** → **Add endpoint**

2. **Endpoint URL**:
   ```
   https://your-project-id.supabase.co/functions/v1/stripe-webhook
   ```

3. **Events to listen to**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. **Copy the Signing Secret** (`whsec_...`)
   - Add to Supabase secrets: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

## 💳 Step 4: Enable Payment Methods

### Via Stripe Dashboard

1. Go to **Settings** → **Payment methods**

2. Enable:
   - ✅ **iDEAL** (Netherlands)
   - ✅ **SEPA Direct Debit** (EU)
   - ✅ **Cards** (Visa, Mastercard, Amex)

3. Configure **Stripe Tax** (optional but recommended):
   - Go to **Settings** → **Tax**
   - Enable automatic tax
   - Add EU VAT rules

---

## 🚀 Step 5: Deploy Edge Functions

### Deploy all three functions

```bash
# Navigate to your project
cd /path/to/eryxon-flow

# Deploy stripe-create-checkout
supabase functions deploy stripe-create-checkout --no-verify-jwt

# Deploy stripe-webhook (no auth required for webhooks)
supabase functions deploy stripe-webhook --no-verify-jwt

# Deploy stripe-portal
supabase functions deploy stripe-portal --no-verify-jwt
```

### Verify Deployment

```bash
# Test checkout function
curl -X POST https://your-project.supabase.co/functions/v1/stripe-create-checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_1ABC...","tenantId":"test-tenant-id"}'
```

---

## 🗄️ Step 6: Apply Database Migration

```bash
# Apply the migration
supabase db push

# Verify tables created
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name='tenants' AND column_name LIKE 'stripe%';"
```

---

## 🧪 Step 7: Enable Billing for Test Tenant

### Via SQL

```sql
-- Enable billing for your test tenant
UPDATE tenants
SET billing_enabled = true
WHERE id = 'your-tenant-id';

-- Verify
SELECT id, name, billing_enabled, plan, status
FROM tenants
WHERE billing_enabled = true;
```

### Via Supabase Dashboard

1. Go to **Table Editor** → `tenants`
2. Find your tenant row
3. Set `billing_enabled` = `true`
4. Save

---

## 🎬 Step 8: Update Price IDs in Code

### Edit StripeBillingSection Component

File: `/src/components/billing/StripeBillingSection.tsx`

```typescript
// Replace with your actual Stripe price IDs
const STRIPE_PRICE_IDS = {
  pro: 'price_1ABC...', // Your Pro plan price ID
  premium: 'price_1XYZ...', // Your Premium plan price ID
};
```

---

## ✅ Step 9: Test the Integration

### Test Upgrade Flow

1. **Login as admin** to a tenant with `billing_enabled = true`
2. Navigate to **My Plan** page
3. You should see "✅ Billing Enabled (Testing Mode)"
4. Click **"Upgrade to Pro"**
5. You'll be redirected to Stripe Checkout
6. Use test card: `4242 4242 4242 4242`
7. Complete checkout
8. Verify webhook updates your database

### Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
SCA Required: 4000 0027 6000 3184
iDEAL Test: Use "Test Bank" and select success/failure
```

### Verify Database Update

```sql
-- Check subscription status after payment
SELECT
  id,
  name,
  plan,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_current_period_end
FROM tenants
WHERE billing_enabled = true;

-- Check subscription events log
SELECT *
FROM subscription_events
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🔐 Step 10: Configure Customer Portal

### Enable Customer Portal

1. Go to **Settings** → **Customer portal**
2. Configure:
   - ✅ Update payment methods
   - ✅ Cancel subscriptions
   - ✅ View invoices
   - ✅ Update billing information

3. Set **Return URL**: `https://your-app.com/my-plan`

---

## 🌍 Production Checklist

Before going live:

- [ ] Switch to **Live Mode** in Stripe
- [ ] Replace test API keys with live keys
- [ ] Update webhook endpoint with live secret
- [ ] Verify price IDs in code (live price IDs)
- [ ] Test with real payment method
- [ ] Enable Stripe Tax in live mode
- [ ] Set up email notifications
- [ ] Configure VAT handling
- [ ] Test cancellation flow
- [ ] Test payment failure handling
- [ ] Remove test tenants

---

## 🚨 Troubleshooting

### Webhook Not Receiving Events

1. Check webhook secret matches Supabase secret
2. Verify edge function deployed correctly
3. Check Stripe webhook logs for errors
4. Ensure endpoint is publicly accessible

### Checkout Redirect Fails

1. Verify `APP_URL` environment variable
2. Check CORS settings in edge function
3. Verify `priceId` is correct
4. Check tenant has `billing_enabled = true`

### Customer Portal Fails

1. Verify tenant has `stripe_customer_id`
2. Check portal configuration in Stripe
3. Verify edge function has correct return URL

---

## 📚 Additional Resources

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [iDEAL Payment Method](https://stripe.com/docs/payments/ideal)
- [SEPA Direct Debit](https://stripe.com/docs/payments/sepa-debit)

---

## 🎯 Coming Soon Mode

### How It Works

- Regular users see "Coming Soon" message
- Only admins with `billing_enabled = true` can access billing
- Super admins can test full integration
- Once ready, enable `billing_enabled` for all tenants

### Enabling for All Users

```sql
-- Enable billing for all tenants
UPDATE tenants SET billing_enabled = true;

-- Or selectively
UPDATE tenants
SET billing_enabled = true
WHERE plan IN ('pro', 'premium');
```

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
