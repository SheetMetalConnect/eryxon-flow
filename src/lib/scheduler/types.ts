import { Database } from '@/integrations/supabase/types';

export type Job = Database['public']['Tables']['jobs']['Row'];
export type Operation = Database['public']['Tables']['operations']['Row'];
export type Cell = Database['public']['Tables']['cells']['Row'];

export const MAX_SCHEDULING_DAYS = 365;
export const DEFAULT_OPERATION_DURATION_MINUTES = 60;

export interface CalendarDay {
  date: string;
  day_type: 'working' | 'holiday' | 'closure' | 'half_day';
  capacity_multiplier: number;
}

export interface DayAllocation {
  date: string;
  hours_allocated: number;
  cell_id: string;
  operation_id: string;
}

export interface ScheduledOperation extends Operation {
  planned_start: string | null;
  planned_end: string | null;
  day_allocations: DayAllocation[];
}

export interface SchedulerConfig {
  workingDaysMask?: number;
  factoryOpeningTime?: string;
  factoryClosingTime?: string;
}
