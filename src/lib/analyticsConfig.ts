/**
 * Analytics Configuration
 *
 * Centralized configuration for analytics timeframes and settings.
 * All analytics hooks should import these values for consistency.
 */

/**
 * Default date range presets in days
 */
export const AnalyticsDateRange = {
  /** Last 24 hours - for real-time operational views */
  DAY: 1,

  /** Last 7 days - for weekly trends and employee metrics */
  WEEK: 7,

  /** Last 14 days - for bi-weekly analysis */
  TWO_WEEKS: 14,

  /** Last 30 days - default for most analytics dashboards */
  MONTH: 30,

  /** Last 60 days - for extended trend analysis */
  TWO_MONTHS: 60,

  /** Last 90 days - for quarterly analysis */
  QUARTER: 90,

  /** Last 180 days - for semi-annual analysis */
  HALF_YEAR: 180,

  /** Last 365 days - for year-over-year comparisons */
  YEAR: 365,
} as const;

export type AnalyticsDateRangeKey = keyof typeof AnalyticsDateRange;
export type AnalyticsDateRangeValue = (typeof AnalyticsDateRange)[AnalyticsDateRangeKey];

/**
 * Default date ranges for specific analytics features
 */
export const AnalyticsDefaults = {
  /** QRM Dashboard - Manufacturing Cycle Time, OTP, Queue Time */
  qrmDashboard: AnalyticsDateRange.MONTH,

  /** OEE Analytics - Overall Equipment Effectiveness */
  oeeAnalytics: AnalyticsDateRange.MONTH,

  /** Quality Analytics - Yield rates, scrap analysis */
  qualityAnalytics: AnalyticsDateRange.MONTH,

  /** Reliability Analytics - MTBF, MTTR, Availability */
  reliabilityAnalytics: AnalyticsDateRange.MONTH,

  /** Employee OEE - Operator productivity */
  employeeOee: AnalyticsDateRange.WEEK,

  /** Jobs Analytics - Job completion trends */
  jobsAnalytics: AnalyticsDateRange.MONTH,

  /** Production Metrics - real-time production data */
  productionMetrics: AnalyticsDateRange.MONTH,

  /** Capacity Matrix - resource utilization */
  capacityMatrix: AnalyticsDateRange.TWO_WEEKS,
} as const;

/**
 * Maximum date ranges allowed for each feature (prevents excessive data load)
 */
export const AnalyticsMaxRange = {
  qrmDashboard: AnalyticsDateRange.YEAR,
  oeeAnalytics: AnalyticsDateRange.YEAR,
  qualityAnalytics: AnalyticsDateRange.YEAR,
  reliabilityAnalytics: AnalyticsDateRange.HALF_YEAR,
  employeeOee: AnalyticsDateRange.QUARTER,
  jobsAnalytics: AnalyticsDateRange.YEAR,
  productionMetrics: AnalyticsDateRange.QUARTER,
  capacityMatrix: AnalyticsDateRange.MONTH,
} as const;

/**
 * Available date range options for UI selectors
 */
export const DateRangeOptions = [
  { value: AnalyticsDateRange.WEEK, label: "Last 7 days" },
  { value: AnalyticsDateRange.TWO_WEEKS, label: "Last 14 days" },
  { value: AnalyticsDateRange.MONTH, label: "Last 30 days" },
  { value: AnalyticsDateRange.TWO_MONTHS, label: "Last 60 days" },
  { value: AnalyticsDateRange.QUARTER, label: "Last 90 days" },
] as const;

/**
 * Extended date range options for features that support longer periods
 */
export const ExtendedDateRangeOptions = [
  ...DateRangeOptions,
  { value: AnalyticsDateRange.HALF_YEAR, label: "Last 6 months" },
  { value: AnalyticsDateRange.YEAR, label: "Last year" },
] as const;

/**
 * Sparkline/trend chart configuration
 */
export const TrendConfig = {
  /** Maximum data points for sparkline charts */
  maxSparklinePoints: 14,

  /** Minimum data points required for meaningful trends */
  minTrendPoints: 3,

  /** Number of periods for reliability heatmap */
  reliabilityPeriods: 8,

  /** Sample interval divisor (dateRange / this = sample interval) */
  sampleIntervalDivisor: 10,
} as const;

/**
 * Refresh intervals for analytics data (in milliseconds)
 */
export const AnalyticsRefreshInterval = {
  /** Real-time dashboards */
  realtime: 30 * 1000, // 30 seconds

  /** Standard analytics */
  standard: 60 * 1000, // 1 minute

  /** Historical analytics */
  historical: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * Helper to validate date range is within allowed bounds
 */
export function validateDateRange(
  range: number,
  feature: keyof typeof AnalyticsMaxRange
): number {
  const maxRange = AnalyticsMaxRange[feature];
  return Math.min(Math.max(range, AnalyticsDateRange.DAY), maxRange);
}

/**
 * Helper to get appropriate sample interval for trend charts
 */
export function getTrendSampleInterval(dateRange: number): number {
  return Math.max(1, Math.floor(dateRange / TrendConfig.sampleIntervalDivisor));
}
