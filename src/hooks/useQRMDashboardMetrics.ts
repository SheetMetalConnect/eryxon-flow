export interface QRMDashboardMetrics {
  mct: {
    current: number;
    target: number;
    trend: { date: string; value: number }[];
  };
  otp: {
    current: number;
    target: number;
    trend: { date: string; value: number }[];
  };
  queueTime: {
    current: number;
    target: number;
    trend: { date: string; value: number }[];
    byCell: { cellName: string; avgQueueTime: number }[];
  };
  cycleTime: {
    current: number;
    target: number;
    trend: { date: string; value: number }[];
    byOperation: { operationType: string; median: number }[];
  };
  wipAge: {
    buckets: { range: string; count: number }[];
    avgAge: number;
    totalWip: number;
    distribution: { label: string; count: number }[];
  };
  issueRate: {
    current: number;
    trend: { date: string; value: number }[];
    byCategory: { category: string; rate: number }[];
  };
  reliability: {
    labels: string[];
    data: number[][];
    cells: string[];
    periodLabels: string[];
    heatmap: { cellName: string; values: number[] }[];
  };
  throughput: {
    current: number;
    trend: { date: string; value: number }[];
    byCell: { cellName: string; current: number; trend: number[] }[];
  };
}
