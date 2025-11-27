import type { Database } from '@/integrations/supabase/types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
type SubscriptionPlan = Database['public']['Enums']['subscription_plan'];

export interface SubscriptionAccessResult {
  allowed: boolean;
  reason: 'free_tier' | 'active_subscription' | 'trial_period' | 'payment_overdue' | 'payment_failed' | 'subscription_cancelled' | 'subscription_required' | 'no_subscription';
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
  if (tenant.status === 'trial' && tenant.trial_ends_at) {
    const trialEnd = new Date(tenant.trial_ends_at);
    if (trialEnd > now) {
      return {
        allowed: true,
        reason: 'trial_period',
        trialEnds: trialEnd,
      };
    }
  }

  // Payment failed or tenant suspended (requires approval)
  if (tenant.status === 'suspended') {
    return {
      allowed: false,
      reason: 'payment_failed', // Using payment_failed for suspended status
    };
  }

  // Subscription cancelled
  if (tenant.status === 'cancelled') {
    return {
      allowed: false,
      reason: 'subscription_cancelled',
    };
  }

  // Default: Access denied - subscription required
  return {
    allowed: false,
    reason: 'subscription_required',
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
      return 'Your account is pending approval. Please wait for activation or contact support.';
    case 'subscription_cancelled':
      return 'Your subscription has been cancelled. Upgrade to restore access to premium features.';
    case 'subscription_required':
      return 'Subscription required to access this feature.';
    case 'no_subscription':
      return 'No active subscription found.';
    default:
      return 'Unknown subscription status.';
  }
}

/**
 * Check if billing features should be shown to user
 */
export function canSeeBillingFeatures(tenant: Tenant | null, isAdmin: boolean): boolean {
  // Billing features not implemented yet
  return false;
}
