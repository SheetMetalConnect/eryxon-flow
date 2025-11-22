import type { Database } from '@/integrations/supabase/types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
type SubscriptionPlan = Database['public']['Enums']['subscription_plan'];

export interface SubscriptionAccessResult {
  allowed: boolean;
  reason: 'free_tier' | 'active_subscription' | 'trial_period' | 'payment_overdue' | 'payment_failed' | 'subscription_cancelled' | 'no_subscription';
  gracePeriodEnds?: Date | null;
  trialEnds?: Date | null;
}

/**
 * Check if a tenant has active subscription access
 * This is the core access control logic for the entire app
 */
export function canAccessApp(tenant: Tenant | null): SubscriptionAccessResult {
  if (!tenant) {
    return {
      allowed: false,
      reason: 'no_subscription',
    };
  }

  const now = new Date();

  // Always allow free tier (with feature limits)
  if (tenant.plan === 'free') {
    return {
      allowed: true,
      reason: 'free_tier',
    };
  }

  // Check if subscription is active
  if (tenant.status === 'active') {
    return {
      allowed: true,
      reason: 'active_subscription',
    };
  }

  // Check if in trial period
  if (tenant.status === 'trial' && tenant.trial_end) {
    const trialEnd = new Date(tenant.trial_end);
    if (trialEnd > now) {
      return {
        allowed: true,
        reason: 'trial_period',
        trialEnds: trialEnd,
      };
    }
  }

  // Check if in grace period for payment failures (7 days)
  if (tenant.status === 'suspended' && tenant.grace_period_ends_at) {
    const gracePeriodEnd = new Date(tenant.grace_period_ends_at);
    if (gracePeriodEnd > now) {
      return {
        allowed: true,
        reason: 'payment_overdue',
        gracePeriodEnds: gracePeriodEnd,
      };
    }
  }

  // Payment failed and grace period expired
  if (tenant.status === 'suspended') {
    return {
      allowed: false,
      reason: 'payment_failed',
    };
  }

  // Subscription cancelled
  if (tenant.status === 'cancelled') {
    return {
      allowed: false,
      reason: 'subscription_cancelled',
    };
  }

  // Default: no access
  return {
    allowed: false,
    reason: 'no_subscription',
  };
}

/**
 * Get human-readable message for subscription status
 */
export function getSubscriptionMessage(result: SubscriptionAccessResult): string {
  switch (result.reason) {
    case 'free_tier':
      return 'You are on the Free plan. Upgrade to unlock more features.';
    case 'active_subscription':
      return 'Your subscription is active.';
    case 'trial_period':
      return `You are in a trial period until ${result.trialEnds?.toLocaleDateString()}.`;
    case 'payment_overdue':
      return `Your payment is overdue. Please update your payment method by ${result.gracePeriodEnds?.toLocaleDateString()} to avoid service interruption.`;
    case 'payment_failed':
      return 'Your payment has failed and the grace period has expired. Please update your payment method to restore access.';
    case 'subscription_cancelled':
      return 'Your subscription has been cancelled. Upgrade to restore access to premium features.';
    case 'no_subscription':
      return 'No active subscription found.';
    default:
      return 'Unknown subscription status.';
  }
}

/**
 * Check if billing features should be shown to user
 * COMING SOON MODE: Only show to users with billing_enabled = true
 */
export function canSeeBillingFeatures(tenant: Tenant | null, isAdmin: boolean): boolean {
  if (!tenant) return false;

  // Super admin can always see billing features (for testing)
  if (isAdmin && tenant.billing_enabled) {
    return true;
  }

  // Regular users cannot see billing yet (coming soon mode)
  return false;
}
