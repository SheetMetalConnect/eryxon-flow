import { useQuery } from '@tanstack/react-query';

export interface ReliabilityMetrics {
  totalOperations: number;
  onTimeOperations: number;
  onTimePercentage: number;
  lateOperations: number;
  latePercentage: number;
  avgDelayMinutes: number;
  weeklyTrend: { week: string; onTime: number; late: number }[];
  delayTrend: { date: string; avgDelay: number }[];
  byCell: { name: string; onTime: number; late: number }[];
}

export function useReliabilityMetrics(days: number) {
  return useQuery<ReliabilityMetrics | null>({
    queryKey: ['reliability-metrics', days],
    queryFn: async () => {
      // TODO: Implement real reliability calculation from operations and time_entries
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
