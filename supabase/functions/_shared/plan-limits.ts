/**
 * Plan Limits Enforcement Helper
 *
 * This module provides utilities for enforcing subscription plan limits
 * across all API endpoints.
 *
 * The database keeps the historical free/pro/premium/enterprise keys for hosted
 * quota records. Public plan names and commercial terms are not defined here.
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface PlanLimits {
  plan: 'free' | 'pro' | 'premium' | 'enterprise';
  max_jobs: number | null;
  max_parts_per_month: number | null;
  max_storage_gb: number | null;
  current_jobs: number;
  current_month_parts: number;
  current_storage_mb: number;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  current?: number;
}

function displayPlan(plan: PlanLimits['plan']): string {
  if (plan === 'free') return 'hosted trial';
  if (plan === 'pro') return 'hosted';
  return 'managed hosting';
}

/**
 * Get plan limits and current usage for a tenant
 */
export async function getTenantLimits(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PlanLimits | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('plan, max_jobs, max_parts_per_month, max_storage_gb, current_jobs, current_parts_this_month, current_storage_gb')
    .eq('id', tenantId)
    .single();

  if (error || !data) {
    console.error('Error fetching tenant limits:', error);
    return null;
  }

  // Map actual column names to interface
  return {
    plan: data.plan,
    max_jobs: data.max_jobs,
    max_parts_per_month: data.max_parts_per_month,
    max_storage_gb: data.max_storage_gb,
    current_jobs: data.current_jobs ?? 0,
    current_month_parts: data.current_parts_this_month ?? 0,
    current_storage_mb: (parseFloat(data.current_storage_gb) || 0) * 1024,
  } as PlanLimits;
}

/**
 * Check if a tenant can create a new job
 */
export async function canCreateJob(
  supabase: SupabaseClient,
  tenantId: string
): Promise<QuotaCheckResult> {
  const limits = await getTenantLimits(supabase, tenantId);

  if (!limits) {
    return {
      allowed: false,
      reason: 'Unable to fetch tenant limits',
    };
  }

  // A null quota is unlimited.
  if (limits.max_jobs === null) {
    return {
      allowed: true,
      remaining: -1, // -1 means unlimited
    };
  }

  // Check if under limit
  if (limits.current_jobs >= limits.max_jobs) {
    return {
      allowed: false,
      reason: `Job limit reached. Your ${displayPlan(limits.plan)} plan allows ${limits.max_jobs} jobs. Please contact support to change the limit.`,
      limit: limits.max_jobs,
      current: limits.current_jobs,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: limits.max_jobs - limits.current_jobs,
    limit: limits.max_jobs,
    current: limits.current_jobs,
  };
}

/**
 * Check if a tenant can create new parts
 */
export async function canCreateParts(
  supabase: SupabaseClient,
  tenantId: string,
  quantity: number = 1
): Promise<QuotaCheckResult> {
  const limits = await getTenantLimits(supabase, tenantId);

  if (!limits) {
    return {
      allowed: false,
      reason: 'Unable to fetch tenant limits',
    };
  }

  // A null quota is unlimited.
  if (limits.max_parts_per_month === null) {
    return {
      allowed: true,
      remaining: -1, // -1 means unlimited
    };
  }

  // Check if under limit (including the new parts)
  const newTotal = limits.current_month_parts + quantity;

  if (newTotal > limits.max_parts_per_month) {
    const remaining = Math.max(limits.max_parts_per_month - limits.current_month_parts, 0);

    return {
      allowed: false,
      reason: `Monthly parts limit reached. Your ${displayPlan(limits.plan)} plan allows ${limits.max_parts_per_month} parts per month. ` +
              `You have ${remaining} parts remaining this month. ` +
              `This operation requires ${quantity} parts. ` +
              `Please contact support or wait until next month.`,
      limit: limits.max_parts_per_month,
      current: limits.current_month_parts,
      remaining,
    };
  }

  return {
    allowed: true,
    remaining: limits.max_parts_per_month - newTotal,
    limit: limits.max_parts_per_month,
    current: limits.current_month_parts,
  };
}

/**
 * Get rate limit configuration based on plan
 *
 * Conservative daily limits (MVP - can increase later):
 * - Free: 100 requests/day (very limited for evaluation)
 * - Pro: 1,000 requests/day (production use)
 * - Legacy premium key: 10,000 requests/day
 * - Enterprise: No limit (custom infrastructure)
 */
export function getRateLimitConfig(plan: 'free' | 'pro' | 'premium' | 'enterprise'): {
  maxRequests: number | null;  // null = unlimited
  windowMs: number;
} {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  switch (plan) {
    case 'free':
      return {
        maxRequests: 100,      // 100 requests per day
        windowMs: ONE_DAY_MS,
      };
    case 'pro':
      return {
        maxRequests: 1000,     // 1,000 requests per day
        windowMs: ONE_DAY_MS,
      };
    case 'premium':
      return {
        maxRequests: 10000,    // 10,000 requests per day (fair use)
        windowMs: ONE_DAY_MS,
      };
    case 'enterprise':
      return {
        maxRequests: null,     // Unlimited
        windowMs: ONE_DAY_MS,
      };
    default:
      return {
        maxRequests: 100,      // Default to free tier
        windowMs: ONE_DAY_MS,
      };
  }
}
