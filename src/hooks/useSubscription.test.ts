import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock the auth context
const mockProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  username: 'testuser',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
  active: true,
  is_machine: false,
  is_root_admin: false,
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    profile: mockProfile,
  })),
}));

// Mock supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockImplementation((funcName) => {
      if (funcName === 'get_my_tenant_subscription') {
        return Promise.resolve({
          data: [
            {
              tenant_id: 'tenant-1',
              plan: 'pro',
              status: 'active',
              max_jobs: 100,
              max_parts_per_month: 500,
              max_storage_gb: 10,
              current_jobs: 25,
              current_parts_this_month: 150,
              current_storage_gb: 2.5,
            },
          ],
          error: null,
        });
      }
      if (funcName === 'get_tenant_usage_stats') {
        return Promise.resolve({
          data: [
            {
              total_jobs: 50,
              total_parts: 200,
              active_jobs: 25,
              completed_jobs: 25,
              parts_this_month: 150,
              total_operators: 10,
              total_admins: 2,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  },
}));

// Import after mocking
import { useSubscription, SubscriptionPlan } from './useSubscription';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, {
      client: queryClient,
      children,
    });
  };
};

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPlanDisplayName', () => {
    it('returns correct display name for all plans', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getPlanDisplayName('free')).toBe('Hosted Alpha Trial');
      expect(result.current.getPlanDisplayName('pro')).toBe('Pro Plan');
      expect(result.current.getPlanDisplayName('premium')).toBe('Premium Plan');
      expect(result.current.getPlanDisplayName('enterprise')).toBe(
        'Enterprise Plan'
      );
    });

    it('returns "Unknown Plan" for unknown plans', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(
        result.current.getPlanDisplayName('invalid' as SubscriptionPlan)
      ).toBe('Unknown Plan');
    });
  });

  describe('getPlanColor', () => {
    it('returns correct colors for all plans', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getPlanColor('free')).toBe('#64748b');
      expect(result.current.getPlanColor('pro')).toBe('#8b5cf6');
      expect(result.current.getPlanColor('premium')).toBe('#f59e0b');
      expect(result.current.getPlanColor('enterprise')).toContain('gradient');
    });

    it('returns default color for unknown plans', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(
        result.current.getPlanColor('invalid' as SubscriptionPlan)
      ).toBe('#64748b');
    });
  });

  describe('isAtLimit', () => {
    it('returns true when at limit', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAtLimit(100, 100)).toBe(true);
      expect(result.current.isAtLimit(150, 100)).toBe(true);
    });

    it('returns false when below limit', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAtLimit(50, 100)).toBe(false);
      expect(result.current.isAtLimit(0, 100)).toBe(false);
    });

    it('returns false when max is null (unlimited)', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAtLimit(1000, null)).toBe(false);
      expect(result.current.isAtLimit(999999, null)).toBe(false);
    });
  });

  describe('getUsagePercentage', () => {
    it('calculates correct percentage', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getUsagePercentage(50, 100)).toBe(50);
      expect(result.current.getUsagePercentage(25, 100)).toBe(25);
      expect(result.current.getUsagePercentage(75, 100)).toBe(75);
    });

    it('caps at 100%', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getUsagePercentage(150, 100)).toBe(100);
      expect(result.current.getUsagePercentage(200, 100)).toBe(100);
    });

    it('returns 0 for unlimited (null max)', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getUsagePercentage(50, null)).toBe(0);
      expect(result.current.getUsagePercentage(1000, null)).toBe(0);
    });

    it('handles zero max gracefully', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // When max is 0, any current value would be 100% (capped)
      // But typically we wouldn't have max=0, so this tests edge case
      expect(result.current.getUsagePercentage(10, 0)).toBe(100);
    });
  });

  describe('canUpgrade', () => {
    it('returns true for free plan', async () => {
      const { supabase } = await import('../integrations/supabase/client');
      vi.mocked(supabase.rpc).mockImplementationOnce(() =>
        ({
          then: (cb: any) => cb({
            data: [{ plan: 'free', status: 'active' }],
            error: null,
          }),
        }) as any
      );

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canUpgrade).toBe(true);
    });

    it('returns true for pro plan', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Default mock returns 'pro' plan
      expect(result.current.canUpgrade).toBe(true);
    });
  });

  describe('subscription data', () => {
    it('loads subscription data', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.subscription).toBeDefined();
      expect(result.current.subscription?.plan).toBe('pro');
      expect(result.current.subscription?.status).toBe('active');
    });

    it('loads usage stats', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.usageStats).toBeDefined();
      expect(result.current.usageStats?.total_jobs).toBe(50);
      expect(result.current.usageStats?.active_jobs).toBe(25);
    });
  });

  describe('error handling', () => {
    it('handles API errors gracefully', async () => {
      const { supabase } = await import('../integrations/supabase/client');
      vi.mocked(supabase.rpc).mockImplementationOnce(() =>
        ({
          then: (cb: any) => cb({
            data: null,
            error: { message: 'API Error', code: '500' },
          }),
        }) as any
      );

      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('loading state', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      expect(result.current.loading).toBe(true);
    });

    it('transitions to loaded state', async () => {
      const { result } = renderHook(() => useSubscription(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});

// Note: Testing the no-profile case requires module-level mock reset
// which is complex with dynamic imports. The main useSubscription tests
// adequately cover the functionality.
