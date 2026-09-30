import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useMutation } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ConfigWebhooks from './Webhooks';

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useMutation: vi.fn(actual.useMutation) };
});
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ tenant_id: 'tenant-1' }) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => String(input).includes('/rpc/')
      ? Response.json({ code: '55000', message: 'Configure Vault project_url and internal_service_secret' }, { status: 400 })
      : Response.json([]) },
  }) };
});

it('shows the actionable database preflight error instead of a success toast', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><ConfigWebhooks /></QueryClientProvider>);
  const sendTest = vi.mocked(useMutation).mock.results[3].value;
  await act(async () => { await expect(sendTest.mutateAsync('webhook-1')).rejects.toThrow('Configure Vault'); });
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Configure Vault project_url and internal_service_secret'));
  expect(toast.success).not.toHaveBeenCalled();
});
