import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const mockProfile = {
  id: 'profile-1',
  tenant_id: 'tenant-1',
  full_name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
  active: true,
  is_machine: false,
  is_root_admin: false,
}

vi.mock('@/hooks/useProfile', () => ({
  useProfile: vi.fn(() => mockProfile),
}))

// Capture calls so we can assert the remove-then-insert ordering and payloads.
const updateCalls: Record<string, unknown>[] = []
const insertCalls: Record<string, unknown>[] = []

const makeFrom = () => {
  // update().eq().eq().is() chain resolves to { error: null }
  const updateChain = {
    eq: vi.fn(() => updateChain),
    is: vi.fn(() => Promise.resolve({ error: null })),
  }
  // insert().select().single() chain resolves to inserted row
  const insertChain = {
    select: vi.fn(() => insertChain),
    single: vi.fn(() => Promise.resolve({ data: { id: 'placement-1' }, error: null })),
  }
  return {
    update: vi.fn((payload: Record<string, unknown>) => {
      updateCalls.push(payload)
      return updateChain
    }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push(payload)
      return insertChain
    }),
  }
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => makeFrom()),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

import { useRecordPlacement } from './useRecordPlacement'

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('useRecordPlacement', () => {
  beforeEach(() => {
    updateCalls.length = 0
    insertCalls.length = 0
  })

  it('clears any active placement (removed_at) then inserts the new row scoped to tenant', async () => {
    const { result } = renderHook(() => useRecordPlacement(), { wrapper })

    result.current.recordPlacement({
      partId: 'part-1',
      locationId: 'loc-1',
      operationId: 'op-1',
      operatorId: 'operator-1',
    })

    await waitFor(() => expect(insertCalls.length).toBe(1))

    // Existing active placement is marked removed before a new one is inserted.
    expect(updateCalls.length).toBe(1)
    expect(updateCalls[0]).toHaveProperty('removed_at')

    // Insert carries tenant scope, placed_by (profile) and operator id.
    expect(insertCalls[0]).toMatchObject({
      tenant_id: 'tenant-1',
      part_id: 'part-1',
      location_id: 'loc-1',
      operation_id: 'op-1',
      placed_by: 'profile-1',
      placed_by_operator_id: 'operator-1',
    })
  })

  it('defaults operator id to null when none is supplied', async () => {
    const { result } = renderHook(() => useRecordPlacement(), { wrapper })

    result.current.recordPlacement({ partId: 'part-2', locationId: 'loc-2' })

    await waitFor(() => expect(insertCalls.length).toBe(1))
    expect(insertCalls[0]).toMatchObject({
      part_id: 'part-2',
      location_id: 'loc-2',
      operation_id: null,
      placed_by_operator_id: null,
    })
  })
})
