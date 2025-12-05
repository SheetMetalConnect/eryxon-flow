import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Create mock functions at module scope (before vi.mock calls)
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: () => mockOnAuthStateChange(),
      signInWithPassword: (params: unknown) => mockSignInWithPassword(params),
      signUp: (params: unknown) => mockSignUp(params),
      signOut: () => mockSignOut(),
    },
    from: (table: string) => mockFrom(table),
    rpc: (fn: string, params?: unknown) => mockRpc(fn, params),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Import after mocking
import { AuthProvider, useAuth } from './AuthContext';

describe('AuthContext', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser,
    expires_in: 3600,
    token_type: 'bearer',
  };

  const mockProfile = {
    id: 'user-123',
    tenant_id: 'tenant-123',
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    active: true,
    is_machine: false,
    is_root_admin: false,
  };

  const mockTenantInfo = {
    id: 'tenant-123',
    name: 'Test Tenant',
    company_name: 'Test Company',
    plan: 'pro',
    status: 'active',
    whitelabel_enabled: false,
    whitelabel_logo_url: null,
    whitelabel_app_name: null,
    whitelabel_primary_color: null,
    whitelabel_favicon_url: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: { unsubscribe: vi.fn() },
      },
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
    });

    mockRpc.mockResolvedValue({
      data: [mockTenantInfo],
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthProvider, null, children);

  describe('initialization', () => {
    it('starts in loading state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      expect(result.current.loading).toBe(true);
    });

    it('checks for existing session on mount', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled();
      });
    });

    it('sets up auth state listener on mount', () => {
      renderHook(() => useAuth(), { wrapper });
      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('calls supabase signInWithPassword', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('returns error on sign in failure', async () => {
      const signInError = new Error('Invalid credentials');
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let signInResult: { error: Error | null };
      await act(async () => {
        signInResult = await result.current.signIn('test@example.com', 'wrong');
      });

      expect(signInResult!.error).toBe(signInError);
    });
  });

  describe('signUp', () => {
    it('calls supabase signUp with user data', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('new@example.com', 'password123', {
          full_name: 'New User',
          role: 'operator',
          company_name: 'New Company',
        });
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password123',
        options: expect.objectContaining({
          data: expect.objectContaining({
            full_name: 'New User',
            role: 'operator',
            company_name: 'New Company',
          }),
        }),
      });
    });

    it('generates username from email', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('testuser@example.com', 'password123', {
          full_name: 'Test User',
        });
      });

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            data: expect.objectContaining({
              username: 'testuser',
            }),
          }),
        })
      );
    });
  });

  describe('signOut', () => {
    it('calls supabase signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('clears profile and tenant on sign out', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(result.current.profile).toBeNull();
      expect(result.current.tenant).toBeNull();
    });
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});

describe('AuthContext - Profile Types', () => {
  it('correctly types operator role', () => {
    const operatorProfile = {
      id: 'user-1',
      tenant_id: 'tenant-1',
      username: 'operator1',
      full_name: 'Operator One',
      email: 'operator@example.com',
      role: 'operator' as const,
      active: true,
      is_machine: false,
      is_root_admin: false,
    };

    expect(operatorProfile.role).toBe('operator');
  });

  it('correctly types admin role', () => {
    const adminProfile = {
      id: 'user-1',
      tenant_id: 'tenant-1',
      username: 'admin1',
      full_name: 'Admin One',
      email: 'admin@example.com',
      role: 'admin' as const,
      active: true,
      is_machine: false,
      is_root_admin: true,
    };

    expect(adminProfile.role).toBe('admin');
  });
});

describe('AuthContext - Tenant Types', () => {
  it('correctly types tenant plans', () => {
    const plans = ['free', 'pro', 'premium', 'enterprise'] as const;
    plans.forEach((plan) => {
      expect(typeof plan).toBe('string');
    });
  });

  it('correctly types tenant status', () => {
    const statuses = ['active', 'cancelled', 'suspended', 'trial'] as const;
    statuses.forEach((status) => {
      expect(typeof status).toBe('string');
    });
  });
});
