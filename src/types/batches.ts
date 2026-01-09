/**
 * Batch/Nesting Management Types
 *
 * Type definitions for the batch operations system including
 * operation batches, batch-operation relationships, and related enums.
 * Used for grouping operations in sheet metal fabrication:
 * - Laser cutting nestings
 * - Tube laser batches
 * - Sawing batches
 * - Finishing/deburring batches
 */

// ============================================================================
// Enums
// ============================================================================

export type BatchStatus =
  | 'draft'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type BatchType =
  | 'laser_nesting'
  | 'tube_batch'
  | 'saw_batch'
  | 'finishing_batch'
  | 'general';

// ============================================================================
// Batch Types
// ============================================================================

export interface OperationBatch {
  id: string;
  tenant_id: string;

  // Identification
  batch_number: string;
  batch_type: BatchType;
  status: BatchStatus;

  // Cell/Stage association
  cell_id: string;

  // Grouping criteria (always same material + thickness)
  material: string | null;
  thickness_mm: number | null;

  // Additional info
  notes: string | null;
  nesting_metadata: NestingMetadata | null;

  // Counts and times
  operations_count: number;
  estimated_time: number | null;
  actual_time: number | null;

  // Tracking
  created_by: string | null;
  completed_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;

  // External system integration (SigmaNest, Lantek, etc.)
  external_id: string | null;
  external_source: string | null;
}

export interface NestingMetadata {
  // Nesting efficiency and material utilization
  efficiency_percent?: number;
  material_utilization?: number;
  scrap_percent?: number;

  // Sheet/stock information
  sheet_size?: {
    length_mm: number;
    width_mm: number;
  };
  sheet_count?: number;

  // Tube/bar information (for tube laser, sawing)
  stock_length_mm?: number;
  stock_diameter_mm?: number;
  stock_count?: number;

  // Cut information
  total_cut_length_mm?: number;
  estimated_cut_time_seconds?: number;

  // Process parameters
  machine_program?: string;
  machine_settings?: Record<string, unknown>;

  // External nesting software data
  nesting_file_path?: string;
  nesting_software?: string;
  nesting_job_id?: string;

  // Flexible extension
  [key: string]: unknown;
}

// ============================================================================
// Batch Operation (Junction) Types
// ============================================================================

export interface BatchOperation {
  id: string;
  batch_id: string;
  operation_id: string;
  tenant_id: string;

  // Sequencing within batch
  sequence_in_batch: number | null;
  quantity_in_batch: number | null;

  created_at: string;
  updated_at: string | null;
}

// ============================================================================
// Extended Types (with relations)
// ============================================================================

export interface BatchWithOperations extends OperationBatch {
  batch_operations?: BatchOperationWithDetails[];
  cell?: {
    id: string;
    name: string;
    color: string | null;
    icon_name: string | null;
  };
  created_by_user?: {
    id: string;
    full_name: string;
  };
}

export interface BatchOperationWithDetails extends BatchOperation {
  operation?: {
    id: string;
    operation_name: string;
    status: string;
    estimated_time: number;
    sequence: number;
    part: {
      id: string;
      part_number: string;
      material: string;
      quantity: number | null;
      job: {
        id: string;
        job_number: string;
        customer: string | null;
        due_date: string | null;
      };
    };
  };
}

// ============================================================================
// Form/Input Types
// ============================================================================

export interface CreateBatchInput {
  batch_type: BatchType;
  cell_id: string;
  material?: string;
  thickness_mm?: number;
  notes?: string;
  nesting_metadata?: NestingMetadata;
  external_id?: string;
  external_source?: string;
}

export interface UpdateBatchInput extends Partial<CreateBatchInput> {
  status?: BatchStatus;
}

export interface AddOperationToBatchInput {
  batch_id: string;
  operation_id: string;
  sequence_in_batch?: number;
  quantity_in_batch?: number;
}

export interface AddOperationsToBatchInput {
  batch_id: string;
  operation_ids: string[];
}

// Auto-grouping input (group by material + thickness at a cell)
export interface AutoGroupBatchInput {
  cell_id: string;
  batch_type: BatchType;
  material: string;
  thickness_mm: number;
  operation_ids?: string[]; // Optional: specific operations, or all matching if not provided
}

// ============================================================================
// Stats/Analytics Types
// ============================================================================

export interface BatchStats {
  total: number;
  draft: number;
  ready: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  completedToday: number;
  completedThisWeek: number;
  avgOperationsPerBatch: number;
  avgEfficiency: number | null;
}

export interface BatchesByCell {
  cell_id: string;
  cell_name: string;
  count: number;
  batches: OperationBatch[];
}

export interface BatchesByMaterial {
  material: string;
  thickness_mm: number | null;
  count: number;
  total_operations: number;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface BatchFilters {
  status?: BatchStatus[];
  batch_type?: BatchType[];
  cell_id?: string;
  material?: string;
  thickness_mm?: number;
  created_from?: string;
  created_to?: string;
  search?: string;
}

// ============================================================================
// Groupable Operations (for batch creation UI)
// ============================================================================

export interface GroupableOperation {
  id: string;
  operation_name: string;
  cell_id: string;
  cell_name: string;
  part_id: string;
  part_number: string;
  material: string;
  thickness_mm: number | null;
  quantity: number | null;
  job_id: string;
  job_number: string;
  customer: string | null;
  due_date: string | null;
  status: string;
  estimated_time: number;
  // Whether already in a batch
  existing_batch_id: string | null;
}

export interface MaterialGroup {
  material: string;
  thickness_mm: number | null;
  cell_id: string;
  cell_name: string;
  operations: GroupableOperation[];
  total_estimated_time: number;
}

// ============================================================================
// Status Configuration
// ============================================================================

export const BATCH_STATUS_CONFIG: Record<
  BatchStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
  }
> = {
  draft: {
    label: 'Draft',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
    icon: 'FileEdit',
  },
  ready: {
    label: 'Ready',
    color: 'text-[hsl(var(--color-info))]',
    bgColor: 'bg-[hsl(var(--color-info))]/20',
    borderColor: 'border-[hsl(var(--color-info))]/30',
    icon: 'CheckCircle',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-[hsl(var(--color-warning))]',
    bgColor: 'bg-[hsl(var(--color-warning))]/20',
    borderColor: 'border-[hsl(var(--color-warning))]/30',
    icon: 'Play',
  },
  completed: {
    label: 'Completed',
    color: 'text-[hsl(var(--color-success))]',
    bgColor: 'bg-[hsl(var(--color-success))]/20',
    borderColor: 'border-[hsl(var(--color-success))]/30',
    icon: 'CheckCircle2',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-[hsl(var(--color-error))]',
    bgColor: 'bg-[hsl(var(--color-error))]/20',
    borderColor: 'border-[hsl(var(--color-error))]/30',
    icon: 'XCircle',
  },
};

export const BATCH_TYPE_CONFIG: Record<
  BatchType,
  {
    label: string;
    icon: string;
    description: string;
  }
> = {
  laser_nesting: {
    label: 'Laser Nesting',
    icon: 'Zap',
    description: 'Sheet metal laser cutting with nested parts',
  },
  tube_batch: {
    label: 'Tube Laser',
    icon: 'Cylinder',
    description: 'Tube/pipe laser cutting batch',
  },
  saw_batch: {
    label: 'Sawing',
    icon: 'Scissors',
    description: 'Sawing batch with multiple cuts',
  },
  finishing_batch: {
    label: 'Finishing',
    icon: 'Sparkles',
    description: 'Deburring/finishing batch (same thickness)',
  },
  general: {
    label: 'General',
    icon: 'Layers',
    description: 'General operation batch',
  },
};
