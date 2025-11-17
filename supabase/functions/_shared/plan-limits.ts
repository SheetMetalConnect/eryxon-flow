/**
 * Plan Limits Enforcement Helper
 *
 * This module provides utilities for enforcing subscription plan limits
 * across all API endpoints.
 *
 * Plan Limits:
 * - Free:       100 jobs, 1000 parts/month, 5GB storage, limited API access
 * - Pro:        1000 jobs, 10000 parts/month, 50GB storage, full API access
 * - Enterprise: Unlimited everything (premium tier in DB)
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface PlanLimits {
  plan: 'free' | 'pro' | 'premium';
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

/**
 * Get plan limits and current usage for a tenant
 */
export async function getTenantLimits(
  supabase: SupabaseClient,
  tenantId: string
): Promise<PlanLimits | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('plan, max_jobs, max_parts_per_month, max_storage_gb, current_jobs, current_month_parts, current_storage_mb')
    .eq('id', tenantId)
    .single();

  if (error || !data) {
    console.error('Error fetching tenant limits:', error);
    return null;
  }

  return data as PlanLimits;
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

  // Premium/Enterprise has unlimited jobs
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
      reason: `Job limit reached. Your ${limits.plan} plan allows ${limits.max_jobs} jobs. Please upgrade your plan to create more jobs.`,
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

  // Premium/Enterprise has unlimited parts
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
      reason: `Monthly parts limit reached. Your ${limits.plan} plan allows ${limits.max_parts_per_month} parts per month. ` +
              `You have ${remaining} parts remaining this month. ` +
              `This operation requires ${quantity} parts. ` +
              `Please upgrade your plan or wait until next month.`,
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
 * Check if a tenant has API access
 * Free plan has limited API access (rate limited more aggressively)
 * Pro and Enterprise have full API access
 */
export function getApiAccessLevel(plan: 'free' | 'pro' | 'premium'): 'limited' | 'full' {
  return plan === 'free' ? 'limited' : 'full';
}

/**
 * Get rate limit configuration based on plan
 */
export function getRateLimitConfig(plan: 'free' | 'pro' | 'premium'): {
  maxRequests: number;
  windowMs: number;
} {
  switch (plan) {
    case 'free':
      return {
        maxRequests: 60,      // 60 requests per hour
        windowMs: 60 * 60 * 1000,
      };
    case 'pro':
      return {
        maxRequests: 1000,    // 1000 requests per hour
        windowMs: 60 * 60 * 1000,
      };
    case 'premium':
      return {
        maxRequests: 10000,   // 10000 requests per hour
        windowMs: 60 * 60 * 1000,
      };
    default:
      return {
        maxRequests: 60,
        windowMs: 60 * 60 * 1000,
      };
  }
}

/**
 * Create a standardized error response for plan limit violations
 */
export function createLimitErrorResponse(
  quotaResult: QuotaCheckResult,
  resourceType: 'job' | 'part'
): Response {
  const headers = {
    'Content-Type': 'application/json',
    'X-Quota-Limit': quotaResult.limit?.toString() || 'unlimited',
    'X-Quota-Current': quotaResult.current?.toString() || '0',
    'X-Quota-Remaining': quotaResult.remaining?.toString() || '0',
  };

  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: quotaResult.reason || `Cannot create ${resourceType}: quota exceeded`,
        resource_type: resourceType,
        limit: quotaResult.limit,
        current: quotaResult.current,
        remaining: quotaResult.remaining,
        upgrade_url: '/pricing',
      },
    }),
    {
      status: 402, // 402 Payment Required
      headers,
    }
  );
}

/**
 * Check storage quota
 * Note: This is a placeholder - actual file upload tracking needs to be implemented
 */
export async function canUploadFile(
  supabase: SupabaseClient,
  tenantId: string,
  fileSizeMb: number
): Promise<QuotaCheckResult> {
  const limits = await getTenantLimits(supabase, tenantId);

  if (!limits) {
    return {
      allowed: false,
      reason: 'Unable to fetch tenant limits',
    };
  }

  // Premium/Enterprise has unlimited storage
  if (limits.max_storage_gb === null) {
    return {
      allowed: true,
      remaining: -1,
    };
  }

  const maxStorageMb = limits.max_storage_gb * 1024;
  const newTotal = limits.current_storage_mb + fileSizeMb;

  if (newTotal > maxStorageMb) {
    const remainingMb = Math.max(maxStorageMb - limits.current_storage_mb, 0);

    return {
      allowed: false,
      reason: `Storage limit reached. Your ${limits.plan} plan allows ${limits.max_storage_gb}GB. ` +
              `You have ${(remainingMb / 1024).toFixed(2)}GB remaining. ` +
              `This file requires ${(fileSizeMb / 1024).toFixed(2)}GB. ` +
              `Please upgrade your plan or delete old files.`,
      limit: maxStorageMb,
      current: limits.current_storage_mb,
      remaining: remainingMb,
    };
  }

  return {
    allowed: true,
    remaining: maxStorageMb - newTotal,
    limit: maxStorageMb,
    current: limits.current_storage_mb,
  };
}

/**
 * Get a user-friendly plan name
 */
export function getPlanDisplayName(plan: 'free' | 'pro' | 'premium'): string {
  switch (plan) {
    case 'free':
      return 'Free';
    case 'pro':
      return 'Pro';
    case 'premium':
      return 'Enterprise';
    default:
      return 'Unknown';
  }
}

/**
 * Log quota check (for analytics/monitoring)
 * This can be extended to track quota violations for proactive upgrade prompts
 */
export async function logQuotaCheck(
  supabase: SupabaseClient,
  tenantId: string,
  resourceType: 'job' | 'part' | 'storage',
  allowed: boolean,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    // You could create a quota_checks table for analytics
    // For now, just log to console
    console.log('Quota check:', {
      tenant_id: tenantId,
      resource_type: resourceType,
      allowed,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  } catch (error) {
    console.error('Error logging quota check:', error);
    // Don't throw - logging should never break the main flow
  }
}
