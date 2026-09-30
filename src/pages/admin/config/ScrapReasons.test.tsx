import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { QueryKeys } from '@/lib/queryClient';
import ConfigScrapReasons from './ScrapReasons';

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useMutation: vi.fn(actual.useMutation) };
});
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ tenant_id: 'tenant-1' }) }));
vi.mock('@/hooks/useQualityMetrics', () => ({ useScrapReasonUsage: () => ({ data: [] as never[] }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (_input, init) => Response.json(init?.method === 'GET' ? [] : { id: 'reason-1' }) },
  }) };
});

describe('scrap reason mutation caches', () => {
  it.each([
    ['seed', 0, undefined],
    ['create', 1, { code: 'MAT-001', description: 'Material defect', category: 'material' }],
    ['update', 1, { id: 'reason-1', code: 'MAT-001', description: 'Material defect', category: 'material' }],
    ['delete', 2, 'reason-1'],
  ])('%s invalidates both current-tenant caches', async (_name, index, value) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(QueryKeys.quality.scrapUsage('tenant-1'), []);
    client.setQueryData(QueryKeys.quality.scrapUsage('other-tenant'), []);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(<QueryClientProvider client={client}><ConfigScrapReasons /></QueryClientProvider>);
    const mutation = vi.mocked(useMutation).mock.results[index].value;
    await act(async () => { await mutation.mutateAsync(value); });
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: QueryKeys.config.scrapReasons('tenant-1') });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: QueryKeys.quality.scrapUsage('tenant-1') });
    });
    expect(client.getQueryState(QueryKeys.quality.scrapUsage('tenant-1'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(QueryKeys.quality.scrapUsage('other-tenant'))?.isInvalidated).toBe(false);
  });
});
