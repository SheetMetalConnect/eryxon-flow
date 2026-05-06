/**
 * Tests for supabase/functions/_shared/plan-limits.ts
 *
 * Tests the pure utility functions that enforce subscription plan limits:
 * - Rate limit configuration per plan tier
 * - API access level determination
 * - Plan display names
 *
 * The async quota-check functions (canCreateJob, canCreateParts, canUploadFile)
 * require a Supabase client and are integration test territory.
 */

import { describe, it, expect } from 'vitest';

import {
  getRateLimitConfig,
  getApiAccessLevel,
  getPlanDisplayName,
} from '../../../supabase/functions/_shared/plan-limits.ts';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('plan-limits — getRateLimitConfig', () => {
  it('free plan: 100 requests per day', () => {
    const config = getRateLimitConfig('free');
    expect(config.maxRequests).toBe(100);
    expect(config.windowMs).toBe(ONE_DAY_MS);
  });

  it('pro plan: 1000 requests per day', () => {
    const config = getRateLimitConfig('pro');
    expect(config.maxRequests).toBe(1000);
    expect(config.windowMs).toBe(ONE_DAY_MS);
  });

  it('premium plan: 10000 requests per day', () => {
    const config = getRateLimitConfig('premium');
    expect(config.maxRequests).toBe(10000);
    expect(config.windowMs).toBe(ONE_DAY_MS);
  });

  it('enterprise plan: unlimited requests', () => {
    const config = getRateLimitConfig('enterprise');
    expect(config.maxRequests).toBeNull();
    expect(config.windowMs).toBe(ONE_DAY_MS);
  });

  it('tiers are strictly ordered: free < pro < premium < enterprise', () => {
    const free = getRateLimitConfig('free').maxRequests!;
    const pro = getRateLimitConfig('pro').maxRequests!;
    const premium = getRateLimitConfig('premium').maxRequests!;
    const enterprise = getRateLimitConfig('enterprise').maxRequests;

    expect(free).toBeLessThan(pro);
    expect(pro).toBeLessThan(premium);
    expect(enterprise).toBeNull(); // unlimited
  });

  it('defaults to free tier for unknown plans', () => {
    // Force an unknown plan value
    const config = getRateLimitConfig('unknown' as any);
    expect(config.maxRequests).toBe(100);
    expect(config.windowMs).toBe(ONE_DAY_MS);
  });

  it('all plans use a 24-hour window', () => {
    const plans: Array<'free' | 'pro' | 'premium' | 'enterprise'> = [
      'free',
      'pro',
      'premium',
      'enterprise',
    ];
    for (const plan of plans) {
      expect(getRateLimitConfig(plan).windowMs).toBe(ONE_DAY_MS);
    }
  });
});

describe('plan-limits — getApiAccessLevel', () => {
  it('free plan has limited API access', () => {
    expect(getApiAccessLevel('free')).toBe('limited');
  });

  it('pro plan has full API access', () => {
    expect(getApiAccessLevel('pro')).toBe('full');
  });

  it('premium plan has full API access', () => {
    expect(getApiAccessLevel('premium')).toBe('full');
  });

  it('enterprise plan has full API access', () => {
    expect(getApiAccessLevel('enterprise')).toBe('full');
  });
});

describe('plan-limits — getPlanDisplayName', () => {
  it('returns correct display names for all plans', () => {
    expect(getPlanDisplayName('free')).toBe('Free');
    expect(getPlanDisplayName('pro')).toBe('Pro');
    expect(getPlanDisplayName('premium')).toBe('Premium');
    expect(getPlanDisplayName('enterprise')).toBe('Enterprise');
  });

  it('returns "Unknown" for unrecognized plans', () => {
    expect(getPlanDisplayName('beta' as any)).toBe('Unknown');
  });
});
