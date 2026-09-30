import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ transport: vi.fn<typeof fetch>() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: state.transport },
  });
  const channel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
  supabase.channel = vi.fn().mockReturnValue(channel);
  supabase.removeChannel = vi.fn();
  return { supabase };
});
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ id: 'profile-1', tenant_id: 'tenant-1' }) }));
vi.mock('@/contexts/OperatorContext', () => ({ useOperator: () => ({ activeOperator: { id: 'worker-1' } }) }));
import MyIssues from './MyIssues';

describe('my issues with an active shop-floor operator', () => {
  it('filters by profile id, never physical operator id', async () => {
    state.transport.mockResolvedValue(new Response('[]', { headers: { 'Content-Type': 'application/json' } }));
    render(<MyIssues />);
    await waitFor(() => expect(state.transport).toHaveBeenCalled());
    const url = new URL(String(state.transport.mock.calls[0][0]));
    expect(url.searchParams.get('created_by')).toBe('eq.profile-1');
  });
});
