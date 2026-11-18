import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock useTenant
const mockTenant = { id: 'tenant-1', plan: 'pro', name: 'Test Tenant' };
vi.mock('@/hooks/useTenant', () => ({
  useTenant: vi.fn(() => ({ tenant: mockTenant, refreshTenant: vi.fn() })),
}));

// Mock supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: any[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: any[]) => {
            mockEq(...eqArgs);
            return {
              single: () => mockSingle(),
            };
          },
        };
      },
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useFeatureFlags, useIsFeatureEnabled, DEFAULT_FEATURE_FLAGS } from './useFeatureFlags';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient, children });
  };
};

describe('useFeatureFlags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default flags while loading', () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    // Before query resolves, flags should be defaults
    expect(result.current.flags).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('fetches and merges stored flags with defaults', async () => {
    mockSingle.mockResolvedValue({
      data: { feature_flags: { analytics: false, advancedCAD: false } },
      error: null,
    });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.flags.analytics).toBe(false);
    expect(result.current.flags.advancedCAD).toBe(false);
    // Other flags should remain as defaults
    expect(result.current.flags.monitoring).toBe(true);
    expect(result.current.flags.operatorViews).toBe(true);
  });

  it('returns all defaults when no stored flags exist', async () => {
    mockSingle.mockResolvedValue({
      data: { feature_flags: null },
      error: null,
    });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.flags).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('isEnabled returns correct flag state', async () => {
    mockSingle.mockResolvedValue({
      data: { feature_flags: { analytics: false } },
      error: null,
    });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEnabled('analytics')).toBe(false);
    expect(result.current.isEnabled('monitoring')).toBe(true);
  });

  it('returns defaults when no tenant is set', async () => {
    const { useTenant } = await import('@/hooks/useTenant');
    vi.mocked(useTenant).mockReturnValueOnce({ tenant: null as any, refreshTenant: vi.fn() });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    // Query should not be enabled, so flags stay as defaults
    expect(result.current.flags).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('exposes isSaving state', () => {
    mockSingle.mockResolvedValue({ data: { feature_flags: {} }, error: null });

    const { result } = renderHook(() => useFeatureFlags(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isSaving).toBe(false);
  });

  it('all default flags are true', () => {
    for (const [key, value] of Object.entries(DEFAULT_FEATURE_FLAGS)) {
      expect(value).toBe(true);
    }
  });
});

describe('useIsFeatureEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for enabled features', async () => {
    mockSingle.mockResolvedValue({
      data: { feature_flags: { analytics: true } },
      error: null,
    });

    const { result } = renderHook(() => useIsFeatureEnabled('analytics'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('returns false for disabled features', async () => {
    mockSingle.mockResolvedValue({
      data: { feature_flags: { analytics: false } },
      error: null,
    });

    const { result } = renderHook(() => useIsFeatureEnabled('analytics'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
