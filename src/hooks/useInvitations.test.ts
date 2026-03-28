import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock profile
const mockProfile = {
  id: 'user-1',
  tenant_id: 'tenant-1',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
  active: true,
  is_machine: false,
  is_root_admin: false,
};

const mockUseProfile = vi.fn(() => mockProfile as any);
vi.mock('@/hooks/useProfile', () => ({
  useProfile: (...args: any[]) => mockUseProfile(...args),
}));

// Per-table response map
const tableResponses: Record<string, any> = {};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const chain: any = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.in = () => chain;
      chain.order = () => {
        const ordered: any = { ...chain };
        ordered.then = (resolve: any, reject: any) => {
          const resp = tableResponses[table] ?? { data: [], error: null };
          return Promise.resolve(resp).then(resolve, reject);
        };
        return ordered;
      };
      chain.single = () => Promise.resolve(tableResponses[table] ?? { data: null, error: null });
      chain.then = (resolve: any, reject: any) => {
        const resp = tableResponses[table] ?? { data: [], error: null };
        return Promise.resolve(resp).then(resolve, reject);
      };
      return chain;
    },
    rpc: (...args: any[]) => mockRpc(...args),
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
    },
  },
}));

const mockRpc = vi.fn();
const mockFunctionsInvoke = vi.fn();
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null });
const mockRefreshSession = vi.fn();

// Stable t reference
const stableT = (key: string) => key;
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: stableT }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { useInvitations } from './useInvitations';
import { toast } from 'sonner';

describe('useInvitations', () => {
  beforeEach(() => {
    for (const key in tableResponses) delete tableResponses[key];
    mockRpc.mockReset();
    mockFunctionsInvoke.mockReset();
    mockGetSession.mockReset().mockResolvedValue({ data: { session: { access_token: 'test' } }, error: null });
    mockRefreshSession.mockReset();
    mockUseProfile.mockReturnValue(mockProfile as any);
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it('loads invitations on mount', async () => {
    const mockInvitations = [
      {
        id: 'inv-1',
        tenant_id: 'tenant-1',
        email: 'test@test.com',
        role: 'operator',
        token: 'abc123',
        invited_by: 'user-1',
        status: 'pending',
        expires_at: '2026-04-28T00:00:00Z',
        created_at: '2026-03-28T00:00:00Z',
      },
    ];
    tableResponses['invitations'] = { data: mockInvitations, error: null };

    const { result } = renderHook(() => useInvitations());

    // Wait for the useEffect loadInvitations to complete
    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.invitations).toEqual(mockInvitations);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns empty invitations when no tenant_id', async () => {
    mockUseProfile.mockReturnValue(null);

    const { result } = renderHook(() => useInvitations());

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.invitations).toEqual([]);
  });

  it('sets error when loading fails', async () => {
    tableResponses['invitations'] = { data: null, error: { message: 'DB error' } };

    const { result } = renderHook(() => useInvitations());

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeTruthy();
  });

  it('createInvitation calls send-invitation edge function', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockFunctionsInvoke.mockResolvedValue({
      data: { invitation_id: 'inv-new', invitation_url: 'https://example.com/invite/abc' },
      error: null,
    });

    const { result } = renderHook(() => useInvitations());

    let invitationId: string | null;
    await act(async () => {
      invitationId = await result.current.createInvitation('new@test.com', 'admin');
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('send-invitation', {
      body: {
        email: 'new@test.com',
        role: 'admin',
        tenant_id: 'tenant-1',
      },
    });
    expect(invitationId!).toBe('inv-new');
    expect(toast.success).toHaveBeenCalled();
  });

  it('createInvitation shows error when no tenant_id', async () => {
    mockUseProfile.mockReturnValue({ ...mockProfile, tenant_id: undefined as any });

    const { result } = renderHook(() => useInvitations());

    let invitationId: string | null;
    await act(async () => {
      invitationId = await result.current.createInvitation('test@test.com');
    });

    expect(invitationId!).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it('createInvitation handles edge function error', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Rate limited' },
    });

    const { result } = renderHook(() => useInvitations());

    let invitationId: string | null;
    await act(async () => {
      invitationId = await result.current.createInvitation('test@test.com');
    });

    expect(invitationId!).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it('cancelInvitation calls rpc and shows success', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockRpc.mockResolvedValue({ data: true, error: null });

    const { result } = renderHook(() => useInvitations());

    await act(async () => {
      await result.current.cancelInvitation('inv-1');
    });

    expect(mockRpc).toHaveBeenCalledWith('cancel_invitation', {
      p_invitation_id: 'inv-1',
    });
    expect(toast.success).toHaveBeenCalled();
  });

  it('cancelInvitation shows error on rpc failure', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const { result } = renderHook(() => useInvitations());

    await act(async () => {
      await result.current.cancelInvitation('inv-bad');
    });

    expect(toast.error).toHaveBeenCalled();
  });

  it('getInvitationByToken calls rpc and returns data', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockRpc.mockResolvedValue({
      data: [{ id: 'inv-1', email: 'test@test.com', status: 'pending' }],
      error: null,
    });

    const { result } = renderHook(() => useInvitations());

    let invitation: any;
    await act(async () => {
      invitation = await result.current.getInvitationByToken('token-abc');
    });

    expect(mockRpc).toHaveBeenCalledWith('get_invitation_by_token', {
      p_token: 'token-abc',
    });
    expect(invitation).toEqual({ id: 'inv-1', email: 'test@test.com', status: 'pending' });
  });

  it('getInvitationByToken returns null for invalid token', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useInvitations());

    let invitation: any;
    await act(async () => {
      invitation = await result.current.getInvitationByToken('bad-token');
    });

    expect(invitation).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it('acceptInvitation calls rpc with token and userId', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockRpc.mockResolvedValue({ data: 'tenant-1', error: null });

    const { result } = renderHook(() => useInvitations());

    let returnVal: any;
    await act(async () => {
      returnVal = await result.current.acceptInvitation('token-abc', 'user-new');
    });

    expect(mockRpc).toHaveBeenCalledWith('accept_invitation', {
      p_token: 'token-abc',
      p_user_id: 'user-new',
    });
    expect(returnVal).toBe('tenant-1');
  });

  it('acceptInvitation returns null on error', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Expired' } });

    const { result } = renderHook(() => useInvitations());

    let returnVal: any;
    await act(async () => {
      returnVal = await result.current.acceptInvitation('expired-token', 'user-1');
    });

    expect(returnVal).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });

  it('reload function triggers re-fetch', async () => {
    tableResponses['invitations'] = { data: [], error: null };

    const { result } = renderHook(() => useInvitations());

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.invitations).toEqual([]);

    const updatedInvitations = [{ id: 'inv-2', email: 'new@test.com' }];
    tableResponses['invitations'] = { data: updatedInvitations, error: null };

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.invitations).toEqual(updatedInvitations);
  });

  it('createInvitation tries to refresh session when getSession fails', async () => {
    tableResponses['invitations'] = { data: [], error: null };
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: { access_token: 'refreshed' } },
      error: null,
    });
    mockFunctionsInvoke.mockResolvedValue({
      data: { invitation_id: 'inv-new' },
      error: null,
    });

    const { result } = renderHook(() => useInvitations());

    await act(async () => {
      await result.current.createInvitation('test@test.com');
    });

    expect(mockRefreshSession).toHaveBeenCalled();
    expect(mockFunctionsInvoke).toHaveBeenCalled();
  });
});
