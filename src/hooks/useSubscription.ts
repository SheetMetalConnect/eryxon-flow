import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

export type SubscriptionPlan = 'free' | 'pro' | 'premium' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'suspended' | 'trial';

export interface TenantSubscription {
  tenant_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  max_jobs: number | null;
  max_parts_per_month: number | null;
  max_storage_gb: number | null;
  current_jobs: number;
  current_parts_this_month: number;
  current_storage_gb: number;
}

export interface TenantUsageStats {
  total_jobs: number;
  total_parts: number;
  active_jobs: number;
  completed_jobs: number;
  parts_this_month: number;
  total_operators: number;
  total_admins: number;
}

export interface ApiUsageStats {
  today_requests: number;
  this_month_requests: number;
  reset_at: string;
  daily_limit: number | null;
}

export const useSubscription = () => {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [usageStats, setUsageStats] = useState<TenantUsageStats | null>(null);
  const [apiUsageStats, setApiUsageStats] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!profile?.tenant_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch subscription data using the RPC function
        const { data: subData, error: subError } = await supabase
          .rpc('get_my_tenant_subscription' as any);

        if (subError) throw subError;

        if (subData && subData.length > 0) {
          setSubscription(subData[0] as any);
        }

        // Fetch usage statistics (no parameter needed - function uses caller's tenant)
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_tenant_usage_stats' as any);

        if (statsError) throw statsError;

        if (statsData && statsData.length > 0) {
          setUsageStats(statsData[0] as any);
        }

        // Fetch API usage statistics
        const { data: apiData, error: apiError } = await supabase
          .rpc('get_api_usage_stats' as any);

        if (apiError) {
          console.warn('API usage stats not available:', apiError);
          // Don't throw - API usage stats are optional
        } else if (apiData && apiData.length > 0) {
          setApiUsageStats(apiData[0] as any);
        }
      } catch (err) {
        console.error('Error fetching subscription:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [profile?.tenant_id]);

  const getPlanDisplayName = (plan: SubscriptionPlan): string => {
    const planNames: Record<SubscriptionPlan, string> = {
      free: 'Free Plan',
      pro: 'Pro Plan',
      premium: 'Premium Plan',
      enterprise: 'Enterprise Plan',
    };
    return planNames[plan] || 'Unknown Plan';
  };

  const getPlanColor = (plan: SubscriptionPlan): string => {
    const planColors: Record<SubscriptionPlan, string> = {
      free: '#64748b', // slate
      pro: '#8b5cf6', // purple
      premium: '#f59e0b', // amber
      enterprise: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // gradient
    };
    return planColors[plan] || '#64748b';
  };

  const isAtLimit = (current: number, max: number | null): boolean => {
    if (max === null) return false; // null means unlimited
    return current >= max;
  };

  const getUsagePercentage = (current: number, max: number | null): number => {
    if (max === null) return 0; // unlimited
    return Math.min((current / max) * 100, 100);
  };

  const canUpgrade = subscription?.plan !== 'premium';

  return {
    subscription,
    usageStats,
    apiUsageStats,
    loading,
    error,
    getPlanDisplayName,
    getPlanColor,
    isAtLimit,
    getUsagePercentage,
    canUpgrade,
  };
};
