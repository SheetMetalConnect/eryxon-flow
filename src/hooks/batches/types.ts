/**
 * Batch domain types shared by the batch query/mutation hooks.
 * Public API surface is re-exported through `@/hooks/useBatches`.
 */

export type BatchType = "laser_nesting" | "tube_batch" | "saw_batch" | "finishing_batch" | "general";
export type BatchStatus = "draft" | "ready" | "in_progress" | "completed" | "cancelled" | "blocked";

export interface Batch {
  id: string;
  tenant_id: string;
  batch_number: string;
  batch_type: BatchType;
  cell_id: string;
  status: BatchStatus;
  material: string | null;
  thickness_mm: number | null;
  estimated_time: number | null;
  actual_time: number | null;
  operations_count: number;
  notes: string | null;
  nesting_metadata: Record<string, unknown> | null;
  external_id: string | null;
  external_source: string | null;
  created_by: string | null;
  started_by: string | null;
  completed_by: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  nesting_image_url: string | null;
  layout_image_url: string | null;
  parent_batch_id: string | null;
  material_requirement_raised: boolean;
  material_requirement_metadata: Record<string, unknown> | null;
  cell?: {
    id: string;
    name: string;
  };
  created_by_profile?: {
    full_name: string;
  };
}

export interface BatchOperation {
  id: string;
  batch_id: string;
  operation_id: string;
  sequence_in_batch: number | null;
  quantity_in_batch: number | null;
  tenant_id: string;
  created_at: string;
  operation?: {
    id: string;
    operation_name: string;
    status: string;
    part?: {
      id: string;
      part_number: string;
      quantity: number;
      job?: {
        id: string;
        job_number: string;
        customer: string;
      };
    };
  };
}

export interface BatchRequirement {
  id: string;
  batch_id: string;
  material_name: string;
  quantity: number;
  status: 'pending' | 'ordered' | 'received';
  created_at: string;
}

export interface CreateBatchInput {
  batch_number: string;
  batch_type: BatchType;
  cell_id: string;
  material?: string;
  thickness_mm?: number;
  estimated_time?: number;
  notes?: string;
  nesting_metadata?: Record<string, unknown>;
  nesting_image_url?: string;
  layout_image_url?: string;
  parent_batch_id?: string;
  operation_ids?: string[];
}
