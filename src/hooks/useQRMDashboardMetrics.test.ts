import { describe, it, expect } from 'vitest';
import type { QRMDashboardMetrics } from './useQRMDashboardMetrics';

/**
 * useQRMDashboardMetrics exports a type-only interface.
 * Verify the type structure is correct at compile time.
 */

describe('QRMDashboardMetrics type', () => {
  it('has the expected shape for mct', () => {
    const metrics: QRMDashboardMetrics = createMockMetrics();
    expect(metrics.mct).toHaveProperty('current');
    expect(metrics.mct).toHaveProperty('target');
    expect(metrics.mct).toHaveProperty('trend');
  });

  it('has the expected shape for otp', () => {
    const metrics = createMockMetrics();
    expect(metrics.otp).toHaveProperty('current');
    expect(metrics.otp).toHaveProperty('target');
    expect(Array.isArray(metrics.otp.trend)).toBe(true);
  });

  it('has the expected shape for queueTime with byCell', () => {
    const metrics = createMockMetrics();
    expect(metrics.queueTime).toHaveProperty('byCell');
    expect(metrics.queueTime.byCell[0]).toHaveProperty('cellName');
    expect(metrics.queueTime.byCell[0]).toHaveProperty('avgQueueTime');
  });

  it('has the expected shape for cycleTime with byOperation', () => {
    const metrics = createMockMetrics();
    expect(metrics.cycleTime).toHaveProperty('byOperation');
    expect(metrics.cycleTime.byOperation[0]).toHaveProperty('operationType');
    expect(metrics.cycleTime.byOperation[0]).toHaveProperty('median');
  });

  it('has the expected shape for wipAge', () => {
    const metrics = createMockMetrics();
    expect(metrics.wipAge).toHaveProperty('buckets');
    expect(metrics.wipAge).toHaveProperty('avgAge');
    expect(metrics.wipAge).toHaveProperty('totalWip');
    expect(metrics.wipAge).toHaveProperty('distribution');
  });

  it('has the expected shape for issueRate', () => {
    const metrics = createMockMetrics();
    expect(metrics.issueRate).toHaveProperty('current');
    expect(metrics.issueRate).toHaveProperty('byCategory');
  });

  it('has the expected shape for reliability', () => {
    const metrics = createMockMetrics();
    expect(metrics.reliability).toHaveProperty('labels');
    expect(metrics.reliability).toHaveProperty('data');
    expect(metrics.reliability).toHaveProperty('cells');
    expect(metrics.reliability).toHaveProperty('heatmap');
  });

  it('has the expected shape for throughput', () => {
    const metrics = createMockMetrics();
    expect(metrics.throughput).toHaveProperty('current');
    expect(metrics.throughput).toHaveProperty('byCell');
    expect(metrics.throughput.byCell[0]).toHaveProperty('cellName');
  });
});

function createMockMetrics(): QRMDashboardMetrics {
  return {
    mct: { current: 12, target: 10, trend: [{ date: '2026-03-01', value: 12 }] },
    otp: { current: 85, target: 95, trend: [{ date: '2026-03-01', value: 85 }] },
    queueTime: {
      current: 4,
      target: 2,
      trend: [{ date: '2026-03-01', value: 4 }],
      byCell: [{ cellName: 'CNC', avgQueueTime: 3.5 }],
    },
    cycleTime: {
      current: 8,
      target: 6,
      trend: [{ date: '2026-03-01', value: 8 }],
      byOperation: [{ operationType: 'Milling', median: 7.5 }],
    },
    wipAge: {
      buckets: [{ range: '0-1d', count: 5 }],
      avgAge: 2.3,
      totalWip: 15,
      distribution: [{ label: 'Fresh', count: 5 }],
    },
    issueRate: {
      current: 3.2,
      trend: [{ date: '2026-03-01', value: 3.2 }],
      byCategory: [{ category: 'Machining', rate: 2.1 }],
    },
    reliability: {
      labels: ['Week 1'],
      data: [[95]],
      cells: ['CNC'],
      periodLabels: ['W1'],
      heatmap: [{ cellName: 'CNC', values: [95] }],
    },
    throughput: {
      current: 42,
      trend: [{ date: '2026-03-01', value: 42 }],
      byCell: [{ cellName: 'CNC', current: 42, trend: [40, 42] }],
    },
  };
}
