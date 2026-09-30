import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import ProductionQuantityModal from './ProductionQuantityModal';

const state = vi.hoisted(() => ({ transport: vi.fn<typeof fetch>(), writes: [] as Array<{ table: string; body: unknown }> }));
const translation = vi.hoisted(() => ({
  t: (key: string, options?: { count?: number }) =>
    key === 'production.reported' ? `${options?.count} parts reported` : key,
}));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ id: 'profile-1', tenant_id: 'tenant-1' }) }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: state.transport },
  }) };
});
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => translation,
}));

function show(plannedQuantity?: number) {
  const onSuccess = vi.fn();
  render(<ProductionQuantityModal isOpen onClose={vi.fn()} operationId="operation-1"
    operationName="Laser cut" partNumber="PART-1" plannedQuantity={plannedQuantity} allowComplete onSuccess={onSuccess} />);
  return onSuccess;
}

describe('ProductionQuantityModal', () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockClear();
    state.writes = [];
    state.transport.mockImplementation(async (input, init) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop()!;
      let body: unknown = table === 'scrap_reasons'
        ? [{ id: 'reason-1', code: 'MAT-001', description: 'Material defect' }, { id: 'reason-2', code: 'PRC-001', description: 'Process defect' }]
        : [{ quantity_good: 4 }];
      if (init?.method === 'POST') {
        state.writes.push({ table, body: JSON.parse(String(init.body)) });
        body = { id: 'quantity-1' };
      }
      return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
    });
  });

  it('reports the final good quantity and completes in one action', async () => {
    const onSuccess = show(5);
    await waitFor(() => expect(screen.getByText('4 / 5')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'production.increaseQuantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'production.reportAndComplete' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(1, true));
    expect(state.writes[0].body).toMatchObject({ quantity_produced: 1, quantity_good: 1, quantity_scrap: 0, quantity_rework: 0 });
  });

  it('records good, scrap and rework through the existing reporting contract with multiple reasons', async () => {
    const onSuccess = show();
    fireEvent.click(screen.getByRole('button', { name: 'production.increaseQuantity' }));
    fireEvent.change(screen.getByLabelText('production.rework'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'production.addReason' }));
    fireEvent.change(screen.getByLabelText('production.scrap 1'), { target: { value: '3' } });
    await screen.findByRole('option', { name: 'MAT-001: Material defect' });
    fireEvent.change(screen.getByLabelText('production.selectReason 1'), { target: { value: 'reason-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'production.addReason' }));
    fireEvent.change(screen.getByLabelText('production.scrap 2'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('production.selectReason 2'), { target: { value: 'reason-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'production.report' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(1, false));
    expect(state.writes[0]).toMatchObject({ table: 'operation_quantities', body: {
      tenant_id: 'tenant-1', recorded_by: 'profile-1', quantity_produced: 10,
      quantity_good: 1, quantity_scrap: 7, quantity_rework: 2,
    } });
    expect(state.writes[1]).toEqual({ table: 'operation_quantity_scrap_reasons', body: [
      { operation_quantity_id: 'quantity-1', scrap_reason_id: 'reason-1', quantity: 3 },
      { operation_quantity_id: 'quantity-1', scrap_reason_id: 'reason-2', quantity: 4 },
    ] });
    expect(toast.success).toHaveBeenCalledWith('10 parts reported');
  });

  it('allows rework-only output and rejects fractional or negative quantities', async () => {
    const onSuccess = show();
    const rework = screen.getByLabelText('production.rework');
    for (const value of ['-1', '1.5']) {
      fireEvent.change(rework, { target: { value } });
      expect(screen.getByRole('button', { name: 'production.report' })).toBeDisabled();
    }
    fireEvent.change(rework, { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'production.report' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(0, false));
    expect(state.writes[0].body).toMatchObject({ quantity_produced: 2, quantity_good: 0, quantity_rework: 2 });
    expect(toast.success).toHaveBeenCalledWith('2 parts reported');
  });
});
