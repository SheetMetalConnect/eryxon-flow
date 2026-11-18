import { Database } from '@/integrations/supabase/types';

type JobRow = Database['public']['Tables']['jobs']['Row'];
type OperationRow = Database['public']['Tables']['operations']['Row'];
type CellRow = Database['public']['Tables']['cells']['Row'];
type PartRow = Database['public']['Tables']['parts']['Row'];

export type Job = Pick<JobRow, 'id' | 'due_date' | 'due_date_override'>;
export type Operation = Pick<
  OperationRow,
  | 'id'
  | 'part_id'
  | 'cell_id'
  | 'sequence'
  | 'estimated_time'
  | 'status'
  | 'planned_start'
  | 'planned_end'
  | 'updated_at'
>;
export type Cell = Pick<CellRow, 'id' | 'capacity_hours_per_day'>;
export type Part = Pick<PartRow, 'id' | 'job_id'>;

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

export type SchedulingStatus = 'scheduled' | 'unscheduled';
export type SchedulingFailureReason =
  | 'missing_cell'
  | 'insufficient_capacity'
  | 'blocked_by_predecessor'
  | null;

export interface OperationScheduleConstraint {
  earliestStart?: Date;
  blockedByPredecessor?: boolean;
}

export interface ScheduleJobsOptions {
  constraintsByOperation?: Map<string, OperationScheduleConstraint>;
  existingAllocationsByOperation?: Map<string, DayAllocation[]>;
}

export interface ScheduledOperation extends Operation {
  planned_start: string | null;
  planned_end: string | null;
  day_allocations: DayAllocation[];
  scheduling_status: SchedulingStatus;
  scheduling_failure_reason: SchedulingFailureReason;
  remaining_hours: number;
}

export interface SchedulerConfig {
  workingDaysMask?: number;
  factoryOpeningTime?: string;
  factoryClosingTime?: string;
}
