import { describe, it, expect, vi } from 'vitest';

/**
 * useQRMMetrics is a re-export barrel that re-exports from '@/hooks/qrm'.
 * Verify all expected exports are present.
 */

// Mock the underlying qrm module
vi.mock('./qrm', () => ({
  useCellQRMMetrics: vi.fn(),
  useAllCellsQRMMetrics: vi.fn(),
  useNextCellCapacity: vi.fn(),
  usePartRouting: vi.fn(),
  useJobRouting: vi.fn(),
  useMultipleJobsRouting: vi.fn(),
}));

import {
  useCellQRMMetrics,
  useAllCellsQRMMetrics,
  useNextCellCapacity,
  usePartRouting,
  useJobRouting,
  useMultipleJobsRouting,
} from './useQRMMetrics';

describe('useQRMMetrics barrel exports', () => {
  it('re-exports useCellQRMMetrics', () => {
    expect(useCellQRMMetrics).toBeDefined();
    expect(typeof useCellQRMMetrics).toBe('function');
  });

  it('re-exports useAllCellsQRMMetrics', () => {
    expect(useAllCellsQRMMetrics).toBeDefined();
    expect(typeof useAllCellsQRMMetrics).toBe('function');
  });

  it('re-exports useNextCellCapacity', () => {
    expect(useNextCellCapacity).toBeDefined();
    expect(typeof useNextCellCapacity).toBe('function');
  });

  it('re-exports usePartRouting', () => {
    expect(usePartRouting).toBeDefined();
    expect(typeof usePartRouting).toBe('function');
  });

  it('re-exports useJobRouting', () => {
    expect(useJobRouting).toBeDefined();
    expect(typeof useJobRouting).toBe('function');
  });

  it('re-exports useMultipleJobsRouting', () => {
    expect(useMultipleJobsRouting).toBeDefined();
    expect(typeof useMultipleJobsRouting).toBe('function');
  });
});
