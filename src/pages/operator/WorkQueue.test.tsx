import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkQueue from './WorkQueue';

const mocks = vi.hoisted(() => ({ detail: vi.fn(), list: vi.fn(), translate: (key: string) => key }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: mocks.translate, i18n: { language: "en" } }) }));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ id: 'user-1', tenant_id: 'tenant-1' }) }));
vi.mock('@/contexts/OperatorContext', () => ({ useOperator: (): { activeOperator: null } => ({ activeOperator: null }) }));
vi.mock('@/lib/db', () => ({ fetchOperationDetails: mocks.detail, fetchOperationsWithDetails: mocks.list, fetchOperationLookupDetails: mocks.list }));
vi.mock('@/components/operator/OperationDetailModal', () => ({ default: ({ operation, initialIssueOpen }: { operation: { id: string }; initialIssueOpen: boolean }) => <div role="dialog">{operation.id}:{String(initialIssueOpen)}</div> }));
vi.mock('@/components/operator/OperationCard', () => ({ default: (): null => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { channel: () => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }), removeChannel: vi.fn() } }));

function open(path: string) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><Routes><Route path="/operator/operations/:operationId" element={<WorkQueue />} /></Routes></MemoryRouter>
  </QueryClientProvider>);
}

describe('operation deep links', () => {
  beforeEach(() => vi.clearAllMocks());
  it('loads only the requested operation and preserves report-issue intent', async () => {
    mocks.detail.mockResolvedValue({ id: 'op-1' });
    open('/operator/operations/op-1?tab=issue');
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('op-1:true'));
    expect(mocks.detail).toHaveBeenCalledWith('tenant-1', 'op-1');
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it('shows a recoverable missing-operation state', async () => {
    mocks.detail.mockResolvedValue(null);
    open('/operator/operations/missing');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('workQueue.operationNotFound'));
  });
});
