import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductionQuantityModal from './ProductionQuantityModal';

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  selectEq: vi.fn(),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ tenant_id: 'tenant-1' }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      insert: mocks.insert,
      select: () => ({ eq: mocks.selectEq }),
    }),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('ProductionQuantityModal', () => {
  beforeEach(() => {
    mocks.selectEq.mockResolvedValue({ data: [{ quantity_good: 4 }], error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it('reports the final quantity and completes in one action', async () => {
    const onSuccess = vi.fn();
    render(
      <ProductionQuantityModal
        isOpen
        onClose={vi.fn()}
        operationId="operation-1"
        operationName="Laser cut"
        partNumber="PART-1"
        plannedQuantity={5}
        allowComplete
        onSuccess={onSuccess}
      />,
    );

    await waitFor(() => expect(screen.getByText('4 / 5')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'production.increaseQuantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'production.reportAndComplete' }));

    await waitFor(() => {
      expect(mocks.insert).toHaveBeenCalledOnce();
      expect(onSuccess).toHaveBeenCalledWith(1, true);
    });
  });
});
