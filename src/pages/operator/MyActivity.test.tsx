import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  transport: vi.fn<typeof fetch>(),
  operator: null as { id: string } | null,
}));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: state.transport },
  }) };
});
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ id: 'profile-1' }) }));
vi.mock('@/contexts/OperatorContext', () => ({ useOperator: () => ({ activeOperator: state.operator }) }));
vi.mock('@/hooks/usePageTitle', () => ({ usePageTitle: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import MyActivity from './MyActivity';

describe('activity effective actor filtering', () => {
  beforeEach(() => {
    state.operator = null;
    state.transport.mockReset().mockImplementation(async () => new Response('[]', {
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('excludes PIN-worker rows from the terminal profile activity', async () => {
    render(<MyActivity />);
    await waitFor(() => expect(state.transport).toHaveBeenCalled());
    const query = new URL(String(state.transport.mock.calls[0][0])).searchParams;
    expect(query.get('operator_id')).toBe('eq.profile-1');
    expect(query.get('shop_floor_operator_id')).toBe('is.null');
  });

  it('uses the verified worker identity for PIN activity', async () => {
    state.operator = { id: 'worker-1' };
    render(<MyActivity />);
    await waitFor(() => expect(state.transport).toHaveBeenCalled());
    const query = new URL(String(state.transport.mock.calls[0][0])).searchParams;
    expect(query.get('shop_floor_operator_id')).toBe('eq.worker-1');
    expect(query.has('operator_id')).toBe(false);
  });
});
