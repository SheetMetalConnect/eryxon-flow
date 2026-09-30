import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ transport: vi.fn<typeof fetch>() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: state.transport },
  }) };
});
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ id: 'profile-1', tenant_id: 'tenant-1' }) }));
vi.mock('@/contexts/OperatorContext', () => ({ useOperator: () => ({ activeOperator: { id: 'worker-1', full_name: 'Worker' } }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
import IssueForm from './IssueForm';

describe('issue creator identity', () => {
  it('reports an NCR with the authenticated profile while a physical operator is active', async () => {
    let inserted: Record<string, unknown> | undefined;
    state.transport.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      let body: unknown = [];
      if (url.pathname.endsWith('/operations') && url.searchParams.has('id')) {
        body = { sequence: 1, cell_id: 'cell-1', part: { id: 'part-1', current_cell_id: null, job: {} } };
      }
      if (url.pathname.endsWith('/issues') && init?.method === 'POST') {
        inserted = JSON.parse(String(init.body));
      }
      return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    });
    const onSuccess = vi.fn();
    render(<IssueForm operationId="operation-1" open onOpenChange={vi.fn()} onSuccess={onSuccess}
      prefilledData={{ affectedQuantity: 2, isShortfall: true }} />);
    fireEvent.change(screen.getByLabelText(/issues.description/), { target: { value: 'Dimensional defect' } });
    fireEvent.click(screen.getByRole('button', { name: 'issues.report' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(inserted).toMatchObject({ created_by: 'profile-1', tenant_id: 'tenant-1', issue_type: 'ncr' });
  });
});
