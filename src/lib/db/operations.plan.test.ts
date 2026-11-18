import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the payload passed to .update()
const updateSpy = vi.fn();
const eqResult = { error: null as unknown };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: (patch: Record<string, unknown>) => {
        updateSpy(patch);
        return { eq: vi.fn(() => Promise.resolve(eqResult)) };
      },
    })),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { updateOperationPlan } from './operations';

describe('updateOperationPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eqResult.error = null;
  });

  it('writes estimated_time in minutes', async () => {
    await updateOperationPlan('op-1', { estimated_time: 90 });
    expect(updateSpy).toHaveBeenCalledWith({ estimated_time: 90 });
  });

  it('clamps negative estimated_time to 0', async () => {
    await updateOperationPlan('op-1', { estimated_time: -30 });
    expect(updateSpy).toHaveBeenCalledWith({ estimated_time: 0 });
  });

  it('writes planned_start and planned_end when provided', async () => {
    await updateOperationPlan('op-1', {
      planned_start: '2026-06-22T08:00:00.000Z',
      planned_end: '2026-06-22T12:00:00.000Z',
    });
    expect(updateSpy).toHaveBeenCalledWith({
      planned_start: '2026-06-22T08:00:00.000Z',
      planned_end: '2026-06-22T12:00:00.000Z',
    });
  });

  it('allows clearing the planned window with null', async () => {
    await updateOperationPlan('op-1', { planned_start: null, planned_end: null });
    expect(updateSpy).toHaveBeenCalledWith({ planned_start: null, planned_end: null });
  });

  it('only writes the fields provided (partial patch)', async () => {
    await updateOperationPlan('op-1', { estimated_time: 45 });
    const patch = updateSpy.mock.calls[0][0];
    expect(Object.keys(patch)).toEqual(['estimated_time']);
  });

  it('does not call the database when the patch is empty', async () => {
    await updateOperationPlan('op-1', {});
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('throws when the update errors', async () => {
    eqResult.error = new Error('rls denied');
    await expect(updateOperationPlan('op-1', { estimated_time: 60 })).rejects.toThrow('rls denied');
  });
});
