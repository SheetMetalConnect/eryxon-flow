import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Mock AuthContext value
export const mockAuthContextValue = {
  user: { id: 'test-user-id', email: 'test@example.com' } as any,
  session: { access_token: 'mock-token' } as any,
  profile: {
    id: 'test-user-id',
    tenant_id: 'test-tenant-id',
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    role: 'admin' as const,
    active: true,
    is_machine: false,
    is_root_admin: false,
  },
  tenant: {
    id: 'test-tenant-id',
    name: 'Test Tenant',
    company_name: 'Test Company',
    plan: 'pro' as const,
    status: 'active' as const,
    whitelabel_enabled: false,
    whitelabel_logo_url: null,
    whitelabel_app_name: null,
    whitelabel_primary_color: null,
    whitelabel_favicon_url: null,
  },
  loading: false,
  signIn: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn().mockResolvedValue({ error: null, data: {} }),
  signOut: vi.fn().mockResolvedValue(undefined),
  switchTenant: vi.fn().mockResolvedValue(undefined),
  refreshTenant: vi.fn().mockResolvedValue(undefined),
};

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`;
      }
      return key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

interface WrapperProps {
  children: React.ReactNode;
}

// All providers wrapper for testing
const AllTheProviders = ({ children }: WrapperProps) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

// Custom render function that wraps with all providers
function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return rtlRender(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
export { createTestQueryClient };
