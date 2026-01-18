import { describe, it, expect } from 'vitest';
import {
  AnalyticsDateRange,
  AnalyticsMaxRange,
  validateDateRange,
  getTrendSampleInterval,
  TrendConfig,
} from './analyticsConfig';

describe('analyticsConfig', () => {
  describe('validateDateRange', () => {
    it('returns range within bounds', () => {
      expect(validateDateRange(30, 'qrmDashboard')).toBe(30);
      expect(validateDateRange(90, 'oeeAnalytics')).toBe(90);
    });

    it('clamps range to minimum (DAY)', () => {
      expect(validateDateRange(0, 'qrmDashboard')).toBe(AnalyticsDateRange.DAY);
      expect(validateDateRange(-5, 'oeeAnalytics')).toBe(AnalyticsDateRange.DAY);
    });

    it('clamps range to maximum for feature', () => {
      // qrmDashboard max is YEAR (365)
      expect(validateDateRange(500, 'qrmDashboard')).toBe(AnalyticsMaxRange.qrmDashboard);
      // employeeOee max is QUARTER (90)
      expect(validateDateRange(200, 'employeeOee')).toBe(AnalyticsMaxRange.employeeOee);
    });

    it('handles NaN by defaulting to DAY', () => {
      expect(validateDateRange(NaN, 'qrmDashboard')).toBe(AnalyticsDateRange.DAY);
    });

    it('handles Infinity by defaulting to DAY then clamping to max', () => {
      // Infinity becomes DAY (1), which is then clamped within bounds
      expect(validateDateRange(Infinity, 'qrmDashboard')).toBe(AnalyticsDateRange.DAY);
      expect(validateDateRange(-Infinity, 'oeeAnalytics')).toBe(AnalyticsDateRange.DAY);
    });
  });

  describe('getTrendSampleInterval', () => {
    it('returns correct sample interval', () => {
      // 30 days / 10 = 3
      expect(getTrendSampleInterval(30)).toBe(3);
      // 90 days / 10 = 9
      expect(getTrendSampleInterval(90)).toBe(9);
    });

    it('returns minimum of 1 for small ranges', () => {
      expect(getTrendSampleInterval(5)).toBe(1);
      expect(getTrendSampleInterval(1)).toBe(1);
    });

    it('handles NaN by defaulting to DAY then calculating', () => {
      // DAY (1) / 10 = 0.1, Math.floor = 0, Math.max(1, 0) = 1
      expect(getTrendSampleInterval(NaN)).toBe(1);
    });

    it('handles Infinity by defaulting to DAY then calculating', () => {
      expect(getTrendSampleInterval(Infinity)).toBe(1);
      expect(getTrendSampleInterval(-Infinity)).toBe(1);
    });

    it('floors the result', () => {
      // 14 / 10 = 1.4, floored to 1
      expect(getTrendSampleInterval(14)).toBe(1);
      // 25 / 10 = 2.5, floored to 2
      expect(getTrendSampleInterval(25)).toBe(2);
    });
  });

  describe('TrendConfig', () => {
    it('has expected default values', () => {
      expect(TrendConfig.maxSparklinePoints).toBe(14);
      expect(TrendConfig.minTrendPoints).toBe(3);
      expect(TrendConfig.reliabilityPeriods).toBe(8);
      expect(TrendConfig.sampleIntervalDivisor).toBe(10);
    });
  });
});
