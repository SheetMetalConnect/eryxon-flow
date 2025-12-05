import { vi } from 'vitest';

// Mock Supabase channel for realtime subscriptions
export const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn(),
};

// Mock query builder chain
export const createMockQueryBuilder = (data: any = [], error: any = null) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data[0] || null, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
    textSearch: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
  };
  return builder;
};

// Mock auth methods
export const mockAuth = {
  getSession: vi.fn().mockResolvedValue({
    data: {
      session: {
        access_token: 'mock-token',
        user: { id: 'test-user-id', email: 'test@example.com' },
      },
    },
    error: null,
  }),
  signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  onAuthStateChange: vi.fn().mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  }),
};

// Create a mock Supabase client
export const createMockSupabase = () => ({
  from: vi.fn((table: string) => createMockQueryBuilder()),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  channel: vi.fn().mockReturnValue(mockChannel),
  removeChannel: vi.fn(),
  auth: mockAuth,
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file' } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
});

// Default mock instance
export const mockSupabase = createMockSupabase();

// Mock the supabase import
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));
