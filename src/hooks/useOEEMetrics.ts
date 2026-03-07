import { useQuery } from '@tanstack/react-query';

export interface OEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  trend: { date: string; oee: number; availability: number; performance: number; quality: number }[];
  stateBreakdown: { name: string; value: number; color: string }[];
  byCell: { cellName: string; oee: number }[];
}

export function useOEEMetrics(days: number) {
  return useQuery<OEEMetrics | null>({
    queryKey: ['oee-metrics', days],
    queryFn: async () => {
      // TODO: Implement real OEE calculation from time_entries and operations
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
