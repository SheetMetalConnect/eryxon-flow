# Stripe Integration & Self-Signup System - Implementation Plan

**Author:** Claude
**Date:** 2025-11-17
**Status:** Planning Phase

---

## Executive Summary

This document outlines the implementation plan for integrating Stripe payment processing and building a self-service signup system for Eryxon Flow. The implementation will enable:

1. **Subscription Management** - Automated billing for Free, Pro, and Premium plans
2. **Self-Signup** - New customers can sign up and select plans independently
3. **Team Management** - Admin users can invite and manage team members
4. **Customer Portal** - Self-service subscription management via Stripe

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Phases](#implementation-phases)
4. [Database Schema Changes](#database-schema-changes)
5. [Stripe Configuration](#stripe-configuration)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Security Considerations](#security-considerations)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)

---

## Current State Analysis

### ✅ What's Already Built

- **Multi-tenant architecture** with tenant isolation via RLS
- **Subscription schema** in database with plan tiers (free, pro, premium)
- **Usage tracking** for jobs, parts, and storage
- **API key system** for programmatic access
- **Webhook infrastructure** for event handling
- **User authentication** via Supabase Auth
- **Role-based access control** (admin/operator roles)

### ❌ What's Missing

- Stripe SDK integration
- Payment processing flows
- Subscription lifecycle management
- Self-service signup with plan selection
- Team invitation system
- Customer portal integration
- Stripe webhook handling
- Trial period automation

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                            │
├─────────────────────────────────────────────────────────────────┤
│  • Signup Flow with Plan Selection                               │
│  • Stripe Checkout Redirect                                      │
│  • Team Management UI                                            │
│  • Subscription Dashboard                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE EDGE FUNCTIONS (Deno)                      │
├─────────────────────────────────────────────────────────────────┤
│  • stripe-create-checkout-session                                │
│  • stripe-create-portal-session                                  │
│  • stripe-webhook-handler                                        │
│  • invite-team-member                                            │
│  • accept-invitation                                             │
└────────────┬───────────────────────┬────────────────────────────┘
             │                       │
             ▼                       ▼
┌────────────────────────┐  ┌──────────────────────────────────┐
│   STRIPE API           │  │   SUPABASE DATABASE              │
├────────────────────────┤  ├──────────────────────────────────┤
│  • Customers           │  │  Tables:                         │
│  • Subscriptions       │  │   • tenants                      │
│  • Checkout Sessions   │  │   • profiles                     │
│  • Products/Prices     │  │   • team_invitations (NEW)       │
│  • Invoices            │  │   • subscription_events (NEW)    │
│  • Portal Sessions     │  │   • stripe_customers (NEW)       │
└────────────────────────┘  └──────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Database & Schema Setup (Day 1)
- [ ] Create migration for Stripe-related tables
- [ ] Add Stripe fields to tenants table
- [ ] Create team_invitations table
- [ ] Create subscription_events audit table
- [ ] Update RLS policies

### Phase 2: Stripe Configuration (Day 1)
- [ ] Create Stripe products and prices
- [ ] Configure webhooks
- [ ] Set up environment variables
- [ ] Create test mode configuration

### Phase 3: Backend - Subscription Management (Day 2-3)
- [ ] Implement stripe-create-checkout-session function
- [ ] Implement stripe-webhook-handler function
- [ ] Implement stripe-create-portal-session function
- [ ] Add subscription sync utilities
- [ ] Implement trial period logic

### Phase 4: Backend - Team Management (Day 3-4)
- [ ] Implement invite-team-member function
- [ ] Implement accept-invitation function
- [ ] Implement list-team-members function
- [ ] Add email notification service
- [ ] Implement invitation expiry logic

### Phase 5: Frontend - Signup Flow (Day 4-5)
- [ ] Build plan selection component
- [ ] Integrate Stripe Checkout
- [ ] Handle post-payment redirect
- [ ] Add trial period messaging
- [ ] Implement signup success page

### Phase 6: Frontend - Subscription Management (Day 5-6)
- [ ] Enhance MyPlan page with Stripe integration
- [ ] Add upgrade/downgrade flows
- [ ] Integrate Customer Portal
- [ ] Add billing history view
- [ ] Implement usage alerts

### Phase 7: Frontend - Team Management (Day 6-7)
- [ ] Build team members list page
- [ ] Create invite team member form
- [ ] Build invitation acceptance flow
- [ ] Add role management UI
- [ ] Implement member removal

### Phase 8: Testing & QA (Day 7-8)
- [ ] Unit tests for Edge Functions
- [ ] Integration tests for Stripe webhooks
- [ ] End-to-end signup flow testing
- [ ] Team invitation flow testing
- [ ] Subscription lifecycle testing

### Phase 9: Documentation & Deployment (Day 8-9)
- [ ] API documentation updates
- [ ] User guide for signup
- [ ] Admin guide for team management
- [ ] Environment setup guide
- [ ] Production deployment

---

## Database Schema Changes

### New Tables

#### 1. team_invitations

```sql
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'operator',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired', 'cancelled'
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

CREATE INDEX idx_team_invitations_tenant ON team_invitations(tenant_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_token ON team_invitations(token);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
```

#### 2. subscription_events

```sql
CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'updated', 'cancelled', 'trial_started', 'trial_ending', 'payment_succeeded', 'payment_failed'
  stripe_event_id TEXT,
  old_plan subscription_plan,
  new_plan subscription_plan,
  old_status subscription_status,
  new_status subscription_status,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_events_tenant ON subscription_events(tenant_id);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX idx_subscription_events_created ON subscription_events(created_at DESC);
```

### Modified Tables

#### tenants table additions

```sql
ALTER TABLE public.tenants
ADD COLUMN stripe_customer_id TEXT UNIQUE,
ADD COLUMN stripe_subscription_id TEXT UNIQUE,
ADD COLUMN stripe_price_id TEXT,
ADD COLUMN payment_method_added BOOLEAN DEFAULT false,
ADD COLUMN trial_start_date TIMESTAMPTZ,
ADD COLUMN subscription_cancelled_at TIMESTAMPTZ,
ADD COLUMN subscription_cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id);
CREATE INDEX idx_tenants_stripe_subscription ON tenants(stripe_subscription_id);
```

---

## Stripe Configuration

### Products & Prices

Create the following in Stripe Dashboard:

#### Product 1: Eryxon Flow Pro
- **Price ID:** `price_pro_monthly` (to be created)
- **Amount:** $499.00 USD
- **Interval:** Monthly
- **Metadata:**
  - `plan_key`: `pro`
  - `max_jobs`: `999999`
  - `max_parts_per_month`: `999999`
  - `max_storage_gb`: `50`

#### Product 2: Eryxon Flow Premium
- **Price ID:** `price_premium_monthly` (to be created)
- **Amount:** $1,999.00 USD
- **Interval:** Monthly
- **Metadata:**
  - `plan_key`: `premium`
  - `max_jobs`: `999999`
  - `max_parts_per_month`: `999999`
  - `max_storage_gb`: `500`
  - `sso_enabled`: `true`

### Webhook Configuration

**Endpoint URL:** `https://vatgianzotsurljznsry.supabase.co/functions/v1/stripe-webhook-handler`

**Events to Subscribe:**
- `customer.created`
- `customer.updated`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.trial_will_end`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

### Environment Variables

```bash
# Frontend (.env)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... # Use pk_live_... in production

# Backend (Supabase Secrets)
STRIPE_SECRET_KEY=sk_test_... # Use sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_pro_monthly
STRIPE_PRICE_ID_PREMIUM=price_premium_monthly
```

---

## Backend Implementation

### Edge Function 1: stripe-create-checkout-session

**Path:** `/supabase/functions/stripe-create-checkout-session/index.ts`

**Purpose:** Create a Stripe Checkout session for new signups or upgrades

**Input:**
```typescript
{
  priceId: string; // Stripe price ID
  tenantId?: string; // For existing tenant upgrades
  email?: string; // For new signups
  metadata?: {
    fullName?: string;
    companyName?: string;
  };
}
```

**Output:**
```typescript
{
  sessionId: string;
  url: string; // Redirect URL to Stripe Checkout
}
```

**Logic:**
1. Validate input and authenticate request
2. Check if tenant exists (upgrade) or create placeholder
3. Create or retrieve Stripe customer
4. Create Checkout session with:
   - Selected price
   - Trial period (14 days for Pro, 30 days for Premium)
   - Success/cancel URLs
   - Customer metadata
5. Return session URL

---

### Edge Function 2: stripe-webhook-handler

**Path:** `/supabase/functions/stripe-webhook-handler/index.ts`

**Purpose:** Handle Stripe webhook events and sync subscription state

**Key Event Handlers:**

#### checkout.session.completed
```typescript
1. Extract customer and subscription IDs
2. Update tenant with Stripe IDs
3. Activate subscription in database
4. Set trial_ends_at if applicable
5. Send welcome email
6. Log subscription_event
```

#### customer.subscription.updated
```typescript
1. Get tenant by stripe_subscription_id
2. Update plan and status
3. Update limits based on new plan
4. Check for cancellation schedule
5. Log subscription_event
```

#### customer.subscription.deleted
```typescript
1. Get tenant by stripe_subscription_id
2. Set status to 'cancelled'
3. Set plan to 'free'
4. Reset limits to free tier
5. Send cancellation confirmation email
6. Log subscription_event
```

#### invoice.payment_failed
```typescript
1. Get tenant by stripe_customer_id
2. Set status to 'suspended'
3. Send payment failure notification
4. Give 7-day grace period
5. Log subscription_event
```

#### customer.subscription.trial_will_end
```typescript
1. Get tenant by stripe_subscription_id
2. Send trial ending reminder (3 days before)
3. Prompt to add payment method
4. Log subscription_event
```

---

### Edge Function 3: stripe-create-portal-session

**Path:** `/supabase/functions/stripe-create-portal-session/index.ts`

**Purpose:** Generate Stripe Customer Portal session for self-service management

**Input:**
```typescript
{
  tenantId: string;
  returnUrl: string;
}
```

**Output:**
```typescript
{
  url: string; // Customer Portal URL
}
```

**Logic:**
1. Authenticate admin user
2. Get tenant's stripe_customer_id
3. Create portal session
4. Return portal URL

---

### Edge Function 4: invite-team-member

**Path:** `/supabase/functions/invite-team-member/index.ts`

**Purpose:** Send invitation to join a tenant's team

**Input:**
```typescript
{
  email: string;
  role: 'operator' | 'admin';
  fullName?: string;
}
```

**Output:**
```typescript
{
  invitationId: string;
  expiresAt: string;
}
```

**Logic:**
1. Authenticate admin user
2. Check subscription allows more team members
3. Check email not already in tenant
4. Generate secure token
5. Create invitation record
6. Send invitation email with magic link
7. Return invitation details

---

### Edge Function 5: accept-invitation

**Path:** `/supabase/functions/accept-invitation/index.ts`

**Purpose:** Accept team invitation and create user account

**Input:**
```typescript
{
  token: string;
  password: string;
  fullName?: string;
}
```

**Output:**
```typescript
{
  success: boolean;
  userId: string;
  tenantId: string;
}
```

**Logic:**
1. Validate token and check expiry
2. Create Supabase auth user
3. Create profile with tenant_id from invitation
4. Mark invitation as accepted
5. Send welcome email
6. Return user details

---

## Frontend Implementation

### 1. Enhanced Signup Flow

**Component:** `/src/pages/SignUp.tsx` (new)

**Flow:**
```
Step 1: Plan Selection
├─ Display pricing cards (Free, Pro, Premium)
├─ Highlight features and limits
└─ "Get Started" buttons

Step 2: Account Information
├─ Full Name
├─ Email
├─ Company Name (optional)
├─ Password
└─ Terms acceptance

Step 3: Stripe Checkout (if paid plan)
├─ Redirect to Stripe hosted page
├─ Enter payment information
├─ Trial period messaging
└─ Complete payment

Step 4: Success & Onboarding
├─ Email verification reminder
├─ Setup wizard (optional)
└─ Dashboard redirect
```

**Key Features:**
- Plan comparison table
- Trial period badges
- Price toggle (monthly/annual if applicable)
- Social proof elements
- Trust badges (security, uptime, etc.)

---

### 2. Subscription Management Dashboard

**Component:** `/src/pages/MyPlan.tsx` (enhanced)

**Sections:**

#### Current Plan Card
```typescript
- Plan name and price
- Billing cycle
- Next billing date
- Cancel at period end warning (if applicable)
- Trial status (if in trial)
```

#### Usage Metrics
```typescript
- Jobs used / limit
- Parts this month / limit
- Storage used / limit
- Visual progress bars
- Overage warnings
```

#### Actions
```typescript
- Upgrade Plan button → Checkout
- Downgrade Plan button → Confirm modal
- Manage Billing → Stripe Portal
- Cancel Subscription → Confirm modal
- Download Invoices → Stripe Portal
```

#### Subscription History Timeline
```typescript
- Plan changes
- Payment events
- Trial milestones
```

---

### 3. Team Management Interface

**Component:** `/src/pages/admin/TeamMembers.tsx` (new)

**Features:**

#### Team Members List
```typescript
interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'operator';
  active: boolean;
  lastLogin: Date;
  createdAt: Date;
}

Columns:
- Avatar + Name
- Email
- Role (with badge)
- Status (Active/Inactive)
- Last Login
- Actions (Edit, Deactivate, Remove)
```

#### Invite Team Member Form
```typescript
Fields:
- Email (required)
- Role selector (Admin/Operator)
- Custom message (optional)

Validation:
- Email format
- Not already member
- Subscription limit check
```

#### Pending Invitations Table
```typescript
Columns:
- Email
- Role
- Invited By
- Sent Date
- Expires In
- Actions (Resend, Cancel)
```

---

### 4. Invitation Acceptance Flow

**Component:** `/src/pages/AcceptInvitation.tsx` (new)

**URL:** `/accept-invitation?token={token}`

**Flow:**
```
1. Validate token from URL
   ├─ If invalid → Show error
   └─ If valid → Continue

2. Show invitation details
   ├─ Company name
   ├─ Invited by
   └─ Role assignment

3. Account creation form
   ├─ Full name (pre-filled if available)
   ├─ Email (read-only from invitation)
   ├─ Password
   └─ Confirm password

4. Create account
   ├─ Call accept-invitation function
   ├─ Auto-login
   └─ Redirect to dashboard
```

---

## Security Considerations

### 1. Authentication & Authorization

- **Stripe webhook authentication:** Verify signature using webhook secret
- **Function authentication:** Require valid Supabase JWT for all non-webhook functions
- **Role checks:** Verify admin role for team management functions
- **Tenant isolation:** All queries must filter by tenant_id

### 2. Data Validation

- **Email validation:** Use regex + DNS check for team invitations
- **Price ID validation:** Whitelist allowed price IDs
- **Token security:** Use cryptographically secure random tokens (32+ bytes)
- **Input sanitization:** Sanitize all user inputs to prevent SQL injection

### 3. Rate Limiting

- **Invitation sends:** Max 10 invitations per hour per tenant
- **Checkout sessions:** Max 5 per hour per user
- **Portal sessions:** Max 10 per hour per user
- **Webhook retries:** Exponential backoff for failed webhook processing

### 4. Secrets Management

- **Stripe keys:** Store in Supabase Edge Function secrets (never in code)
- **Webhook secret:** Rotate quarterly
- **Invitation tokens:** Single-use, expire after 7 days
- **API keys:** Never log or expose in responses

### 5. Payment Security

- **PCI compliance:** Use Stripe Checkout (PCI-DSS compliant, no card data handling)
- **Customer Portal:** For payment method updates (Stripe-hosted)
- **Webhook replay protection:** Store and check Stripe event IDs
- **Amount verification:** Verify prices match expected amounts

---

## Testing Strategy

### 1. Unit Tests

**Edge Functions:**
```typescript
// stripe-create-checkout-session
- ✓ Creates session for new customer
- ✓ Creates session for existing customer
- ✓ Validates price ID
- ✓ Applies trial period correctly
- ✓ Handles errors gracefully

// stripe-webhook-handler
- ✓ Validates webhook signature
- ✓ Handles checkout.session.completed
- ✓ Handles subscription updates
- ✓ Handles subscription cancellation
- ✓ Handles payment failures
- ✓ Idempotent event processing

// invite-team-member
- ✓ Validates admin role
- ✓ Checks subscription limits
- ✓ Prevents duplicate invitations
- ✓ Generates secure tokens
- ✓ Sends email correctly
```

### 2. Integration Tests

**Stripe Integration:**
```typescript
- ✓ Complete checkout flow (test mode)
- ✓ Webhook event processing
- ✓ Subscription sync accuracy
- ✓ Portal session creation
- ✓ Trial period automation
```

**Database Operations:**
```typescript
- ✓ Tenant creation on signup
- ✓ Profile creation on invitation acceptance
- ✓ Subscription event logging
- ✓ RLS policies enforcement
- ✓ Cascade deletions
```

### 3. End-to-End Tests

**Signup Flow:**
```typescript
1. User selects Pro plan
2. Fills signup form
3. Redirects to Stripe Checkout
4. Completes payment (test card)
5. Returns to success page
6. Receives welcome email
7. Can log in and access dashboard
8. Subscription shows active with trial
```

**Team Invitation Flow:**
```typescript
1. Admin sends invitation
2. Invitation email received
3. New user clicks invite link
4. Creates account
5. Automatically joins tenant
6. Can access appropriate features based on role
7. Shows in team members list
```

**Subscription Management:**
```typescript
1. Admin upgrades from Free to Pro
2. Checkout session created
3. Payment processed
4. Subscription activated
5. Limits updated
6. Invoice generated
7. Confirmation email sent
```

### 4. Test Data

**Stripe Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires Auth: 4000 0025 0000 3155
```

**Test Scenarios:**
```
- New signup with trial
- Upgrade during trial
- Downgrade after trial
- Cancellation
- Payment failure
- Trial expiration
- Team invitation
- Multiple team members
```

---

## Deployment Plan

### Pre-Deployment Checklist

**Database:**
- [ ] Run migrations in staging
- [ ] Verify RLS policies
- [ ] Test data seeding
- [ ] Backup plan

**Stripe:**
- [ ] Create products in live mode
- [ ] Configure live webhook endpoint
- [ ] Set live API keys in secrets
- [ ] Test webhook delivery

**Environment:**
- [ ] Update production environment variables
- [ ] Configure CORS for Stripe
- [ ] Set up monitoring and alerts
- [ ] Configure email service

**Code:**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Performance testing done

### Deployment Steps

#### Step 1: Database Migration (5 min)
```bash
# Apply migrations to production
supabase db push

# Verify schema
supabase db diff
```

#### Step 2: Stripe Configuration (10 min)
```bash
# Create products via Stripe CLI or Dashboard
stripe products create --name "Eryxon Flow Pro" ...

# Configure webhook
stripe listen --forward-to https://...
```

#### Step 3: Deploy Edge Functions (10 min)
```bash
# Deploy all Stripe-related functions
supabase functions deploy stripe-create-checkout-session
supabase functions deploy stripe-webhook-handler
supabase functions deploy stripe-create-portal-session
supabase functions deploy invite-team-member
supabase functions deploy accept-invitation
```

#### Step 4: Deploy Frontend (5 min)
```bash
# Build and deploy frontend
npm run build
# Deploy to hosting (Vercel, Netlify, etc.)
```

#### Step 5: Smoke Testing (15 min)
```bash
# Test critical paths
- [ ] Signup with Pro plan
- [ ] Stripe Checkout redirect
- [ ] Webhook processing
- [ ] Customer Portal access
- [ ] Team invitation
```

#### Step 6: Monitoring (Ongoing)
```bash
# Monitor
- Stripe webhook delivery
- Edge function logs
- Error tracking (Sentry)
- User signups
- Payment success rate
```

### Rollback Plan

**If issues detected:**
1. Disable new signups (feature flag)
2. Route existing users to old flow
3. Revert database migration if needed
4. Fix issues in staging
5. Re-deploy when ready

**Critical Monitoring:**
- Webhook failure rate > 5%
- Checkout abandonment > 50%
- Payment decline rate > 10%
- 5xx errors in Edge Functions

---

## Post-Deployment Tasks

### Week 1
- [ ] Monitor signup funnel metrics
- [ ] Check webhook delivery success rate
- [ ] Review subscription sync accuracy
- [ ] Gather user feedback on signup flow
- [ ] Fix any critical bugs

### Week 2
- [ ] Analyze conversion rates by plan
- [ ] Optimize checkout flow based on analytics
- [ ] Add additional features (annual billing, etc.)
- [ ] Create admin reporting dashboard
- [ ] Document common support issues

### Month 1
- [ ] Review subscription churn rate
- [ ] Implement usage-based billing (if needed)
- [ ] Add subscription lifecycle emails
- [ ] Create customer success workflows
- [ ] Optimize pricing based on data

---

## Success Metrics

### Technical Metrics
- **Webhook Success Rate:** > 99%
- **Checkout Completion Rate:** > 60%
- **API Response Time:** < 500ms (p95)
- **Payment Processing Time:** < 3s
- **Error Rate:** < 0.1%

### Business Metrics
- **Trial-to-Paid Conversion:** > 20%
- **Free-to-Paid Conversion:** > 10%
- **Team Invitation Acceptance:** > 70%
- **Subscription Retention (90d):** > 80%
- **Average Team Size:** > 3 members

### User Experience Metrics
- **Signup Completion Time:** < 3 minutes
- **Time to First Value:** < 10 minutes
- **Customer Portal Usage:** > 30% of customers/month
- **Support Tickets (billing):** < 5% of users

---

## Open Questions & Future Enhancements

### Open Questions
1. Should we offer annual billing with discount?
2. Do we need usage-based billing for overages?
3. Should free tier have time limit or be permanent?
4. What's the team member limit per plan?
5. Do we need separate pricing for self-hosted?

### Future Enhancements
1. **Multi-currency support** - Support EUR, GBP, etc.
2. **Annual billing** - Offer annual plans with discount
3. **Usage-based billing** - Charge for overages
4. **Add-ons** - Extra storage, API calls, etc.
5. **Referral program** - Give credits for referrals
6. **Enterprise quotes** - Custom pricing for large teams
7. **SSO integration** - SAML/OAuth for Premium
8. **Invoicing** - Custom invoices for enterprise
9. **Tax handling** - Automatic tax calculation
10. **Dunning management** - Smart retry logic for failed payments

---

## Appendix

### A. Stripe Products Schema

```json
{
  "products": [
    {
      "name": "Eryxon Flow Pro",
      "description": "Professional manufacturing management",
      "prices": [
        {
          "id": "price_pro_monthly",
          "amount": 49900,
          "currency": "usd",
          "interval": "month",
          "trial_period_days": 14
        }
      ],
      "metadata": {
        "plan_key": "pro",
        "max_jobs": "999999",
        "max_parts_per_month": "999999",
        "max_storage_gb": "50"
      }
    },
    {
      "name": "Eryxon Flow Premium",
      "description": "Enterprise-grade manufacturing suite",
      "prices": [
        {
          "id": "price_premium_monthly",
          "amount": 199900,
          "currency": "usd",
          "interval": "month",
          "trial_period_days": 30
        }
      ],
      "metadata": {
        "plan_key": "premium",
        "max_jobs": "999999",
        "max_parts_per_month": "999999",
        "max_storage_gb": "500",
        "sso_enabled": "true"
      }
    }
  ]
}
```

### B. Email Templates

**Welcome Email** (new signup)
```
Subject: Welcome to Eryxon Flow! Your trial has started

Hi {name},

Welcome to Eryxon Flow! Your {plan} plan trial has started.

Trial ends: {trial_end_date}

Get started:
1. Set up your first job
2. Invite your team
3. Configure your workflow

Need help? Reply to this email or visit our docs.

Best,
The Eryxon Flow Team
```

**Team Invitation Email**
```
Subject: You've been invited to join {company} on Eryxon Flow

Hi,

{inviter_name} has invited you to join {company} on Eryxon Flow as a {role}.

Accept invitation: {invite_link}

This invitation expires in 7 days.

Questions? Contact {inviter_email}
```

**Trial Ending Reminder** (3 days before)
```
Subject: Your Eryxon Flow trial ends in 3 days

Hi {name},

Your {plan} trial ends on {trial_end_date}.

To continue using Eryxon Flow, please add a payment method.

Manage subscription: {billing_portal_link}

Thanks,
The Eryxon Flow Team
```

### C. Useful Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-17
**Next Review:** Post-implementation review
